import type { AppSettings } from '../types'
import { openKey } from './aiKey'

/**
 * DeepSeek 在线接口（OpenAI 兼容协议）。
 * 密钥由用户在设置页填一次，AES 加密存本机；这里只负责真实调用。
 * 注意：DeepSeek 目前没有视觉模型，食材照片识别仍走本地几何估算；
 * AI 用在健康报告文字解读、配餐点评这类纯文本任务上。
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
