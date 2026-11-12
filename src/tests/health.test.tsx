import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Health from '../pages/Health'
import { emptyAppData, useAppStore } from '../store/appStore'
import { analyzeMetric, metricLabels, metricUnit } from '../lib/health'
import { parseHealthCsv } from '../lib/healthImport'
import type { HealthMetric } from '../types'

function makeMetric(overrides: Partial<HealthMetric>): HealthMetric {
  return {
    id: 'metric-test',
    type: 'systolic_pressure',
    value: 120,
    unit: 'mmHg',
    measuredAt: '2026-11-12T08:00:00+08:00',
    source: 'manual',
    createdAt: '2026-11-12T08:00:00+08:00',
    updatedAt: '2026-11-12T08:00:00+08:00',
    sourceDevice: 'test-device',
    ...overrides,
  }
}

describe('功能七：健康指标分析与 vivo 预留', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      data: structuredClone(emptyAppData),
      initialized: true,
    })
  })

  it('血压、血糖、血脂可按常见参考范围分析', () => {
    const normal = analyzeMetric(makeMetric({ value: 120 }))
    const high = analyzeMetric(makeMetric({ value: 145 }))
    const lowGlucose = analyzeMetric(
      makeMetric({ type: 'blood_glucose', value: 3.5, unit: 'mmol/L' }),
    )
    const highCholesterol = analyzeMetric(
      makeMetric({ type: 'total_cholesterol', value: 6.5, unit: 'mmol/L' }),
    )
    expect(normal.level).toBe('normal')
    expect(high.level).toBe('high')
    expect(lowGlucose.level).toBe('low')
    expect(highCholesterol.level).toBe('high')
  })

  it('指标单位按类型自动匹配', () => {
    expect(metricUnit('systolic_pressure')).toBe('mmHg')
    expect(metricUnit('blood_glucose')).toBe('mmol/L')
    expect(metricUnit('weight')).toBe('kg')
    expect(metricLabels.ldl).toContain('低密度')
  })

  it('健康页面可以手动保存指标并显示分析', async () => {
    const user = userEvent.setup()
    render(<Health />)

    await user.selectOptions(screen.getByLabelText('指标类型'), '收缩压')
    await user.clear(screen.getByLabelText(/数值/))
    await user.type(screen.getByLabelText(/数值/), '118')
    await user.click(screen.getByRole('button', { name: '保存健康指标' }))

    await waitFor(() => {
      expect(useAppStore.getState().data.healthMetrics.length).toBe(1)
    })

    const metric = useAppStore.getState().data.healthMetrics[0]
    expect(metric.type).toBe('systolic_pressure')
    expect(metric.value).toBe(118)
    expect(metric.unit).toBe('mmHg')
    expect(screen.getByText(/收缩压在常见参考范围内/)).toBeInTheDocument()
  })

  it('无效数值会被拦截，不会写入记录', async () => {
    const user = userEvent.setup()
    render(<Health />)
    await user.clear(screen.getByLabelText(/数值/))
    await user.click(screen.getByRole('button', { name: '保存健康指标' }))
    expect(await screen.findByText(/请填写大于 0 的指标数值/)).toBeInTheDocument()
    expect(useAppStore.getState().data.healthMetrics.length).toBe(0)
  })

  it('CSV 导入可以批量保存健康记录', async () => {
    const csv =
      'type,value,unit,measuredAt,source,note\nsystolic_pressure,125,mmHg,2026-11-12T08:00:00+08:00,manual,导入测试\nblood_glucose,5.4,mmol/L,2026-11-12T08:05:00+08:00,manual,空腹\n'
    const metrics = parseHealthCsv(csv)
    expect(metrics.length).toBe(2)
    expect(metrics[0].value).toBe(125)
    expect(metrics[1].type).toBe('blood_glucose')

    for (const metric of metrics) {
      await useAppStore.getState().addHealthMetric(metric)
    }
    expect(useAppStore.getState().data.healthMetrics.length).toBe(2)
  })

  it('vivo 健康授权可切换，且不影响手动录入', async () => {
    const user = userEvent.setup()
    render(<Health />)

    expect(screen.getByRole('button', { name: '连接 vivo 健康' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '连接 vivo 健康' }))

    await waitFor(() => {
      expect(useAppStore.getState().data.settings.vivoHealthAuthorized).toBe(true)
    })
    expect(screen.getByRole('button', { name: '已连接 vivo 健康' })).toBeInTheDocument()
    expect(screen.getByText(/已授权，等待支持的数据同步/)).toBeInTheDocument()

    await user.clear(screen.getByLabelText(/数值/))
    await user.type(screen.getByLabelText(/数值/), '120')
    await user.click(screen.getByRole('button', { name: '保存健康指标' }))
    await waitFor(() => {
      expect(useAppStore.getState().data.healthMetrics.length).toBe(1)
    })
  })
})
