import { Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'

const links = [
  { to: '/onboarding', label: '编辑个人档案' },
  { to: '/utensils/calibrate', label: '餐具校准' },
  { to: '/knowledge', label: '知识册' },
  { to: '/medals', label: '勋章与奖励' },
  { to: '/health', label: '健康指标' },
  { to: '/import', label: 'NDM 导入导出' },
  { to: '/settings', label: '设置' },
]

export default function Mine() {
  const data = useAppStore(state => state.data)

  return (
    <div className="stack">
      <section className="card">
        <h1 className="section-title">我的</h1>
        {data.profile ? (
          <div className="stack">
            <div className="spread">
              <strong>{data.profile.nickname}</strong>
              <span className="muted">
                {data.profile.goal === 'gain_muscle'
                  ? '增肌'
                  : data.profile.goal === 'lose_fat'
                    ? '减脂'
                    : '维持健康'}
              </span>
            </div>
            <p className="muted">
              过敏：{data.profile.allergies.join('、') || '无'}
              <br />
              忌口：{data.profile.avoid.join('、') || '无'}
              <br />
              疾病情况：{data.profile.diseases.join('、') || '未填写'}
            </p>
          </div>
        ) : (
          <p className="muted">尚未创建个人档案。</p>
        )}
      </section>

      <section className="card stack">
        <h2 className="section-title">常用功能</h2>
        <div className="row">
          {links.map(link => (
            <Link key={link.to} to={link.to} className="button small ghost">
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
