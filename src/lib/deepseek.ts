import type { AppSettings } from '../types'
import { openKey } from './aiKey'

/**
 * DeepSeek 在线接口（OpenAI 兼容协议，已验证支持 CORS，浏览器可直接调用）。
 * 密钥由用户在设置页填一次，AES 加密存本机；这里只负责真实调用。
 * 文本模型（deepseek-chat）用于健康报告解读、配餐点评；
 * 视觉模型（deepseek-flash）用于食材照片识别，详见 recognizeIngredientsWithVision。
 * 密钥仅在本机解密后用于本次请求，不写入代码、不进仓库、不随安装包明文分发。
 */
export const DEEPSEEK_MODEL = 'deepseek-chat'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super('还没有配置 AI 密钥，请到「设置」里填入 DeepSeek 密钥。')
    this.name = 'AiNotConfiguredError'
  }
}

/** 调用 DeepSeek chat/completions，返回模型回复的文本。 */
export async function chatWithDeepSeek(
  settings: AppSettings,
  messages: ChatMessage[],
  options?: { temperature?: number; signal?: AbortSignal },
): Promise<string> {
  const key = await openKey(settings.aiKeyEncrypted)
  if (!key) throw new AiNotConfiguredError()

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: options?.temperature ?? 0.6,
      stream: false,
    }),
    signal: options?.signal,
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('DeepSeek 密钥校验失败（401），请到「设置」里检查或更换密钥。')
    }
    if (response.status === 402) {
      throw new Error('DeepSeek 账户余额不足（402），请充值后重试。')
    }
    if (response.status === 429) {
      throw new Error('请求太频繁（429），稍等片刻再试。')
    }
    throw new Error(`DeepSeek 接口返回 ${response.status}，请稍后重试。`)
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('DeepSeek 没有返回内容，请稍后重试。')
  return content
}

export interface AiMetric {
  /** 指标中文名，如「收缩压」「空腹血糖」 */
  label: string
  value: number
  unit?: string
}

const metricAlias: Array<{ type: string; words: string[] }> = [
  { type: 'systolic_pressure', words: ['收缩压', '高压', 'systolic'] },
  { type: 'diastolic_pressure', words: ['舒张压', '低压', 'diastolic'] },
  { type: 'blood_glucose', words: ['血糖', '葡萄糖', 'glucose'] },
  { type: 'total_cholesterol', words: ['总胆固醇', '胆固醇', 'cholesterol'] },
  { type: 'triglyceride', words: ['甘油三酯', 'triglyceride'] },
  { type: 'ldl', words: ['低密度脂蛋白', '低密度', 'ldl'] },
  { type: 'hdl', words: ['高密度脂蛋白', '高密度', 'hdl'] },
  { type: 'weight', words: ['体重', 'weight'] },
]

/** 把模型给出的中文指标名映射回系统内部的指标类型；映射不上的丢弃 */
export function mapAiMetricType(label: string): string | null {
  const lowered = label.toLowerCase()
  for (const alias of metricAlias) {
    if (alias.words.some(word => lowered.includes(word.toLowerCase()))) return alias.type
  }
  return null
}

function extractJsonArray(text: string): unknown {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

/**
 * 让 DeepSeek 从化验单文字 / CSV 里抽取健康指标。
 * 要求模型只输出 JSON 数组；解析失败或结果为空时返回空数组，由调用方回退本地规则。
 */
export async function extractHealthMetricsWithAI(
  settings: AppSettings,
  reportText: string,
): Promise<AiMetric[]> {
  const content = await chatWithDeepSeek(settings, [
    {
      role: 'system',
      content:
        '你是健康数据抽取助手。从用户给的化验单/体检报告文字里抽取健康指标，只输出 JSON 数组，不要输出其它内容。数组元素形如 {"label":"收缩压","value":128,"unit":"mmHg"}。支持：收缩压、舒张压、血糖、总胆固醇、甘油三酯、低密度脂蛋白、高密度脂蛋白、体重。没有可抽取的指标就输出 []。',
    },
    { role: 'user', content: reportText.slice(0, 8000) },
  ])
  const parsed = extractJsonArray(content)
  if (!Array.isArray(parsed)) return []
  const results: AiMetric[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const record = item as { label?: unknown; value?: unknown; unit?: unknown }
    const value = Number(record.value)
    if (typeof record.label !== 'string' || !Number.isFinite(value) || value <= 0) continue
    results.push({
      label: record.label,
      value,
      unit: typeof record.unit === 'string' ? record.unit : undefined,
    })
  }
  return results
}

/** 用于食材照片识别的视觉模型（支持图片输入） */
export const DEEPSEEK_VISION_MODEL = 'deepseek-flash'

export interface VisionIngredient {
  /** 食材中文名，如「米饭」 */
  name: string
  /** 估算生重，单位克 */
  grams: number
  /** 对识别与重量估算的把握 */
  confidence: 'high' | 'medium' | 'low'
}

/**
 * 用 deepseek-flash 视觉模型识别食材照片。
 * 返回每种食材的名称、估算生重（克）与置信度；解析失败或空结果返回 []，由调用方回退本地规则。
 * 图片以 base64 data URL 直传 DeepSeek（接口支持 CORS，密钥仅本机解密后用于本次请求）。
 */
export async function recognizeIngredientsWithVision(
  settings: AppSettings,
  imageDataUrl: string,
  referenceLabel: string,
  referenceSize: string,
): Promise<VisionIngredient[]> {
  const key = await openKey(settings.aiKeyEncrypted)
  if (!key) throw new AiNotConfiguredError()

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_VISION_MODEL,
      messages: [
        {
          role: 'system',
          content:
            '你是家庭营养师 App 的食材识别助手。请看用户上传的照片，识别里面的食物或食材，并估算每种食材的生重（克）。' +
            `照片里放了一张尺寸参照物：「${referenceLabel}（${referenceSize}）」，可据此推断物体实际大小。` +
            '只输出 JSON 数组，不要输出其它内容。数组元素形如 {"name":"米饭","grams":200,"confidence":"high"}。' +
            'confidence 取值 high / medium / low，表示你对识别和重量估算的把握。' +
            '没有识别到任何食物就输出 []。',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: '请识别这张照片里的食材，并估算每种的生重（克）。' },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
      temperature: 0.2,
      stream: false,
    }),
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('DeepSeek 密钥校验失败（401），请到「设置」里检查或更换密钥。')
    }
    if (response.status === 402) {
      throw new Error('DeepSeek 账户余额不足（402），请充值后重试。')
    }
    if (response.status === 429) {
      throw new Error('请求太频繁（429），稍等片刻再试。')
    }
    throw new Error(`DeepSeek 接口返回 ${response.status}，请稍后重试。`)
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) return []
  const parsed = extractJsonArray(content)
  if (!Array.isArray(parsed)) return []
  const results: VisionIngredient[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const record = item as { name?: unknown; grams?: unknown; confidence?: unknown }
    if (typeof record.name !== 'string' || !record.name.trim()) continue
    const grams = Number(record.grams)
    const conf = record.confidence
    const confidence: VisionIngredient['confidence'] =
      conf === 'high' || conf === 'medium' || conf === 'low' ? conf : 'low'
    results.push({
      name: record.name.trim(),
      grams: Number.isFinite(grams) && grams > 0 ? grams : 100,
      confidence,
    })
  }
  return results
}
