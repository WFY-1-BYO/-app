import { useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'

export default function FloatingAssistant({
  message = '今天也要好好吃饭，不用追求完美。',
  isTablet = false,
}: {
  message?: string
  isTablet?: boolean
}) {
  const settings = useAppStore(state => state.data.settings)
  const updateSettings = useAppStore(state => state.updateSettings)
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [position, setPosition] = useState(settings.assistantPosition)
  const startRef = useRef({ x: 0, y: 0, left: 0, top: 0 })
  const movedRef = useRef(false)

  const hasCustomPosition = position.x >= 0 && position.y >= 0

  if (!settings.assistantEnabled) return null

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
    const size = isTablet ? 64 : 56
    const minX = isTablet ? 248 : 8
    const bottomInset = isTablet ? 24 : 96
    const nextX = Math.max(
      minX,
      Math.min(window.innerWidth - size - 8, startRef.current.left + deltaX),
    )
    const nextY = Math.max(
      8,
      Math.min(window.innerHeight - size - bottomInset, startRef.current.top + deltaY),
    )
    setPosition({ x: nextX, y: nextY })
  }

  const onPointerUp = () => {
    setDragging(false)
    if (!movedRef.current) {
      setOpen(value => !value)
    } else {
      void updateSettings({ assistantPosition: position })
    }
  }

  return (
    <>
      <button
        type="button"
        className={`assistant ${isTablet ? 'assistant-tablet' : ''}`}
        aria-label="营养师助手"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={
          hasCustomPosition
            ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
            : undefined
        }
      >
        <img src="/assistant.svg" alt="" />
      </button>
      {open && (
        <div className="assistant-bubble" role="status">
          {message}
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
