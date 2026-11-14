import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore, createDefaultProfile } from '../store/appStore'
import type { Disease, Goal, Taste } from '../types'

const goalOptions: Array<{ value: Goal; label: string; description: string }> = [
  { value: 'gain_muscle', label: '增肌', description: '更关注蛋白质和训练恢复' },
  { value: 'lose_fat', label: '减脂', description: '控制整体能量，保留饱腹感' },
  { value: 'maintain_health', label: '维持健康', description: '均衡饮食，长期稳定' },
]

const tasteOptions: Array<{ value: Taste; label: string }> = [
  { value: 'spicy', label: '辣口' },
  { value: 'sweet', label: '甜口' },
  { value: 'sour', label: '酸口' },
  { value: 'mild', label: '温和' },
  { value: 'light', label: '清淡' },
]

/** 活动水平讲解：用生活场景解释每一档，用户不需要猜术语 */
const activityOptions: Array<{
  value: 'sedentary' | 'light' | 'moderate' | 'active'
  label: string
  detail: string
}> = [
  {
    value: 'sedentary',
    label: '久坐为主',
    detail: '大部分时间坐着：办公室工作、在家看电视、很少走动，一周基本没有运动。',
  },
  {
    value: 'light',
    label: '轻度活动',
    detail: '每周有 1–3 次轻度运动，比如散步、做家务、骑车通勤，日常偶尔走动。',
  },
  {
    value: 'moderate',
    label: '中等活动',
    detail: '每周有 3–5 次中等强度运动（快走、慢跑、健身），或工作需要经常走动、站立。',
  },
  {
    value: 'active',
    label: '活动较多',
    detail: '每周锻炼 5 次以上，或从事体力劳动（搬运、快递、工地），日常活动量很大。',
  },
]

const diseaseOptions: Array<{ value: Disease; label: string }> = [
  { value: 'hypertension', label: '高血压' },
  { value: 'diabetes', label: '糖尿病' },
  { value: 'kidney_disease', label: '肾病' },
  { value: 'other', label: '其他' },
]

const CURRENT_YEAR = new Date().getFullYear()

