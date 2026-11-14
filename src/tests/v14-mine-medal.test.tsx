import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Mine from '../pages/Mine'
import MedalCelebration from '../components/MedalCelebration'
import { emptyAppData, useAppStore } from '../store/appStore'

const seed = (patch: Partial<ReturnType<typeof structuredClone<typeof emptyAppData>>>) => {
  const data = structuredClone(emptyAppData) as never as Record<string, unknown>
  Object.assign(data, patch)
  useAppStore.setState({ data: data as never, initialized: true })
}

describe('V1.4 改动 6：我的页面布局重组', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({ data: structuredClone(emptyAppData), initialized: true })
  })

  it('顶部有头像档案卡与四项统计', () => {
    seed({
      profile: {
        id: 'p1',
        nickname: '小骑士',
        goal: 'maintain_health',
        allergies: [],
        avoid: [],
        tastes: [],
        diseases: [],
        doctorRestrictions: '',
        createdAt: '2026-01-01T00:00:00+08:00',
        updatedAt: '2026-01-01T00:00:00+08:00',
      },
      mealLogs: [],
    })
    render(
      <MemoryRouter>
        <Mine />
      </MemoryRouter>,
    )
    expect(screen.getByText('小骑士')).toBeInTheDocument()
    expect(screen.getByAltText('知夏')).toBeInTheDocument()
    expect(screen.getByText('记录天数')).toBeInTheDocument()
    expect(screen.getByText('已点亮勋章')).toBeInTheDocument()
    expect(screen.getByText('知识收藏')).toBeInTheDocument()
  })

  it('按「校准与授权」「数据与备份」分组展示入口，不再是一排小按钮', () => {
    render(
      <MemoryRouter>
        <Mine />
      </MemoryRouter>,
    )
    expect(screen.getByText('校准与授权')).toBeInTheDocument()
    expect(screen.getByText('数据与备份')).toBeInTheDocument()
    expect(screen.getByText('设置与 AI 密钥')).toBeInTheDocument()
    expect(screen.getByText('NDM 导入导出')).toBeInTheDocument()
    expect(screen.queryByText('常用功能')).toBeNull()
  })

  it('有记录数据时统计数字正确', () => {
    seed({
      mealLogs: [
        {
          id: 'log1',
          date: '2026-11-13',
          mealType: 'lunch',
          items: [],
          nutrition: {
            calories: 500,
            carbs: 50,
            protein: 20,
            fat: 15,
            carbsRatio: 0.4,
            proteinRatio: 0.2,
            fatRatio: 0.4,
          },
          isOffPlan: false,
          createdAt: '2026-11-13T12:00:00+08:00',
          updatedAt: '2026-11-13T12:00:00+08:00',
          sourceDevice: 'test',
        },
      ],
    })
    render(
      <MemoryRouter>
        <Mine />
      </MemoryRouter>,
    )
    // 记录天数与累计坚持都是 1
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2)
  })
})

describe('V1.4 改动 7：勋章点亮全屏动画', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({ data: structuredClone(emptyAppData), initialized: true })
  })

  it('勋章从未点亮到点亮时，播放一次全屏庆祝', async () => {
    render(<MedalCelebration />)
    expect(screen.queryByText('勋章点亮！')).toBeNull()

    // 记录第一餐 → 「第一束光」达成
    await useAppStore.getState().addMealLog({
      id: 'log-1',
      date: '2026-11-14',
      mealType: 'lunch',
      items: [],
      nutrition: {
        calories: 500,
        carbs: 50,
        protein: 20,
        fat: 15,
        carbsRatio: 0.4,
        proteinRatio: 0.2,
        fatRatio: 0.4,
      },
      isOffPlan: false,
      createdAt: '2026-11-14T12:00:00+08:00',
      updatedAt: '2026-11-14T12:00:00+08:00',
      sourceDevice: 'test',
    })

    await waitFor(() => {
      expect(screen.getByText('勋章点亮！')).toBeInTheDocument()
    })
    expect(screen.getByText('第一束光')).toBeInTheDocument()
    expect(screen.getByAltText('知夏开心庆祝')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收下这份鼓励' })).toBeInTheDocument()
  })

  it('点「收下这份鼓励」关闭动画，同一枚勋章不重复播放', async () => {
    const user = userEvent.setup()
    render(<MedalCelebration />)

    await useAppStore.getState().addMealLog({
      id: 'log-1',
      date: '2026-11-14',
      mealType: 'lunch',
      items: [],
      nutrition: {
        calories: 500,
        carbs: 50,
        protein: 20,
        fat: 15,
        carbsRatio: 0.4,
        proteinRatio: 0.2,
        fatRatio: 0.4,
      },
      isOffPlan: false,
      createdAt: '2026-11-14T12:00:00+08:00',
      updatedAt: '2026-11-14T12:00:00+08:00',
      sourceDevice: 'test',
    })
    await waitFor(() => {
      expect(screen.getByText('勋章点亮！')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: '收下这份鼓励' }))
    expect(screen.queryByText('勋章点亮！')).toBeNull()

    // 数据再变化（已点亮的勋章不会再次触发）
    await useAppStore.getState().addMealLog({
      id: 'log-2',
      date: '2026-11-14',
      mealType: 'dinner',
      items: [],
      nutrition: {
        calories: 400,
        carbs: 40,
        protein: 20,
        fat: 12,
        carbsRatio: 0.4,
        proteinRatio: 0.2,
        fatRatio: 0.4,
      },
      isOffPlan: false,
      createdAt: '2026-11-14T19:00:00+08:00',
      updatedAt: '2026-11-14T19:00:00+08:00',
      sourceDevice: 'test',
    })
    await waitFor(() => {
      expect(useAppStore.getState().data.medals.length).toBeGreaterThan(0)
    })
    expect(screen.queryByText('勋章点亮！')).toBeNull()
  })
})
