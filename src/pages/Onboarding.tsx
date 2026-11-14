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

const diseaseOptions: Array<{ value: Disease; label: string }> = [
  { value: 'hypertension', label: '高血压' },
  { value: 'diabetes', label: '糖尿病' },
  { value: 'kidney_disease', label: '肾病' },
  { value: 'other', label: '其他' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const setProfile = useAppStore(state => state.setProfile)
  const existing = useAppStore(state => state.data.profile)
  const isEditing = Boolean(existing)
  const [nickname, setNickname] = useState(existing?.nickname ?? '')
  const [goal, setGoal] = useState<Goal>(existing?.goal ?? 'maintain_health')
  const [sex, setSex] = useState<'male' | 'female' | 'other' | ''>(existing?.sex ?? '')
  const [birthDate, setBirthDate] = useState(existing?.birthDate ?? '')
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
  const [allergies, setAllergies] = useState((existing?.allergies ?? []).join('、'))
  const [avoid, setAvoid] = useState((existing?.avoid ?? []).join('、'))
  const [diseases, setDiseases] = useState<Disease[]>(existing?.diseases ?? [])
  const [doctorRestrictions, setDoctorRestrictions] = useState(existing?.doctorRestrictions ?? '')
  const [error, setError] = useState('')

  const toggleArray = <T,>(values: T[], value: T): T[] =>
    values.includes(value) ? values.filter(item => item !== value) : [...values, value]

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
    const profile = createDefaultProfile({
      id: existing?.id,
      createdAt: existing?.createdAt,
      nickname: nickname.trim(),
      goal,
      sex: sex || undefined,
      birthDate: birthDate || undefined,
      heightCm: heightCm ? Number(heightCm) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      activityLevel,
      tastes,
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
        <label htmlFor="birthDate">出生日期</label>
        <input
          id="birthDate"
          type="date"
          value={birthDate}
          onChange={event => setBirthDate(event.target.value)}
        />
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
        <label htmlFor="activity">日常活动水平</label>
        <select
          id="activity"
          value={activityLevel}
          onChange={event => setActivityLevel(event.target.value as typeof activityLevel)}
        >
          <option value="sedentary">久坐为主</option>
          <option value="light">轻度活动</option>
          <option value="moderate">中等活动</option>
          <option value="active">活动较多</option>
        </select>
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
        </div>
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
