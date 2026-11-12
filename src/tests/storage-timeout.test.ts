import { describe, expect, it, vi } from 'vitest'

vi.mock('idb', () => ({
  openDB: () => new Promise<never>(() => {}), // 模拟浏览器里 IndexedDB 一直挂起
}))

import { loadAppData } from '../lib/storage'

describe('IndexedDB 长时间无响应', () => {
  it('loadAppData 会超时兜底，不会让 App 永久停在加载态', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      value: {},
      configurable: true,
    })
    const started = Date.now()
    const result = await loadAppData()
    expect(result).toBeNull()
    expect(Date.now() - started).toBeLessThan(4000)
  }, 6000)
})
