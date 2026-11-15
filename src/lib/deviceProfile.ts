/**
 * V1.7 手机 / 平板分版。
 *
 * 同一个代码库出两个安装包：手机包固定单栏 + 底部导航（竖屏），
 * 平板包固定侧栏 + 双栏（横竖屏都可用）。设备档在构建时由
 * VITE_DEVICE_PROFILE 写进各自的 JS 包，运行时也可由宿主注入覆盖。
 * auto（默认 Web 版）仍按 CSS 宽度 900px 自适应，行为与旧版一致。
 */

export type DeviceProfile = 'auto' | 'phone' | 'pad'

declare global {
  interface Window {
    /** 宿主（WebView）可注入设备档，覆盖构建时写入的值 */
    __FN_DEVICE_PROFILE__?: string
  }
}

/** 返回当前构建 / 宿主指定的设备档；未知值一律回落到自动适配。 */
export function resolveDeviceProfile(win?: Window | null): DeviceProfile {
  const target = win === undefined ? (typeof window === 'undefined' ? null : window) : win
  const raw = target?.__FN_DEVICE_PROFILE__ ?? import.meta.env.VITE_DEVICE_PROFILE
  if (raw === 'phone') return 'phone'
  if (raw === 'pad') return 'pad'
  return 'auto'
}

/** 界面上给用户看的分版名称。 */
export function deviceProfileLabel(profile: DeviceProfile): string {
  if (profile === 'phone') return '手机端'
  if (profile === 'pad') return '平板端'
  return ''
}
