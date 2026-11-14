import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { dateKey, formatDate } from '../lib/id'
import { computeStreak, recentDates, summarizeNutrition } from '../lib/stats'
import NutritionPie from '../components/NutritionPie'
import { evaluateMeal } from '../lib/nutrition'
import { computeMedals, getNextMedal } from '../lib/medals'
import { metricLabels } from '../lib/health'
import { useIsTablet } from '../lib/breakpoint'

type RecordTab = 'diet' | 'health' | 'medal'

const mealNames: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
}

export default function Records() {
  const data = useAppStore(state => state.data)
  const toggleRestDay = useAppStore(state => state.toggleRestDay)
  const isTablet = useIsTablet()
  const [today] = useState(() => dateKey(new Date()))
  const [tab, setTab] = useState<RecordTab>('diet')
  const isRestDay = data.restDays.includes(today)
  const recordDates = new Set(data.mealLogs.map(log => dateKey(log.date)))
  const sortedDates = Array.from(recordDates).sort((a, b) => b.localeCompare(a))
  const streak = computeStreak(data.mealLogs, data.restDays)
  const recent = recentDates(data.mealLogs, 7)
  const [selectedDate, setSelectedDate] = useState(() => recent[0] ?? today)
  const todayLogs = data.mealLogs.filter(log => dateKey(log.date) === today)
  const selectedLogs = data.mealLogs.filter(log => dateKey(log.date) === selectedDate)
  const selectedNutrition = summarizeNutrition(selectedLogs)
  const offPlanCount = data.mealLogs.filter(log => log.isOffPlan).length
  const medal = getNextMedal(data)
  const unlockedMedals = computeMedals(data).filter(item => item.unlockedAt)
  const sortedMetrics = [...data.healthMetrics].sort((a, b) =>
    b.measuredAt.localeCompare(a.measuredAt),
  )
  const persistedDays = sortedDates.filter(date => {
    const logs = data.mealLogs.filter(log => dateKey(log.date) === date)
    return logs.some(log => !log.isOffPlan)
  }).length
  const evaluation = data.profile
    ? evaluateMeal(
        selectedNutrition,
        data.profile,
        selectedLogs[0]?.mealType ?? 'lunch',
      )
    : null
  const dayOffPlan = selectedLogs.filter(log => log.isOffPlan).length
  const isBalanced =
    selectedLogs.length > 0 &&
    (evaluation?.level === 'good' || evaluation?.level === 'acceptable')
  const base = new Date(`${today}T00:00:00`)
  const trend = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(base)
    date.setDate(date.getDate() - (13 - index))
    const key = dateKey(date)
    return {
      date: key,
      summary: summarizeNutrition(
        data.mealLogs.filter(log => dateKey(log.date) === key),
      ),
    }
  })
  const maxTrendCalories = Math.max(1, ...trend.map(item => item.summary.calories))

  // 手机：保持 V1.2 单列布局与全部既有功能、文案
  if (!isTablet) {
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
                          {mealNames[log.mealType] ?? '加餐'}：
                          {log.items.map(item => item.name).join('、') || '未填写'}
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

  // 平板：按 UI 方案图 15 左历史列表 / 右单次详情
  return (
    <div className="records-tablet">
      <div className="records-left stack">
        <section className="card">
          <div className="spread">
            <h1 className="section-title" style={{ margin: 0 }}>
              记录
            </h1>
            <span className="muted">{today.slice(0, 7).replace('-', ' 年 ')} 月</span>
          </div>
          <div className="stat-grid stat-grid-four">
            <div className="stat">
              <strong>{streak.totalDays}</strong>
              <span>记录日</span>
            </div>
            <div className="stat">
              <strong>{persistedDays}</strong>
              <span>累计坚持日</span>
            </div>
            <div className="stat">
              <strong>{streak.current}</strong>
              <span>当前连续</span>
            </div>
            <div className="stat">
              <strong>{streak.longest}</strong>
              <span>历史最长</span>
            </div>
          </div>
          <p className="muted" style={{ marginTop: 12 }}>
            漏记日只是中性格，中断不会清零坚持成果。
          </p>
        </section>

        <section className="card stack" aria-label="记录分类">
          <div className="chip-group" role="group" aria-label="记录分类切换">
            {(
              [
                ['diet', '饮食'],
                ['health', '健康'],
                ['medal', '勋章'],
              ] as const
            ).map(([key, label]) => (
              <button
                type="button"
                key={key}
                className={`chip ${tab === key ? 'active' : ''}`}
                aria-pressed={tab === key}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'diet' && (
            <div className="history-list">
              {sortedDates.length === 0 ? (
                <p className="muted">还没有用餐记录。</p>
              ) : (
                sortedDates.slice(0, 14).map(date => {
                  const logs = data.mealLogs.filter(log => dateKey(log.date) === date)
                  const summary = summarizeNutrition(logs)
                  const selected = date === selectedDate
                  return (
                    <button
                      type="button"
                      key={date}
                      className={`history-item ${selected ? 'selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() => setSelectedDate(date)}
                    >
                      <span className="spread">
                        <strong>{formatDate(date)}</strong>
                        <span className="muted">{summary.calories} kcal</span>
                      </span>
                      <span className="muted history-sub">
                        {logs.length} 条记录 ·{' '}
                        {logs.map(log => mealNames[log.mealType] ?? '加餐').join('、')}
                        {logs.some(log => log.isOffPlan) ? ' · 含计划外' : ''}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          )}

          {tab === 'health' && (
            <div className="history-list">
              {sortedMetrics.length === 0 ? (
                <p className="muted">还没有健康指标记录。</p>
              ) : (
                sortedMetrics.slice(0, 14).map(item => (
                  <div className="history-item static" key={item.id}>
                    <span className="spread">
                      <strong>
                        {metricLabels[item.type]} {item.value} {item.unit}
                      </strong>
                      <span className="muted">{formatDate(item.measuredAt)}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'medal' && (
            <div className="history-list">
              {unlockedMedals.length === 0 ? (
                <p className="muted">还没有点亮的勋章，慢慢来就好。</p>
              ) : (
                unlockedMedals.map(item => (
                  <div className="history-item static" key={item.id}>
                    <span className="spread">
                      <strong>{item.name}</strong>
                      <span className="muted">
                        {formatDate(item.unlockedAt!)} 点亮
                      </span>
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>

      <div className="records-right stack">
        <section className="card stack" aria-label="单日营养详情">
          <div className="spread">
            <h2 className="section-title" style={{ margin: 0 }}>
              {formatDate(selectedDate)} · 全天
            </h2>
            <Link to="/import" className="bubble-link">
              数据与备份 ›
            </Link>
          </div>
          {selectedLogs.length === 0 ? (
            <p className="muted">这一天还没有用餐记录，选中左侧某天即可查看详情。</p>
          ) : (
            <>
              <NutritionPie nutrition={selectedNutrition} />
              <p className="muted">
                碳水 {selectedNutrition.carbs}g · 蛋白质 {selectedNutrition.protein}g · 脂肪{' '}
                {selectedNutrition.fat}g · 能量 {selectedNutrition.calories}kcal
              </p>
              {evaluation && <p>{evaluation.message}</p>}
            </>
          )}
        </section>

        <section className="card stack" aria-label="四态判定">
          <h2 className="section-title">这天的四态判定</h2>
          <div className="state-grid">
            <div className="state-cell">
              <span className="muted">记录日</span>
              <strong>{selectedLogs.length > 0 ? '✓ 是' : '— 否'}</strong>
            </div>
            <div className="state-cell">
              <span className="muted">坚持日</span>
              <strong>
                {selectedLogs.some(log => !log.isOffPlan) ? '✓ 是' : '— 否'}
              </strong>
            </div>
            <div className="state-cell">
              <span className="muted">均衡日</span>
              <strong>{isBalanced ? '✓ 是' : '— 否'}</strong>
            </div>
            <div className="state-cell">
              <span className="muted">计划外</span>
              <strong>{dayOffPlan} 次</strong>
            </div>
          </div>
        </section>

        <section className="card assistant-note">
          <img src="/assistant.png" alt="" />
          <div>
            <span className="bubble-from">知夏 · 这天的说明</span>
            <p>
              {selectedLogs.length > 0 && evaluation
                ? evaluation.message
                : '这一天还没有记录可以说明，先按自己的节奏来就好。'}
            </p>
            <p className="muted">
              计划外的一次不改变你已经累计的坚持，下一餐正常回归就好。
            </p>
          </div>
        </section>

        <section className="card stack" aria-label="近 14 天能量与结构">
          <h2 className="section-title">近 14 天能量与结构</h2>
          <div className="trend-bars" role="img" aria-label="近 14 天能量与三大营养素供能结构">
            {trend.map(item => {
              const { carbsRatio, proteinRatio, fatRatio, calories } = item.summary
              const total = Math.max(1, carbsRatio + proteinRatio + fatRatio)
              const height = Math.max(12, Math.round((calories / maxTrendCalories) * 100))
              return (
                <div
                  className="trend-col"
                  key={item.date}
                  title={`${formatDate(item.date)} · ${calories} kcal`}
                >
                  <div className="trend-stack" style={{ height: `${height}%` }}>
                    <span
                      className="seg seg-fat"
                      style={{ height: `${(fatRatio / total) * 100}%` }}
                    />
                    <span
                      className="seg seg-protein"
                      style={{ height: `${(proteinRatio / total) * 100}%` }}
                    />
                    <span
                      className="seg seg-carbs"
                      style={{ height: `${(carbsRatio / total) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="muted trend-caption">
            每根柱自下而上为碳水 / 蛋白质 / 脂肪供能占比，柱高按当日总能量等比放大。
          </p>
        </section>
      </div>
    </div>
  )
}
