import type { MealLog, NutritionSummary } from '../types'
import { dateKey } from './id'
import { ratioFromMacros } from './nutrition'

export function summarizeNutrition(logs: MealLog[]): NutritionSummary {
  const calories = logs.reduce((sum, log) => sum + log.nutrition.calories, 0)
  const carbs = logs.reduce((sum, log) => sum + log.nutrition.carbs, 0)
  const protein = logs.reduce((sum, log) => sum + log.nutrition.protein, 0)
  const fat = logs.reduce((sum, log) => sum + log.nutrition.fat, 0)
  return {
    calories,
    carbs,
    protein,
    fat,
    ...ratioFromMacros(carbs, protein, fat),
  }
}

export function logsByDate(logs: MealLog[], date: string): MealLog[] {
  return logs.filter(log => dateKey(log.date) === date)
}

export function computeStreak(logs: MealLog[], restDays: string[] = []) {
  const dates = new Set(logs.map(log => dateKey(log.date)))
  const rest = new Set(restDays)
  const sorted = Array.from(dates).sort()

  if (sorted.length === 0) {
    return { current: 0, longest: 0, totalDays: 0 }
  }

  let longest = 1
  let currentRun = 1
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = new Date(sorted[i - 1])
    const current = new Date(sorted[i])
    const diffDays = Math.round(
      (current.getTime() - previous.getTime()) / 86400000,
    )

    let continuous = false
    if (diffDays === 1) {
      continuous = true
    } else if (diffDays > 1) {
      // Intervening rest days do not break the streak.
      let cursor = new Date(previous)
      cursor.setDate(cursor.getDate() + 1)
      continuous = true
      while (cursor < current) {
        if (!rest.has(dateKey(cursor))) {
          continuous = false
          break
        }
        cursor.setDate(cursor.getDate() + 1)
      }
    }

    if (continuous) {
      currentRun += 1
      longest = Math.max(longest, currentRun)
    } else {
      currentRun = 1
    }
  }

  // Determine whether the streak extends to today or yesterday.
  const today = dateKey(new Date())
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = dateKey(yesterday)
  const latest = sorted[sorted.length - 1]
  let current = 0
  if (latest === today || latest === yesterdayKey) {
    current = currentRun
    // If today is a rest day, the streak is still considered active.
    if (latest === yesterdayKey && rest.has(today)) {
      current = currentRun
    }
  }

  return { current, longest, totalDays: sorted.length }
}

export function recentDates(logs: MealLog[], limit = 7): string[] {
  const dates = Array.from(new Set(logs.map(log => dateKey(log.date))))
  return dates.sort((a, b) => b.localeCompare(a)).slice(0, limit)
}
