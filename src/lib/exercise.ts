import type { ExerciseLog, Goal, Profile } from '../types'

export function recommendExercise(profile: Profile): string {
  if (profile.goal === 'gain_muscle') {
    return '建议每周安排 2-3 次力量训练，配合适量有氧。'
  }
  if (profile.goal === 'lose_fat') {
    return '建议从快走或慢跑开始，每周累计 150 分钟左右。'
  }
  return '建议保持规律活动，例如每天散步 20 分钟或每周 3 次轻量训练。'
}

export function shouldIncreaseProtein(exercise: ExerciseLog): boolean {
  if (exercise.status !== 'completed') return false
  return exercise.durationMin >= 20 || exercise.intensity !== 'low'
}

export function suggestMealAdjustment(exercise: ExerciseLog): string {
  if (exercise.status === 'planned') {
    return '这是计划运动，先不调整饮食。完成后再根据实际情况微调。'
  }
  if (exercise.status === 'cancelled') {
    return '运动已取消，本餐可以按原计划正常吃。'
  }
  if (shouldIncreaseProtein(exercise)) {
    return '运动已完成，本餐可以适当补充蛋白质，例如鸡蛋、豆腐或鸡胸肉。'
  }
  return '运动量较轻，本餐正常吃饭即可，不必额外加餐。'
}

export function exerciseLabel(exercise: ExerciseLog): string {
  const status =
    exercise.status === 'completed'
      ? '已完成'
      : exercise.status === 'planned'
        ? '计划中'
        : exercise.status === 'cancelled'
          ? '已取消'
          : '部分完成'
  return `${exercise.type} · ${exercise.durationMin} 分钟 · ${status}`
}

export function goalLabel(goal: Goal): string {
  if (goal === 'gain_muscle') return '增肌'
  if (goal === 'lose_fat') return '减脂'
  return '维持健康'
}
