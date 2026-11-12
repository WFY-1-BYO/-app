import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import ImportExport from '../pages/ImportExport'
import { createDefaultProfile, emptyAppData, useAppStore } from '../store/appStore'
import { exportNdm, mergeAppData, parseNdm } from '../lib/ndm'
import { initialKnowledge } from '../lib/knowledge'
import { computeMedals } from '../lib/medals'
import { createMealSession } from '../lib/mealPlanner'
import { nowIso } from '../lib/id'

describe('功能十：本地保存与 NDM 导入导出', () => {
  beforeEach(() => {
    localStorage.clear()
    const profile = createDefaultProfile({
      nickname: '数据用户',
      goal: 'maintain_health',
      tastes: ['light'],
    })
    const ingredients = [
      {
        id: 'ndm-food-1',
        name: '米饭',
        source: 'current' as const,
        estimatedAmount: 150,
        confirmedAmount: 150,
        unit: 'g' as const,
        state: 'raw' as const,
        used: true,
      },
      {
        id: 'ndm-food-2',
        name: '西兰花',
        source: 'recommended' as const,
        unit: 'g' as const,
        state: 'raw' as const,
        used: false,
      },
    ]
    const session = createMealSession({
      profile,
      mealType: 'dinner',
      ingredients,
      sourceDevice: 'test-device',
    })
    const mealLog = {
      id: 'ndm-log-1',
      sessionId: session.id,
      date: nowIso(),
      mealType: 'dinner' as const,
      items: [{ dishId: '', name: '米饭', amount: 150, unit: 'g' as const }],
      nutrition: session.nutrition,
      isOffPlan: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      sourceDevice: 'test-device',
    }
    const exercise = {
      id: 'ndm-exercise-1',
      status: 'completed' as const,
      type: '跑步',
      start: nowIso(),
      durationMin: 20,
      intensity: 'medium' as const,
      source: 'manual' as const,
      sessionId: session.id,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      sourceDevice: 'test-device',
    }
    const healthMetric = {
      id: 'ndm-metric-1',
      type: 'systolic_pressure' as const,
      value: 120,
      unit: 'mmHg',
      measuredAt: nowIso(),
      source: 'manual' as const,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      sourceDevice: 'test-device',
    }
    const utensil = {
      id: 'ndm-utensil-1',
      name: '白碗',
      kind: 'bowl' as const,
      volumeMl: 300,
      method: '一碗水',
      calibratedAt: nowIso(),
    }
    const knowledge = initialKnowledge().slice(0, 3).map(item => ({
      ...item,
      readAt: nowIso(),
    }))
    const baseData = {
      ...structuredClone(emptyAppData),
      profile,
      mealSessions: [session],
      mealLogs: [mealLog],
      exerciseLogs: [exercise],
      healthMetrics: [healthMetric],
      utensilCalibrations: [utensil],
      knowledge,
      medals: computeMedals({
        ...structuredClone(emptyAppData),
        profile,
        mealLogs: [mealLog],
        exerciseLogs: [exercise],
        knowledge,
      }),
    }
    useAppStore.setState({ data: baseData, initialized: true })
  })

  it('导出的 NDM 包含格式标识、固定章节和记录标记', () => {
    const data = useAppStore.getState().data
    const ndm = exportNdm(data, 'test-device')
    expect(ndm).toContain('format: "nutritionist-data-markdown"')
    expect(ndm).toContain('format_version: "1.0"')
    expect(ndm).toContain('# 营养师数据文档')
    expect(ndm).toContain('## 个人档案')
    expect(ndm).toContain('## 配餐记录')
    expect(ndm).toContain('## 用餐记录')
    expect(ndm).toContain('## 运动记录')
    expect(ndm).toContain('## 健康指标')
    expect(ndm).toContain('## 餐具校准')
    expect(ndm).toContain('## 知识与成就')
    expect(ndm).toContain('## 附件清单')
    expect(ndm).toContain('<!-- @record type=profile')
    expect(ndm).toContain('<!-- @record type=meal_plan')
    expect(ndm).toContain('<!-- @record type=meal_log')
  })

  it('NDM 可以解析回主要数据结构', () => {
    const data = useAppStore.getState().data
    const ndm = exportNdm(data, 'test-device')
    const parsed = parseNdm(ndm)

    expect(parsed.warnings.length).toBe(0)
    expect(parsed.data.profile?.nickname).toBe('数据用户')
    expect(parsed.data.mealSessions.length).toBe(1)
    expect(parsed.data.mealSessions[0].ingredients.length).toBe(1)
    expect(parsed.data.mealSessions[0].recommendations.length).toBeGreaterThan(0)
    expect(parsed.data.mealLogs.length).toBe(1)
    expect(parsed.data.exerciseLogs.length).toBe(1)
    expect(parsed.data.healthMetrics.length).toBe(1)
    expect(parsed.data.utensilCalibrations.length).toBe(1)
    expect(parsed.data.knowledge.length).toBe(3)
    expect(parsed.data.medals.length).toBeGreaterThan(0)
  })

  it('相同记录导入时会被跳过，不会重复添加', () => {
    const data = useAppStore.getState().data
    const imported = structuredClone(data)
    const result = mergeAppData(data, imported)
    expect(result.added).toBe(0)
    expect(result.skipped).toBeGreaterThan(0)
    expect(result.conflicts.length).toBe(0)
    expect(result.data.mealLogs.length).toBe(1)
  })

  it('同一编号但内容不同的记录会进入冲突清单', () => {
    const data = useAppStore.getState().data
    const imported = structuredClone(data)
    imported.mealLogs[0].note = '另一台设备修改过'
    const result = mergeAppData(data, imported)
    expect(result.conflicts.length).toBeGreaterThan(0)
    expect(result.conflicts.some(item => item.includes('用餐记录'))).toBe(true)
  })

  it('导入页面可以选择 NDM 文件并合并数据', async () => {
    const data = useAppStore.getState().data
    const ndm = exportNdm(data, 'test-device')
    const file = new File([ndm], '营养师数据_2026-11-12_test-device.ndm.md', {
      type: 'text/markdown',
    })

    // Clear current data to simulate another device.
    useAppStore.setState({
      data: structuredClone(emptyAppData),
      initialized: true,
    })

    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <ImportExport />
      </BrowserRouter>,
    )

    expect(
      screen.getByRole('button', { name: '导出轻量数据文档' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '导出完整备份包' })).toBeInTheDocument()

    await user.upload(screen.getByLabelText('导入 NDM 数据文档'), file)

    await waitFor(() => {
      expect(useAppStore.getState().data.profile?.nickname).toBe('数据用户')
    })
    expect(useAppStore.getState().data.mealSessions.length).toBe(1)
    expect(screen.getByText(/导入完成/)).toBeInTheDocument()
    expect(screen.getByText(/新增：/)).toBeInTheDocument()
  })
})
