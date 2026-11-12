import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/storage', () => ({
  loadAppData: vi.fn(),
  saveAppData: vi.fn(),
  clearAppData: vi.fn(),
}))

import { loadAppData, saveAppData } from '../lib/storage'
import { useAppStore } from '../store/appStore'

describe('本地存储异常时的启动兜底', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({ initialized: false })
  })

  it('IndexedDB 读取抛错时仍完成初始化并进入界面', async () => {
    vi.mocked(loadAppData).mockRejectedValueOnce(new Error('IndexedDB blocked'))
    await useAppStore.getState().initialize()
    expect(useAppStore.getState().initialized).toBe(true)
    expect(useAppStore.getState().data.knowledge.length).toBeGreaterThan(0)
    expect(saveAppData).toHaveBeenCalled()
  })

  it('存储写入失败不会阻断初始化', async () => {
    vi.mocked(loadAppData).mockResolvedValueOnce(null)
    vi.mocked(saveAppData).mockRejectedValueOnce(new Error('QuotaExceededError'))
    await expect(useAppStore.getState().initialize()).resolves.toBeUndefined()
    expect(useAppStore.getState().initialized).toBe(true)
  })
})
