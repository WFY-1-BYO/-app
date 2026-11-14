import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { createId, nowIso } from '../lib/id'
import { nutritionFromIngredients } from '../lib/nutrition'
import type { MealLog, MealLogItem } from '../types'

export default function MealConfirm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const session = useAppStore(state =>
    state.data.mealSessions.find(item => item.id === id),
  )
  const addMealLog = useAppStore(state => state.addMealLog)
  const [amounts, setAmounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    session?.ingredients.forEach(ingredient => {
      initial[ingredient.id] = ingredient.confirmedAmount ?? ingredient.estimatedAmount ?? 0
    })
    return initial
  })
  const [isOffPlan, setIsOffPlan] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  if (!session) {
    return (
      <div className="card stack">
        <div>
          <h1 className="section-title">没有找到这次配餐</h1>
          <p className="muted">无法确认不存在的配餐。</p>
        </div>
        <Link to="/meal/new" className="button">
          重新配餐
        </Link>
      </div>
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const usedIngredients = session.ingredients.filter(ingredient => ingredient.used)
    if (usedIngredients.length === 0) {
      setError('请至少确认一种实际食用的食材。')
      return
    }
    const items: MealLogItem[] = usedIngredients.map(ingredient => ({
      dishId: session.dishes.find(dish => dish.ingredientIds.includes(ingredient.id))?.id ?? '',
      name: ingredient.name,
      amount: amounts[ingredient.id] ?? 0,
      unit: ingredient.unit,
    }))
    const adjustedIngredients = usedIngredients.map(ingredient => ({
      ...ingredient,
      confirmedAmount: amounts[ingredient.id] ?? 0,
    }))
    const nutrition = nutritionFromIngredients(adjustedIngredients)
    const log: MealLog = {
      id: createId('meallog'),
      sessionId: session.id,
      date: nowIso(),
      mealType: session.mealType,
      items,
      nutrition,
      isOffPlan,
      note: note.trim() || undefined,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      sourceDevice: 'current-device',
    }
    await addMealLog(log)
    navigate('/records')
  }

  return (
    <form className="card form-grid" onSubmit={submit} aria-label="确认实际用餐">
      <div>
        <h1 className="section-title">确认实际用餐</h1>
        <p className="muted">记录实际吃的量，不用追求精确到克。</p>
      </div>

      <div className="stack">
        {session.ingredients.map(ingredient => (
          <div className="form-row" key={ingredient.id}>
            <label htmlFor={ingredient.id}>
              {ingredient.name}（{ingredient.unit}）
            </label>
            <input
              id={ingredient.id}
              type="number"
              min="0"
              value={amounts[ingredient.id] ?? 0}
              onChange={event =>
                setAmounts({
                  ...amounts,
                  [ingredient.id]: Number(event.target.value),
                })
              }
            />
          </div>
        ))}
      </div>

      <div className="form-row">
        <label htmlFor="off-plan">这次属于计划外饮食</label>
        <input
          id="off-plan"
          type="checkbox"
          checked={isOffPlan}
          onChange={event => setIsOffPlan(event.target.checked)}
        />
      </div>

      <div className="form-row">
        <label htmlFor="note">备注</label>
        <textarea
          id="note"
          rows={3}
          value={note}
          onChange={event => setNote(event.target.value)}
          placeholder="例如：在肯德基吃了套餐，下一餐正常回归"
        />
      </div>

      {error && <p style={{ color: 'var(--notice-ink)', margin: 0 }}>{error}</p>}

      <div className="row">
        <button type="submit" className="button">
          保存用餐记录
        </button>
        <Link to={`/meal/${session.id}`} className="button ghost">
          返回菜谱
        </Link>
      </div>
      <p className="muted">
        计划外饮食不会清零长期成果，系统只会记录这一次的实际情况。
      </p>
    </form>
  )
}
