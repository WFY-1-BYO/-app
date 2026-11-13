import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { createMealSession } from '../lib/mealPlanner'
import { createManualIngredient, recognizeIngredientsFromFile } from '../lib/ai'
import type { MealIngredient, MealType } from '../types'

const mealOptions: Array<{ value: MealType; label: string }> = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'snack', label: '加餐' },
]

export default function MealNew() {
  const navigate = useNavigate()
  const profile = useAppStore(state => state.data.profile)
  const addMealSession = useAppStore(state => state.addMealSession)
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [referenceObject, setReferenceObject] = useState(false)
  const [ingredients, setIngredients] = useState<MealIngredient[]>([])
  const [recognitionNote, setRecognitionNote] = useState('')
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('100')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (!selected) return
    const url = URL.createObjectURL(selected)
    setPreviewUrl(url)
    const result = await recognizeIngredientsFromFile(selected)
    setIngredients(result.ingredients)
    setRecognitionNote(result.note)
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
    setIngredients([...ingredients, createManualIngredient(name, amount)])
    setNewName('')
    setNewAmount('100')
    setError('')
  }

  const updateIngredient = (id: string, patch: Partial<MealIngredient>) => {
    setIngredients(ingredients.map(item => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(item => item.id !== id))
  }

  const generate = async () => {
    if (!profile) {
      navigate('/onboarding')
      return
    }
    if (ingredients.filter(item => item.source === 'current' && item.used).length === 0) {
      setError('请至少确认一种当次已有食材。')
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
      <section className="card">
        <h1 className="section-title">拍照配餐</h1>
        <p className="muted">
          请把当次食材分开放置，并放入一个固定参照物。识别结果需要由你确认后才会用于配餐。
        </p>

        <div className="form-row">
          <span>餐次</span>
          <div className="chip-group">
            {mealOptions.map(option => (
              <button
                type="button"
                key={option.value}
                className={`chip ${mealType === option.value ? 'active' : ''}`}
                onClick={() => setMealType(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="meal-photo">当次食材照片</label>
          <input
            id="meal-photo"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChange}
          />
        </div>

        <div className="form-row">
          <label htmlFor="reference">已放入固定参照物</label>
          <input
            id="reference"
            type="checkbox"
            checked={referenceObject}
            onChange={event => setReferenceObject(event.target.checked)}
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
              </article>
            ))}
          </div>
        )}

        <div className="row">
          <input
            aria-label="食材名称"
            placeholder="食材名称"
            value={newName}
            onChange={event => setNewName(event.target.value)}
          />
          <input
            aria-label="用量"
            type="number"
            min="1"
            value={newAmount}
            onChange={event => setNewAmount(event.target.value)}
            style={{ width: 100 }}
          />
          <button type="button" className="button secondary" onClick={addIngredient}>
            添加食材
          </button>
        </div>

        {error && <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>}

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
            }}
          >
            重新开始
          </button>
        </div>
        <p className="muted">
          {referenceObject
            ? '已确认参照物，估算会更稳定。'
            : '建议放入固定参照物，提高用量估算准确度。'}
        </p>
      </section>
    </div>
  )
}
