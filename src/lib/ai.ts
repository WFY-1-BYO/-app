import type { MealIngredient, ReferenceKind } from '../types'
import { createId } from './id'
import { estimateRange, getReferenceOption } from './reference'

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
}

/**
 * 本地识别提供器。
 *
 * 参照物 → 克重的换算走 lib/reference.ts 的纯本地几何估算，不依赖在线密钥；
 * 密钥（改动 9）只影响「能否识别到更多品类」，不影响参照物是否生效。
 * 远程 AI 接入后可以替换为同一接口的远程实现，参照物字段保持不变。
 */
export async function recognizeIngredientsFromFile(
  file: File,
  referenceKind: ReferenceKind = 'card',
): Promise<RecognizeResult> {
  const fileName = decodeURIComponent(file.name)
  const matched = knownIngredients.filter(name => fileName.includes(name))
  const option = getReferenceOption(referenceKind)
  const withoutScale = option.level === 'C'
  const ingredients: MealIngredient[] = matched.map(name => {
    const base = 100
    return {
      id: createId('food'),
      name,
      source: 'current',
      estimatedAmount: withoutScale ? undefined : base,
      confirmedAmount: withoutScale ? undefined : base,
      unit: 'g',
      state: 'raw',
      used: true,
      referenceKind,
      estimateRange: estimateRange(base, referenceKind),
      estimateConfidence: option.confidence,
      portion: withoutScale ? 1 : undefined,
    }
  })

  if (ingredients.length === 0) {
    return {
      ingredients,
      note: `本地校准估算：${option.label}（${option.size}）。没有从照片识别到食材，请手动添加。`,
    }
  }
  return {
    ingredients,
    note: `本地校准估算：${option.label}（${option.size}）。识别到 ${ingredients.length} 种食材，${
      withoutScale ? '仅品类与份数，请填写克重' : '请确认用量'
    }；参照物换算不依赖在线密钥。`,
  }
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
