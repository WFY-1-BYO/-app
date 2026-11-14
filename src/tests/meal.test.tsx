import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MealNew from '../pages/MealNew'
import MealResult from '../pages/MealResult'
import MealConfirm from '../pages/MealConfirm'
import { createDefaultProfile, emptyAppData, useAppStore } from '../store/appStore'
import { createMealSession } from '../lib/mealPlanner'
import { nutritionFromIngredients } from '../lib/nutrition'

function renderMealRoutes(initialEntry = '/meal/new') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/meal/new" element={<MealNew />} />
        <Route path="/meal/:id" element={<MealResult />} />
        <Route path="/meal/:id/confirm" element={<MealConfirm />} />
        <Route path="/records" element={<div>记录页</div>} />
        <Route path="/onboarding" element={<div>档案页</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('功能一：当次食材配餐', () => {
  beforeEach(() => {
    localStorage.clear()
    const profile = createDefaultProfile({
      nickname: '测试用户',
      goal: 'maintain_health',
      allergies: [],
      avoid: [],
      tastes: ['light'],
      diseases: [],
    })
    useAppStore.setState({
      data: { ...structuredClone(emptyAppData), profile },
      initialized: true,
    })
  })

  it('配餐逻辑只使用当次已有食材，并生成具体菜品和营养', () => {
    const profile = useAppStore.getState().data.profile!
    const ingredients = [
      {
        id: 'i1',
        name: '米饭',
        source: 'current' as const,
        estimatedAmount: 150,
        confirmedAmount: 150,
        unit: 'g' as const,
        state: 'raw' as const,
        used: true,
      },
      {
        id: 'i2',
        name: '鸡胸肉',
        source: 'current' as const,
        estimatedAmount: 100,
        confirmedAmount: 100,
        unit: 'g' as const,
        state: 'raw' as const,
        used: true,
      },
      {
        id: 'i3',
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

    expect(session.ingredients.map(item => item.name)).toEqual(['米饭', '鸡胸肉'])
    expect(session.ingredients.every(item => item.source === 'current')).toBe(true)
    expect(session.recommendations.some(item => item.source === 'recommended')).toBe(true)
    expect(session.dishes[0]?.name).toContain('主食')
    expect(session.dishes[0]?.steps.length).toBeGreaterThan(0)
    expect(session.nutrition.calories).toBeGreaterThan(0)
    expect(session.reason).toContain('当次已有食材')
    expect(session.nutrition.carbsRatio).toBeGreaterThan(0)
    expect(session.nutrition.proteinRatio).toBeGreaterThan(0)
  })

  it('额外推荐食材不计入本次营养计算', () => {
    const current = [
      {
        id: 'a',
        name: '米饭',
        source: 'current' as const,
        estimatedAmount: 100,
        confirmedAmount: 100,
        unit: 'g' as const,
        state: 'raw' as const,
        used: true,
      },
    ]
    const recommended = [
      {
        id: 'b',
        name: '西兰花',
        source: 'recommended' as const,
        unit: 'g' as const,
        state: 'raw' as const,
        used: false,
      },
    ]
    const onlyCurrent = nutritionFromIngredients(current)
    const withRecommended = nutritionFromIngredients([...current, ...recommended])
    expect(withRecommended).toEqual(onlyCurrent)
  })

  it('过敏和忌口食材不会进入当次配菜', () => {
    const profile = useAppStore.getState().data.profile!
    profile.allergies = ['鸡蛋']
    profile.avoid = ['香菜']
    const ingredients = [
      {
        id: 'x1',
        name: '鸡蛋',
        source: 'current' as const,
        estimatedAmount: 50,
        confirmedAmount: 50,
        unit: 'g' as const,
        state: 'raw' as const,
        used: true,
      },
      {
        id: 'x2',
        name: '香菜',
        source: 'current' as const,
        estimatedAmount: 10,
        confirmedAmount: 10,
        unit: 'g' as const,
        state: 'raw' as const,
        used: true,
      },
      {
        id: 'x3',
        name: '番茄',
        source: 'current' as const,
        estimatedAmount: 100,
        confirmedAmount: 100,
        unit: 'g' as const,
        state: 'raw' as const,
        used: true,
      },
    ]
    const session = createMealSession({
      profile,
      mealType: 'lunch',
      ingredients,
      sourceDevice: 'test-device',
    })
    expect(session.ingredients.map(item => item.name)).toEqual(['番茄'])
  })

  it('可以从拍照配餐页手动添加食材并生成菜谱', async () => {
    const user = userEvent.setup()
    renderMealRoutes('/meal/new')

    await user.click(screen.getByRole('button', { name: '晚餐' }))
    await user.type(screen.getByLabelText('食材名称'), '米饭')
    await user.type(screen.getByLabelText('用量，单位克'), '150')
    await user.click(screen.getByRole('button', { name: '添加食材' }))
    await user.type(screen.getByLabelText('食材名称'), '鸡胸肉')
    await user.click(screen.getByRole('button', { name: '添加食材' }))

    await user.click(screen.getByRole('button', { name: '生成菜谱' }))

    await waitFor(() => {
      expect(useAppStore.getState().data.mealSessions.length).toBe(1)
    })

    const session = useAppStore.getState().data.mealSessions[0]
    expect(session.mealType).toBe('dinner')
    expect(session.ingredients.map(item => item.name)).toEqual(['米饭', '鸡胸肉'])
    expect(session.dishes[0]?.name).toBeTruthy()
  })

  it('配餐结果页展示菜谱、当次食材、营养和额外推荐', async () => {
    const profile = useAppStore.getState().data.profile!
    const ingredients = [
      {
        id: 'm1',
        name: '米饭',
        source: 'current' as const,
        estimatedAmount: 150,
        confirmedAmount: 150,
        unit: 'g' as const,
        state: 'raw' as const,
        used: true,
      },
      {
        id: 'm2',
        name: '鸡胸肉',
        source: 'current' as const,
        estimatedAmount: 100,
        confirmedAmount: 100,
        unit: 'g' as const,
        state: 'raw' as const,
        used: true,
      },
    ]
    const session = createMealSession({
      profile,
      mealType: 'dinner',
      ingredients,
      sourceDevice: 'test-device',
    })
    await useAppStore.getState().addMealSession(session)

    renderMealRoutes(`/meal/${session.id}`)

    expect(screen.getByRole('heading', { name: /当次食材配餐|主食/ })).toBeInTheDocument()
    expect(screen.getByText('现在就能做')).toBeInTheDocument()
    expect(screen.getByText('营养估算')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '确认实际用餐' })).toBeInTheDocument()
    expect(screen.getByText(/以后可以补充/)).toBeInTheDocument()
  })

  it('实际用餐确认会生成记录，计划外饮食不清零成果', async () => {
    const profile = useAppStore.getState().data.profile!
    const ingredients = [
      {
        id: 'c1',
        name: '米饭',
        source: 'current' as const,
        estimatedAmount: 150,
        confirmedAmount: 150,
        unit: 'g' as const,
        state: 'raw' as const,
        used: true,
      },
    ]
    const session = createMealSession({
      profile,
      mealType: 'dinner',
      ingredients,
      sourceDevice: 'test-device',
    })
    await useAppStore.getState().addMealSession(session)

    renderMealRoutes(`/meal/${session.id}/confirm`)
    await userEvent.click(screen.getByLabelText(/计划外饮食/))
    await userEvent.type(screen.getByLabelText('备注'), '吃了一顿计划外餐食')
    await userEvent.click(screen.getByRole('button', { name: '保存用餐记录' }))

    await waitFor(() => {
      expect(useAppStore.getState().data.mealLogs.length).toBe(1)
    })

    const log = useAppStore.getState().data.mealLogs[0]
    expect(log.isOffPlan).toBe(true)
    expect(log.note).toBe('吃了一顿计划外餐食')
    expect(log.items[0]?.name).toBe('米饭')
    expect(log.nutrition.calories).toBeGreaterThan(0)
  })
})
