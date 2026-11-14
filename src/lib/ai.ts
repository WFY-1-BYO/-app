import type { AppSettings, MealIngredient, ReferenceKind } from '../types'
import { createId } from './id'
import { estimateRange, getReferenceOption } from './reference'
import { openKey } from './aiKey'
import { recognizeIngredientsWithVision, type VisionIngredient } from './deepseek'

const knownIngredients = [
  '米饭',
  '糙米',
  '面条',
  '馒头',
  '燕麦',
  '红薯',
  '土豆',
  '玉米',
  '鸡蛋',
  '鸡胸肉',
  '牛肉',
  '猪肉',
  '三文鱼',
  '虾仁',
  '豆腐',
  '豆浆',
  '西兰花',
  '菠菜',
  '番茄',
  '黄瓜',
  '胡萝卜',
  '白菜',
  '生菜',
  '蘑菇',
  '茄子',
  '青椒',
  '苹果',
  '香蕉',
  '橙子',
  '蓝莓',
  '牛奶',
  '酸奶',
  '奶酪',
  '橄榄油',
  '坚果',
  '盐',
  '酱油',
  '醋',
  '蜂蜜',
]

export interface RecognizeResult {
  ingredients: MealIngredient[]
  note: string
  /** 本次识别来源：vision=DeepSeek 视觉模型；local=本地理据兜底 */
  source: 'vision' | 'local'
}

/**
 * 识别照片里的食材。
 *
 * - 用户在「设置」填入 DeepSeek 密钥时，走 deepseek-flash 视觉模型真实看图识别；
 * - 没填密钥 / 未联网 / 视觉识别失败时，回退到本地理据：文件名匹配已知食材 + 参照物几何估算。
 *
 * 密钥只在本机解密后用于本次请求，不写入代码、不进入仓库、不随安装包明文分发。
 */
export async function recognizeIngredientsFromFile(
  file: File,
  referenceKind: ReferenceKind = 'card',
  settings?: AppSettings,
): Promise<RecognizeResult> {
  const option = getReferenceOption(referenceKind)
  const withoutScale = option.level === 'C'
  const baseNote = `本地校准估算：${option.label}（${option.size}）。`

  let ingredients: MealIngredient[] = []
  let note = `${baseNote}请手动添加食材。`
  let source: RecognizeResult['source'] = 'local'

  // 优先尝试真实视觉识别
  if (settings) {
    try {
      const key = await openKey(settings.aiKeyEncrypted)
      if (key) {
        const dataUrl = await fileToDataUrl(file)
        const vision = await recognizeIngredientsWithVision(
          settings,
          dataUrl,
          option.label,
          option.size,
        )
        if (vision.length > 0) {
          ingredients = vision.map(item => buildVisionIngredient(item, referenceKind, withoutScale))
          source = 'vision'
          note = `AI 视觉识别到 ${ingredients.length} 种食材（${option.label} ${option.size} 作参照），请确认用量后再用于配餐。`
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '识别服务暂不可用'
      note = `${baseNote}AI 识别暂不可用（${msg}），已回退本地估算；请手动添加或确认食材。`
    }
  }

  // 兜底：本地文件名匹配（无视觉结果或没配密钥时）
  if (ingredients.length === 0) {
    const fileName = decodeURIComponent(file.name)
    const matched = knownIngredients.filter(name => fileName.includes(name))
    ingredients = matched.map(name => buildIngredient(name, 100, option.confidence, referenceKind, withoutScale))
    if (ingredients.length > 0) {
      note = `${baseNote}识别到 ${ingredients.length} 种食材（按文件名匹配，仅供参考），请确认用量。`
    } else {
      note = `${baseNote}没有从照片识别到食材，请手动添加。`
    }
  }

  return { ingredients, note, source }
}

function buildIngredient(
  name: string,
  amount: number,
  confidence: MealIngredient['estimateConfidence'],
  referenceKind: ReferenceKind,
  withoutScale: boolean,
): MealIngredient {
  return {
    id: createId('food'),
    name,
    source: 'current',
    estimatedAmount: withoutScale ? undefined : amount,
    confirmedAmount: withoutScale ? undefined : amount,
    unit: 'g',
    state: 'raw',
    used: true,
    referenceKind,
    estimateRange: estimateRange(amount, referenceKind),
    estimateConfidence: confidence,
    portion: withoutScale ? 1 : undefined,
  }
}

function buildVisionIngredient(
  vision: VisionIngredient,
  referenceKind: ReferenceKind,
  withoutScale: boolean,
): MealIngredient {
  const grams = Number.isFinite(vision.grams) && vision.grams > 0 ? Math.round(vision.grams) : 100
  const high = vision.confidence === 'high'
  return {
    id: createId('food'),
    name: vision.name,
    source: 'current',
    estimatedAmount: grams,
    confirmedAmount: high ? grams : undefined,
    unit: 'g',
    state: 'raw',
    used: true,
    referenceKind,
    estimateRange: estimateRange(grams, referenceKind),
    estimateConfidence: high ? 'high' : 'confirm',
    portion: withoutScale ? 1 : undefined,
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

export function createManualIngredient(
  name: string,
  amount: number,
  unit: 'g' | 'ml' = 'g',
  state: 'raw' | 'cooked' = 'raw',
  referenceKind: ReferenceKind = 'card',
): MealIngredient {
  return {
    id: createId('food'),
    name,
    source: 'current',
    estimatedAmount: amount,
    confirmedAmount: amount,
    unit,
    state,
    used: true,
    referenceKind,
    estimateRange: estimateRange(amount, referenceKind),
    // 用户亲手填的用量视为已确认
    estimateConfidence: 'high',
  }
}
