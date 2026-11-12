import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Records from '../pages/Records'
import { createDefaultProfile, emptyAppData, useAppStore } from '../store/appStore'
import { computeStreak, summarizeNutrition } from '../lib/stats'
import type { MealLog } from '../types'

function makeLog(date: string, overrides: Partial<MealLog> = {}): MealLog {
  return {
    id: `log-${date}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId: undefined,
    date,
    mealType: 'lunch',
    items: [{ dishId: 'dish', name: '米饭', amount: 150, unit: 'g' }],
    nutrition: {
      calories: 300,
      carbs: 40,
      protein: 12,
      fat: 8,
      carbsRatio: 50,
      proteinRatio: 20,
      fatRatio: 30,
    },
    isOffPlan: false,
    createdAt: date,
    updatedAt: date,
    sourceDevice: 'test-device',
    ...overrides,
  }
}

describe('功能四：用餐记录与坚持统计', () => {
  beforeEach(() => {
    localStorage.clear()
    const profile = createDefaultProfile({
      nickname: '记录用户',
      goal: 'maintain_health',
    })
    useAppStore.setState({
      data: { ...structuredClone(emptyAppData), profile },
      initialized: true,
    })
  })

  it('营养汇总会累加克数并重算供能比例', () => {
    const logs = [
      makeLog('2026-11-10'),
      makeLog('2026-11-11', {
        nutrition: {
          calories: 200,
          carbs: 20,
          protein: 10,
          fat: 5,
          carbsRatio: 40,
          proteinRatio: 30,
          fatRatio: 30,
        },
      }),
    ]
    const summary = summarizeNutrition(logs)
    expect(summary.calories).toBe(500)
    expect(summary.carbs).toBe(60)
    expect(summary.protein).toBe(22)
    expect(summary.fat).toBe(13)
    expect(summary.carbsRatio + summary.proteinRatio + summary.fatRatio).toBeGreaterThan(95)
  })

  it('连续记录统计可以区分当前、历史最长和累计', () => {
    const logs = [
      makeLog('2026-11-08'),
      makeLog('2026-11-09'),
      makeLog('2026-11-10'),
      makeLog('2026-11-12'),
    ]
    const streak = computeStreak(logs)
    expect(streak.totalDays).toBe(4)
    expect(streak.longest).toBe(3)
  })

  it('休息日不打断连续记录', () => {
    const logs = [makeLog('2026-11-10'), makeLog('2026-11-12')]
    const streak = computeStreak(logs, ['2026-11-11'])
    expect(streak.longest).toBe(2)
  })

  it('记录页展示统计、营养图和用餐历史', () => {
    const logs = [
      makeLog('2026-11-11'),
      makeLog('2026-11-12', { isOffPlan: true }),
    ]
    useAppStore.setState({
      data: {
        ...useAppStore.getState().data,
        mealLogs: logs,
      },
    })

    render(
      <BrowserRouter>
        <Records />
      </BrowserRouter>,
    )

    expect(screen.getByRole('heading', { name: '记录' })).toBeInTheDocument()
    expect(screen.getByText('累计记录日')).toBeInTheDocument()
    expect(screen.getByText('当前连续记录')).toBeInTheDocument()
    expect(screen.getByText('历史最长记录')).toBeInTheDocument()
    expect(screen.getByText('计划外饮食')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '三大营养素供能比例' })).toBeInTheDocument()
    expect(screen.getByText('2026/11/12')).toBeInTheDocument()
    expect(screen.getAllByText(/计划外/).length).toBeGreaterThan(0)
  })

  it('可以把今天标记为休息日，且不打断长期统计', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <Records />
      </BrowserRouter>,
    )

    await user.click(screen.getByRole('button', { name: '把今天标记为休息日' }))

    await waitFor(() => {
      expect(useAppStore.getState().data.restDays.length).toBe(1)
    })
    expect(screen.getByRole('button', { name: '取消今日休息日' })).toBeInTheDocument()
  })
})
