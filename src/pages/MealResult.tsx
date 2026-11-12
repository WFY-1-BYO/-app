import { Link, useParams } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import NutritionPie from '../components/NutritionPie'
import { evaluateMeal } from '../lib/nutrition'

export default function MealResult() {
  const { id } = useParams()
  const session = useAppStore(state =>
    state.data.mealSessions.find(item => item.id === id),
  )
  const profile = useAppStore(state => state.data.profile)

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
                      : 'var(--danger)',
              }}
            >
              {evaluation.message}
            </p>
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
