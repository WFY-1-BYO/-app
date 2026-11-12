import type { AppData, MedalProgress } from '../types'
import { dateKey, nowIso } from './id'

interface MedalDefinition {
  id: string
  name: string
  group: MedalProgress['group']
  condition: string
  target: number
  current: (data: AppData) => number
}

const medalDefinitions: MedalDefinition[] = [
  {
    id: 'first_light',
    name: '第一束光',
    group: 'persistence',
    condition: '完成第一次真实用餐记录',
    target: 1,
    current: data => data.mealLogs.length,
  },
  {
    id: 'three_sprouts',
    name: '三日新芽',
    group: 'persistence',
    condition: '累计 3 个记录日',
    target: 3,
    current: data => new Set(data.mealLogs.map(log => dateKey(log.date))).size,
  },
  {
    id: 'seven_table',
    name: '七日同桌',
    group: 'persistence',
    condition: '累计 7 个记录日',
    target: 7,
    current: data => new Set(data.mealLogs.map(log => dateKey(log.date))).size,
  },
  {
    id: 'fourteen_warm',
    name: '十四日渐暖',
    group: 'persistence',
    condition: '累计 14 个记录日',
    target: 14,
    current: data => new Set(data.mealLogs.map(log => dateKey(log.date))).size,
  },
  {
    id: 'thirty_fireworks',
    name: '三十日烟火',
    group: 'persistence',
    condition: '累计 30 个记录日',
    target: 30,
    current: data => new Set(data.mealLogs.map(log => dateKey(log.date))).size,
  },
  {
    id: 'hundred_evergreen',
    name: '百日常青',
    group: 'persistence',
    condition: '累计 100 个记录日',
    target: 100,
    current: data => new Set(data.mealLogs.map(log => dateKey(log.date))).size,
  },
  {
    id: 'year_round',
    name: '四季如一',
    group: 'persistence',
    condition: '累计 365 个记录日',
    target: 365,
    current: data => new Set(data.mealLogs.map(log => dateKey(log.date))).size,
  },
  {
    id: 'honest_record',
    name: '诚实记录',
    group: 'composure',
    condition: '首次主动记录计划外饮食',
    target: 1,
    current: data => data.mealLogs.filter(log => log.isOffPlan).length,
  },
  {
    id: 'not_perfect',
    name: '不必完美',
    group: 'composure',
    condition: '计划外饮食后，下一餐正常回归并记录',
    target: 1,
    current: data => {
      const offPlanDates = data.mealLogs
        .filter(log => log.isOffPlan)
        .map(log => dateKey(log.date))
      return data.mealLogs.some(
        log =>
          !log.isOffPlan && offPlanDates.some(date => dateKey(log.date) > date),
      )
        ? 1
        : 0
    },
  },
  {
    id: 'restart',
    name: '重新出发',
    group: 'composure',
    condition: '中断 7 天后重新开始记录',
    target: 1,
    current: data => {
      const dates = Array.from(
        new Set(data.mealLogs.map(log => dateKey(log.date))),
      ).sort()
      for (let i = 1; i < dates.length; i += 1) {
        const gap =
          (new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()) /
          86400000
        if (gap >= 7) return 1
      }
      return 0
    },
  },
  {
    id: 'first_step',
    name: '第一步',
    group: 'exercise',
    condition: '完成第一次真实运动记录',
    target: 1,
    current: data => data.exerciseLogs.filter(log => log.status === 'completed').length,
  },
  {
    id: 'say_do',
    name: '说到做到',
    group: 'exercise',
    condition: '累计完成 3 次运动计划',
    target: 3,
    current: data => data.exerciseLogs.filter(log => log.status === 'completed').length,
  },
  {
    id: 'rainbow_table',
    name: '彩虹餐桌',
    group: 'table',
    condition: '累计记录 15 种不同当次食材',
    target: 15,
    current: data =>
      new Set(
        data.mealSessions.flatMap(session =>
          session.ingredients
            .filter(ingredient => ingredient.source === 'current')
            .map(ingredient => ingredient.name),
        ),
      ).size,
  },
  {
    id: 'ingredient_explorer',
    name: '食材探索家',
    group: 'table',
    condition: '累计记录 10 种不同当次食材',
    target: 10,
    current: data =>
      new Set(
        data.mealSessions.flatMap(session =>
          session.ingredients
            .filter(ingredient => ingredient.source === 'current')
            .map(ingredient => ingredient.name),
        ),
      ).size,
  },
  {
    id: 'three_meals_order',
    name: '三餐有序',
    group: 'table',
    condition: '累计 7 天每天至少记录两餐',
    target: 7,
    current: data => {
      const grouped = new Map<string, Set<string>>()
      data.mealLogs.forEach(log => {
        const key = dateKey(log.date)
        if (!grouped.has(key)) grouped.set(key, new Set())
        grouped.get(key)!.add(log.mealType)
      })
      return Array.from(grouped.values()).filter(meals => meals.size >= 2).length
    },
  },
  {
    id: 'pairing_master',
    name: '搭配小能手',
    group: 'table',
    condition: '累计完成 10 次当次食材配餐',
    target: 10,
    current: data => data.mealSessions.length,
  },
  {
    id: 'knowledge_intro',
    name: '知食入门',
    group: 'knowledge',
    condition: '读完 7 条营养知识',
    target: 7,
    current: data => data.knowledge.filter(item => item.readAt).length,
  },
  {
    id: 'understand_why',
    name: '懂一点为什么',
    group: 'knowledge',
    condition: '收藏并回看 5 条知识',
    target: 5,
    current: data => data.knowledge.filter(item => item.favorite).length,
  },
]

export function computeMedals(data: AppData): MedalProgress[] {
  const existing = new Map(data.medals.map(medal => [medal.id, medal]))
  return medalDefinitions.map(definition => {
    const current = definition.current(data)
    const previous = existing.get(definition.id)
    const unlocked = current >= definition.target
    return {
      id: definition.id,
      name: definition.name,
      group: definition.group,
      condition: definition.condition,
      current,
      target: definition.target,
      unlockedAt:
        unlocked ? previous?.unlockedAt ?? nowIso() : previous?.unlockedAt,
      achievedAt:
        unlocked ? previous?.achievedAt ?? nowIso() : previous?.achievedAt,
      relatedRecordIds: [],
    }
  })
}

export function getUnlockedMedals(data: AppData): MedalProgress[] {
  return computeMedals(data).filter(medal => medal.unlockedAt)
}

export function getNextMedal(data: AppData): MedalProgress | null {
  const medals = computeMedals(data).filter(medal => !medal.unlockedAt)
  if (medals.length === 0) return null
  return medals.sort((a, b) => b.current / b.target - a.current / a.target)[0]
}
