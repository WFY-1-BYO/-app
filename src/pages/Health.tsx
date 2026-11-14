import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { createId, formatDate, nowIso } from '../lib/id'
import { analyzeMetric, metricLabels, metricUnit } from '../lib/health'
import { parseHealthCsv } from '../lib/healthImport'
import {
  captureKindLabels,
  createHealthUpload,
  hasAiKey,
  metricsFromAiMetrics,
  reprocessHealthUpload,
  uploadStatusLabels,
} from '../lib/healthCapture'
import { extractHealthMetricsWithAI } from '../lib/deepseek'
import PhotoCapture from '../components/PhotoCapture'
import type { CaptureKind } from '../lib/healthCapture'
import type { HealthMetric, MetricType } from '../types'

const metricOptions: MetricType[] = [
  'systolic_pressure',
  'diastolic_pressure',
  'blood_glucose',
  'total_cholesterol',
  'triglyceride',
  'ldl',
  'hdl',
  'weight',
]

export default function Health() {
  const data = useAppStore(state => state.data)
  const addHealthMetric = useAppStore(state => state.addHealthMetric)
  const addHealthUpload = useAppStore(state => state.addHealthUpload)
  const updateSettings = useAppStore(state => state.updateSettings)
  const [type, setType] = useState<MetricType>('systolic_pressure')
  const [value, setValue] = useState('')
  const [measuredAt, setMeasuredAt] = useState('')
  const [source, setSource] = useState<HealthMetric['source']>('manual')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const [captureMessage, setCaptureMessage] = useState('')
  const [busyUpload, setBusyUpload] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const keyReady = hasAiKey(data.settings)
  const pendingUploads = data.healthUploads.filter(item => item.status !== 'recognized')

  // 填入密钥后自动重试同一份留档，不需要用户重新上传
  useEffect(() => {
    if (!keyReady) return
    const pending = useAppStore
      .getState()
      .data.healthUploads.filter(item => item.status !== 'recognized')
    if (pending.length === 0) return
    let cancelled = false
    const run = async () => {
      for (const upload of pending) {
        const result = reprocessHealthUpload(upload, true)
        if (result.metrics.length === 0 || cancelled) continue
        for (const metric of result.metrics) {
          await useAppStore.getState().addHealthMetric(metric)
        }
        await useAppStore.getState().updateHealthUpload(result.upload)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [keyReady, data.healthUploads])

  const handleFile = async (kind: CaptureKind, file: File | undefined) => {
    if (!file) return
    setBusyUpload(true)
    setCaptureMessage('')
    try {
      const base = createHealthUpload({ kind, fileName: file.name, hasKey: keyReady })
      let result = base
      // 填了密钥且是文字类文件时，先交给 DeepSeek 在线识别一次
      const textLike =
        /\.(txt|csv|md)$/i.test(file.name) || file.type.startsWith('text/')
      if (!base.upload.status || base.upload.status !== 'recognized') {
        if (keyReady && textLike) {
          try {
            const reportText = await file.text()
            const aiMetrics = await extractHealthMetricsWithAI(data.settings, reportText)
            const aiResult = metricsFromAiMetrics(base.upload, aiMetrics)
            if (aiResult.metrics.length > 0) result = aiResult
          } catch (aiError) {
            setCaptureMessage(
              aiError instanceof Error
                ? `在线识别没成功：${aiError.message} 已先按本地规则留档。`
                : '在线识别没成功，已先按本地规则留档。',
            )
          }
        }
      }
      await addHealthUpload(result.upload)
      for (const metric of result.metrics) {
        await addHealthMetric(metric)
      }
      if (!captureMessage) {
        setCaptureMessage(
          result.upload.status === 'recognized'
            ? `已识别 ${result.metrics.length} 项指标，可在下方历史趋势查看。`
            : '已留档并标记「待识别」。纯图片和 PDF 暂时只留档；文字类文件填入 AI 密钥后可在线识别。',
        )
      }
    } finally {
      setBusyUpload(false)
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setError('请填写大于 0 的指标数值。')
      return
    }
    const metric: HealthMetric = {
      id: createId('metric'),
      type,
      value: numericValue,
      unit: metricUnit(type),
      measuredAt: measuredAt || nowIso(),
      source,
      note: note.trim() || undefined,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      sourceDevice: 'current-device',
    }
    await addHealthMetric(metric)
    setValue('')
    setMeasuredAt('')
    setNote('')
    setError('')
  }

  const importCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const metrics = parseHealthCsv(text)
      for (const metric of metrics) {
        await addHealthMetric(metric)
      }
      setImportMessage(`已导入 ${metrics.length} 条健康记录。`)
      setError('')
    } catch (error) {
      setImportMessage('')
      setError(error instanceof Error ? error.message : '导入失败。')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const authorizeVivo = async () => {
    await updateSettings({ vivoHealthAuthorized: !data.settings.vivoHealthAuthorized })
  }

  const sortedMetrics = [...data.healthMetrics].sort((a, b) =>
    b.measuredAt.localeCompare(a.measuredAt),
  )

  return (
    <div className="stack">
      <section className="card">
        <h1 className="section-title">健康指标</h1>
        <p className="muted">
          优先用拍照或文件上传提交血压、血糖、血脂等数据，手动录入只作兜底。App
          只提供趋势和饮食建议，不会替代医生诊断。
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          <button
            type="button"
            className={`button small ${data.settings.vivoHealthAuthorized ? '' : 'secondary'}`}
            onClick={() => void authorizeVivo()}
          >
            {data.settings.vivoHealthAuthorized ? '已连接 vivo 健康' : '连接 vivo 健康'}
          </button>
          <span className="muted">
            {data.settings.vivoHealthAuthorized
              ? '已授权，等待支持的数据同步。'
              : '第一版预留授权能力，不影响手动记录。'}
          </span>
        </div>
      </section>

      <section className="card stack" aria-label="拍照与文件上传">
        <h2 className="section-title">拍照 / 文件上传</h2>
        <p className="muted">
          血压计读数、化验单、体检报告都可以拍照或上传文件提交；附件只按文件名关联，不会把图片塞进导出文档。
        </p>

        <div className="form-row">
          <span>拍照（血压计、化验单、体检报告）</span>
          <PhotoCapture
            label="健康数据照片"
            hint="拍一张，或从相册上传。"
            disabled={busyUpload}
            onFile={file => handleFile('photo', file)}
          />
        </div>

        <div className="form-row">
          <span>上传文件（照片、PDF、CSV、文本）</span>
          <PhotoCapture
            label="健康数据文件"
            hint="从文件里选择，支持照片、PDF、CSV 和文本。"
            accept="image/*,.pdf,.csv,text/*"
            allowCamera={false}
            uploadLabel="选择文件"
            disabled={busyUpload}
            onFile={file => handleFile('file', file)}
          />
        </div>

        {busyUpload && <p className="muted">正在识别文件，请稍等……</p>}
        {captureMessage && <p className="muted">{captureMessage}</p>}
      </section>

      <section className="card stack" aria-label="上传留档">
        <h2 className="section-title">上传留档</h2>
        {data.healthUploads.length === 0 ? (
          <p className="muted">还没有上传记录。</p>
        ) : (
          data.healthUploads.map(upload => (
            <article key={upload.id} className="card upload-item" style={{ boxShadow: 'none' }}>
              <div className="spread">
                <strong>{upload.fileName}</strong>
                <span className={`upload-status ${upload.status}`}>
                  {uploadStatusLabels[upload.status]}
                </span>
              </div>
              <p className="muted">
                {captureKindLabels[upload.kind]} · {formatDate(upload.createdAt)} · 关联{' '}
                {upload.metricIds.length} 项指标
              </p>
            </article>
          ))
        )}
        {!keyReady && pendingUploads.length > 0 && (
          <p className="muted">
            还没有填入 AI 密钥，以上文件只留档、不假装已识别；填入后会自动重新识别，不需要重新上传。
          </p>
        )}
        {keyReady && <p className="muted">已启用在线识别，待识别留档会自动重试。</p>}
      </section>

      <form className="card form-grid" onSubmit={submit} aria-label="新增健康指标">
        <h2 className="section-title">手动录入（兜底）</h2>
        <div className="form-row">
          <label htmlFor="metric-type">指标类型</label>
          <select
            id="metric-type"
            value={type}
            onChange={event => setType(event.target.value as MetricType)}
          >
            {metricOptions.map(item => (
              <option key={item} value={item}>
                {metricLabels[item]}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label htmlFor="metric-value">数值（{metricUnit(type)}）</label>
          <input
            id="metric-value"
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={event => setValue(event.target.value)}
          />
        </div>

        <div className="form-row">
          <label htmlFor="metric-time">测量时间</label>
          <input
            id="metric-time"
            type="datetime-local"
            value={measuredAt}
            onChange={event => setMeasuredAt(event.target.value)}
          />
        </div>

        <div className="form-row">
          <span>来源</span>
          <div className="chip-group">
            {(['manual', 'import', 'vivo'] as const).map(item => (
              <button
                type="button"
                key={item}
                className={`chip ${source === item ? 'active' : ''}`}
                onClick={() => setSource(item)}
              >
                {item === 'manual' ? '手动' : item === 'import' ? '导入' : 'vivo'}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="metric-note">备注</label>
          <textarea
            id="metric-note"
            rows={2}
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder="例如：早晨空腹测量"
          />
        </div>

        {error && <p style={{ color: 'var(--notice-ink)', margin: 0 }}>{error}</p>}

        <button type="submit" className="button">
          保存健康指标
        </button>
      </form>

      <section className="card stack">
        <h2 className="section-title">导入已有记录</h2>
        <p className="muted">
          支持 CSV 文件，列名需包含 type、value、measuredAt，可选 unit、source、note。
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={event => void importCsv(event)}
          aria-label="导入健康记录 CSV"
        />
        {importMessage && <p className="muted">{importMessage}</p>}
      </section>

      <section className="card stack">
        <h2 className="section-title">历史趋势</h2>
        {sortedMetrics.length === 0 ? (
          <p className="muted">还没有健康指标记录。</p>
        ) : (
          sortedMetrics.map(metric => {
            const analysis = analyzeMetric(metric)
            return (
              <article key={metric.id} className="card" style={{ boxShadow: 'none' }}>
                <div className="spread">
                  <strong>
                    {metricLabels[metric.type]}：{metric.value} {metric.unit}
                  </strong>
                  <span className="muted">{formatDate(metric.measuredAt)}</span>
                </div>
                <p
                  style={{
                    color:
                      analysis.level === 'normal'
                        ? 'var(--primary-strong)'
                        : analysis.level === 'unknown'
                          ? 'var(--muted)'
                          : 'var(--notice-ink)',
                  }}
                >
                  {analysis.message}
                </p>
                {metric.note && <p className="muted">备注：{metric.note}</p>}
              </article>
            )
          })
        )}
      </section>
    </div>
  )
}
