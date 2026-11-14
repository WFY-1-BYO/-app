import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhotoCapture from '../components/PhotoCapture'
import { useAppStore } from '../store/appStore'
import { createMealSession } from '../lib/mealPlanner'
import { createManualIngredient, recognizeIngredientsFromFile } from '../lib/ai'
import {
  getReferenceOption,
  hasAmountEstimate,
  levelText,
  localEstimateNote,
  perspectiveCorrection,
  photoGuide,
  rangeText,
  referenceOptions,
} from '../lib/reference'
import type { MealIngredient, MealType, ReferenceKind } from '../types'

const mealOptions: Array<{ value: MealType; label: string }> = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'snack', label: '加餐' },
]

export default function MealNew() {
  const navigate = useNavigate()
  const profile = useAppStore(state => state.data.profile)
  const settings = useAppStore(state => state.data.settings)
  const addMealSession = useAppStore(state => state.addMealSession)
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [referenceKind, setReferenceKind] = useState<ReferenceKind>('card')
  const [ingredients, setIngredients] = useState<MealIngredient[]>([])
  const [recognitionNote, setRecognitionNote] = useState('')
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('100')
  const [error, setError] = useState('')
  const selectedFileRef = useRef<File | null>(null)

  const option = getReferenceOption(referenceKind)

  const applyRecognition = async (file: File, kind: ReferenceKind) => {
    const result = await recognizeIngredientsFromFile(file, kind, settings)
    setIngredients(result.ingredients)
    setRecognitionNote(result.note)
  }

  const onReferenceChange = async (next: ReferenceKind) => {
    setReferenceKind(next)
    // 已经拍过照片时，按新参照物重新估算，让用户再次确认用量
    const file = selectedFileRef.current
    if (file) await applyRecognition(file, next)
  }

  const addIngredient = () => {
    const name = newName.trim()
    const amount = Number(newAmount)
    if (!name) {
      setError('请填写食材名称。')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('请填写大于 0 的用量。')
      return
    }
    setIngredients([...ingredients, createManualIngredient(name, amount, 'g', 'raw', referenceKind)])
    setNewName('')
    setNewAmount('100')
    setError('')
  }

  const updateIngredient = (id: string, patch: Partial<MealIngredient>) => {
    setIngredients(ingredients.map(item => (item.id === id ? { ...item, ...patch } : item)))
  }

  const confirmIngredient = (id: string) => {
    const target = ingredients.find(item => item.id === id)
    const amount = target?.confirmedAmount ?? target?.estimatedAmount ?? 0
    if (!(amount > 0)) {
      setError('请先填写大于 0 的确认量，再标记已确认。')
      return
    }
    setError('')
    setIngredients(
      ingredients.map(item =>
        item.id === id
          ? { ...item, confirmedAmount: amount, estimateConfidence: 'high' as const }
          : item,
      ),
    )
  }

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(item => item.id !== id))
  }

  const generate = async () => {
    if (!profile) {
      navigate('/onboarding')
      return
    }
    const usable = ingredients.filter(item => item.source === 'current' && item.used)
    if (usable.length === 0) {
      setError('请至少确认一种当次已有食材。')
      return
    }
    if (usable.some(item => item.estimateConfidence === 'confirm')) {
      setError('还有食材标记为「需确认」，请逐项核对用量并点「确认用量」后再生成菜谱。')
      return
    }
    if (usable.some(item => !(item.confirmedAmount && item.confirmedAmount > 0))) {
      setError('有食材还没有填写确认量，请补齐后再生成菜谱。')
      return
    }
    const session = createMealSession({
      profile,
      mealType,
      ingredients,
      sourceDevice: 'current-device',
    })
    await addMealSession(session)
    navigate(`/meal/${session.id}`)
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h1 className="section-title">拍照配餐</h1>
        <p className="muted">
          每次只依据这张照片里当次已有的食材配餐。先把参照物和食材一起拍进去，识别出的用量需要你确认后才用于配餐。
        </p>

        <div className="form-row">
          <span>餐次</span>
          <div className="chip-group">
            {mealOptions.map(item => (
              <button
                type="button"
                key={item.value}
                className={`chip ${mealType === item.value ? 'active' : ''}`}
                onClick={() => setMealType(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <span>参照物</span>
          <div className="chip-group" role="group" aria-label="参照物">
            {referenceOptions.map(item => (
              <button
                type="button"
                key={item.id}
                className={`chip ${referenceKind === item.id ? 'active' : ''}`}
                aria-pressed={referenceKind === item.id}
                onClick={() => {
                  void onReferenceChange(item.id)
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="muted">
            {option.size} · {option.hint}
          </p>
        </div>

        <div className="card reference-guide stack" aria-label="拍摄指引">
          <h2 className="section-title">怎么拍</h2>
          <ul>
            {photoGuide.map(line => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="muted">{perspectiveCorrection}</p>
        </div>

        <div className="form-row">
          <span>当次食材照片</span>
          <PhotoCapture
            label="食材照片"
            hint="拍一张，或从相册上传；参照物和食材要在同一张照片里。"
            onFile={async file => {
              selectedFileRef.current = file
              setPreviewUrl(
                typeof URL.createObjectURL === 'function'
                  ? URL.createObjectURL(file)
                  : null,
              )
              await applyRecognition(file, referenceKind)
            }}
          />
        </div>

        {previewUrl && (
          <div>
            <img
              src={previewUrl}
              alt="当次食材照片预览"
              style={{ maxWidth: '100%', borderRadius: 14, border: '1px solid var(--border)' }}
            />
          </div>
        )}

        {recognitionNote && <p className="muted">{recognitionNote}</p>}
      </section>

      <section className="card stack" aria-label="当前估算方式">
        <h2 className="section-title">当前估算方式</h2>
        <p className="level-note">{levelText(option)}</p>
        <p className="muted">{localEstimateNote}</p>
      </section>

      <section className="card stack">
        <h2 className="section-title">确认当次食材</h2>
        {ingredients.length === 0 ? (
          <p className="muted">暂无食材，请上传照片或手动添加。</p>
        ) : (
          <div className="stack">
            {ingredients.map(ingredient => (
              <article key={ingredient.id} className="card" style={{ boxShadow: 'none' }}>
                <div className="spread">
                  <strong>{ingredient.name}</strong>
                  <button
                    type="button"
                    className="button small ghost"
                    onClick={() => removeIngredient(ingredient.id)}
                  >
                    移除
                  </button>
                </div>
                <div className="estimate-line">
                  <span
                    className={`estimate-tag ${
                      ingredient.estimateConfidence === 'high' ? 'high' : 'confirm'
                    }`}
                  >
                    {ingredient.estimateConfidence === 'high' ? '高可信' : '需确认'}
                  </span>
                  <span className="muted">{rangeText(ingredient.estimateRange, ingredient.unit)}</span>
                  {!hasAmountEstimate(ingredient.estimateRange) && ingredient.portion && (
                    <span className="muted">约 {ingredient.portion} 份（需你填克重）</span>
                  )}
                </div>
                <div className="row">
                  <label>
                    确认量
                    <input
                      type="number"
                      min="1"
                      value={ingredient.confirmedAmount ?? ingredient.estimatedAmount ?? 0}
                      onChange={event =>
                        updateIngredient(ingredient.id, {
                          confirmedAmount: Number(event.target.value),
                        })
                      }
                      style={{ width: 90, marginLeft: 8 }}
                    />
                  </label>
                  <label>
                    单位
                    <select
                      value={ingredient.unit}
                      onChange={event =>
                        updateIngredient(ingredient.id, {
                          unit: event.target.value as 'g' | 'ml',
                        })
                      }
                      style={{ marginLeft: 8 }}
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                    </select>
                  </label>
                  <label>
                    生熟
                    <select
                      value={ingredient.state}
                      onChange={event =>
                        updateIngredient(ingredient.id, {
                          state: event.target.value as 'raw' | 'cooked',
                        })
                      }
                      style={{ marginLeft: 8 }}
                    >
                      <option value="raw">生重</option>
                      <option value="cooked">熟重</option>
                    </select>
                  </label>
                  <label>
                    用于配菜
                    <input
                      type="checkbox"
                      checked={ingredient.used}
                      onChange={event =>
                        updateIngredient(ingredient.id, { used: event.target.checked })
                      }
                      style={{ marginLeft: 8 }}
                    />
                  </label>
                </div>
                {ingredient.estimateConfidence === 'confirm' && (
                  <button
                    type="button"
                    className="button small secondary"
                    onClick={() => confirmIngredient(ingredient.id)}
                  >
                    确认用量
                  </button>
                )}
              </article>
            ))}
          </div>
        )}

        <div className="manual-add-row">
          <label className="manual-add-field">
            <span>食材名称</span>
            <input
              aria-label="食材名称"
              placeholder="例如：西红柿"
              value={newName}
              onChange={event => setNewName(event.target.value)}
            />
          </label>
          <label className="manual-add-field manual-add-amount">
            <span>用量（克）</span>
            <input
              aria-label="用量，单位克"
              type="number"
              min="1"
              value={newAmount}
              onChange={event => setNewAmount(event.target.value)}
            />
          </label>
          <button type="button" className="button secondary" onClick={addIngredient}>
            添加食材
          </button>
        </div>
        <p className="muted manual-add-note">
          用量按生重（还没有煮之前的重量）填写，单位是克；一杯米饭约 200 克、一个鸡蛋约 50 克，拿不准可以先填估计值，之后还能改。
        </p>

        {error && <p style={{ color: 'var(--notice-ink)', margin: 0 }}>{error}</p>}

        <div className="row">
          <button type="button" className="button" onClick={generate}>
            生成菜谱
          </button>
          <button
            type="button"
            className="button ghost"
            onClick={() => {
              setIngredients([])
              setPreviewUrl(null)
              setRecognitionNote('')
              selectedFileRef.current = null
            }}
          >
            重新开始
          </button>
        </div>
        <p className="muted">
          所有食材确认后才用于配餐，最终用量以你填写的确认量为准；切换参照物后会按新参照物重新估算，请再次确认。
        </p>
      </section>
    </div>
  )
}
