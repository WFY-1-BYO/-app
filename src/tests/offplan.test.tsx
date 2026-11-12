import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import OffPlan from '../pages/OffPlan'
import { createDefaultProfile, emptyAppData, useAppStore } from '../store/appStore'
import { computeStreak } from '../lib/stats'
import type { MealLog } from '../types'

function makeLog(date: string): MealLog {
  return {
    id: `old-${date}`,
    date,
    mealType: 'lunch',
    items: [{ dishId: 'dish', name: '正常午餐', amount: 300, unit: 'g' }],
    nutrition: {
      calories: 500,
      carbs: 60,
      protein: 25,
      fat: 15,
      carbsRatio: 50,
      proteinRatio: 25,
      fatRatio: 25,
    },
    isOffPlan: false,
    createdAt: date,
    updatedAt: date,
    sourceDevice: 'test-device',
  }
}

describe('功能八：计划外饮食的人性化处理', () => {
  beforeEach(() => {
    localStorage.clear()
    const profile = createDefaultProfile({
      nickname: '从容用户',
      goal: 'maintain_health',
      diseases: [],
    })
    useAppStore.setState({
      data: {
        ...structuredClone(emptyAppData),
        profile,
        mealLogs: [makeLog('2026-11-10'), makeLog('2026-11-11')],
      },
      initialized: true,
    })
  })

  it('提供三种处理方式，不使用羞辱性文案', () => {
    render(
      <BrowserRouter>
        <OffPlan />
      </BrowserRouter>,
    )
    expect(screen.getByRole('form', { name: '计划外饮食' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '按原计划吃' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '少量或调整搭配' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '偶尔正常吃' })).toBeInTheDocument()
    expect(screen.getByText(/不会批评你/)).toBeInTheDocument()
  })

  it('可以记录计划外饮食，并保留原有坚持统计', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <OffPlan />
      </BrowserRouter>,
    )

    await user.clear(screen.getByLabelText('想吃的食物'))
    await user.type(screen.getByLabelText('想吃的食物'), '肯德基套餐')
    await user.click(screen.getByRole('button', { name: '偶尔正常吃' }))
    await user.click(screen.getByRole('button', { name: '记录这次选择' }))

    await waitFor(() => {
      expect(useAppStore.getState().data.mealLogs.length).toBe(3)
    })

    const log = useAppStore.getState().data.mealLogs[2]
    expect(log.isOffPlan).toBe(true)
    expect(log.items[0]?.name).toBe('肯德基套餐')

    const streak = computeStreak(useAppStore.getState().data.mealLogs)
    expect(streak.totalDays).toBeGreaterThanOrEqual(3)
  })

  it('保存后提示长期成果不清零，不要求补偿', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <OffPlan />
      </BrowserRouter>,
    )

    await user.click(screen.getByRole('button', { name: '少量或调整搭配' }))
    await user.click(screen.getByRole('button', { name: '记录这次选择' }))

    await waitFor(() => {
      expect(screen.getByText('已经记下来了')).toBeInTheDocument()
    })

    expect(screen.getByText(/之前的坚持仍然算数/)).toBeInTheDocument()
    expect(screen.getByText(/不需要用极端节食或过量运动补偿/)).toBeInTheDocument()
  })
})
