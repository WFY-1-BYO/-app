import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import NutritionPie from '../components/NutritionPie'
import { evaluateMeal } from '../lib/nutrition'
import { chatWithDeepSeek } from '../lib/deepseek'
import { hasAiKey } from '../lib/aiKey'

export default function MealResult() {
  const { id } = useParams()
  const session = useAppStore(state =>
    state.data.mealSessions.find(item => item.id === id),
  )
  const profile = useAppStore(state => state.data.profile)
  const settings = useAppStore(state => state.data.settings)
  const keyReady = hasAiKey(settings)
  const [aiText, setAiText] = useState('')
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [aiError, setAiError] = useState('')

  const askAi = async () => {
    if (!session || !profile) return
    setAiState('loading')
    setAiError('')
    try {
      const text = await chatWithDeepSeek(settings, [
        {
          role: 'system',
          content:
            '你是一位温和的家庭营养师「知夏」。先肯定用户做到的部分，再给 1-2 条具体建议，最后提醒适用边界。不用批评语气，不使用「必须」「赶紧」这类词，全文不超过 200 字。',
        },
        {
          role: 'user',
          content: `用户目标：${profile.goal === 'lose_fat' ? '减脂' : profile.goal === 'gain_muscle' ? '增肌' : '维持健康'}。${profile.diseases.length > 0 ? `健康情况：${profile.diseases.join('、')}。` : ''}这一餐：${session.dishes[0]?.name ?? '配餐'}，能量约 ${Math.round(session.nutrition.calories)} kcal，碳水 ${session.nutrition.carbs}g、蛋白质 ${session.nutrition.protein}g、脂肪 ${session.nutrition.fat}g。食材：${session.ingredients.map(item => item.name).join('、')}。请结合这些信息解读这一餐。`,
        },
      ])
      setAiText(text)
      setAiState('done')
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI 解读失败，请稍后重试。')
      setAiState('error')
    }
  }

  if (!session) {
    return (
      <div className="card stack">
        <div>
          <h1 className="section-title">没有找到这次配餐</h1>
          <p className="muted">它可能已被删除，或来自另一台设备尚未导入。</p>
        </div>
        <Link to="/meal/new" className="button">
          重新配餐
        </Link>
      </div>
    )
  }

  const evaluation = profile ? evaluateMeal(session.nutrition, profile, session.mealType) : null

  return (
    <div className="stack">
      <section className="card">
        <div className="spread">
          <div>
            <p className="muted">
              {session.mealType === 'breakfast'
                ? '早餐'
                : session.mealType === 'lunch'
                  ? '午餐'
                  : session.mealType === 'dinner'
                    ? '晚餐'
                    : '加餐'}
            </p>
            <h1 className="section-title">
              {session.dishes[0]?.name ?? '当次食材配餐'}
            </h1>
            <p className="muted">{session.reason}</p>
          </div>
          <Link to={`/meal/${session.id}/confirm`} className="button">
            确认实际用餐
          </Link>
        </div>
      </section>

      <div className="two-col">
        <section className="card stack">
          <h2 className="section-title">现在就能做</h2>
          {session.dishes.map(dish => (
            <article key={dish.id} className="card" style={{ boxShadow: 'none' }}>
              <div className="spread">
                <strong>{dish.name}</strong>
                <span className="muted">{dish.servings} 份</span>
              </div>
              <ol>
                {dish.steps.map(step => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </article>
          ))}

          <h2 className="section-title">当次食材与用量</h2>
          <ul>
            {session.ingredients.map(ingredient => (
              <li key={ingredient.id}>
                {ingredient.name}：{ingredient.confirmedAmount ?? ingredient.estimatedAmount ?? 0}
                {ingredient.unit}（{ingredient.state === 'raw' ? '生重' : '熟重'}）
              </li>
            ))}
          </ul>
        </section>

        <section className="card stack">
          <h2 className="section-title">营养估算</h2>
          <NutritionPie nutrition={session.nutrition} />
          {evaluation && (
            <p
              style={{
                color:
                  evaluation.level === 'good'
                    ? 'var(--primary-strong)'
                    : evaluation.level === 'acceptable'
                      ? 'var(--accent)'
                      : 'var(--notice-ink)',
              }}
            >
              {evaluation.message}
            </p>
          )}

          {keyReady && (
            <div className="card ai-note stack" style={{ boxShadow: 'none' }}>
              <div className="row" style={{ alignItems: 'center' }}>
                <img
                  src="/zhixia-study.png"
                  alt="知夏"
                  style={{ width: 44, height: 44, borderRadius: '50%' }}
                />
                <button
                  type="button"
                  className="button small secondary"
                  disabled={aiState === 'loading'}
                  onClick={() => void askAi()}
                >
                  {aiState === 'loading' ? '知夏正在看这一餐……' : '让知夏用 AI 详细解读'}
                </button>
              </div>
              {aiState === 'loading' && <p className="muted">已连接 DeepSeek，稍等几秒。</p>}
              {aiState === 'done' && <p className="ai-text">{aiText}</p>}
              {aiState === 'error' && <p className="muted">{aiError}</p>}
              <p className="muted">AI 解读只作参考，不替代医生或临床营养师的意见。</p>
            </div>
          )}

          {session.recommendations.length > 0 && (
            <>
              <h2 className="section-title">以后可以补充</h2>
              <ul className="muted">
                {session.recommendations.map(item => (
                  <li key={item.id}>{item.name}：只作建议，不计入本次菜谱</li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
