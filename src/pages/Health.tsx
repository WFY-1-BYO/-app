import { useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { createId, formatDate, nowIso } from '../lib/id'
import { analyzeMetric, metricLabels, metricUnit } from '../lib/health'
import { parseHealthCsv } from '../lib/healthImport'
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
  const updateSettings = useAppStore(state => state.updateSettings)
  const [type, setType] = useState<MetricType>('systolic_pressure')
  const [value, setValue] = useState('')
  const [measuredAt, setMeasuredAt] = useState('')
  const [source, setSource] = useState<HealthMetric['source']>('manual')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

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
          手动录入血压、血糖、血脂等数据。App 只提供趋势和饮食建议，不会替代医生诊断。
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

      <form className="card form-grid" onSubmit={submit} aria-label="新增健康指标">
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

        {error && <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>}

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
                          : 'var(--danger)',
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
