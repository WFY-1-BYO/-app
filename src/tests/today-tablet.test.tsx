import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Today from '../pages/Today'
import { emptyAppData, useAppStore, createDefaultProfile } from '../store/appStore'
import { initialKnowledge } from '../lib/knowledge'
import type { HealthMetric } from '../types'

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

function metric(type: HealthMetric['type'], value: number): HealthMetric {
  return {
    id: `metric-${type}`,
    type,
    value,
    unit: type.includes('pressure') ? 'mmHg' : 'mmol/L',
    measuredAt: '2026-11-10T08:00:00.000Z',
    source: 'manual',
    createdAt: '2026-11-10T08:00:00.000Z',
    updatedAt: '2026-11-10T08:00:00.000Z',
    sourceDevice: 'vivo S7',
  }
}

function setup(healthMetrics: HealthMetric[] = []) {
  useAppStore.setState({
    data: {
      ...structuredClone(emptyAppData),
      profile: createDefaultProfile({ nickname: '测试用户', goal: 'lose_fat' }),
      knowledge: initialKnowledge(),
      healthMetrics,
    },
    initialized: true,
  })
  return render(
    <MemoryRouter>
      <Today />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('V1.3 首页平板双栏（图 14）', () => {
  it('平板首页分为主栏与副栏，主栏保留配餐主线', () => {
    stubMedia(true)
    const { container } = setup()

    expect(container.querySelector('.tablet-today')).not.toBeNull()
    expect(container.querySelector('.today-main')).not.toBeNull()
    expect(container.querySelector('.today-side')).not.toBeNull()

    const main = container.querySelector('.today-main')!
    expect(main.querySelector('[aria-label="下一餐"]')).not.toBeNull()
    expect(main.querySelectorAll('.cta-primary')).toHaveLength(1)
    expect(main.textContent).toContain('今天三餐')
    expect(main.textContent).toContain('○ 待配餐')
  })

  it('副栏含营养师说、坚持进度与健康指标，且全页只有一个主 CTA', () => {
    stubMedia(true)
    const { container } = setup()

    const side = container.querySelector('.today-side')!
    expect(side.querySelector('[aria-label="营养师说"]')).not.toBeNull()
    expect(side.querySelector('[aria-label="坚持进度"]')).not.toBeNull()
    expect(side.querySelector('[aria-label="健康指标"]')).not.toBeNull()
    expect(side.textContent).toContain('中断不会清零')
    expect(container.querySelectorAll('.cta-primary')).toHaveLength(1)
  })

  it('健康指标只做摘要与就医提醒，不出现运动字样', () => {
    stubMedia(true)
    const { container } = setup()

    expect(container.textContent).toContain('不替代诊断')
    expect(container.textContent).toContain('及时就医')
    expect(container.textContent).not.toContain('运动')
  })

  it('有血压数据时按 128/82 mmHg 形式展示', () => {
    stubMedia(true)
    const { container } = setup([
      metric('systolic_pressure', 128),
      metric('diastolic_pressure', 82),
    ])
    expect(container.querySelector('.health-big')?.textContent).toContain('128/82')
  })

  it('手机宽度仍是极简一屏，不渲染平板双栏', () => {
    stubMedia(false)
    const { container } = setup()
    expect(container.querySelector('.tablet-today')).toBeNull()
    expect(screen.queryByText('今天三餐')).not.toBeInTheDocument()
    expect(screen.queryByText('坚持进度')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.cta-primary')).toHaveLength(1)
  })
})
