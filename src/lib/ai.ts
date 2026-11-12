import type { MealIngredient } from '../types'
import { createId } from './id'

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
 * 第一版先以文件名和常见食材库做离线识别，避免没有外网 API 密钥时功能不可用。
 * 远程 AI 接入后，可以替换为同一接口的远程实现。
 */
export async function recognizeIngredientsFromFile(file: File): Promise<RecognizeResult> {
  const fileName = decodeURIComponent(file.name)
  const matched = knownIngredients.filter(name => fileName.includes(name))
  const ingredients: MealIngredient[] = matched.map(name => ({
    id: createId('food'),
    name,
    source: 'current',
    estimatedAmount: 100,
    confirmedAmount: 100,
    unit: 'g',
    state: 'raw',
    used: true,
  }))

  if (ingredients.length === 0) {
    return {
      ingredients,
      note: '没有从照片文件名中识别到食材，请手动添加或修改。',
    }
  }
  return {
    ingredients,
    note: `识别到 ${ingredients.length} 种当次食材，请确认用量。`,
  }
}

export function createManualIngredient(
  name: string,
  amount: number,
  unit: 'g' | 'ml' = 'g',
  state: 'raw' | 'cooked' = 'raw',
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
  }
}
