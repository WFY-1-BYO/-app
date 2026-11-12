import type {
  Dish,
  Goal,
  MealIngredient,
  MealSession,
  MealType,
  Profile,
  Taste,
} from '../types'
import { createId, nowIso } from './id'
import { foodCategory } from './foodDatabase'
import { nutritionFromIngredients } from './nutrition'

function normalizeName(name: string) {
  return name.trim().toLowerCase()
}

function filterAvailableIngredients(
  ingredients: MealIngredient[],
  profile: Profile,
): MealIngredient[] {
  const blocked = [...profile.allergies, ...profile.avoid].map(normalizeName)
  return ingredients.filter(ingredient => {
    if (ingredient.source !== 'current') return false
    if (!ingredient.used) return false
    if (blocked.includes(normalizeName(ingredient.name))) return false
    return true
  })
}

function tasteLabel(tastes: Taste[]): string {
  if (tastes.includes('spicy')) return '香辣'
  if (tastes.includes('sweet')) return '清甜'
  if (tastes.includes('sour')) return '酸爽'
  if (tastes.includes('mild')) return '家常'
  return '清淡'
}

function dishName(
  categories: Set<string>,
  taste: string,
  mealType: MealType,
): string {
  const hasGrain = categories.has('grain')
  const hasProtein = categories.has('protein')
  const hasVegetable = categories.has('vegetable')
  const hasFruit = categories.has('fruit')
  const hasDairy = categories.has('dairy')
  if (hasGrain && hasProtein && hasVegetable) {
    return `${taste}主食配菜套餐`
  }
  if (hasGrain && hasProtein) return `${taste}主食蛋白碗`
  if (hasGrain && hasVegetable) return `${taste}蔬菜炒饭`
  if (hasProtein && hasVegetable) return `${taste}小炒`
  if (hasGrain) return mealType === 'breakfast' ? '简单主食早餐' : '基础主食'
  if (hasProtein) return `${taste}蛋白质主菜`
  if (hasVegetable) return '清爽蔬菜拼盘'
  if (hasFruit || hasDairy) return '轻食水果奶碗'
  return '简单家常菜'
}

function buildSteps(
  categories: Set<string>,
  ingredients: MealIngredient[],
): string[] {
  const steps: string[] = []
  const names = ingredients.map(ingredient => ingredient.name).join('、')
  steps.push(`准备食材：${names}。`)
  if (categories.has('grain')) steps.push('将主食煮熟或蒸熟，保持原味，少油少盐。')
  if (categories.has('protein')) steps.push('蛋白质食材用蒸、煮或快炒的方式处理，避免油炸。')
  if (categories.has('vegetable')) steps.push('蔬菜洗净后快炒或焯水，保留口感和营养。')
  if (categories.has('fruit') || categories.has('dairy'))
    steps.push('水果和奶制品直接搭配，可作为清爽收尾。')
  steps.push('组合装盘，按个人口味少量调味。')
  return steps
}

function recommendationFor(
  missingCategories: string[],
  profile: Profile,
): MealIngredient[] {
  const recommendations: MealIngredient[] = []
  const add = (name: string, reason: string) => {
    recommendations.push({
      id: createId('food'),
      name,
      source: 'recommended',
      unit: 'g',
      state: 'raw',
      used: false,
      nutritionPer100g: undefined,
      estimatedAmount: undefined,
      confirmedAmount: undefined,
      photoPath: undefined,
    })
    void reason
  }
  if (missingCategories.includes('vegetable')) {
    if (profile.diseases.includes('kidney_disease')) add('白菜', '低钾蔬菜')
    else add('西兰花', '补充蔬菜')
  }
  if (missingCategories.includes('protein')) {
    if (profile.diseases.includes('kidney_disease')) add('鸡蛋', '优质蛋白')
    else if (profile.goal === 'gain_muscle') add('鸡胸肉', '补充蛋白质')
    else add('豆腐', '植物蛋白')
  }
  if (missingCategories.includes('grain')) {
    if (profile.diseases.includes('diabetes')) add('糙米', '全谷主食')
    else add('米饭', '补充主食')
  }
  if (profile.diseases.includes('hypertension')) {
    add('醋', '替代部分盐，减少钠摄入')
  }
  return recommendations
}

export function createMealSession(input: {
  profile: Profile
  mealType: MealType
  ingredients: MealIngredient[]
  exerciseContext?: string
  sourceDevice: string
}): MealSession {
  const { profile, mealType, ingredients, exerciseContext, sourceDevice } = input
  const available = filterAvailableIngredients(ingredients, profile)
  const categories = new Set(
    available.map(ingredient => foodCategory(ingredient.name)).filter(Boolean) as string[],
  )
  const taste = tasteLabel(profile.tastes)
  const name = dishName(categories, taste, mealType)
  const steps = buildSteps(categories, available)
  const dish: Dish = {
    id: createId('dish'),
    name,
    servings: 1,
    steps,
    ingredientIds: available.map(ingredient => ingredient.id),
  }
  const missing = ['grain', 'protein', 'vegetable'].filter(
    category => !categories.has(category),
  )
  const recommendations = recommendationFor(missing, profile)
  const nutrition = nutritionFromIngredients(available)
  const reasonParts: string[] = []
  reasonParts.push(`依据当次已有食材和${goalLabel(profile.goal)}目标搭配。`)
  if (missing.length > 0) reasonParts.push(`当前缺少${missing.join('、')}，已单独给出补充建议。`)
  if (exerciseContext) reasonParts.push(`结合${exerciseContext}调整了本餐建议。`)
  if (profile.diseases.length > 0)
    reasonParts.push('已按已填写疾病情况优先考虑更稳妥的搭配。')
  return {
    id: createId('meal'),
    date: nowIso(),
    mealType,
    goalSnapshot: profile.goal,
    exerciseContext,
    ingredients: available,
    dishes: [dish],
    recommendations,
    nutrition,
    reason: reasonParts.join(''),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    sourceDevice,
  }
}

function goalLabel(goal: Goal): string {
  if (goal === 'gain_muscle') return '增肌'
  if (goal === 'lose_fat') return '减脂'
  return '维持健康'
}

export function adjustMealForExercise(
  session: MealSession,
  exerciseCompleted: boolean,
): MealSession {
  if (!exerciseCompleted) return session
  const hasProtein = session.ingredients.some(
    ingredient => foodCategory(ingredient.name) === 'protein',
  )
  const reason = hasProtein
    ? '已完成运动，本餐保留蛋白质，帮助恢复。'
    : '已完成运动，但当次食材缺少蛋白质，建议下次补充。'
  return {
    ...session,
    reason: `${session.reason}${reason}`,
    updatedAt: nowIso(),
  }
}
