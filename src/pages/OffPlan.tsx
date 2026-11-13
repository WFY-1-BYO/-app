import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { createId, nowIso } from '../lib/id'
import { nutritionFromIngredients } from '../lib/nutrition'
import { createManualIngredient } from '../lib/ai'
import type { MealLog, MealType } from '../types'

type Choice = 'original' | 'small' | 'normal'

const mealOptions: Array<{ value: MealType; label: string }> = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'snack', label: '加餐' },
]

const choiceOptions: Array<{ value: Choice; label: string; description: string }> = [
  {
    value: 'original',
    label: '按原计划吃',
    description: '保持当次配餐，不吃计划外食物。',
  },
  {
    value: 'small',
    label: '少量或调整搭配',
    description: '可以吃，但控制份量，并让当天其他餐更清淡。',
  },
  {
    value: 'normal',
    label: '偶尔正常吃',
    description: '一顿不会否定长期坚持，下一餐正常回归即可。',
  },
]

export default function OffPlan() {
  const navigate = useNavigate()
  const data = useAppStore(state => state.data)
  const addMealLog = useAppStore(state => state.addMealLog)
  const [foodName, setFoodName] = useState('肯德基套餐')
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [choice, setChoice] = useState<Choice>('normal')
  const [amount, setAmount] = useState('1')
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  const suggestion =
    choice === 'original'
      ? '很好，继续保持当次配餐。'
      : choice === 'small'
        ? '可以少量吃，同时把今天其他餐做得更清淡一些。'
        : '偶尔吃一次不会清零长期成果，下一餐正常吃就好。'

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!foodName.trim()) return
    const numericAmount = Number(amount)
    const ingredient = createManualIngredient(
      foodName.trim(),
      Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount : 1,
      'g',
      'cooked',
    )
    const nutrition = nutritionFromIngredients([ingredient])
    const log: MealLog = {
      id: createId('meallog'),
      date: nowIso(),
      mealType,
      items: [
        {
          dishId: '',
          name: foodName.trim(),
          amount: numericAmount > 0 ? numericAmount : 1,
          unit: 'g',
        },
      ],
      nutrition,
      isOffPlan: true,
      note:
        note.trim() ||
        (choice === 'small' ? '少量食用，当天其他餐更清淡' : '偶尔正常食用'),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      sourceDevice: 'current-device',
    }
    await addMealLog(log)
    setSaved(true)
  }

  if (saved) {
    return (
      <div className="card stack">
        <div>
          <h1 className="section-title">已经记下来了</h1>
          <p className="muted">
            之前的坚持仍然算数。下一餐正常回归，不需要用极端节食或额外消耗来补偿。
          </p>
        </div>
        <div className="row">
          <button type="button" className="button" onClick={() => navigate('/')}>
            回到今天
          </button>
          <Link to="/records" className="button ghost">
            查看记录
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form className="card form-grid" onSubmit={save} aria-label="计划外饮食">
      <div>
        <h1 className="section-title">我想吃点别的</h1>
        <p className="muted">
          偶尔想吃计划外食物很正常。你可以选择自己的处理方式，App 不会批评你。
        </p>
      </div>

      <div className="form-row">
        <label htmlFor="food-name">想吃的食物</label>
        <input
          id="food-name"
          value={foodName}
          onChange={event => setFoodName(event.target.value)}
        />
      </div>

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
        <label htmlFor="food-amount">估算食用量（g 或份）</label>
        <input
          id="food-amount"
          type="number"
          min="0"
          value={amount}
          onChange={event => setAmount(event.target.value)}
        />
      </div>

      <div className="form-row">
        <span>处理方式</span>
        <div className="stack">
          {choiceOptions.map(option => (
            <button
              type="button"
              key={option.value}
              className={`chip ${choice === option.value ? 'active' : ''}`}
              onClick={() => setChoice(option.value)}
            >
              {option.label}
            </button>
          ))}
          <p className="muted">
            {choiceOptions.find(option => option.value === choice)?.description}
          </p>
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="off-plan-note">备注</label>
        <textarea
          id="off-plan-note"
          rows={2}
          value={note}
          onChange={event => setNote(event.target.value)}
          placeholder="例如：今天很想吃，吃完心里舒服"
        />
      </div>

      <p>{suggestion}</p>
      <p className="muted">
        如果医生明确限制这类食物，系统会在记录中给出更醒目的提醒。
        {data.profile?.diseases.length ? '已按你填写的疾病情况保留限制。' : ''}
      </p>

      <button type="submit" className="button">
        记录这次选择
      </button>
    </form>
  )
}
