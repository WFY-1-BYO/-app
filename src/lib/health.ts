import type { HealthMetric, MetricType } from '../types'

export const metricLabels: Record<MetricType, string> = {
  systolic_pressure: '收缩压',
  diastolic_pressure: '舒张压',
  blood_glucose: '空腹血糖',
  total_cholesterol: '总胆固醇',
  triglyceride: '甘油三酯',
  ldl: '低密度脂蛋白胆固醇',
  hdl: '高密度脂蛋白胆固醇',
  weight: '体重',
}

export type HealthLevel = 'normal' | 'borderline' | 'high' | 'low' | 'unknown'

export interface HealthAnalysis {
  level: HealthLevel
  message: string
}

export function analyzeMetric(metric: HealthMetric): HealthAnalysis {
  const value = metric.value
  switch (metric.type) {
    case 'systolic_pressure':
      if (value < 90) return normalOrLow('偏低', '收缩压偏低，建议结合状态判断，必要时咨询医生。')
      if (value < 140) return normalOrLow('正常', '收缩压在常见参考范围内。')
      if (value < 180) return high('偏高', '收缩压偏高，建议关注钠摄入并择期复测。')
      return high('明显偏高', '收缩压明显偏高，建议尽快就医评估。')
    case 'diastolic_pressure':
      if (value < 60) return normalOrLow('偏低', '舒张压偏低，如伴不适建议咨询医生。')
      if (value < 90) return normalOrLow('正常', '舒张压在常见参考范围内。')
      return high('偏高', '舒张压偏高，建议减少高盐饮食并复测。')
    case 'blood_glucose':
      if (value < 3.9) return normalOrLow('偏低', '血糖偏低，如出汗或心慌请及时处理。')
      if (value <= 6.1) return normalOrLow('正常', '空腹血糖在常见参考范围内。')
      if (value < 7) return high('偏高', '空腹血糖偏高，建议择期复查。')
      return high('明显偏高', '空腹血糖明显偏高，建议就医评估。')
    case 'total_cholesterol':
      if (value < 5.2) return normalOrLow('正常', '总胆固醇在常见参考范围内。')
      if (value < 6.2) return high('边缘升高', '总胆固醇边缘升高，建议关注饮食结构。')
      return high('偏高', '总胆固醇偏高，建议咨询医生。')
    case 'triglyceride':
      if (value < 1.7) return normalOrLow('正常', '甘油三酯在常见参考范围内。')
      if (value < 2.3) return high('边缘升高', '甘油三酯边缘升高，建议减少精制糖和酒精。')
      return high('偏高', '甘油三酯偏高，建议就医评估。')
    case 'ldl':
      if (value < 3.4) return normalOrLow('正常', '低密度脂蛋白在常见参考范围内。')
      return high('偏高', '低密度脂蛋白偏高，建议关注饱和脂肪摄入。')
    case 'hdl':
      if (value >= 1.0) return normalOrLow('正常', '高密度脂蛋白在常见参考范围内。')
      return normalOrLow('偏低', '高密度脂蛋白偏低，可结合整体血脂判断。')
    case 'weight':
      return {
        level: 'unknown',
        message: '体重需结合身高和目标判断，暂不单独评价。',
      }
    default:
      return { level: 'unknown', message: '暂无法分析该指标。' }
  }
}

function normalOrLow(label: string, message: string): HealthAnalysis {
  return { level: label === '偏低' ? 'low' : 'normal', message }
}

function high(label: string, message: string): HealthAnalysis {
  return {
    level: label.includes('明显') || label === '偏高' ? 'high' : 'borderline',
    message,
  }
}

export function analyzeMetrics(metrics: HealthMetric[]): HealthMetric[] & {
  summary: string
} {
  const result = metrics as HealthMetric[] & { summary: string }
  const analyzed = metrics.map(metric => ({
    ...metric,
    note: `${metric.note ? `${metric.note}；` : ''}${analyzeMetric(metric).message}`,
  }))
  const abnormal = analyzed.filter(metric => {
    const level = analyzeMetric(metric).level
    return level === 'high' || level === 'borderline' || level === 'low'
  })
  result.length = 0
  analyzed.forEach(item => result.push(item))
  result.summary =
    abnormal.length === 0
      ? '目前记录的指标整体平稳。'
      : `有 ${abnormal.length} 项指标需要关注，建议结合趋势和医生意见判断。`
  return result
}

export function metricUnit(type: MetricType): string {
  switch (type) {
    case 'systolic_pressure':
    case 'diastolic_pressure':
      return 'mmHg'
    case 'blood_glucose':
    case 'total_cholesterol':
    case 'triglyceride':
    case 'ldl':
    case 'hdl':
      return 'mmol/L'
    case 'weight':
      return 'kg'
    default:
      return ''
  }
}
