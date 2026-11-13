import type {
  AppData,
  Dish,
  HealthMetric,
  KnowledgeItem,
  MealIngredient,
  MealLog,
  MealSession,
  MedalProgress,
  Profile,
  Reward,
  UtensilCalibration,
} from '../types'
import { emptyAppData } from '../store/appStore'
import { createId, nowIso } from './id'

const NDM_FORMAT = 'nutritionist-data-markdown'
const NDM_VERSION = '1.0'

function escapeValue(value: unknown): string {
  if (value === undefined || value === null) return '-'
  if (Array.isArray(value)) return value.length === 0 ? '-' : value.join('、')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function frontMatter(data: AppData, sourceDevice: string): string {
  return [
    '---',
    `format: "${NDM_FORMAT}"`,
    `format_version: "${NDM_VERSION}"`,
    `document_id: "export_${Date.now()}_${sourceDevice}"`,
    'app_version: "1.0.0"',
    `created_at: "${nowIso()}"`,
    'timezone: "Asia/Shanghai"',
    `source_device: "${sourceDevice}"`,
    `profile_id: "${data.profile?.id ?? '-'}"`,
    '---',
    '',
  ].join('\n')
}

function recordBlock(
  type: string,
  id: string,
  fields: Array<[string, unknown]>,
): string {
  const lines = [`<!-- @record type=${type} id=${id} -->`]
  fields.forEach(([key, value]) => {
    lines.push(`- ${key}：${escapeValue(value)}`)
  })
  lines.push('<!-- @endrecord -->', '')
  return lines.join('\n')
}

function section(title: string, blocks: string[]): string {
  if (blocks.length === 0) return `## ${title}\n\n暂无记录。\n\n`
  return `## ${title}\n\n${blocks.join('')}`
}

export function exportNdm(data: AppData, sourceDevice: string): string {
  const parts: string[] = []
  parts.push(frontMatter(data, sourceDevice))
  parts.push('# 营养师数据文档\n\n')

  if (data.profile) {
    const profile = data.profile
    parts.push(
      section('个人档案', [
        recordBlock('profile', profile.id, [
          ['昵称', profile.nickname],
          ['出生日期', profile.birthDate],
          ['生理性别', profile.sex],
          ['身高(cm)', profile.heightCm],
          ['体重(kg)', profile.weightKg],
          ['活动水平', profile.activityLevel],
          ['饮食目标', profile.goal],
          ['食物过敏', profile.allergies],
          ['忌口', profile.avoid],
          ['口味偏好', profile.tastes],
          ['疾病情况', profile.diseases],
          ['医生限制', profile.doctorRestrictions],
          ['创建时间', profile.createdAt],
          ['修改时间', profile.updatedAt],
          ['来源设备', sourceDevice],
        ]),
      ]),
    )
  } else {
    parts.push(section('个人档案', []))
  }

  const mealBlocks = data.mealSessions.flatMap(session => {
    const dishBlocks = session.dishes.map(dish =>
      recordBlock('dish', dish.id, [
        ['所属配餐', session.id],
        ['菜名', dish.name],
        ['份数', dish.servings],
        ['制作步骤', dish.steps],
        ['食材编号', dish.ingredientIds],
      ]),
    )
    const ingredientBlocks = session.ingredients.map(ingredient =>
      recordBlock('meal_ingredient', ingredient.id, [
        ['所属配餐', session.id],
        ['名称', ingredient.name],
        ['来源', ingredient.source],
        ['估算量', ingredient.estimatedAmount],
        ['确认量', ingredient.confirmedAmount],
        ['单位', ingredient.unit],
        ['生熟', ingredient.state],
        ['用于配菜', ingredient.used],
        ['照片', ingredient.photoPath],
      ]),
    )
    const recommendationBlocks = session.recommendations.map(ingredient =>
      recordBlock('meal_ingredient', ingredient.id, [
        ['所属配餐', session.id],
        ['名称', ingredient.name],
        ['来源', ingredient.source],
        ['估算量', ingredient.estimatedAmount],
        ['确认量', ingredient.confirmedAmount],
        ['单位', ingredient.unit],
        ['生熟', ingredient.state],
        ['用于配菜', ingredient.used],
        ['照片', ingredient.photoPath],
      ]),
    )
    const sessionBlock = recordBlock('meal_plan', session.id, [
      ['日期', session.date],
      ['餐次', session.mealType],
      ['目标', session.goalSnapshot],
      ['配餐理由', session.reason],
      ['能量(kcal)', session.nutrition.calories],
      ['碳水(g)', session.nutrition.carbs],
      ['蛋白质(g)', session.nutrition.protein],
      ['脂肪(g)', session.nutrition.fat],
      ['碳水供能比', session.nutrition.carbsRatio],
      ['蛋白质供能比', session.nutrition.proteinRatio],
      ['脂肪供能比', session.nutrition.fatRatio],
      ['创建时间', session.createdAt],
      ['修改时间', session.updatedAt],
      ['来源设备', session.sourceDevice],
    ])
    return [sessionBlock, ...dishBlocks, ...ingredientBlocks, ...recommendationBlocks]
  })
  parts.push(section('配餐记录', mealBlocks))

  const mealLogBlocks = data.mealLogs.map(log =>
    recordBlock('meal_log', log.id, [
      ['关联配餐', log.sessionId],
      ['日期', log.date],
      ['餐次', log.mealType],
      ['菜品', log.items.map(item => `${item.name}:${item.amount}${item.unit}`)],
      ['能量(kcal)', log.nutrition.calories],
      ['碳水(g)', log.nutrition.carbs],
      ['蛋白质(g)', log.nutrition.protein],
      ['脂肪(g)', log.nutrition.fat],
      ['是否计划外', log.isOffPlan],
      ['备注', log.note],
      ['创建时间', log.createdAt],
      ['修改时间', log.updatedAt],
      ['来源设备', log.sourceDevice],
    ]),
  )
  parts.push(section('用餐记录', mealLogBlocks))

  const healthBlocks = data.healthMetrics.map(metric =>
    recordBlock('health_metric', metric.id, [
      ['类型', metric.type],
      ['数值', metric.value],
      ['单位', metric.unit],
      ['测量时间', metric.measuredAt],
      ['来源', metric.source],
      ['参考范围', metric.referenceRange],
      ['备注', metric.note],
      ['创建时间', metric.createdAt],
      ['修改时间', metric.updatedAt],
      ['来源设备', metric.sourceDevice],
    ]),
  )
  parts.push(section('健康指标', healthBlocks))

  const utensilBlocks = data.utensilCalibrations.map(calibration =>
    recordBlock('utensil', calibration.id, [
      ['名称', calibration.name],
      ['类型', calibration.kind],
      ['容量(ml)', calibration.volumeMl],
      ['校准方法', calibration.method],
      ['参照物', calibration.reference],
      ['校准日期', calibration.calibratedAt],
      ['备注', calibration.note],
    ]),
  )
  parts.push(section('餐具校准', utensilBlocks))

  const knowledgeBlocks = data.knowledge.map(item =>
    recordBlock('knowledge', item.id, [
      ['标题', item.title],
      ['分类', item.category],
      ['摘要', item.summary],
      ['解释', item.why],
      ['关联功能', item.relatedFeature],
      ['创建时间', item.createdAt],
      ['阅读时间', item.readAt],
      ['收藏', item.favorite],
    ]),
  )
  parts.push(section('知识与成就', knowledgeBlocks))

  const medalBlocks = data.medals.map(medal =>
    recordBlock('medal', medal.id, [
      ['名称', medal.name],
      ['分组', medal.group],
      ['条件', medal.condition],
      ['当前进度', medal.current],
      ['目标', medal.target],
      ['点亮时间', medal.unlockedAt],
      ['达成时间', medal.achievedAt],
      ['关联记录', medal.relatedRecordIds],
    ]),
  )
  const rewardBlocks = data.rewards.map(reward =>
    recordBlock('reward', reward.id, [
      ['名称', reward.name],
      ['描述', reward.description],
      ['状态', reward.status],
      ['创建时间', reward.createdAt],
      ['完成时间', reward.completedAt],
    ]),
  )
  parts.push(section('知识与成就', [...medalBlocks, ...rewardBlocks]))

  const attachmentBlocks: string[] = []
  data.mealSessions.forEach(session => {
    session.ingredients.forEach(ingredient => {
      if (ingredient.photoPath) {
        attachmentBlocks.push(
          recordBlock('attachment', createId('attachment'), [
            ['相对路径', ingredient.photoPath],
            ['类型', 'image'],
            ['关联记录', ingredient.id],
          ]),
        )
      }
    })
  })
  parts.push(section('附件清单', attachmentBlocks))
  parts.push(
    section('导入导出说明', [
      '本文件由家庭自用营养师 App 导出，符合 NDM 1.0 格式。\n\n',
    ]),
  )
  return parts.join('')
}

export interface ParsedNdm {
  data: AppData
  warnings: string[]
}

interface RawRecord {
  type: string
  id: string
  fields: Record<string, string>
}

function parseRecords(text: string): RawRecord[] {
  const records: RawRecord[] = []
  const lines = text.split(/\r?\n/)
  let current: RawRecord | null = null
  const recordRegex = /<!--\s*@record\s+type=([^\s]+)\s+id=([^\s]+)\s*-->/
  for (const line of lines) {
    const match = line.match(recordRegex)
    if (match) {
      current = { type: match[1], id: match[2], fields: {} }
      continue
    }
    if (line.includes('<!-- @endrecord -->')) {
      if (current) records.push(current)
      current = null
      continue
    }
    if (current) {
      const fieldMatch = line.match(/^-\s*([^：]+)：(.*)$/)
      if (fieldMatch) current.fields[fieldMatch[1]] = fieldMatch[2]
    }
  }
  return records
}

function parseList(value: string): string[] {
  if (!value || value === '-') return []
  return value.split('、').map(item => item.trim()).filter(Boolean)
}

function parseNumber(value: string): number | undefined {
  if (!value || value === '-') return undefined
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
}

function parseBoolean(value: string): boolean {
  return value === 'true' || value === '是'
}

function buildProfile(record: RawRecord): Profile {
  return {
    id: record.id,
    nickname: record.fields['昵称'] ?? '我',
    birthDate: record.fields['出生日期'] || undefined,
    sex: (record.fields['生理性别'] as Profile['sex']) || undefined,
    heightCm: parseNumber(record.fields['身高(cm)']),
    weightKg: parseNumber(record.fields['体重(kg)']),
    activityLevel: (record.fields['活动水平'] as Profile['activityLevel']) || undefined,
    goal: (record.fields['饮食目标'] as Profile['goal']) ?? 'maintain_health',
    allergies: parseList(record.fields['食物过敏']),
    avoid: parseList(record.fields['忌口']),
    tastes: parseList(record.fields['口味偏好']) as Profile['tastes'],
    diseases: parseList(record.fields['疾病情况']) as Profile['diseases'],
    doctorRestrictions: record.fields['医生限制'] ?? '',
    createdAt: record.fields['创建时间'] ?? nowIso(),
    updatedAt: record.fields['修改时间'] ?? nowIso(),
  }
}

function buildMealSession(record: RawRecord): MealSession {
  return {
    id: record.id,
    date: record.fields['日期'] ?? nowIso(),
    mealType: (record.fields['餐次'] as MealSession['mealType']) ?? 'breakfast',
    goalSnapshot: (record.fields['目标'] as MealSession['goalSnapshot']) ?? 'maintain_health',
    ingredients: [],
    dishes: [],
    recommendations: [],
    nutrition: {
      calories: parseNumber(record.fields['能量(kcal)']) ?? 0,
      carbs: parseNumber(record.fields['碳水(g)']) ?? 0,
      protein: parseNumber(record.fields['蛋白质(g)']) ?? 0,
      fat: parseNumber(record.fields['脂肪(g)']) ?? 0,
      carbsRatio: parseNumber(record.fields['碳水供能比']) ?? 0,
      proteinRatio: parseNumber(record.fields['蛋白质供能比']) ?? 0,
      fatRatio: parseNumber(record.fields['脂肪供能比']) ?? 0,
    },
    reason: record.fields['配餐理由'] ?? '',
    createdAt: record.fields['创建时间'] ?? nowIso(),
    updatedAt: record.fields['修改时间'] ?? nowIso(),
    sourceDevice: record.fields['来源设备'] ?? '',
  }
}

function buildDish(record: RawRecord): Dish {
  return {
    id: record.id,
    name: record.fields['菜名'] ?? '',
    servings: parseNumber(record.fields['份数']) ?? 1,
    steps: parseList(record.fields['制作步骤']),
    ingredientIds: parseList(record.fields['食材编号']),
  }
}

function buildIngredient(record: RawRecord): MealIngredient {
  return {
    id: record.id,
    name: record.fields['名称'] ?? '',
    source: (record.fields['来源'] as MealIngredient['source']) ?? 'current',
    estimatedAmount: parseNumber(record.fields['估算量']),
    confirmedAmount: parseNumber(record.fields['确认量']),
    unit: (record.fields['单位'] as MealIngredient['unit']) ?? 'g',
    state: (record.fields['生熟'] as MealIngredient['state']) ?? 'raw',
    used: parseBoolean(record.fields['用于配菜']),
    photoPath: record.fields['照片'] || undefined,
  }
}

function buildMealLog(record: RawRecord): MealLog {
  const itemStrings = parseList(record.fields['菜品'])
  const items = itemStrings.map(item => {
    const match = item.match(/^(.*):(\d+(?:\.\d+)?)(g|ml)$/)
    if (!match) return { dishId: createId('dish'), name: item, amount: 0, unit: 'g' as const }
    return {
      dishId: createId('dish'),
      name: match[1],
      amount: Number(match[2]),
      unit: match[3] as 'g' | 'ml',
    }
  })
  return {
    id: record.id,
    sessionId: record.fields['关联配餐'] || undefined,
    date: record.fields['日期'] ?? nowIso(),
    mealType: (record.fields['餐次'] as MealLog['mealType']) ?? 'breakfast',
    items,
    nutrition: {
      calories: parseNumber(record.fields['能量(kcal)']) ?? 0,
      carbs: parseNumber(record.fields['碳水(g)']) ?? 0,
      protein: parseNumber(record.fields['蛋白质(g)']) ?? 0,
      fat: parseNumber(record.fields['脂肪(g)']) ?? 0,
      carbsRatio: 0,
      proteinRatio: 0,
      fatRatio: 0,
    },
    isOffPlan: parseBoolean(record.fields['是否计划外']),
    note: record.fields['备注'] || undefined,
    createdAt: record.fields['创建时间'] ?? nowIso(),
    updatedAt: record.fields['修改时间'] ?? nowIso(),
    sourceDevice: record.fields['来源设备'] ?? '',
  }
}

function buildHealthMetric(record: RawRecord): HealthMetric {
  return {
    id: record.id,
    type: (record.fields['类型'] as HealthMetric['type']) ?? 'weight',
    value: parseNumber(record.fields['数值']) ?? 0,
    unit: record.fields['单位'] ?? '',
    measuredAt: record.fields['测量时间'] ?? nowIso(),
    source: (record.fields['来源'] as HealthMetric['source']) ?? 'manual',
    referenceRange: record.fields['参考范围'] || undefined,
    note: record.fields['备注'] || undefined,
    createdAt: record.fields['创建时间'] ?? nowIso(),
    updatedAt: record.fields['修改时间'] ?? nowIso(),
    sourceDevice: record.fields['来源设备'] ?? '',
  }
}

function buildUtensil(record: RawRecord): UtensilCalibration {
  return {
    id: record.id,
    name: record.fields['名称'] ?? '',
    kind: (record.fields['类型'] as UtensilCalibration['kind']) ?? 'bowl',
    volumeMl: parseNumber(record.fields['容量(ml)']),
    method: record.fields['校准方法'] ?? '',
    reference: record.fields['参照物'] || undefined,
    calibratedAt: record.fields['校准日期'] ?? nowIso(),
    note: record.fields['备注'] || undefined,
  }
}

function buildKnowledge(record: RawRecord): KnowledgeItem {
  return {
    id: record.id,
    title: record.fields['标题'] ?? '',
    category: record.fields['分类'] ?? '',
    summary: record.fields['摘要'] ?? '',
    why: record.fields['解释'] ?? '',
    relatedFeature: record.fields['关联功能'] ?? '',
    createdAt: record.fields['创建时间'] ?? nowIso(),
    readAt: record.fields['阅读时间'] || undefined,
    favorite: parseBoolean(record.fields['收藏']),
  }
}

function buildMedal(record: RawRecord): MedalProgress {
  return {
    id: record.id,
    name: record.fields['名称'] ?? '',
    group: (record.fields['分组'] as MedalProgress['group']) ?? 'persistence',
    condition: record.fields['条件'] ?? '',
    current: parseNumber(record.fields['当前进度']) ?? 0,
    target: parseNumber(record.fields['目标']) ?? 1,
    unlockedAt: record.fields['点亮时间'] || undefined,
    achievedAt: record.fields['达成时间'] || undefined,
    relatedRecordIds: parseList(record.fields['关联记录']),
  }
}

function buildReward(record: RawRecord): Reward {
  return {
    id: record.id,
    name: record.fields['名称'] ?? '',
    description: record.fields['描述'] ?? '',
    status: (record.fields['状态'] as Reward['status']) ?? 'suggested',
    createdAt: record.fields['创建时间'] || undefined,
    completedAt: record.fields['完成时间'] || undefined,
  }
}

export function parseNdm(text: string): ParsedNdm {
  const warnings: string[] = []
  if (!text.startsWith('---')) warnings.push('缺少 YAML Front Matter。')
  const records = parseRecords(text)
  const data: AppData = structuredClone(emptyAppData)

  records.forEach(record => {
    switch (record.type) {
      case 'profile':
        data.profile = buildProfile(record)
        break
      case 'meal_plan':
        data.mealSessions.push(buildMealSession(record))
        break
      case 'dish':
        // Dish records are attached to their parent meal session below.
        break
      case 'meal_ingredient':
        // handled below after sessions are known
        break
      case 'meal_log':
        data.mealLogs.push(buildMealLog(record))
        break
      case 'exercise':
        // V1.2 起运动不再属于 App 范畴；兼容旧版导出文件，安全忽略而不报错。
        break
      case 'health_metric':
        data.healthMetrics.push(buildHealthMetric(record))
        break
      case 'utensil':
        data.utensilCalibrations.push(buildUtensil(record))
        break
      case 'knowledge':
        data.knowledge.push(buildKnowledge(record))
        break
      case 'medal':
        data.medals.push(buildMedal(record))
        break
      case 'reward':
        data.rewards.push(buildReward(record))
        break
      default:
        warnings.push(`未知记录类型：${record.type}`)
    }
  })

  // Rebuild nested sessions.
  const sessionMap = new Map(data.mealSessions.map(session => [session.id, session]))
  records.forEach(record => {
    if (record.type === 'dish') {
      const parentId = record.fields['所属配餐']
      const session = sessionMap.get(parentId)
      if (session) session.dishes.push(buildDish(record))
    }
    if (record.type === 'meal_ingredient') {
      const parentId = record.fields['所属配餐']
      const session = sessionMap.get(parentId)
      const ingredient = buildIngredient(record)
      if (session) {
        if (ingredient.source === 'recommended') {
          session.recommendations.push(ingredient)
        } else {
          session.ingredients.push(ingredient)
        }
      }
    }
  })

  if (records.length === 0) warnings.push('未找到任何记录。')
  return { data, warnings }
}

export interface MergeResult {
  data: AppData
  added: number
  skipped: number
  conflicts: string[]
}

export function mergeAppData(current: AppData, imported: AppData): MergeResult {
  const result: AppData = {
    ...current,
    mealSessions: [...current.mealSessions],
    mealLogs: [...current.mealLogs],
    healthMetrics: [...current.healthMetrics],
    utensilCalibrations: [...current.utensilCalibrations],
    knowledge: [...current.knowledge],
    medals: [...current.medals],
    rewards: [...current.rewards],
    restDays: [...current.restDays],
  }
  let added = 0
  let skipped = 0
  const conflicts: string[] = []

  const mergeById = <T extends { id: string }>(
    currentItems: T[],
    importedItems: T[],
    label: string,
  ): T[] => {
    const map = new Map(currentItems.map(item => [item.id, item]))
    importedItems.forEach(item => {
      const existing = map.get(item.id)
      if (!existing) {
        map.set(item.id, item)
        added += 1
      } else if (JSON.stringify(existing) === JSON.stringify(item)) {
        skipped += 1
      } else {
        conflicts.push(`${label}:${item.id}`)
      }
    })
    return Array.from(map.values())
  }

  result.mealSessions = mergeById(result.mealSessions, imported.mealSessions, '配餐记录')
  result.mealLogs = mergeById(result.mealLogs, imported.mealLogs, '用餐记录')
  result.healthMetrics = mergeById(
    result.healthMetrics,
    imported.healthMetrics,
    '健康指标',
  )
  result.utensilCalibrations = mergeById(
    result.utensilCalibrations,
    imported.utensilCalibrations,
    '餐具校准',
  )
  result.knowledge = mergeById(result.knowledge, imported.knowledge, '知识')
  result.medals = mergeById(result.medals, imported.medals, '勋章')
  result.rewards = mergeById(result.rewards, imported.rewards, '奖励')

  if (imported.profile) {
    if (!current.profile) {
      result.profile = imported.profile
      added += 1
    } else if (current.profile.id === imported.profile.id) {
      if (JSON.stringify(current.profile) === JSON.stringify(imported.profile)) {
        skipped += 1
      } else {
        conflicts.push('个人档案')
      }
    } else {
      conflicts.push('个人档案')
    }
  }

  return { data: result, added, skipped, conflicts }
}
