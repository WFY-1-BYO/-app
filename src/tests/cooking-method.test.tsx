import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MealResult from '../pages/MealResult'
import { createDefaultProfile, emptyAppData, useAppStore } from '../store/appStore'
import { createMealSession } from '../lib/mealPlanner'
import { recommendCookingMethods, summarizeCookingMethods } from '../lib/cookingMethods'
import type { MealIngredient } from '../types'

function ingredient(name: string, id: string): MealIngredient {
  return {
    id,
    name,
    source: 'current',
    estimatedAmount: 100,
    confirmedAmount: 100,
    unit: 'g',
    state: 'raw',
    used: true,
  }
}

const grainAndProtein = [
  ingredient('米饭', 'g1'),
  ingredient('鸡胸肉', 'p1'),
  ingredient('西兰花', 'v1'),
]

describe('V1.7 配餐：建议具体烹饪方式以保留营养', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      data: {
        ...structuredClone(emptyAppData),
        profile: createDefaultProfile({
          nickname: '测试用户',
          goal: 'maintain_health',
          allergies: [],
          avoid: [],
          tastes: ['light'],
          diseases: [],
        }),
      },
      initialized: true,
    })
  })

  it('配餐结果带有明确的烹饪方式、理由和做法', () => {
    const profile = useAppStore.getState().data.profile!
    const session = createMealSession({
      profile,
      mealType: 'lunch',
      ingredients: grainAndProtein,
      sourceDevice: 'test-device',
    })
    const methods = session.dishes[0]!.cookingMethods!
    expect(methods.length).toBeGreaterThanOrEqual(2)
    for (const method of methods) {
      expect(method.name.length).toBeGreaterThan(0)
      expect(method.appliesTo.length).toBeGreaterThan(0)
      expect(method.reason.length).toBeGreaterThan(10)
      expect(method.tip.length).toBeGreaterThan(10)
    }
    expect(session.reason).toContain('更保留营养的具体烹饪方式')
  })

  it('明确给出「微波炉加热」这种可执行方式，并说明营养理由', () => {
    const methods = recommendCookingMethods([ingredient('西兰花', 'v1')])
    const microwave = methods.find(method => method.name === '微波炉加热')!
    expect(microwave).toBeDefined()
    expect(microwave.appliesTo).toBe('蔬菜')
    expect(microwave.reason).toMatch(/维生素|营养|流失/)
    expect(microwave.tip).toContain('中高火')
  })

  it('不同食材类别给不同方式，且不重复', () => {
    const methods = recommendCookingMethods(grainAndProtein)
    const keys = methods.map(method => `${method.appliesTo}-${method.name}`)
    expect(new Set(keys).size).toBe(keys.length)
    expect(methods.some(method => method.name === '隔水蒸')).toBe(true)
    expect(methods.some(method => method.name === '少油快炒')).toBe(true)
    expect(methods.length).toBeLessThanOrEqual(5)
  })

  it('没有可识别食材时仍给出微波炉加热兜底', () => {
    const methods = recommendCookingMethods([ingredient('自制混合菜', 'x1')])
    expect(methods).toHaveLength(1)
    expect(methods[0]!.name).toBe('微波炉加热')
    expect(summarizeCookingMethods(methods)).toContain('微波炉加热')
  })

  it('配餐结果页展示「建议烹饪方式」及每条理由、做法', async () => {
    const profile = useAppStore.getState().data.profile!
    const session = createMealSession({
      profile,
      mealType: 'dinner',
      ingredients: grainAndProtein,
      sourceDevice: 'test-device',
    })
    await useAppStore.getState().addMealSession(session)

    render(
      <MemoryRouter initialEntries={[`/meal/${session.id}`]}>
        <Routes>
          <Route path="/meal/:id" element={<MealResult />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '建议烹饪方式' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: '建议烹饪方式' })).toBeInTheDocument()
    expect(screen.getAllByText('微波炉加热').length).toBeGreaterThan(0)
    expect(screen.getByText(/优先选加热短、用水少/)).toBeInTheDocument()
    expect(screen.getAllByText(/做法：/).length).toBeGreaterThan(0)
  })

  it('旧版本配餐数据没有烹饪方式字段时按当次食材即时补算', async () => {
    const profile = useAppStore.getState().data.profile!
    const session = createMealSession({
      profile,
      mealType: 'dinner',
      ingredients: grainAndProtein,
      sourceDevice: 'test-device',
    })
    session.dishes[0]!.cookingMethods = undefined
    await useAppStore.getState().addMealSession(session)

    render(
      <MemoryRouter initialEntries={[`/meal/${session.id}`]}>
        <Routes>
          <Route path="/meal/:id" element={<MealResult />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '建议烹饪方式' })).toBeInTheDocument()
    expect(screen.getAllByText('微波炉加热').length).toBeGreaterThan(0)
  })
})
