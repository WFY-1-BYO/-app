import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { dateKey, toDateKey } from '../lib/id'

/**
 * 知夏悬浮球。
 * - 可以自由拖动，位置记在本机，下次打开还在原地；
 * - 每天第一次打开 App 时主动开口，播报今日知识（不重复打扰）；
 * - 点一下可再听一遍，专注流程页自动隐藏。
 */
export default function FloatingAssistant({
  message,
  isTablet = false,
}: {
  message?: string
  isTablet?: boolean
}) {
  const settings = useAppStore(state => state.data.settings)
  const profileExists = useAppStore(state => Boolean(state.data.profile))
  const updateSettings = useAppStore(state => state.updateSettings)
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [position, setPosition] = useState(settings.assistantPosition)
  const startRef = useRef({ x: 0, y: 0, left: 0, top: 0 })
  const movedRef = useRef(false)
  const dragPositionRef = useRef(settings.assistantPosition)

  const today = dateKey(new Date())
  const todayKnowledge = useAppStore(state =>
    state.data.knowledge.find(
      item => (item.date ?? toDateKey(item.createdAt)) === dateKey(new Date()),
    ),
  )
  const dailyMessage = profileExists
    ? todayKnowledge
      ? `知夏 · 今日知识：${todayKnowledge.summary}`
      : '今天还没有新知识，联网后稍候再看。'
    : '先把档案建好，我就能按你的目标配餐了。点这里去创建。'
  const bubbleText = message ?? dailyMessage

  // 每天第一次打开 App：悬浮球主动播报今日知识
  useEffect(() => {
    if (!settings.assistantEnabled) return
    if (!profileExists) return
    if (settings.lastKnowledgePushDate === today) return
    const timer = window.setTimeout(() => {
      setOpen(true)
      void updateSettings({ lastKnowledgePushDate: today })
    }, 800)
    return () => window.clearTimeout(timer)
    // 只依赖「今天是否已播报」等关键标记，避免每次数据变化都重跑
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.lastKnowledgePushDate, profileExists, settings.assistantEnabled])

  if (!settings.assistantEnabled) return null

  const hasCustomPosition = position.x >= 0 && position.y >= 0

  const clampPosition = (x: number, y: number) => {
    const size = isTablet ? 64 : 56
    const minX = isTablet ? 248 : 8
    const bottomInset = isTablet ? 24 : 96
    return {
      x: Math.max(minX, Math.min(window.innerWidth - size - 8, x)),
      y: Math.max(8, Math.min(window.innerHeight - size - bottomInset, y)),
    }
  }

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    startRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: rect.left,
      top: rect.top,
    }
    movedRef.current = false
    setDragging(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return
    const deltaX = event.clientX - startRef.current.x
    const deltaY = event.clientY - startRef.current.y
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) movedRef.current = true
    // 平板左侧有固定导航栏，手机底部有三段导航，悬浮球吸附区分别避开
    const next = clampPosition(
      startRef.current.left + deltaX,
      startRef.current.top + deltaY,
    )
    dragPositionRef.current = next
    setPosition(next)
  }

  const onPointerUp = () => {
    setDragging(false)
    if (!movedRef.current) {
      setOpen(value => !value)
      return
    }
    setPosition(dragPositionRef.current)
    void updateSettings({ assistantPosition: dragPositionRef.current })
  }

  return (
    <>
      <button
        type="button"
        className={`assistant ${isTablet ? 'assistant-tablet' : ''} ${dragging ? 'assistant-dragging' : ''}`}
        aria-label="营养师助手知夏"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={
          hasCustomPosition
            ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
            : undefined
        }
      >
        <img src="/assistant.png" alt="" />
      </button>
      {open && (
        <div className="assistant-bubble" role="status">
          {bubbleText}
          <div className="row" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="button small secondary"
              onClick={() => setOpen(false)}
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </>
  )
}
