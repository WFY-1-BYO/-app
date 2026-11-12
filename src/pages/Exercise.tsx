import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { createId, nowIso } from '../lib/id'
import { recommendExercise, suggestMealAdjustment, exerciseLabel } from '../lib/exercise'
import { adjustMealForExercise } from '../lib/mealPlanner'
import type { ExerciseLog } from '../types'

const exerciseTypes = ['跑步', '快走', '骑行', '力量训练', '游泳', '拉伸', '其他']

export default function Exercise() {
  const data = useAppStore(state => state.data)
  const addExerciseLog = useAppStore(state => state.addExerciseLog)
  const updateMealSession = useAppStore(state => state.updateMealSession)
  const [type, setType] = useState('跑步')
  const [durationMin, setDurationMin] = useState('20')
  const [intensity, setIntensity] = useState<'low' | 'medium' | 'high'>('medium')
  const [status, setStatus] = useState<ExerciseLog['status']>('planned')
  const [sessionId, setSessionId] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const duration = Number(durationMin)
    if (!type.trim()) {
      setError('请填写运动项目。')
      return
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      setError('请填写大于 0 的运动时长。')
      return
    }
    const log: ExerciseLog = {
      id: createId('exercise'),
      status,
      type: type.trim(),
      start: nowIso(),
      durationMin: duration,
      intensity,
      source: 'manual',
      sessionId: sessionId || undefined,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      sourceDevice: 'current-device',
    }
    await addExerciseLog(log)

    if (status === 'completed' && sessionId) {
      const session = data.mealSessions.find(item => item.id === sessionId)
      if (session) {
        await updateMealSession(adjustMealForExercise(session, true))
      }
    }
    setError('')
  }

  return (
    <div className="stack">
      <section className="card">
        <h1 className="section-title">运动记录</h1>
        {data.profile ? (
          <p className="muted">{recommendExercise(data.profile)}</p>
        ) : (
          <p className="muted">先创建档案，才能给出更贴合目标的运动建议。</p>
        )}
      </section>

      <form className="card form-grid" onSubmit={submit} aria-label="添加运动记录">
        <div className="form-row">
          <label htmlFor="exercise-type">运动项目</label>
          <select
            id="exercise-type"
            value={type}
            onChange={event => setType(event.target.value)}
          >
            {exerciseTypes.map(item => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label htmlFor="exercise-duration">时长（分钟）</label>
          <input
            id="exercise-duration"
            type="number"
            min="1"
            value={durationMin}
            onChange={event => setDurationMin(event.target.value)}
          />
        </div>

        <div className="form-row">
          <label htmlFor="exercise-intensity">强度</label>
          <select
            id="exercise-intensity"
            value={intensity}
            onChange={event => setIntensity(event.target.value as typeof intensity)}
          >
            <option value="low">轻度</option>
            <option value="medium">中等</option>
            <option value="high">较高</option>
          </select>
        </div>

        <div className="form-row">
          <span>状态</span>
          <div className="chip-group">
            {(['planned', 'completed', 'cancelled', 'partial'] as const).map(item => (
              <button
                type="button"
                key={item}
                className={`chip ${status === item ? 'active' : ''}`}
                onClick={() => setStatus(item)}
              >
                {item === 'planned'
                  ? '计划'
                  : item === 'completed'
                    ? '已完成'
                    : item === 'cancelled'
                      ? '已取消'
                      : '部分完成'}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="exercise-session">关联配餐（可选）</label>
          <select
            id="exercise-session"
            value={sessionId}
            onChange={event => setSessionId(event.target.value)}
          >
            <option value="">不关联</option>
            {data.mealSessions.map(session => (
              <option key={session.id} value={session.id}>
                {session.dishes[0]?.name ?? session.mealType}
              </option>
            ))}
          </select>
        </div>

        {error && <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>}

        <button type="submit" className="button">
          保存运动记录
        </button>
      </form>

      <section className="card stack">
        <h2 className="section-title">运动历史</h2>
        {data.exerciseLogs.length === 0 ? (
          <p className="muted">还没有运动记录。</p>
        ) : (
          data.exerciseLogs.map(log => (
            <article key={log.id} className="card" style={{ boxShadow: 'none' }}>
              <div className="spread">
                <strong>{exerciseLabel(log)}</strong>
                <span className="muted">
                  {log.intensity === 'low' ? '轻度' : log.intensity === 'medium' ? '中等' : '较高'}
                </span>
              </div>
              <p>{suggestMealAdjustment(log)}</p>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
