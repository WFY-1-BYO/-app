import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Records from '../pages/Records'
import { emptyAppData, useAppStore, createDefaultProfile } from '../store/appStore'
import type { MealLog, MealType } from '../types'

function stubMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

function log(date: string, mealType: MealType, isOffPlan = false): MealLog {
  return {
    id: `${date}-${mealType}`,
    date: `${date}T08:00:00.000Z`,
    mealType,
    items: [{ dishId: 'd1', name: '米饭', amount: 150, unit: 'g' }],
    nutrition: {
      calories: 520,
      carbs: 60,
      protein: 30,
      fat: 15,
      carbsRatio: 46,
      proteinRatio: 23,
      fatRatio: 31,
    },
    isOffPlan,
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
    sourceDevice: 'vivo S7',
  }
}

function setup() {
  useAppStore.setState({
    data: {
      ...structuredClone(emptyAppData),
      profile: createDefaultProfile({ nickname: '测试用户', goal: 'maintain_health' }),
      mealLogs: [
        log('2026-11-11', 'breakfast'),
        log('2026-11-11', 'dinner', true),
        log('2026-11-08', 'lunch'),
      ],
    },
    initialized: true,
  })
  return render(
    <MemoryRouter>
      <Records />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('V1.3 记录页平板双栏（图 15）', () => {
  it('平板分为左历史与右详情，左栏含四项坚持统计', () => {
    stubMedia(true)
    const { container } = setup()
    expect(container.querySelector('.records-tablet')).not.toBeNull()
    expect(container.querySelector('.records-left')).not.toBeNull()
    expect(container.querySelector('.records-right')).not.toBeNull()
    expect(container.querySelector('.stat-grid-four')).not.toBeNull()

    const left = container.querySelector('.records-left')!
    expect(left.textContent).toContain('记录日')
    expect(left.textContent).toContain('累计坚持日')
    expect(left.textContent).toContain('当前连续')
    expect(left.textContent).toContain('历史最长')
    expect(left.querySelector('.history-list')).not.toBeNull()
  })

  it('右栏含供能环、四态判定、知夏说明与近 14 天趋势', () => {
    stubMedia(true)
    const { container } = setup()
    expect(screen.getByRole('img', { name: '三大营养素供能比例' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '四态判定' })).toHaveTextContent('记录日')
    expect(screen.getByRole('region', { name: '四态判定' })).toHaveTextContent('均衡日')
    expect(screen.getByText('知夏 · 这天的说明')).toBeInTheDocument()
    expect(container.querySelector('.trend-bars')).not.toBeNull()
    expect(container.querySelectorAll('.trend-col')).toHaveLength(14)
    expect(container.querySelectorAll('.seg')).toHaveLength(42)
  })

  it('点击左栏某天可切换右栏详情日期', async () => {
    stubMedia(true)
    const user = userEvent.setup()
    const { container } = setup()
    const before = screen.getByRole('region', { name: '单日营养详情' }).textContent
    const items = container.querySelectorAll('button.history-item')
    expect(items.length).toBeGreaterThan(1)
    await user.click(items[items.length - 1] as HTMLButtonElement)
    expect(screen.getByRole('region', { name: '单日营养详情' }).textContent).not.toBe(
      before,
    )
  })

  it('分类切换含饮食/健康/勋章，不出现运动', async () => {
    stubMedia(true)
    const user = userEvent.setup()
    const { container } = setup()
    const group = screen.getByRole('group', { name: '记录分类切换' })
    expect(group.textContent).toContain('饮食')
    expect(group.textContent).toContain('健康')
    expect(group.textContent).toContain('勋章')
    expect(container.textContent).not.toContain('运动')

    await user.click(screen.getByRole('button', { name: '健康' }))
    expect(container.querySelector('.records-left')!.textContent).toContain(
      '还没有健康指标记录',
    )
    await user.click(screen.getByRole('button', { name: '勋章' }))
    // 造了用餐记录后勋章会自动点亮，此处校验勋章列表而非空态
    expect(container.querySelector('.records-left')!.textContent).toContain('点亮')
  })

  it('无记录日只给温和说明，不出现批评式能量提示', () => {
    stubMedia(true)
    useAppStore.setState({
      data: {
        ...structuredClone(emptyAppData),
        profile: createDefaultProfile({ nickname: '测试用户', goal: 'maintain_health' }),
      },
      initialized: true,
    })
    render(
      <MemoryRouter>
        <Records />
      </MemoryRouter>,
    )
    const note = screen.getByText('知夏 · 这天的说明').parentElement!.textContent ?? ''
    expect(note).toContain('先按自己的节奏来就好')
    expect(note).not.toContain('偏低')
  })

  it('手机仍是单列，保留原有统计与入口', () => {
    stubMedia(false)
    const { container } = setup()
    expect(container.querySelector('.records-tablet')).toBeNull()
    expect(screen.getByText('累计记录日')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '今天三餐状态' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '健康指标' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '我想吃点别的' })).toBeInTheDocument()
    expect(container.textContent).not.toContain('运动')
  })
})
