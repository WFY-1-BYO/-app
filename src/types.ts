export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type Goal = 'gain_muscle' | 'lose_fat' | 'maintain_health'

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active'

export type Sex = 'male' | 'female' | 'other'

export type Taste = 'spicy' | 'sweet' | 'sour' | 'mild' | 'light'

export type Disease = 'hypertension' | 'diabetes' | 'kidney_disease' | 'other'

export type IngredientSource = 'current' | 'recommended'

export type IngredientState = 'raw' | 'cooked'

/** 当次照片里的尺寸参照物 */
export type ReferenceKind = 'card' | 'checkerboard' | 'calibrated' | 'none'

/** 用量估算的可信标记：高可信 / 需确认 */
export type EstimateConfidence = 'high' | 'confirm'

/** 由参照物换算出的克重区间；C 级（无参照物）时 min/max 为 0，表示不给克重 */
export interface AmountEstimate {
  min: number
  max: number
}

export type MetricType =
  | 'systolic_pressure'
  | 'diastolic_pressure'
  | 'blood_glucose'
  | 'total_cholesterol'
  | 'triglyceride'
  | 'ldl'
  | 'hdl'
  | 'weight'

export type MedalGroup = 'persistence' | 'table' | 'knowledge' | 'composure'

export interface Profile {
  id: string
  nickname: string
  birthDate?: string
  sex?: Sex
  heightCm?: number
  weightKg?: number
  activityLevel?: ActivityLevel
  goal: Goal
  allergies: string[]
  avoid: string[]
  tastes: Taste[]
  diseases: Disease[]
  doctorRestrictions: string
  createdAt: string
  updatedAt: string
}

export interface NutritionSummary {
  calories: number
  carbs: number
  protein: number
  fat: number
  carbsRatio: number
  proteinRatio: number
  fatRatio: number
}

export interface MealIngredient {
  id: string
  name: string
  source: IngredientSource
  estimatedAmount?: number
  confirmedAmount?: number
  unit: 'g' | 'ml'
  state: IngredientState
  used: boolean
  photoPath?: string
  nutritionPer100g?: NutritionSummary
  /** 当次识别所用的参照物 */
  referenceKind?: ReferenceKind
  /** 由参照物换算出的克重区间；C 级不给克重 */
  estimateRange?: AmountEstimate
  estimateConfidence?: EstimateConfidence
  /** C 级降级时只记录的份数 */
  portion?: number
}

export interface Dish {
  id: string
  name: string
  servings: number
  steps: string[]
  ingredientIds: string[]
}

export interface MealSession {
  id: string
  date: string
  mealType: MealType
  goalSnapshot: Goal
  ingredients: MealIngredient[]
  dishes: Dish[]
  recommendations: MealIngredient[]
  nutrition: NutritionSummary
  reason: string
  createdAt: string
  updatedAt: string
  sourceDevice: string
}

export interface MealLogItem {
  dishId: string
  name: string
  amount: number
  unit: 'g' | 'ml'
}

export interface MealLog {
  id: string
  sessionId?: string
  date: string
  mealType: MealType
  items: MealLogItem[]
  nutrition: NutritionSummary
  isOffPlan: boolean
  note?: string
  createdAt: string
  updatedAt: string
  sourceDevice: string
}

export interface HealthMetric {
  id: string
  type: MetricType
  value: number
  unit: string
  measuredAt: string
  source: 'manual' | 'import' | 'vivo'
  referenceRange?: string
  note?: string
  createdAt: string
  updatedAt: string
  sourceDevice: string
}

export interface UtensilCalibration {
  id: string
  name: string
  kind: 'bowl' | 'spoon' | 'cup'
  volumeMl?: number
  method: string
  reference?: string
  calibratedAt: string
  note?: string
}

export interface KnowledgeItem {
  id: string
  title: string
  category: string
  summary: string
  why: string
  relatedFeature: string
  createdAt: string
  readAt?: string
  favorite: boolean
}

export interface MedalProgress {
  id: string
  name: string
  group: MedalGroup
  condition: string
  current: number
  target: number
  unlockedAt?: string
  achievedAt?: string
  relatedRecordIds: string[]
}

export interface Reward {
  id: string
  name: string
  description: string
  status: 'suggested' | 'accepted' | 'completed' | 'skipped'
  createdAt?: string
  completedAt?: string
}

export interface AppSettings {
  assistantEnabled: boolean
  assistantPosition: { x: number; y: number }
  aiProvider: 'local' | 'remote'
  vivoHealthAuthorized: boolean
  notificationsEnabled: boolean
}

export interface AppData {
  profile: Profile | null
  mealSessions: MealSession[]
  mealLogs: MealLog[]
  healthMetrics: HealthMetric[]
  utensilCalibrations: UtensilCalibration[]
  knowledge: KnowledgeItem[]
  medals: MedalProgress[]
  rewards: Reward[]
  restDays: string[]
  settings: AppSettings
}

export interface ImportSummary {
  added: number
  skipped: number
  conflicts: number
  errors: string[]
  missingAttachments: string[]
}
