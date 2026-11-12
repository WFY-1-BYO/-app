export interface FoodNutrition {
  name: string
  aliases?: string[]
  category:
    | 'grain'
    | 'protein'
    | 'vegetable'
    | 'fruit'
    | 'dairy'
    | 'fat'
    | 'seasoning'
    | 'mixed'
  calories: number
  carbs: number
  protein: number
  fat: number
  suitableFor?: {
    hypertension?: boolean
    diabetes?: boolean
    kidneyDisease?: boolean
  }
}

export const foodDatabase: FoodNutrition[] = [
  { name: '米饭', aliases: ['白米饭', '大米'], category: 'grain', calories: 116, carbs: 25.9, protein: 2.6, fat: 0.3, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '糙米', category: 'grain', calories: 112, carbs: 23.5, protein: 2.8, fat: 0.8, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '面条', aliases: ['挂面', '手工面'], category: 'grain', calories: 110, carbs: 24.3, protein: 3.9, fat: 0.4, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '馒头', category: 'grain', calories: 223, carbs: 47.0, protein: 7.0, fat: 1.1, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '燕麦', aliases: ['燕麦片'], category: 'grain', calories: 377, carbs: 66.9, protein: 15.0, fat: 6.7, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '红薯', aliases: ['地瓜'], category: 'grain', calories: 90, carbs: 20.7, protein: 1.6, fat: 0.2, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '土豆', aliases: ['马铃薯'], category: 'grain', calories: 77, carbs: 17.2, protein: 2.0, fat: 0.2, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '玉米', category: 'grain', calories: 112, carbs: 22.8, protein: 4.0, fat: 1.2, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },

  { name: '鸡蛋', aliases: ['鸡蛋白', '土鸡蛋'], category: 'protein', calories: 144, carbs: 2.8, protein: 13.3, fat: 8.8, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '鸡胸肉', aliases: ['鸡肉', '鸡胸'], category: 'protein', calories: 133, carbs: 2.5, protein: 19.4, fat: 5.0, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '牛里脊', aliases: ['牛肉', '里脊'], category: 'protein', calories: 107, carbs: 0.9, protein: 22.2, fat: 0.9, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '猪里脊', aliases: ['猪肉', '里脊肉'], category: 'protein', calories: 155, carbs: 2.2, protein: 20.2, fat: 7.9, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '三文鱼', aliases: ['鲑鱼'], category: 'protein', calories: 139, carbs: 0.7, protein: 17.2, fat: 7.8, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '虾仁', aliases: ['虾'], category: 'protein', calories: 48, carbs: 1.1, protein: 10.4, fat: 0.7, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '豆腐', aliases: ['北豆腐', '南豆腐'], category: 'protein', calories: 81, carbs: 4.2, protein: 8.1, fat: 3.7, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '豆浆', category: 'protein', calories: 31, carbs: 1.2, protein: 3.0, fat: 1.6, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '黄豆', category: 'protein', calories: 390, carbs: 34.2, protein: 35.0, fat: 16.0, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: false } },
  { name: '鹰嘴豆', category: 'protein', calories: 364, carbs: 60.7, protein: 19.0, fat: 6.0, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },

  { name: '西兰花', aliases: ['绿花菜'], category: 'vegetable', calories: 36, carbs: 4.3, protein: 4.1, fat: 0.6, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '菠菜', category: 'vegetable', calories: 28, carbs: 4.5, protein: 2.6, fat: 0.3, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: false } },
  { name: '番茄', aliases: ['西红柿'], category: 'vegetable', calories: 20, carbs: 4.0, protein: 0.9, fat: 0.2, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '黄瓜', category: 'vegetable', calories: 16, carbs: 2.9, protein: 0.8, fat: 0.2, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '胡萝卜', category: 'vegetable', calories: 39, carbs: 8.8, protein: 1.0, fat: 0.2, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '白菜', aliases: ['大白菜', '小白菜'], category: 'vegetable', calories: 20, carbs: 3.4, protein: 1.5, fat: 0.1, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '生菜', category: 'vegetable', calories: 15, carbs: 2.0, protein: 1.4, fat: 0.1, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '蘑菇', aliases: ['香菇', '平菇'], category: 'vegetable', calories: 24, carbs: 4.1, protein: 2.7, fat: 0.1, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '茄子', category: 'vegetable', calories: 23, carbs: 4.9, protein: 1.1, fat: 0.2, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '青椒', aliases: ['甜椒'], category: 'vegetable', calories: 22, carbs: 5.4, protein: 1.0, fat: 0.2, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },

  { name: '苹果', category: 'fruit', calories: 53, carbs: 13.7, protein: 0.4, fat: 0.2, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '香蕉', category: 'fruit', calories: 93, carbs: 22.0, protein: 1.4, fat: 0.2, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '橙子', category: 'fruit', calories: 48, carbs: 11.1, protein: 0.8, fat: 0.2, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '蓝莓', category: 'fruit', calories: 57, carbs: 14.5, protein: 0.7, fat: 0.3, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },

  { name: '牛奶', category: 'dairy', calories: 65, carbs: 3.4, protein: 3.6, fat: 3.8, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '酸奶', category: 'dairy', calories: 72, carbs: 9.3, protein: 2.8, fat: 2.6, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '奶酪', category: 'dairy', calories: 328, carbs: 3.5, protein: 25.7, fat: 23.5, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: false } },

  { name: '橄榄油', aliases: ['油'], category: 'fat', calories: 899, carbs: 0, protein: 0, fat: 99.9, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '坚果', aliases: ['核桃', '杏仁'], category: 'fat', calories: 600, carbs: 20.0, protein: 20.0, fat: 50.0, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },

  { name: '盐', category: 'seasoning', calories: 0, carbs: 0, protein: 0, fat: 0, suitableFor: { hypertension: false, diabetes: true, kidneyDisease: false } },
  { name: '酱油', category: 'seasoning', calories: 63, carbs: 10.1, protein: 5.6, fat: 0.1, suitableFor: { hypertension: false, diabetes: true, kidneyDisease: false } },
  { name: '醋', category: 'seasoning', calories: 31, carbs: 4.9, protein: 0.5, fat: 0.1, suitableFor: { hypertension: true, diabetes: true, kidneyDisease: true } },
  { name: '蜂蜜', category: 'seasoning', calories: 321, carbs: 75.6, protein: 0.4, fat: 1.9, suitableFor: { hypertension: true, diabetes: false, kidneyDisease: true } },
]

export function findFood(name: string): FoodNutrition | undefined {
  const normalized = name.trim().toLowerCase()
  return foodDatabase.find(
    food =>
      food.name.toLowerCase() === normalized ||
      food.aliases?.some(alias => alias.toLowerCase() === normalized),
  )
}

export function foodCategory(name: string): FoodNutrition['category'] | undefined {
  return findFood(name)?.category
}
