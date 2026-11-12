import { useAppStore } from '../store/appStore'
import { computeMedals } from '../lib/medals'
import { createId, formatDate, nowIso } from '../lib/id'
import type { MedalGroup, Reward } from '../types'

const groupLabels: Record<MedalGroup, string> = {
  persistence: '坚持',
  table: '餐桌',
  exercise: '运动',
  knowledge: '知食',
  composure: '从容',
}

const rewardSuggestions = [
  { name: '适量奶茶', description: '可以喝一杯，不用把它变成新的负担。' },
  { name: '看一部电影', description: '给自己一点放松时间。' },
  { name: '买一本书', description: '把奖励和成长放在一起。' },
  { name: '好好休息一晚', description: '睡眠也是健康的一部分。' },
]

export default function Medals() {
  const data = useAppStore(state => state.data)
  const addReward = useAppStore(state => state.addReward)
  const medals = computeMedals(data)
  const unlocked = medals.filter(medal => medal.unlockedAt)
  const locked = medals.filter(medal => !medal.unlockedAt)
  const milestoneUnlocked = unlocked.some(
    medal => medal.group === 'persistence' && medal.target >= 30,
  )

  const groups = Array.from(new Set(medals.map(medal => medal.group)))

  const chooseReward = async (name: string, description: string) => {
    const reward: Reward = {
      id: createId('reward'),
      name,
      description,
      status: 'accepted',
      createdAt: nowIso(),
    }
    await addReward(reward)
  }

  return (
    <div className="stack">
      <section className="card">
        <h1 className="section-title">勋章墙</h1>
        <p className="muted">
          勋章奖励长期做得到的事，而不是奖励每餐完美。累计成果不会因为中断而熄灭。
        </p>
        <div className="stat-grid" style={{ marginTop: 12 }}>
          <div className="stat">
            <strong>{unlocked.length}</strong>
            <span>已点亮</span>
          </div>
          <div className="stat">
            <strong>{locked.length}</strong>
            <span>进行中</span>
          </div>
          <div className="stat">
            <strong>{data.rewards.length}</strong>
            <span>已选择奖励</span>
          </div>
        </div>
      </section>

      {groups.map(group => {
        const groupMedals = medals.filter(medal => medal.group === group)
        return (
          <section className="card stack" key={group}>
            <h2 className="section-title">{groupLabels[group]}</h2>
            <div className="stack">
              {groupMedals.map(medal => (
                <article key={medal.id} className="card" style={{ boxShadow: 'none' }}>
                  <div className="spread">
                    <div>
                      <strong>{medal.name}</strong>
                      <p className="muted">{medal.condition}</p>
                    </div>
                    <span className="muted">
                      {medal.current}/{medal.target}
                    </span>
                  </div>
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
                  {medal.unlockedAt && (
                    <p className="muted">点亮时间：{formatDate(medal.unlockedAt)}</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )
      })}

      <section className="card stack">
        <h2 className="section-title">阶段奖励</h2>
        {milestoneUnlocked ? (
          <>
            <p className="muted">
              你已经达到一个重要阶段，可以给自己一个小奖励。奖励是可选的，不是必须的。
            </p>
            <div className="row">
              {rewardSuggestions.map(reward => (
                <button
                  type="button"
                  key={reward.name}
                  className="button small secondary"
                  onClick={() => void chooseReward(reward.name, reward.description)}
                >
                  {reward.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="muted">
            达到 30 天等重要阶段后，这里会提供可选奖励。日常小勋章不需要额外奖励。
          </p>
        )}

        {data.rewards.length > 0 && (
          <div className="stack">
            {data.rewards.map(reward => (
              <article key={reward.id} className="card" style={{ boxShadow: 'none' }}>
                <div className="spread">
                  <strong>{reward.name}</strong>
                  <span className="muted">已选择</span>
                </div>
                <p className="muted">{reward.description}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
