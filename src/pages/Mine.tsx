import { Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { dateKey } from '../lib/id'
import { computeMedals } from '../lib/medals'
import { computeStreak } from '../lib/stats'

const tasteLabels: Record<string, string> = {
  spicy: '辣口',
  sweet: '甜口',
  sour: '酸口',
  mild: '温和',
  light: '清淡',
}

const goalLabels: Record<string, string> = {
  gain_muscle: '增肌',
  lose_fat: '减脂',
  maintain_health: '维持健康',
}

function GroupCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="card mine-group">
      <h2 className="section-title">{title}</h2>
      <div className="mine-links">{children}</div>
    </section>
  )
}

function GroupLink({ to, label, note }: { to: string; label: string; note: string }) {
  return (
    <Link to={to} className="mine-link">
      <span className="mine-link-main">
        <strong>{label}</strong>
        <span className="muted">{note}</span>
      </span>
      <span className="mine-link-arrow" aria-hidden>
        ›
      </span>
    </Link>
  )
}

export default function Mine() {
  const data = useAppStore(state => state.data)
  const medals = computeMedals(data)
  const unlockedCount = medals.filter(medal => medal.unlockedAt).length
  const recordDays = new Set(data.mealLogs.map(log => dateKey(log.date))).size
  const streak = computeStreak(data.mealLogs, data.restDays)
  const favorites = data.knowledge.filter(item => item.favorite).length
  const profile = data.profile

  return (
    <div className="stack mine-page">
      <section className="card mine-profile">
        <img src="/assistant.png" alt="知夏" className="mine-avatar" />
        <div className="mine-profile-body">
          <h1 className="section-title">{profile ? profile.nickname : '我的'}</h1>
          {profile ? (
            <p className="muted">
              目标：{goalLabels[profile.goal]}
              {profile.customTastes && profile.customTastes.length > 0
                ? ` · 口味：${[...profile.tastes.map(t => tasteLabels[t] ?? t), ...profile.customTastes].join('、')}`
                : ''}
            </p>
          ) : (
            <p className="muted">还没有档案，点下面的「编辑个人档案」创建一个。</p>
          )}
        </div>
        {profile && (
          <Link to="/onboarding" className="button small secondary mine-edit">
            编辑
          </Link>
        )}
      </section>

      <section className="card">
        <div className="stat-grid">
          <div className="stat">
            <strong>{recordDays}</strong>
            <span>记录天数</span>
          </div>
          <div className="stat">
            <strong>{streak.totalDays}</strong>
            <span>累计坚持</span>
          </div>
          <div className="stat">
            <strong>{unlockedCount}</strong>
            <span>已点亮勋章</span>
          </div>
          <div className="stat">
            <strong>{favorites}</strong>
            <span>知识收藏</span>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          中断不会清零；这些数字只属于你自己。
        </p>
      </section>

      {profile && (
        <section className="card mine-group">
          <h2 className="section-title">档案与饮食约束</h2>
          <p className="muted">
            过敏：{profile.allergies.join('、') || '无'} · 忌口：
            {profile.avoid.join('、') || '无'} · 疾病：
            {profile.diseases.length > 0 ? profile.diseases.length + ' 项' : '未填写'}
          </p>
          <div className="mine-links">
            <GroupLink to="/onboarding" label="编辑个人档案" note="目标、生日、口味、忌口" />
            <GroupLink to="/health" label="健康指标" note="血压血糖血脂，拍照或上传报告" />
          </div>
        </section>
      )}

      <GroupCard title="校准与授权">
        <GroupLink to="/utensils/calibrate" label="餐具校准" note="校准家里的碗勺，估算更准" />
        <GroupLink to="/settings" label="设置与 AI 密钥" note="悬浮球、DeepSeek 接口密钥" />
      </GroupCard>

      <GroupCard title="数据与备份">
        <GroupLink to="/import" label="NDM 导入导出" note="备份成 .ndm.md，换手机不丢数据" />
        <GroupLink to="/knowledge" label="知识册" note="收藏的营养知识都在这里" />
        <GroupLink to="/medals" label="勋章与奖励" note={`${unlockedCount} 枚已点亮`} />
      </GroupCard>
    </div>
  )
}
