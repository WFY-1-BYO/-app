import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { computeMedals } from '../lib/medals'
import type { MedalProgress } from '../types'

const SEEN_KEY = 'ndm-medal-celebrated'

function loadSeen(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveSeen(seen: Set<string>) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)))
  } catch {
    // 存不了就忽略：最多是重启后再看一次动画
  }
}

/**
 * 勋章点亮庆祝。
 * 监听勋章状态：某枚勋章从「未点亮」变为「点亮」时，全屏播放一次点亮动画。
 * 已播放过的勋章记在 localStorage，不会重复打扰；导入带勋章的旧数据时只补播一次。
 */
export default function MedalCelebration() {
  const data = useAppStore(state => state.data)
  const initialized = useAppStore(state => state.initialized)
  const seenRef = useRef<Set<string> | null>(null)
  const [celebrating, setCelebrating] = useState<MedalProgress | null>(null)

  useEffect(() => {
    if (!initialized) return
    if (seenRef.current === null) seenRef.current = loadSeen()
    const seen = seenRef.current
    const unlocked = computeMedals(data).filter(medal => medal.unlockedAt)
    const fresh = unlocked.filter(medal => !seen.has(medal.id))
    if (fresh.length === 0) return
    const next = new Set(seen)
    // 一次只播一枚：优先播放列表中最后解锁的那枚，其余记为已播
    const latest = fresh[fresh.length - 1]
    fresh.forEach(medal => next.add(medal.id))
    saveSeen(next)
    seenRef.current = next
    setCelebrating(latest)
  }, [data, initialized])

  if (!celebrating) return null

  return (
    <div className="medal-celebration" role="alert" aria-label={`勋章点亮：${celebrating.name}`}>
      <div className="medal-celebration-card">
        <div className="medal-celebration-glow" aria-hidden />
        <img src="/zhixia-cheer.png" alt="知夏开心庆祝" className="medal-celebration-avatar" />
        <div className="medal-celebration-medal" aria-hidden>
          ★
        </div>
        <h2 className="medal-celebration-title">勋章点亮！</h2>
        <strong className="medal-celebration-name">{celebrating.name}</strong>
        <p className="medal-celebration-condition">{celebrating.condition}</p>
        <p className="muted medal-celebration-note">
          不是每餐都完美，但你做到了。中断不清零，我们继续。
        </p>
        <button type="button" className="button" onClick={() => setCelebrating(null)}>
          收下这份鼓励
        </button>
      </div>
    </div>
  )
}
