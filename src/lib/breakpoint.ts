import { useSyncExternalStore } from 'react'
import { resolveDeviceProfile } from './deviceProfile'

/** 平板布局断点：CSS 宽度 ≥ 900px（vivo S7 约 360–411px，Y900 约 1280px）。 */
export const TABLET_QUERY = '(min-width: 900px)'

function readMatch(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(TABLET_QUERY).matches
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }
  const mql = window.matchMedia(TABLET_QUERY)
  if (typeof mql.addEventListener !== 'function') return () => {}
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/**
 * 判断当前是否应使用 Y900 平板的左侧导航 + 双栏布局。
 *
 * 手机包 / 平板包各自锁定布局，不再随窗口宽度漂移；Web 通用包（auto）
 * 仍按 CSS 宽度自适应。测试环境（jsdom）没有 matchMedia 时默认手机布局。
 */
export function useIsTablet(): boolean {
  const auto = useSyncExternalStore(subscribe, readMatch, () => false)
  const profile = resolveDeviceProfile()
  if (profile === 'pad') return true
  if (profile === 'phone') return false
  return auto
}
