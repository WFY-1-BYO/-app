import { useSyncExternalStore } from 'react'

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
 * 测试环境（jsdom）没有 matchMedia 时默认手机布局，保持既有行为不变。
 */
export function useIsTablet(): boolean {
  return useSyncExternalStore(subscribe, readMatch, () => false)
}
