import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { dateKey, formatDate, toDateKey } from '../lib/id'
import { computeStreak } from '../lib/stats'
import { getNextMedal } from '../lib/medals'
import { analyzeMetric, metricLabels } from '../lib/health'
import { useIsTablet } from '../lib/breakpoint'

const goalText = {
  gain_muscle: '增肌',
  lose_fat: '减脂',
  maintain_health: '维持健康',
} as const

const mealLabels = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
} as const

export default function Today() {
  const data = useAppStore(state => state.data)
  const toggleKnowledgeFavorite = useAppStore(state => state.toggleKnowledgeFavorite)
  const markKnowledgeRead = useAppStore(state => state.markKnowledgeRead)
  const ensureTodayKnowledge = useAppStore(state => state.ensureTodayKnowledge)
  const isTablet = useIsTablet()
  const [now] = useState(() => new Date())
  const [whyOpen, setWhyOpen] = useState(false)
  const [loadingKnowledge, setLoadingKnowledge] = useState(true)
  const today = dateKey(now)
  const hour = now.getHours()
  const displayDate = formatDate(now)
  const todayKnowledge = useAppStore(state =>
    state.data.knowledge.find(
      item => (item.date ?? toDateKey(item.createdAt)) === dateKey(new Date()),
    ),
  )

  useEffect(() => {
    let alive = true
    ensureTodayKnowledge()
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoadingKnowledge(false)
      })
    return () => {
      alive = false
    }
  }, [ensureTodayKnowledge])
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
  const streak = computeStreak(data.mealLogs, data.restDays)
  const medal = getNextMedal(data)
  const sortedMetrics = [...data.healthMetrics].sort((a, b) =>
    b.measuredAt.localeCompare(a.measuredAt),
  )
  const latestMetric = sortedMetrics[0]
  const systolic = sortedMetrics.find(item => item.type === 'systolic_pressure')
  const diastolic = sortedMetrics.find(item => item.type === 'diastolic_pressure')
  const hasBloodPressure = Boolean(systolic && diastolic)

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

  const dateHead = (
    <header className="today-head">
      <div>
        <p className="muted today-date">{displayDate}</p>
        <h1 className="today-title">{nextMeal}还来得及好好安排</h1>
      </div>
      <span className="goal-pill">目标：{goalText[data.profile.goal]}</span>
    </header>
  )

  const nextMealCard = (
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
  )

  const knowledgeBubble = !todayKnowledge ? (
    <section className="card knowledge-bubble" aria-label="营养师说">
      <img src="/assistant.png" alt="知夏" className="bubble-avatar" />
      <div className="bubble-body">
        <span className="bubble-from">知夏 · 今日知识</span>
        <p className="bubble-text muted">
          {loadingKnowledge ? '正在为你准备今天的知识…' : '今天还没有知识，联网后稍候再来。'}
        </p>
        <div className="row bubble-actions">
          <Link to="/knowledge" className="bubble-link">
            知识册 ›
          </Link>
        </div>
      </div>
    </section>
  ) : (
    <section className="card knowledge-bubble" aria-label="营养师说">
      <img src="/assistant.png" alt="知夏" className="bubble-avatar" />
      <div className="bubble-body">
        <span className="bubble-from">知夏 · 今日知识</span>
        <p className="bubble-text">{todayKnowledge.summary}</p>
        <p className="muted bubble-title">{todayKnowledge.title}</p>
        <div className="row bubble-actions">
          <button
            type="button"
            className="button small ghost"
            onClick={() => {
              setWhyOpen(value => !value)
              if (!todayKnowledge.readAt) void markKnowledgeRead(todayKnowledge.id)
            }}
          >
            {whyOpen ? '收起' : '展开说说为什么'}
          </button>
          <button
            type="button"
            className={`button small ${todayKnowledge.favorite ? '' : 'secondary'}`}
            onClick={() => void toggleKnowledgeFavorite(todayKnowledge.id)}
          >
            {todayKnowledge.favorite ? '已收藏' : '收藏'}
          </button>
          <Link to="/knowledge" className="bubble-link">
            知识册 ›
          </Link>
        </div>
        {whyOpen && (
          <div className="bubble-why">
            <strong>为什么这样说</strong>
            <p>{todayKnowledge.why}</p>
          </div>
        )}
      </div>
    </section>
  )

  // 手机：保持 V1.2 已确认的「极简一屏」，不新增下滑内容
  if (!isTablet) {
    return (
      <div className="stack today-page">
        {dateHead}
        {nextMealCard}
        {knowledgeBubble}
      </div>
    )
  }

  // 平板：按 UI 方案图 14 双栏，主栏配餐主线、副栏知识与提醒
  return (
    <div className="stack today-page tablet-today">
      <div className="today-main stack">
        {dateHead}
        {nextMealCard}
        <section className="card" aria-label="今天三餐状态">
          <div className="spread">
            <h2 className="section-title" style={{ margin: 0 }}>
              今天三餐
            </h2>
            <Link to="/records" className="bubble-link">
              查看记录 ›
            </Link>
          </div>
          <div className="today-meals">
            {(['breakfast', 'lunch', 'dinner'] as const).map(meal => {
              const done = todayLogs.some(log => log.mealType === meal)
              return (
                <div className="today-meal-chip" key={meal}>
                  <strong>{mealLabels[meal]}</strong>
                  <span className={done ? 'meal-state done' : 'meal-state'}>
                    {done ? '✓ 已记录' : '○ 待配餐'}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <div className="today-side stack">
        {knowledgeBubble}
        <section className="card" aria-label="坚持进度">
          <h2 className="section-title">坚持进度</h2>
          {medal ? (
            <>
              <div className="spread">
                <strong>{medal.name}</strong>
                <span className="muted">
                  {medal.current} / {medal.target}
                </span>
              </div>
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
          <p className="muted">
            累计已记录 {streak.totalDays} 天。中断不会清零，计划外饮食也不影响。
          </p>
        </section>
        <section className="card" aria-label="健康指标">
          <div className="spread">
            <h2 className="section-title" style={{ margin: 0 }}>
              健康指标
            </h2>
            <Link to="/health" className="bubble-link">
              查看 ›
            </Link>
          </div>
          {hasBloodPressure ? (
            <>
              <p className="health-big">
                {systolic!.value}/{diastolic!.value}
                <span className="muted"> mmHg</span>
              </p>
              <p className="muted">
                血压 · {formatDate(systolic!.measuredAt)}
              </p>
            </>
          ) : latestMetric ? (
            <>
              <p className="health-big">
                {latestMetric.value}
                <span className="muted"> {latestMetric.unit}</span>
              </p>
              <p className="muted">
                {metricLabels[latestMetric.type]} · {formatDate(latestMetric.measuredAt)}
              </p>
            </>
          ) : (
            <p className="muted">
              还没有健康指标记录。可以拍照或上传报告，App 会帮你留档。
            </p>
          )}
          {latestMetric && <p className="muted">{analyzeMetric(latestMetric).message}</p>}
          <p className="muted health-note">
            只做趋势参考，不替代诊断；如出现持续异常，我会提示你及时就医。
          </p>
        </section>
      </div>
    </div>
  )
}
