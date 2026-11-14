import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { createId, dateKey, formatDate, nowIso } from '../lib/id'
import { analyzeMetric, metricLabels, metricUnit } from '../lib/health'
import { parseHealthCsv } from '../lib/healthImport'
import {
  captureKindLabels,
  createHealthUpload,
  hasAiKey,
  reprocessHealthUpload,
  speechRecognitionAvailable,
  uploadStatusLabels,
} from '../lib/healthCapture'
import type { CaptureKind, CaptureResult } from '../lib/healthCapture'
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

interface SpeechRecognitionLike {
  lang: string
  onresult:
    | ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null
  start: () => void
}

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
  const [voiceText, setVoiceText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const keyReady = hasAiKey(data.settings)
  const pendingUploads = data.healthUploads.filter(item => item.status !== 'recognized')
  const speechSupported = speechRecognitionAvailable()

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

  const commitCapture = async (result: CaptureResult) => {
    await addHealthUpload(result.upload)
    for (const metric of result.metrics) {
      await addHealthMetric(metric)
    }
    setCaptureMessage(
      result.upload.status === 'recognized'
        ? `已识别 ${result.metrics.length} 项指标，可在下方历史趋势查看。`
        : '已留档并标记「待识别」。填入 AI 密钥后会自动重新识别，不需要重新上传。',
    )
  }

  const handleFile = async (kind: CaptureKind, file: File | undefined) => {
    if (!file) return
    await commitCapture(
      createHealthUpload({ kind, fileName: file.name, hasKey: keyReady }),
    )
  }

  const startSpeech = () => {
    if (!speechSupported) return
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Ctor) return
    const recognition = new Ctor()
    recognition.lang = 'zh-CN'
    recognition.onresult = event => {
      const text = Array.from(event.results)
        .map(row => row[0]?.transcript ?? '')
        .join('')
      setVoiceText(text)
    }
    recognition.start()
  }

  const saveVoice = async () => {
    const text = voiceText.trim()
    if (!text) {
      setCaptureMessage('请先填写或粘贴语音转文字内容。')
      return
    }
    await commitCapture(
      createHealthUpload({
        kind: 'voice',
        fileName: `语音记录-${dateKey(new Date())}.txt`,
        rawText: text,
        hasKey: keyReady,
      }),
    )
    setVoiceText('')
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
          优先用拍照、语音转文字或文件上传提交血压、血糖、血脂等数据，手动录入只作兜底。App
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

      <section className="card stack" aria-label="拍照、语音与文件上传">
        <h2 className="section-title">拍照 / 语音 / 文件上传</h2>
        <p className="muted">
          除了个人信息，其他数据尽量以拍照或文件形式提交；附件只按文件名关联，不会把图片或录音塞进导出文档。
        </p>

        <div className="form-row">
          <label htmlFor="health-photo">拍照（血压计、化验单、体检报告）</label>
          <input
            id="health-photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={event => void handleFile('photo', event.target.files?.[0])}
          />
        </div>

        <div className="form-row">
          <label htmlFor="health-file">上传文件（照片、PDF、CSV、文本）</label>
          <input
            id="health-file"
            type="file"
            accept="image/*,.pdf,.csv,text/*"
            onChange={event => void handleFile('file', event.target.files?.[0])}
          />
        </div>

        <div className="form-row">
          <label htmlFor="health-voice">语音转文字内容</label>
          <textarea
            id="health-voice"
            rows={2}
            value={voiceText}
            onChange={event => setVoiceText(event.target.value)}
            placeholder="例如：今天早上收缩压 120，舒张压 78，空腹血糖 5.4"
          />
        </div>

        <div className="row">
          <button
            type="button"
            className="button small secondary"
            disabled={!speechSupported}
            onClick={startSpeech}
          >
            开始语音转文字
          </button>
          <button type="button" className="button small" onClick={() => void saveVoice()}>
            保存语音记录
          </button>
          <input
            id="health-voice-file"
            type="file"
            accept="audio/*"
            aria-label="上传语音文件"
            onChange={event => void handleFile('voice', event.target.files?.[0])}
          />
        </div>
        <p className="muted">
          {speechSupported
            ? '点「开始语音转文字」可以直接说出数值，系统会把转写结果填到上方，由你确认后再留档。'
            : '当前浏览器不支持语音转文字：可以直接上传录音文件，或把转写内容粘贴到上方再保存。'}
        </p>
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
