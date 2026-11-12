import type { HealthMetric, MetricType } from '../types'
import { createId, nowIso } from './id'
import { metricUnit } from './health'

export function parseHealthCsv(text: string): HealthMetric[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) return []
  const header = lines[0].split(',').map(item => item.trim())
  const required = ['type', 'value', 'measuredAt']
  if (!required.every(item => header.includes(item))) {
    throw new Error('健康记录 CSV 必须包含 type、value、measuredAt 列。')
  }
  return lines.slice(1).map(line => {
    const values = line.split(',').map(item => item.trim())
    const record: Record<string, string> = {}
    header.forEach((key, index) => {
      record[key] = values[index] ?? ''
    })
    const type = record.type as MetricType
    const value = Number(record.value)
    if (!Number.isFinite(value)) {
      throw new Error(`数值无效：${record.value}`)
    }
    return {
      id: createId('metric'),
      type,
      value,
      unit: record.unit || metricUnit(type),
      measuredAt: record.measuredAt || nowIso(),
      source: (record.source as HealthMetric['source']) || 'import',
      referenceRange: record.referenceRange || undefined,
      note: record.note || undefined,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      sourceDevice: 'import',
    }
  })
}
