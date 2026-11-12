import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { createId, formatDate, nowIso } from '../lib/id'
import type { UtensilCalibration } from '../types'

const kinds: Array<{ value: UtensilCalibration['kind']; label: string }> = [
  { value: 'bowl', label: '碗' },
  { value: 'spoon', label: '勺' },
  { value: 'cup', label: '杯' },
]

const methods = ['一碗水', '一勺水', '厨房秤称重', '其他']

export default function UtensilCalibration() {
  const data = useAppStore(state => state.data)
  const addUtensilCalibration = useAppStore(state => state.addUtensilCalibration)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<UtensilCalibration['kind']>('bowl')
  const [method, setMethod] = useState('一碗水')
  const [waterMass, setWaterMass] = useState('')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('请填写餐具名称。')
      return
    }
    const mass = Number(waterMass)
    if (!Number.isFinite(mass) || mass <= 0) {
      setError('请填写大于 0 的水量或称重结果。')
      return
    }
    const calibration: UtensilCalibration = {
      id: createId('utensil'),
      name: name.trim(),
      kind,
      volumeMl: mass,
      method,
      reference: reference.trim() || undefined,
      calibratedAt: nowIso(),
      note: note.trim() || undefined,
    }
    await addUtensilCalibration(calibration)
    setName('')
    setWaterMass('')
    setReference('')
    setNote('')
    setError('')
  }

  return (
    <div className="stack">
      <section className="card">
        <h1 className="section-title">餐具校准</h1>
        <p className="muted">
          用一碗水、一勺水或厨房秤，帮助 App 更了解你家的常用量。水的容量校准不会直接等同于盐、油或米的重量。
        </p>
      </section>

      <form className="card form-grid" onSubmit={submit} aria-label="新增餐具校准">
        <div className="form-row">
          <label htmlFor="utensil-name">餐具名称</label>
          <input
            id="utensil-name"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="例如：家里的白碗"
          />
        </div>

        <div className="form-row">
          <span>类型</span>
          <div className="chip-group">
            {kinds.map(item => (
              <button
                type="button"
                key={item.value}
                className={`chip ${kind === item.value ? 'active' : ''}`}
                onClick={() => setKind(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="utensil-method">校准方式</label>
          <select
            id="utensil-method"
            value={method}
            onChange={event => setMethod(event.target.value)}
          >
            {methods.map(item => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label htmlFor="utensil-mass">水量或称重结果（g / ml）</label>
          <input
            id="utensil-mass"
            type="number"
            min="1"
            value={waterMass}
            onChange={event => setWaterMass(event.target.value)}
          />
        </div>

        <div className="form-row">
          <label htmlFor="utensil-reference">参照物说明</label>
          <input
            id="utensil-reference"
            value={reference}
            onChange={event => setReference(event.target.value)}
            placeholder="例如：一枚硬币、固定卡片"
          />
        </div>

        <div className="form-row">
          <label htmlFor="utensil-note">备注</label>
          <textarea
            id="utensil-note"
            rows={2}
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder="例如：一勺盐单独称过约 6g"
          />
        </div>

        {error && <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>}

        <button type="submit" className="button">
          保存校准
        </button>
      </form>

      <section className="card stack">
        <h2 className="section-title">已校准餐具</h2>
        {data.utensilCalibrations.length === 0 ? (
          <p className="muted">还没有校准记录。</p>
        ) : (
          data.utensilCalibrations.map(item => (
            <article key={item.id} className="card" style={{ boxShadow: 'none' }}>
              <div className="spread">
                <strong>{item.name}</strong>
                <span className="muted">{formatDate(item.calibratedAt)}</span>
              </div>
              <p>
                {item.kind === 'bowl' ? '碗' : item.kind === 'spoon' ? '勺' : '杯'} ·{' '}
                {item.volumeMl ?? '-'} ml · {item.method}
              </p>
              {item.reference && <p className="muted">参照物：{item.reference}</p>}
              {item.note && <p className="muted">备注：{item.note}</p>}
            </article>
          ))
        )}
      </section>
    </div>
  )
}
