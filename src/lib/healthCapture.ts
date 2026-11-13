import type { AppSettings, HealthMetric, HealthUpload, MetricType } from '../types'
import { createId, nowIso } from './id'
import { metricUnit } from './health'

export type CaptureKind = HealthUpload['kind']

export const captureKindLabels: Record<CaptureKind, string> = {
  photo: '拍照',
  voice: '语音',
  file: '文件',
}

export const uploadStatusLabels: Record<HealthUpload['status'], string> = {
  pending: '待识别',
  recognized: '已识别',
  failed: '需补充',
}

/** 是否已填入 AI 密钥；改动 9 会把加密后的密钥写进 settings.aiKeyEncrypted */
export function hasAiKey(settings: AppSettings): boolean {
  return Boolean(settings.aiKeyEncrypted)
}

interface ParsedValue {
  type: MetricType
  value: number
}

const aliases: Array<{ type: MetricType; words: string[] }> = [
  { type: 'systolic_pressure', words: ['收缩压', '高压', 'systolic'] },
  { type: 'diastolic_pressure', words: ['舒张压', '低压', 'diastolic'] },
  { type: 'blood_glucose', words: ['血糖', '葡萄糖', 'glucose'] },
  { type: 'total_cholesterol', words: ['总胆固醇', '胆固醇', 'cholesterol'] },
  { type: 'triglyceride', words: ['甘油三酯', 'triglyceride'] },
  { type: 'ldl', words: ['低密度', 'ldl'] },
  { type: 'hdl', words: ['高密度', 'hdl'] },
  { type: 'weight', words: ['体重', 'weight'] },
]

/**
 * 轻量本地识别：从文件名或语音转文字结果里找出「指标名 + 数值」。
 * 真正的在线识别在填入密钥后接入；这里保证无密钥时也能有可解释的降级路径。
 */
export function recognizeHealthText(text: string): ParsedValue[] {
  const results: ParsedValue[] = []
  const seen = new Set<MetricType>()
  aliases.forEach(alias => {
    if (seen.has(alias.type)) return
    for (const word of alias.words) {
      const match = text.match(new RegExp(`${word}[^0-9]{0,8}(\\d+(?:\\.\\d+)?)`))
      if (match) {
        const value = Number(match[1])
        if (Number.isFinite(value) && value > 0) {
          results.push({ type: alias.type, value })
          seen.add(alias.type)
          break
        }
      }
    }
  })
  return results
}

function buildMetrics(values: ParsedValue[], upload: HealthUpload): HealthMetric[] {
  const timestamp = nowIso()
  return values.map(value => ({
    id: createId('metric'),
    type: value.type,
    value: value.value,
    unit: metricUnit(value.type),
    measuredAt: timestamp,
    source: 'import' as const,
    note: `来自${captureKindLabels[upload.kind]}：${upload.fileName}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    sourceDevice: upload.sourceDevice,
  }))
}

export interface CaptureResult {
  upload: HealthUpload
  metrics: HealthMetric[]
}

/**
 * 创建上传留档。
 * 无密钥：只留档、标记「待识别」，不产生任何指标（不假装已识别）。
 * 有密钥：尝试识别，识别不到仍如实留为「待识别」。
 */
export function createHealthUpload(input: {
  kind: CaptureKind
  fileName: string
  rawText?: string
  hasKey: boolean
  sourceDevice?: string
}): CaptureResult {
  const timestamp = nowIso()
  const upload: HealthUpload = {
    id: createId('upload'),
    kind: input.kind,
    fileName: input.fileName,
    rawText: input.rawText?.trim() || undefined,
    status: 'pending',
    metricIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    sourceDevice: input.sourceDevice ?? 'current-device',
  }
  if (!input.hasKey) return { upload, metrics: [] }

  const values = recognizeHealthText(`${upload.fileName} ${upload.rawText ?? ''}`)
  if (values.length === 0) return { upload, metrics: [] }

  const metrics = buildMetrics(values, upload)
  return {
    upload: {
      ...upload,
      status: 'recognized',
      metricIds: metrics.map(metric => metric.id),
      updatedAt: timestamp,
    },
    metrics,
  }
}

/**
 * 填入密钥后对同一份留档重新识别，不需要重新上传。
 * 识别不到时保持「待识别」，不写入任何数值。
 */
export function reprocessHealthUpload(upload: HealthUpload, hasKey: boolean): CaptureResult {
  if (!hasKey || upload.status === 'recognized') {
    return { upload, metrics: [] }
  }
  const values = recognizeHealthText(`${upload.fileName} ${upload.rawText ?? ''}`)
  if (values.length === 0) return { upload, metrics: [] }

  const metrics = buildMetrics(values, upload)
  return {
    upload: {
      ...upload,
      status: 'recognized',
      metricIds: metrics.map(metric => metric.id),
      updatedAt: nowIso(),
    },
    metrics,
  }
}

/** 浏览器是否原生支持语音转文字；不支持时页面给出降级提示 */
export function speechRecognitionAvailable(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as {
    SpeechRecognition?: unknown
    webkitSpeechRecognition?: unknown
  }
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
}
