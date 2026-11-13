import { create } from 'zustand'
import type {
  AppData,
  AppSettings,
  HealthMetric,
  KnowledgeItem,
  MealLog,
  MealSession,
  Profile,
  Reward,
  UtensilCalibration,
} from '../types'
import { loadAppData, saveAppData } from '../lib/storage'
import { createId, nowIso } from '../lib/id'
import { computeMedals } from '../lib/medals'
import { initialKnowledge } from '../lib/knowledge'

const defaultSettings: AppSettings = {
  assistantEnabled: true,
  assistantPosition: { x: 24, y: 24 },
  aiProvider: 'local',
  vivoHealthAuthorized: false,
  notificationsEnabled: true,
}

export const emptyAppData: AppData = {
  profile: null,
  mealSessions: [],
  mealLogs: [],
  healthMetrics: [],
  utensilCalibrations: [],
  knowledge: [],
  medals: [],
  rewards: [],
  restDays: [],
  settings: defaultSettings,
}

interface AppStore {
  data: AppData
  initialized: boolean
  initialize: () => Promise<void>
  setProfile: (profile: Profile) => Promise<void>
  addMealSession: (session: MealSession) => Promise<void>
  updateMealSession: (session: MealSession) => Promise<void>
  addMealLog: (log: MealLog) => Promise<void>
  updateMealLog: (log: MealLog) => Promise<void>
  addHealthMetric: (metric: HealthMetric) => Promise<void>
  addUtensilCalibration: (calibration: UtensilCalibration) => Promise<void>
  addKnowledge: (item: KnowledgeItem) => Promise<void>
  markKnowledgeRead: (id: string) => Promise<void>
  toggleKnowledgeFavorite: (id: string) => Promise<void>
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>
  toggleRestDay: (date: string) => Promise<void>
  addReward: (reward: Reward) => Promise<void>
  replaceData: (data: AppData) => Promise<void>
  reset: () => Promise<void>
}

async function persist(data: AppData) {
  try {
    await saveAppData(data)
  } catch (error) {
    console.warn('数据保存失败', error)
  }
}

export const useAppStore = create<AppStore>((set, get) => ({
  data: emptyAppData,
  initialized: false,

  initialize: async () => {
    let loaded: AppData | null = null
    try {
      loaded = await loadAppData()
    } catch (error) {
      console.warn('初始化读取失败，以空白档案启动', error)
    }
    const seededKnowledge =
      loaded && loaded.knowledge.length > 0 ? loaded.knowledge : initialKnowledge()
    set({
      data: loaded
        ? {
            ...emptyAppData,
            ...loaded,
            knowledge: seededKnowledge,
            settings: { ...defaultSettings, ...loaded.settings },
          }
        : { ...emptyAppData, knowledge: initialKnowledge() },
      initialized: true,
    })
    if (!loaded || loaded.knowledge.length === 0) {
      await persist(useAppStore.getState().data)
    }
  },

  setProfile: async profile => {
    const data = { ...get().data, profile }
    set({ data })
    await persist(data)
  },

  addMealSession: async session => {
    const data = {
      ...get().data,
      mealSessions: [...get().data.mealSessions, session],
    }
    set({ data })
    await persist(data)
  },

  updateMealSession: async session => {
    const data = {
      ...get().data,
      mealSessions: get().data.mealSessions.map(item =>
        item.id === session.id ? session : item,
      ),
    }
    set({ data })
    await persist(data)
  },

  addMealLog: async log => {
    const withLog = {
      ...get().data,
      mealLogs: [...get().data.mealLogs, log],
    }
    const data = { ...withLog, medals: computeMedals(withLog) }
    set({ data })
    await persist(data)
  },

  updateMealLog: async log => {
    const withLog = {
      ...get().data,
      mealLogs: get().data.mealLogs.map(item => (item.id === log.id ? log : item)),
    }
    const data = { ...withLog, medals: computeMedals(withLog) }
    set({ data })
    await persist(data)
  },

  addHealthMetric: async metric => {
    const data = {
      ...get().data,
      healthMetrics: [...get().data.healthMetrics, metric],
    }
    set({ data })
    await persist(data)
  },

  addUtensilCalibration: async calibration => {
    const data = {
      ...get().data,
      utensilCalibrations: [...get().data.utensilCalibrations, calibration],
    }
    set({ data })
    await persist(data)
  },

  addKnowledge: async item => {
    const data = {
      ...get().data,
      knowledge: [...get().data.knowledge, item],
    }
    set({ data })
    await persist(data)
  },

  markKnowledgeRead: async id => {
    const data = {
      ...get().data,
      knowledge: get().data.knowledge.map(item =>
        item.id === id ? { ...item, readAt: nowIso() } : item,
      ),
    }
    set({ data })
    await persist(data)
  },

  toggleKnowledgeFavorite: async id => {
    const data = {
      ...get().data,
      knowledge: get().data.knowledge.map(item =>
        item.id === id ? { ...item, favorite: !item.favorite } : item,
      ),
    }
    set({ data })
    await persist(data)
  },

  updateSettings: async settings => {
    const data = {
      ...get().data,
      settings: { ...get().data.settings, ...settings },
    }
    set({ data })
    await persist(data)
  },

  toggleRestDay: async date => {
    const restDays = get().data.restDays.includes(date)
      ? get().data.restDays.filter(item => item !== date)
      : [...get().data.restDays, date]
    const data = { ...get().data, restDays }
    set({ data })
    await persist(data)
  },

  addReward: async reward => {
    const data = {
      ...get().data,
      rewards: [...get().data.rewards, reward],
    }
    set({ data })
    await persist(data)
  },

  replaceData: async data => {
    set({ data })
    await persist(data)
  },

  reset: async () => {
    set({ data: emptyAppData })
    await persist(emptyAppData)
  },
}))

/** 编辑已有档案时沿用 id 与 createdAt，仅更新 updatedAt；新建时生成全新标识。 */
export function createDefaultProfile(
  input: Partial<Profile> & { id?: string; createdAt?: string },
): Profile {
  return {
    id: input.id ?? createId('profile'),
    nickname: input.nickname ?? '我',
    birthDate: input.birthDate,
    sex: input.sex,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    activityLevel: input.activityLevel,
    goal: input.goal ?? 'maintain_health',
    allergies: input.allergies ?? [],
    avoid: input.avoid ?? [],
    tastes: input.tastes ?? [],
    diseases: input.diseases ?? [],
    doctorRestrictions: input.doctorRestrictions ?? '',
    createdAt: input.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  }
}
