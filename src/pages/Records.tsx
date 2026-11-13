import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { dateKey, formatDate } from '../lib/id'
import { computeStreak, recentDates, summarizeNutrition } from '../lib/stats'
import NutritionPie from '../components/NutritionPie'
import { evaluateMeal } from '../lib/nutrition'
import { getNextMedal } from '../lib/medals'

export default function Records() {
  const data = useAppStore(state => state.data)
  const toggleRestDay = useAppStore(state => state.toggleRestDay)
  const [today] = useState(() => dateKey(new Date()))
  const isRestDay = data.restDays.includes(today)
  const recordDates = new Set(data.mealLogs.map(log => dateKey(log.date)))
  const sortedDates = Array.from(recordDates).sort((a, b) => b.localeCompare(a))
  const streak = computeStreak(data.mealLogs, data.restDays)
  const recent = recentDates(data.mealLogs, 7)
  const selectedDate = recent[0] ?? today
  const todayLogs = data.mealLogs.filter(log => dateKey(log.date) === today)
  const selectedLogs = data.mealLogs.filter(log => dateKey(log.date) === selectedDate)
  const selectedNutrition = summarizeNutrition(selectedLogs)
  const offPlanCount = data.mealLogs.filter(log => log.isOffPlan).length
  const medal = getNextMedal(data)
  const evaluation = data.profile
    ? evaluateMeal(
        selectedNutrition,
        data.profile,
        selectedLogs[0]?.mealType ?? 'lunch',
      )
    : null

  return (
    <div className="stack">
      <section className="card">
        <h1 className="section-title">记录</h1>
        <div className="stat-grid">
          <div className="stat">
            <strong>{streak.totalDays}</strong>
            <span>累计记录日</span>
          </div>
          <div className="stat">
            <strong>{streak.current}</strong>
            <span>当前连续记录</span>
          </div>
          <div className="stat">
            <strong>{streak.longest}</strong>
            <span>历史最长记录</span>
          </div>
          <div className="stat">
            <strong>{data.mealLogs.length}</strong>
            <span>用餐记录</span>
          </div>
          <div className="stat">
            <strong>{offPlanCount}</strong>
            <span>计划外饮食</span>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          计划外饮食不会清零坚持成果，它只是真实生活的一部分。
        </p>
        <button
          type="button"
          className="button small ghost"
          onClick={() => void toggleRestDay(today)}
        >
          {isRestDay ? '取消今日休息日' : '把今天标记为休息日'}
        </button>
      </section>

      <section className="card stack" aria-label="今天三餐状态">
        <h2 className="section-title">今天三餐</h2>
        <div className="row">
          {(['breakfast', 'lunch', 'dinner'] as const).map(meal => {
            const label =
              meal === 'breakfast' ? '早餐' : meal === 'lunch' ? '午餐' : '晚餐'
            const done = todayLogs.some(log => log.mealType === meal)
            return (
              <span key={meal} className={`chip ${done ? 'active' : ''}`}>
                {label} {done ? '已记录' : '待配餐'}
              </span>
            )
          })}
        </div>
      </section>

      <section className="card stack" aria-label="更多记录入口">
        <h2 className="section-title">其他记录</h2>
        <div className="row">
          <Link to="/health" className="button small ghost">
            健康指标
          </Link>
          <Link to="/off-plan" className="button small ghost">
            我想吃点别的
          </Link>
          <Link to="/meal/new" className="button small secondary">
            拍照配餐
          </Link>
        </div>
      </section>

      <div className="two-col">
        <section className="card stack">
          <h2 className="section-title">最近营养比例</h2>
          {selectedLogs.length === 0 ? (
            <p className="muted">暂无用餐记录。</p>
          ) : (
            <>
              <p className="muted">{formatDate(selectedDate)} 的供能比例</p>
              <NutritionPie nutrition={selectedNutrition} />
              {evaluation && <p>{evaluation.message}</p>}
              <p className="muted">
                碳水 {selectedNutrition.carbs}g · 蛋白质 {selectedNutrition.protein}g · 脂肪{' '}
                {selectedNutrition.fat}g · 能量 {selectedNutrition.calories}kcal
              </p>
            </>
          )}
        </section>

        <section className="card stack">
          <h2 className="section-title">坚持与勋章</h2>
          {medal ? (
            <>
              <p>
                {medal.name}：{medal.current}/{medal.target}
              </p>
              <div className="progress">
                <span
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((medal.current / medal.target) * 100),
                    )}%`,
                  }}
                />
              </div>
              <p className="muted">{medal.condition}</p>
            </>
          ) : (
            <p className="muted">当前勋章都已点亮。</p>
          )}
          <Link to="/medals" className="button small secondary">
            查看勋章墙
          </Link>
        </section>
      </div>

      <section className="card stack">
        <div className="spread">
          <h2 className="section-title">用餐历史</h2>
          <Link to="/meal/new" className="button small secondary">
            记一餐
          </Link>
        </div>
        {data.mealLogs.length === 0 ? (
          <p className="muted">还没有用餐记录。</p>
        ) : (
          <div className="stack">
            {sortedDates.slice(0, 10).map(date => {
              const logs = data.mealLogs.filter(log => dateKey(log.date) === date)
              const summary = summarizeNutrition(logs)
              return (
                <article key={date} className="card" style={{ boxShadow: 'none' }}>
                  <div className="spread">
                    <strong>{formatDate(date)}</strong>
                    <span className="muted">
                      {summary.calories} kcal · {logs.length} 条记录
                    </span>
                  </div>
                  <ul>
                    {logs.map(log => (
                      <li key={log.id}>
                        {log.mealType === 'breakfast'
                          ? '早餐'
                          : log.mealType === 'lunch'
                            ? '午餐'
                            : log.mealType === 'dinner'
                              ? '晚餐'
                              : '加餐'}
                        ：{log.items.map(item => item.name).join('、') || '未填写'}
                        {log.isOffPlan ? '（计划外）' : ''}
                      </li>
                    ))}
                  </ul>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
