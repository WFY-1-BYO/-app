import type { AmountEstimate, EstimateConfidence, ReferenceKind } from '../types'

export interface ReferenceOption {
  id: ReferenceKind
  label: string
  size: string
  hint: string
  /** 三级降级：A 标准参照物 / B 已校准餐具 / C 无参照物 */
  level: 'A' | 'B' | 'C'
  confidence: EstimateConfidence
  /** 估算区间的相对半宽，0.12 表示约 ±12% */
  tolerance: number
}

export const referenceOptions: ReferenceOption[] = [
  {
    id: 'card',
    label: '银行卡 / 身份证',
    size: '85.6 × 54 mm',
    hint: '尺寸统一、随手可得，作为默认参照物；平放在食材旁边，不要压住食材。',
    level: 'A',
    confidence: 'high',
    tolerance: 0.12,
  },
  {
    id: 'checkerboard',
    label: '可打印棋盘参照卡',
    size: '100 × 100 mm（每格 10 mm）',
    hint: '打印时选 100% 比例、不要「适应纸张」；黑白格点最利于找四角，抗倾斜能力最好。',
    level: 'A',
    confidence: 'high',
    tolerance: 0.1,
  },
  {
    id: 'calibrated',
    label: '已校准的碗 / 盘',
    size: '以「餐具校准」页记录的容量为准',
    hint: '先记下一碗水 / 一勺水的量，再让同一只碗入镜；手边没有卡片时用它。',
    level: 'B',
    confidence: 'confirm',
    tolerance: 0.25,
  },
  {
    id: 'none',
    label: '没有参照物',
    size: '不参与尺寸换算',
    hint: 'App 只识别食材品类与份数，不猜克重，由你直接填写用量。',
    level: 'C',
    confidence: 'confirm',
    tolerance: 0,
  },
]

/** 拍摄指引：不强制垂直，靠四角透视校正把倾斜照片拉正 */
export const photoGuide: string[] = [
  '把参照物和所有食材放在同一个平面上（同一张桌面）。',
  '参照物四角与食材都要完整入镜，不要被画面边缘裁掉。',
  '食材分开放置，彼此不遮挡，也不要盖住参照物的角。',
  '俯视拍摄即可，镜头与桌面夹角 45°–90°，不要求完全垂直。',
]

/**
 * 为什么这类参照物能抗拍摄角度差：
 * 银行卡的四个直角、棋盘卡的黑白格点都是已知几何基准，
 * 找到四角后用透视变换把倾斜桌面拉正成俯视图，再按真实尺寸换算面积与克重。
 */
export const perspectiveCorrection =
  '参照物为什么能抗角度差：银行卡的四个直角、棋盘卡的黑白格点，都是已知的几何基准。App 先在照片里找到这四角，再用透视变换把倾斜的桌面「拉正」成俯视图，然后按参照物的真实尺寸（85.6 × 54 mm 或 100 × 100 mm）把像素换算成实际面积与克重。所以斜一点拍也没关系，只要四角可见、和食材同在一个平面。'

/**
 * 本地校准说明：参照物到克重的换算完全在本机完成，不依赖在线 AI 密钥；
 * 密钥只影响「识别到哪些食材」，不影响参照物是否生效。
 */
export const localEstimateNote =
  '参照物换算在本地完成，不依赖在线 AI 密钥：即使还没有填入 key，照片里的参照物依然能给出克重区间；key 只用于让识别更聪明，不会让估算失效。'

export function getReferenceOption(kind: ReferenceKind): ReferenceOption {
  return referenceOptions.find(option => option.id === kind) ?? referenceOptions[0]
}

/** 按参照物等级给出克重区间；C 级返回 { min: 0, max: 0 } 表示不给克重 */
export function estimateRange(amount: number, kind: ReferenceKind): AmountEstimate {
  const option = getReferenceOption(kind)
  if (option.level === 'C') return { min: 0, max: 0 }
  const base = Math.max(0, amount)
  return {
    min: Math.round(base * (1 - option.tolerance)),
    max: Math.round(base * (1 + option.tolerance)),
  }
}

export function hasAmountEstimate(range?: AmountEstimate): boolean {
  return Boolean(range && range.max > 0)
}

export function rangeText(range: AmountEstimate | undefined, unit = 'g'): string {
  if (!hasAmountEstimate(range) || !range) return '只识别品类与份数，请填写克重'
  return `估算区间约 ${range.min}–${range.max} ${unit}`
}

export function describeEstimate(
  range: AmountEstimate | undefined,
  confidence: EstimateConfidence | undefined,
  unit = 'g',
): string {
  const mark = confidence === 'high' ? '高可信' : '需确认'
  return `${mark} · ${rangeText(range, unit)}`
}

/** 三级降级说明，用于配餐页展示当前估算方式 */
export function levelText(option: ReferenceOption): string {
  if (option.level === 'A') {
    return 'A 级 · 标准尺寸参照物：给出克重区间并标记「高可信」，你确认用量后用于配餐。'
  }
  if (option.level === 'B') {
    return 'B 级 · 已校准碗盘：结合你记录的一碗水 / 一勺水量估算，区间更宽并标记「需确认」，请核对后用于配餐。'
  }
  return 'C 级 · 无参照物：只识别食材品类与份数，不猜克重，必须你填写用量后才能配餐。'
}
