import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { dailyKnowledge } from '../lib/knowledge'
import { getNextMedal } from '../lib/medals'
import { dateKey, formatDate } from '../lib/id'

export default function Today() {
  const data = useAppStore(state => state.data)
  const [now] = useState(() => new Date())
  const today = dateKey(now)
  const hour = now.getHours()
  const displayDate = formatDate(now)
  const knowledge = dailyKnowledge(today)
  const medal = getNextMedal(data)
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

  if (!data.profile) {
    return (
      <div className="card stack">
        <div>
          <h1 className="section-title">先建立你的营养档案</h1>
          <p className="muted">
            我需要先了解你的目标、口味和忌口，才能给出更合适的配餐建议。
          </p>
        </div>
        <Link to="/onboarding" className="button">
          开始创建
        </Link>
      </div>
    )
  }

  return (
    <div className="stack">
      <section className="card spread">
        <div>
          <p className="muted">{displayDate}</p>
          <h1 className="section-title">{nextMeal}还来得及好好安排</h1>
          <p className="muted">
            {data.profile.nickname}，今天的建议会继续围绕你的目标调整。
          </p>
        </div>
        <div className="stat">
          <strong>{new Set(data.mealLogs.map(log => dateKey(log.date))).size}</strong>
          <span>累计记录日</span>
        </div>
      </section>

      <section className="card meal-card">
        <div className="spread">
          <div>
            <h2 className="section-title">下一餐</h2>
            <p className="muted">根据当次已有食材生成具体菜品和用量。</p>
          </div>
          <Link to="/meal/new" className="button">
            拍照配餐
          </Link>
        </div>
        <div className="row">
          {(['breakfast', 'lunch', 'dinner'] as const).map(meal => {
            const label =
              meal === 'breakfast' ? '早餐' : meal === 'lunch' ? '午餐' : '晚餐'
            const done = mealTypes.has(meal)
            return (
              <span key={meal} className={`chip ${done ? 'active' : ''}`}>
                {label} {done ? '已记录' : '未记录'}
              </span>
            )
          })}
        </div>
      </section>

      <div className="two-col">
        <section className="card">
          <div className="spread">
            <div>
              <h2 className="section-title">营养师说</h2>
              <p>{knowledge.summary}</p>
            </div>
            <Link to="/knowledge" className="button small secondary">
              为什么
            </Link>
          </div>
          <p className="muted">{knowledge.title}</p>
        </section>

        <section className="card stack">
          <div className="spread">
            <div>
              <h2 className="section-title">下一步勋章</h2>
              {medal ? (
                <>
                  <p>
                    {medal.name}：{medal.current}/{medal.target}
                  </p>
                  <div className="progress">
                    <span
                      style={{
                        width: `${Math.min(100, Math.round((medal.current / medal.target) * 100))}%`,
                      }}
                    />
                  </div>
                </>
              ) : (
                <p className="muted">当前勋章都已点亮。</p>
              )}
            </div>
            <Link to="/medals" className="button small ghost">
              勋章墙
            </Link>
          </div>
          <div className="row">
            <Link to="/exercise" className="button small ghost">
              运动记录
            </Link>
            <Link to="/health" className="button small ghost">
              健康指标
            </Link>
            <Link to="/off-plan" className="button small ghost">
              我想吃点别的
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
