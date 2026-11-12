import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom'
import Medals from '../pages/Medals'
import AppShell from '../components/AppShell'
import FloatingAssistant from '../components/FloatingAssistant'
import { createDefaultProfile, emptyAppData, useAppStore } from '../store/appStore'
import { computeMedals } from '../lib/medals'
import { initialKnowledge } from '../lib/knowledge'
import type { MealLog } from '../types'

function makeLog(date: string): MealLog {
  return {
    id: `log-${date}`,
    date,
    mealType: 'lunch',
    items: [{ dishId: 'dish', name: '正常餐', amount: 300, unit: 'g' }],
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

describe('功能九：悬浮角色、勋章与奖励', () => {
  beforeEach(() => {
    localStorage.clear()
    const profile = createDefaultProfile({
      nickname: '勋章用户',
      goal: 'maintain_health',
    })
    useAppStore.setState({
      data: {
        ...structuredClone(emptyAppData),
        profile,
        knowledge: initialKnowledge(),
      },
      initialized: true,
    })
  })

  it('首次用餐记录会点亮第一束光', () => {
    const data = useAppStore.getState().data
    const medals = computeMedals({ ...data, mealLogs: [makeLog('2026-11-12')] })
    const first = medals.find(medal => medal.id === 'first_light')
    expect(first?.unlockedAt).toBeTruthy()
    expect(first?.current).toBe(1)
  })

  it('累计 3 个记录日会点亮三日新芽', () => {
    const data = useAppStore.getState().data
    const logs = ['2026-11-10', '2026-11-11', '2026-11-12'].map(makeLog)
    const medals = computeMedals({ ...data, mealLogs: logs })
    const three = medals.find(medal => medal.id === 'three_sprouts')
    expect(three?.unlockedAt).toBeTruthy()
  })

  it('计划外饮食不会熄灭累计勋章', () => {
    const data = useAppStore.getState().data
    const logs = ['2026-11-10', '2026-11-11', '2026-11-12'].map(makeLog)
    logs[2].isOffPlan = true
    const medals = computeMedals({ ...data, mealLogs: logs })
    const three = medals.find(medal => medal.id === 'three_sprouts')
    expect(three?.unlockedAt).toBeTruthy()
    const honest = medals.find(medal => medal.id === 'honest_record')
    expect(honest?.current).toBe(1)
  })

  it('勋章墙展示分组、进度和已点亮状态', () => {
    const data = useAppStore.getState().data
    useAppStore.setState({
      data: {
        ...data,
        mealLogs: ['2026-11-10', '2026-11-11', '2026-11-12'].map(makeLog),
        medals: computeMedals({
          ...data,
          mealLogs: ['2026-11-10', '2026-11-11', '2026-11-12'].map(makeLog),
        }),
      },
    })

    render(
      <BrowserRouter>
        <Medals />
      </BrowserRouter>,
    )

    expect(screen.getByRole('heading', { name: '勋章墙' })).toBeInTheDocument()
    expect(screen.getByText('坚持')).toBeInTheDocument()
    expect(screen.getByText('从容')).toBeInTheDocument()
    expect(screen.getByText('第一束光')).toBeInTheDocument()
    expect(screen.getByText('三日新芽')).toBeInTheDocument()
    expect(screen.getByText('已点亮')).toBeInTheDocument()
  })

  it('达到 30 天里程碑后提供可选奖励', async () => {
    const data = useAppStore.getState().data
    const dates = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(2026, 9, 1 + index)
      const key = date.toISOString().slice(0, 10)
      return makeLog(key)
    })
    useAppStore.setState({
      data: {
        ...data,
        mealLogs: dates,
        medals: computeMedals({ ...data, mealLogs: dates }),
      },
    })

    render(
      <BrowserRouter>
        <Medals />
      </BrowserRouter>,
    )

    expect(screen.getByText('三十日烟火')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '适量奶茶' })).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '适量奶茶' }))

    await waitFor(() => {
      expect(useAppStore.getState().data.rewards.length).toBe(1)
    })
    expect(useAppStore.getState().data.rewards[0].name).toBe('适量奶茶')
  })

  it('悬浮角色可以点击展开提示气泡', async () => {
    const user = userEvent.setup()
    render(<FloatingAssistant message="今天也要好好吃饭。" />)

    const assistant = screen.getByRole('button', { name: '营养师助手' })
    expect(assistant).toBeInTheDocument()
    await user.click(assistant)
    expect(screen.getByRole('status')).toHaveTextContent('今天也要好好吃饭。')
  })

  it('关闭悬浮角色后不再显示，但核心功能仍可用', async () => {
    useAppStore.setState({
      data: {
        ...useAppStore.getState().data,
        settings: { ...useAppStore.getState().data.settings, assistantEnabled: false },
      },
    })
    const { container } = render(<FloatingAssistant />)
    expect(container.querySelector('.assistant')).toBeNull()
  })

  it('专注页面会隐藏悬浮角色', () => {
    render(
      <MemoryRouter initialEntries={['/meal/new']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/meal/new" element={<div>拍照配餐</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('拍照配餐')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '营养师助手' })).toBeNull()
  })
})
