import type { Goal, MealIngredient, MealType, NutritionSummary, Profile } from '../types'
import { findFood } from './foodDatabase'

export function emptyNutrition(): NutritionSummary {
  return {
    calories: 0,
    carbs: 0,
    protein: 0,
    fat: 0,
    carbsRatio: 0,
    proteinRatio: 0,
    fatRatio: 0,
  }
}

export function ratioFromMacros(carbs: number, protein: number, fat: number) {
  const carbsEnergy = carbs * 4
  const proteinEnergy = protein * 4
  const fatEnergy = fat * 9
  const total = carbsEnergy + proteinEnergy + fatEnergy
  if (total === 0) return { carbsRatio: 0, proteinRatio: 0, fatRatio: 0 }
  return {
    carbsRatio: Math.round((carbsEnergy / total) * 100),
    proteinRatio: Math.round((proteinEnergy / total) * 100),
    fatRatio: Math.round((fatEnergy / total) * 100),
  }
}

export function calculateIngredientNutrition(
  ingredient: MealIngredient,
): NutritionSummary {
  if (ingredient.source !== 'current' || !ingredient.used) return emptyNutrition()
  const amount =
    ingredient.confirmedAmount ?? ingredient.estimatedAmount ?? 0
  if (amount <= 0) return emptyNutrition()
  const food = findFood(ingredient.name)
  if (!food) return emptyNutrition()
  const factor = amount / 100
  const carbs = +(food.carbs * factor).toFixed(1)
  const protein = +(food.protein * factor).toFixed(1)
  const fat = +(food.fat * factor).toFixed(1)
  const calories = +(food.calories * factor).toFixed(0)
  return {
    calories,
    carbs,
    protein,
    fat,
    ...ratioFromMacros(carbs, protein, fat),
  }
}

export function sumNutrition(items: NutritionSummary[]): NutritionSummary {
  const calories = +items.reduce((sum, item) => sum + item.calories, 0).toFixed(0)
  const carbs = +items.reduce((sum, item) => sum + item.carbs, 0).toFixed(1)
  const protein = +items.reduce((sum, item) => sum + item.protein, 0).toFixed(1)
  const fat = +items.reduce((sum, item) => sum + item.fat, 0).toFixed(1)
  return {
    calories,
    carbs,
    protein,
    fat,
    ...ratioFromMacros(carbs, protein, fat),
  }
}

export function nutritionFromIngredients(
  ingredients: MealIngredient[],
): NutritionSummary {
  return sumNutrition(ingredients.map(calculateIngredientNutrition))
}

const targetRanges: Record<Goal, Record<MealType, [number, number]>> = {
  gain_muscle: {
    breakfast: [450, 650],
    lunch: [650, 850],
    dinner: [600, 800],
    snack: [150, 300],
  },
  lose_fat: {
    breakfast: [300, 450],
    lunch: [450, 600],
    dinner: [400, 550],
    snack: [100, 200],
  },
  maintain_health: {
    breakfast: [350, 550],
    lunch: [550, 750],
    dinner: [500, 700],
    snack: [100, 250],
  },
}

export function targetCalories(goal: Goal, mealType: MealType): [number, number] {
  return targetRanges[goal][mealType]
}

export function evaluateMeal(
  nutrition: NutritionSummary,
  profile: Profile,
  mealType: MealType,
): { level: 'good' | 'acceptable' | 'needs_adjustment'; message: string } {
  const [min, max] = targetCalories(profile.goal, mealType)
  if (nutrition.calories < min * 0.8) {
    return {
      level: 'needs_adjustment',
      message: `这一餐能量偏低，约 ${nutrition.calories} kcal，建议下次补充一些主食或蛋白质。`,
    }
  }
  if (nutrition.calories > max * 1.2) {
    return {
      level: 'needs_adjustment',
      message: `这一餐能量偏高，约 ${nutrition.calories} kcal，建议下次适当减少高能量食材。`,
    }
  }
  if (nutrition.protein < 10) {
    return {
      level: 'acceptable',
      message: '整体能量合理，蛋白质还可以再补充一些。',
    }
  }
  return {
    level: 'good',
    message: '这一餐整体合理，可以按这个节奏继续。',
  }
}
