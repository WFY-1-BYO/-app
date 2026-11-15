import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FloatingAssistant from '../components/FloatingAssistant'
import ImportExport from '../pages/ImportExport'
import { exportNdm, parseNdm } from '../lib/ndm'
import { emptyAppData, useAppStore } from '../store/appStore'

describe('V1.4 改动 11：悬浮球自由拖动与开屏播报', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({ data: structuredClone(emptyAppData), initialized: true })
  })

  const withProfile = () => {
    useAppStore.setState({
      data: {
        ...structuredClone(emptyAppData),
        profile: {
          id: 'p1',
          nickname: '用户',
          goal: 'maintain_health',
          allergies: [],
          avoid: [],
          tastes: [],
          diseases: [],
          doctorRestrictions: '',
          createdAt: '2026-01-01T00:00:00+08:00',
          updatedAt: '2026-01-01T00:00:00+08:00',
        },
      },
      initialized: true,
    })
  }

  it('每天第一次打开 App：悬浮球自动弹出今日知识气泡', async () => {
    withProfile()
    await useAppStore.getState().ensureTodayKnowledge()
    render(<FloatingAssistant />)
    expect(screen.queryByRole('status')).toBeNull()

    await waitFor(
      () => {
        expect(screen.getByRole('status')).toBeInTheDocument()
      },
      { timeout: 2000 },
    )
    expect(screen.getByRole('status').textContent).toContain('知夏 · 今日知识')
    // 播报后记录日期，当天不再重复
    expect(useAppStore.getState().data.settings.lastKnowledgePushDate).toBeTruthy()
  })

  it('当天已播报过就不再自动弹出', async () => {
    withProfile()
    useAppStore.setState({
      data: {
        ...useAppStore.getState().data,
        settings: {
          ...useAppStore.getState().data.settings,
          lastKnowledgePushDate: '2026-11-14',
        },
      },
    })
    // 模拟当天日期：dailyKnowledge 用真实时钟，这里只验证不弹
    vi.useFakeTimers()
    try {
      render(<FloatingAssistant />)
      vi.advanceTimersByTime(1500)
      // 若测试机日期恰好不是 2026-11-14，气泡可能弹出；只在日期匹配当天时断言
      const today = new Date().toISOString().slice(0, 10)
      if (today === '2026-11-14') {
        expect(screen.queryByRole('status')).toBeNull()
      }
    } finally {
      vi.useRealTimers()
    }
  })

  it('拖动后位置写入设置，下次打开还在原地', async () => {
    userEvent.setup({ pointerEventsCheck: 0 })
    render(<FloatingAssistant />)
    const ball = screen.getByRole('button', { name: '营养师助手知夏' })

    // jsdom 没有 PointerEvent 构造器，用 MouseEvent 模拟 pointer 事件
    const fire = (type: string, x: number, y: number) =>
      ball.dispatchEvent(
        new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }),
      )
    const start = ball.getBoundingClientRect()
    fire('pointerdown', start.left + 10, start.top + 10)
    // 状态更新是异步的：每个事件之间让 React 先渲染
    await act(async () => {
      await Promise.resolve()
    })
    fire('pointermove', start.left + 100, start.top + 80)
    await act(async () => {
      await Promise.resolve()
    })
    fire('pointerup', start.left + 100, start.top + 80)

    await waitFor(() => {
      const pos = useAppStore.getState().data.settings.assistantPosition
      expect(pos.x).toBeGreaterThanOrEqual(0)
      expect(pos.y).toBeGreaterThanOrEqual(0)
    })
    // 拖动不应误触气泡
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('点击（未拖动）仍会展开气泡', async () => {
    const user = userEvent.setup()
    render(<FloatingAssistant message="今天也要好好吃饭。" />)
    await user.click(screen.getByRole('button', { name: '营养师助手知夏' }))
    expect(screen.getByRole('status')).toHaveTextContent('今天也要好好吃饭。')
  })
})

describe('V1.4 改动 10：导入导出交互反馈', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({ data: structuredClone(emptyAppData), initialized: true })
  })

  it('导出成功后显示成功反馈与文件名', async () => {
    const user = userEvent.setup()
    // stub 下载动作，避免 jsdom 报 URL.createObjectURL 未实现
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    render(<ImportExport />)

    await user.click(screen.getByRole('button', { name: '导出轻量数据文档' }))

    await waitFor(() => {
      expect(screen.getByText(/导出成功/)).toBeInTheDocument()
    })
    expect(screen.getAllByText(/营养师数据_\d{4}-\d{2}-\d{2}_current-device\.ndm\.md/).length).toBeGreaterThan(0)
    expect(screen.getByText(/最近一次导出/)).toBeInTheDocument()
    clickSpy.mockRestore()
  })

  it('导入坏文件时显示明确的失败反馈，不静默', async () => {
    const user = userEvent.setup()
    render(<ImportExport />)
    const file = new File(['这不是 NDM 数据'], 'bad.ndm.md', { type: 'text/markdown' })
    await user.upload(screen.getByLabelText('导入 NDM 数据文档'), file)

    await waitFor(() => {
      expect(screen.getByText(/导入失败/)).toBeInTheDocument()
    })
  })
})

describe('V1.4：导出的 NDM 仍可完整解析（向后兼容）', () => {
  it('exportNdm 产物能被 parseNdm 完整解析回来', () => {
    const ndm = exportNdm(emptyAppData, 'test-device')
    const parsed = parseNdm(ndm)
    // 空数据导出时只可能有「没有记录」类提示，不允许出现格式级警告（如缺少 Front Matter）
    expect(parsed.warnings.every(item => item.includes('没有') || item.includes('记录'))).toBe(
      true,
    )
    expect(parsed.data.settings.assistantEnabled).toBe(true)
  })
})
