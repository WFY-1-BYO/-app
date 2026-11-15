import type { AppSettings } from '../types'
import { hasAiKey } from './aiKey'

/** 首次启动提醒只弹一次；用户选「稍后再说」或「去填写」后都记下，不再打扰。 */
export const API_KEY_PROMPT_STORAGE_KEY = 'family-nutritionist:api-key-prompt:v1'

type ReadStorage = Pick<Storage, 'getItem'>
type WriteStorage = Pick<Storage, 'setItem'>

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/**
 * 是否需要提醒填密钥：只在「首次打开」且「尚未填写密钥」时为真。
 * localStorage 不可用时仍然提醒（隐私模式下最多每次启动提醒一次）。
 */
export function shouldShowApiKeyPrompt(
  settings: AppSettings,
  storage: ReadStorage | null = browserStorage(),
): boolean {
  if (hasAiKey(settings)) return false
  if (!storage) return true
  try {
    return storage.getItem(API_KEY_PROMPT_STORAGE_KEY) !== 'seen'
  } catch {
    return true
  }
}

/** 记住用户已经看过提醒。 */
export function markApiKeyPromptSeen(
  storage: WriteStorage | null = browserStorage(),
): void {
  if (!storage) return
  try {
    storage.setItem(API_KEY_PROMPT_STORAGE_KEY, 'seen')
  } catch {
    // 存不下就算了：不影响 App 使用
  }
}

/** 仅供测试与「重置提醒」使用。 */
export function resetApiKeyPrompt(
  storage: Pick<Storage, 'removeItem'> | null = browserStorage(),
): void {
  if (!storage) return
  try {
    storage.removeItem(API_KEY_PROMPT_STORAGE_KEY)
  } catch {
    // 忽略
  }
}
