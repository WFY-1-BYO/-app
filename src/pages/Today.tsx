import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { dailyKnowledge } from '../lib/knowledge'
import { dateKey, formatDate } from '../lib/id'

const goalText = {
  gain_muscle: '增肌',
  lose_fat: '减脂',
  maintain_health: '维持健康',
} as const

export default function Today() {
  const data = useAppStore(state => state.data)
  const toggleKnowledgeFavorite = useAppStore(state => state.toggleKnowledgeFavorite)
  const markKnowledgeRead = useAppStore(state => state.markKnowledgeRead)
  const [now] = useState(() => new Date())
  const [whyOpen, setWhyOpen] = useState(false)
  const today = dateKey(now)
  const hour = now.getHours()
  const displayDate = formatDate(now)
  const knowledge = dailyKnowledge(today)
  const saved = data.knowledge.find(item => item.id === knowledge.id)
  const todayLogs = data.mealLogs.filter(log => dateKey(log.date) === today)
  const mealTypes = new Set(todayLogs.map(log => log.mealType))
  const nextMeal =
    !mealTypes.has('breakfast') && hour < 10
      ? '早餐'
      : !mealTypes.has('lunch') && hour < 15
        ? '午餐'
        : !mealTypes.has('dinner')
          ? '晚餐'
          : '加餐'
  const suggestTime =
    nextMeal === '早餐' ? '8:00' : nextMeal === '午餐' ? '12:30' : '18:30'
  const calorieRange =
    data.profile?.goal === 'lose_fat'
      ? '450–550'
      : data.profile?.goal === 'gain_muscle'
        ? '650–800'
        : '500–650'

  if (!data.profile) {
    return (
      <div className="card stack">
        <div>
          <h1 className="section-title">先建立你的营养档案</h1>
          <p className="muted">
            我需要先了解你的目标、口味和忌口，才能给出更合适的配餐建议。
          </p>
        </div>
        <Link to="/onboarding" className="button cta-primary">
          开始创建
        </Link>
      </div>
    )
  }

  return (
    <div className="stack today-page">
      {/* 1. 日期与目标：单行弱视觉 */}
      <header className="today-head">
        <div>
          <p className="muted today-date">{displayDate}</p>
          <h1 className="today-title">{nextMeal}还来得及好好安排</h1>
        </div>
        <span className="goal-pill">目标：{goalText[data.profile.goal]}</span>
      </header>

      {/* 2. 下一餐卡片 + 唯一主行动按钮 */}
      <section className="card next-meal-card" aria-label="下一餐">
        <span className="eyebrow">下一餐 · {nextMeal}</span>
        <h2 className="next-meal-title">
          用当次已有食材，配一餐主食、蛋白质和蔬菜都照顾到的搭配
        </h2>
        <p className="muted next-meal-hint">
          建议 {suggestTime} 前后 · 约 {calorieRange} kcal
        </p>
        <Link to="/meal/new" className="button cta-primary">
          <span aria-hidden>📷</span> 拍照配餐
        </Link>
        <p className="muted next-meal-note">
          只使用当次拍照并确认的食材；需要补充的食材会单独给出建议，不混入本餐。
        </p>
      </section>

      {/* 3. 营养师说：今日知识气泡 */}
      <section className="card knowledge-bubble" aria-label="营养师说">
        <img src="/assistant.svg" alt="知夏" className="bubble-avatar" />
        <div className="bubble-body">
          <span className="bubble-from">知夏 · 今日知识</span>
          <p className="bubble-text">{knowledge.summary}</p>
          <p className="muted bubble-title">{knowledge.title}</p>
          <div className="row bubble-actions">
            <button
              type="button"
              className="button small ghost"
              onClick={() => {
                setWhyOpen(value => !value)
                if (!saved?.readAt) void markKnowledgeRead(knowledge.id)
              }}
            >
              {whyOpen ? '收起' : '展开说说为什么'}
            </button>
            <button
              type="button"
              className={`button small ${saved?.favorite ? '' : 'secondary'}`}
              onClick={() => void toggleKnowledgeFavorite(knowledge.id)}
            >
              {saved?.favorite ? '已收进知识册' : '收进知识册'}
            </button>
            <Link to="/knowledge" className="bubble-link">
              知识册 ›
            </Link>
          </div>
          {whyOpen && (
            <div className="bubble-why">
              <strong>为什么这样说</strong>
              <p>{knowledge.why}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
