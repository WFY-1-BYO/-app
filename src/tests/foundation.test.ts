import { describe, expect, it } from 'vitest'
import { emptyAppData, useAppStore } from '../store/appStore'

describe('项目基础与测试环境', () => {
  it('默认数据结构包含第一版所有数据域', () => {
    expect(Object.keys(emptyAppData)).toEqual([
      'profile',
      'mealSessions',
      'mealLogs',
      'healthMetrics',
      'healthUploads',
      'utensilCalibrations',
      'knowledge',
      'medals',
      'rewards',
      'restDays',
      'settings',
    ])
  })

  it('默认设置启用悬浮角色并使用本地 AI 提供器', () => {
    expect(emptyAppData.settings.assistantEnabled).toBe(true)
    expect(emptyAppData.settings.aiProvider).toBe('local')
  })

  it('应用状态仓库可初始化并重置', () => {
    expect(useAppStore.getState().initialized).toBe(false)
    expect(typeof useAppStore.getState().initialize).toBe('function')
    expect(typeof useAppStore.getState().reset).toBe('function')
  })
})