export default function Onboarding() {
  const navigate = useNavigate()
  const setProfile = useAppStore(state => state.setProfile)
  const existing = useAppStore(state => state.data.profile)
  const isEditing = Boolean(existing)
  const [nickname, setNickname] = useState(existing?.nickname ?? '')
  const [goal, setGoal] = useState<Goal>(existing?.goal ?? 'maintain_health')
  const [sex, setSex] = useState<'male' | 'female' | 'other' | ''>(existing?.sex ?? '')
  const [heightCm, setHeightCm] = useState(
    existing?.heightCm != null ? String(existing.heightCm) : '',
  )
  const [weightKg, setWeightKg] = useState(
    existing?.weightKg != null ? String(existing.weightKg) : '',
  )
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active'>(
    existing?.activityLevel ?? 'light',
  )
  const [tastes, setTastes] = useState<Taste[]>(existing?.tastes ?? [])
  const [customTastes, setCustomTastes] = useState<string[]>(existing?.customTastes ?? [])
  const [customTasteInput, setCustomTasteInput] = useState('')
  // 出生日期直接填年月日；已有档案时拆成三段回填
  const existingBirth = existing?.birthDate ?? ''
  const [birthYear, setBirthYear] = useState(existingBirth ? existingBirth.slice(0, 4) : '')
  const [birthMonth, setBirthMonth] = useState(existingBirth ? existingBirth.slice(5, 7) : '')
  const [birthDay, setBirthDay] = useState(existingBirth ? existingBirth.slice(8, 10) : '')
  const [allergies, setAllergies] = useState((existing?.allergies ?? []).join('、'))
  const [avoid, setAvoid] = useState((existing?.avoid ?? []).join('、'))
  const [diseases, setDiseases] = useState<Disease[]>(existing?.diseases ?? [])
  const [doctorRestrictions, setDoctorRestrictions] = useState(existing?.doctorRestrictions ?? '')
  const [error, setError] = useState('')

  const toggleArray = <T,>(values: T[], value: T): T[] =>
    values.includes(value) ? values.filter(item => item !== value) : [...values, value]

  /** 三段生日拼成 ISO 日期；全空返回 undefined（选填），填了一部分返回 'invalid' */
  const buildBirthDate = (): string | undefined | 'invalid' => {
    if (!birthYear && !birthMonth && !birthDay) return undefined
    if (!birthYear || !birthMonth || !birthDay) return 'invalid'
    const y = Number(birthYear)
    const m = Number(birthMonth)
    const d = Number(birthDay)
    const thisYear = CURRENT_YEAR
    if (!Number.isInteger(y) || y < 1900 || y > thisYear) return 'invalid'
    if (!Number.isInteger(m) || m < 1 || m > 12) return 'invalid'
    const maxDay = new Date(y, m, 0).getDate()
    if (!Number.isInteger(d) || d < 1 || d > maxDay) return 'invalid'
    return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const addCustomTaste = () => {
    const name = customTasteInput.trim()
    if (!name) return
    if (customTastes.includes(name)) {
      setCustomTasteInput('')
      return
    }
    setCustomTastes([...customTastes, name].slice(0, 10))
    setCustomTasteInput('')
  }

  const removeCustomTaste = (name: string) => {
    setCustomTastes(customTastes.filter(item => item !== name))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!nickname.trim()) {
      setError('请先填写昵称。')
      return
    }
    if (!goal) {
      setError('请选择一个饮食目标。')
      return
    }
    const birthDate = buildBirthDate()
    if (birthDate === 'invalid') {
      setError('出生日期的年、月、日要填完整（比如 1998 年 5 月 20 日）。')
      return
    }
    const profile = createDefaultProfile({
      id: existing?.id,
      createdAt: existing?.createdAt,
      nickname: nickname.trim(),
      goal,
      sex: sex || undefined,
      birthDate,
      heightCm: heightCm ? Number(heightCm) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      activityLevel,
      tastes,
      customTastes,
      allergies: allergies
        .split(/[,，、\s]+/)
        .map(item => item.trim())
        .filter(Boolean),
      avoid: avoid
        .split(/[,，、\s]+/)
        .map(item => item.trim())
        .filter(Boolean),
      diseases,
      doctorRestrictions,
    })
    await setProfile(profile)
    navigate(isEditing ? '/mine' : '/')
  }

  return (
    <form
      className="card form-grid"
      onSubmit={submit}
      noValidate
      aria-label={isEditing ? '编辑个人档案' : '创建个人档案'}
    >
      <div>
        <h1 className="section-title">
          {isEditing ? '编辑你的营养档案' : '创建你的营养档案'}
        </h1>
        <p className="muted">
          这些信息只保存在本机，用于让配餐建议更贴近你的目标和生活。
          {isEditing ? '已填入你之前保存的内容，修改后保存即可。' : ''}
        </p>
      </div>

      <div className="form-row">
        <label htmlFor="nickname">昵称</label>
        <input
          id="nickname"
          value={nickname}
          onChange={event => setNickname(event.target.value)}
          placeholder="你想被怎样称呼？"
        />
      </div>

      <div className="form-row">
        <span>饮食目标</span>
        <div className="chip-group">
          {goalOptions.map(option => (
            <button
              type="button"
              key={option.value}
              className={`chip ${goal === option.value ? 'active' : ''}`}
              onClick={() => setGoal(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="muted">{goalOptions.find(option => option.value === goal)?.description}</p>
      </div>

      <div className="form-row">
        <label htmlFor="sex">生理性别</label>
        <select id="sex" value={sex} onChange={event => setSex(event.target.value as typeof sex)}>
          <option value="">不填写</option>
          <option value="male">男</option>
          <option value="female">女</option>
          <option value="other">其他</option>
        </select>
      </div>

      <div className="form-row">
        <span>出生日期</span>
        <div className="birth-row" role="group" aria-label="出生日期">
          <label className="birth-field">
            <span className="muted">年</span>
            <input
              aria-label="出生年份"
              type="number"
              inputMode="numeric"
              placeholder="1998"
              min="1900"
              max={CURRENT_YEAR}
              value={birthYear}
              onChange={event => setBirthYear(event.target.value)}
            />
          </label>
          <label className="birth-field">
            <span className="muted">月</span>
            <input
              aria-label="出生月份"
              type="number"
              inputMode="numeric"
              placeholder="5"
              min="1"
              max="12"
              value={birthMonth}
              onChange={event => setBirthMonth(event.target.value)}
            />
          </label>
          <label className="birth-field">
            <span className="muted">日</span>
            <input
              aria-label="出生日期（日）"
              type="number"
              inputMode="numeric"
              placeholder="20"
              min="1"
              max="31"
              value={birthDay}
              onChange={event => setBirthDay(event.target.value)}
            />
          </label>
        </div>
        <p className="muted">直接填数字就行，比如 1998 年 5 月 20 日；不填也可以。</p>
      </div>

      <div className="form-row">
        <label htmlFor="height">身高（cm）</label>
        <input
          id="height"
          type="number"
          min="80"
          max="250"
          value={heightCm}
          onChange={event => setHeightCm(event.target.value)}
        />
      </div>

      <div className="form-row">
        <label htmlFor="weight">体重（kg）</label>
        <input
          id="weight"
          type="number"
          min="25"
          max="250"
          value={weightKg}
          onChange={event => setWeightKg(event.target.value)}
        />
      </div>

      <div className="form-row">
        <span>日常活动水平</span>
        <div className="chip-group" role="group" aria-label="日常活动水平">
          {activityOptions.map(option => (
            <button
              type="button"
              key={option.value}
              className={`chip ${activityLevel === option.value ? 'active' : ''}`}
              aria-pressed={activityLevel === option.value}
              onClick={() => setActivityLevel(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="muted">
          {activityOptions.find(option => option.value === activityLevel)?.detail}
        </p>
        <p className="muted">不确定就往低选：选低了建议更保守，不会让你吃超。</p>
      </div>

      <div className="form-row">
        <span>口味偏好</span>
        <div className="chip-group">
          {tasteOptions.map(option => (
            <button
              type="button"
              key={option.value}
              className={`chip ${tastes.includes(option.value) ? 'active' : ''}`}
              onClick={() => setTastes(toggleArray(tastes, option.value))}
            >
              {option.label}
            </button>
          ))}
          {customTastes.map(name => (
            <button
              type="button"
              key={name}
              className="chip active custom-chip"
              aria-label={`移除自定义口味 ${name}`}
              title="点一下移除"
              onClick={() => removeCustomTaste(name)}
            >
              {name} ×
            </button>
          ))}
        </div>
        <div className="row custom-taste-row">
          <input
            aria-label="自定义口味"
            placeholder="其他口味？自己加一个，比如：不吃香菜、爱喝汤"
            value={customTasteInput}
            onChange={event => setCustomTasteInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addCustomTaste()
              }
            }}
          />
          <button type="button" className="button small secondary" onClick={addCustomTaste}>
            添加口味
          </button>
        </div>
        <p className="muted">预设不够用就自己加；添加后点一下标签可以移除。</p>
      </div>

      <div className="form-row">
        <label htmlFor="allergies">食物过敏（用逗号或顿号分隔）</label>
        <input
          id="allergies"
          value={allergies}
          onChange={event => setAllergies(event.target.value)}
          placeholder="例如：花生、虾"
        />
      </div>

      <div className="form-row">
        <label htmlFor="avoid">明确忌口（用逗号或顿号分隔）</label>
        <input
          id="avoid"
          value={avoid}
          onChange={event => setAvoid(event.target.value)}
          placeholder="例如：香菜、动物内脏"
        />
      </div>

      <div className="form-row">
        <span>已填写疾病情况</span>
        <div className="chip-group">
          {diseaseOptions.map(option => (
            <button
              type="button"
              key={option.value}
              className={`chip ${diseases.includes(option.value) ? 'active' : ''}`}
              onClick={() => setDiseases(toggleArray(diseases, option.value))}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="muted">
          疾病信息只用于调整饮食建议，不会用于诊断，也不会替代医生意见。
        </p>
      </div>

      <div className="form-row">
        <label htmlFor="doctor">医生或临床营养师给出的饮食限制</label>
        <textarea
          id="doctor"
          rows={3}
          value={doctorRestrictions}
          onChange={event => setDoctorRestrictions(event.target.value)}
          placeholder="如果有明确的限制，请填写在这里"
        />
      </div>

      {error && <p style={{ color: 'var(--notice-ink)', margin: 0 }}>{error}</p>}

      <div className="row">
        <button type="submit" className="button">
          {isEditing ? '保存修改' : '保存并开始'}
        </button>
        <button
          type="button"
          className="button ghost"
          onClick={() => {
            setGoal('maintain_health')
            setTastes([])
            setDiseases([])
          }}
        >
          清除选择
        </button>
      </div>
    </form>
  )
}
