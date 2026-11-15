/**
 * 手机端习惯的「从左边缘向右滑返回上一页」。
 *
 * 只在左边缘起手、水平位移足够、且明显大于垂直位移时才触发；
 * 输入框 / 文本域 / 可编辑区域与标记 data-no-swipe-back 的元素一律不接管，
 * 免得和光标定位、横向滚动、按钮点击打架。
 */

export const SWIPE_BACK_EDGE_PX = 32
export const SWIPE_BACK_MIN_DISTANCE_PX = 72

const INTERACTIVE_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [data-no-swipe-back]'

interface TouchPoint {
  clientX: number
  clientY: number
}

function pointsOf(event: Event, field: 'touches' | 'changedTouches'): TouchPoint[] {
  const value = (event as unknown as Record<string, unknown>)[field]
  return Array.isArray(value) ? (value as TouchPoint[]) : []
}

export interface SwipeBackOptions {
  doc?: Document
  /** 起手点距屏幕左边缘的最大距离（px） */
  edge?: number
  /** 触发返回所需的最小水平位移（px） */
  distance?: number
}

/** 安装手势；返回卸载函数。 */
export function installSwipeBack(
  onBack: () => void,
  options: SwipeBackOptions = {},
): () => void {
  const doc = options.doc ?? document
  const edge = options.edge ?? SWIPE_BACK_EDGE_PX
  const distance = options.distance ?? SWIPE_BACK_MIN_DISTANCE_PX
  let startX = 0
  let startY = 0
  let tracking = false

  const onTouchStart = (event: Event) => {
    tracking = false
    const touch = pointsOf(event, 'touches')[0]
    if (!touch || touch.clientX > edge) return
    const target = event.target
    if (
      typeof Element !== 'undefined' &&
      target instanceof Element &&
      target.closest(INTERACTIVE_SELECTOR)
    ) {
      return
    }
    tracking = true
    startX = touch.clientX
    startY = touch.clientY
  }

  const onTouchEnd = (event: Event) => {
    if (!tracking) return
    tracking = false
    const touch = pointsOf(event, 'changedTouches')[0]
    if (!touch) return
    const dx = touch.clientX - startX
    const dy = Math.abs(touch.clientY - startY)
    if (dx >= distance && dx >= dy) onBack()
  }

  const onTouchCancel = () => {
    tracking = false
  }

  doc.addEventListener('touchstart', onTouchStart, { passive: true })
  doc.addEventListener('touchend', onTouchEnd, { passive: true })
  doc.addEventListener('touchcancel', onTouchCancel, { passive: true })

  return () => {
    doc.removeEventListener('touchstart', onTouchStart)
    doc.removeEventListener('touchend', onTouchEnd)
    doc.removeEventListener('touchcancel', onTouchCancel)
  }
}
