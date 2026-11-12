import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Today from '../pages/Today'
import Records from '../pages/Records'
import { emptyAppData, useAppStore, createDefaultProfile } from '../store/appStore'
import { initialKnowledge } from '../lib/knowledge'

describe('改动 1：首页极简一屏', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      data: {
        ...structuredClone(emptyAppData),
        profile: createDefaultProfile({ nickname: '测试用户', goal: 'maintain_health' }),
        knowledge: initialKnowledge(),
      },
      initialized: true,
    })
  })

  const renderToday = () =>
    render(
      <MemoryRouter>
        <Today />
      </MemoryRouter>,
    )

  it('首屏核心是配餐：只有一个主行动按钮「拍照配餐」', () => {
    renderToday()
    const cta = screen.getByRole('link', { name: /拍照配餐/ })
    expect(cta).toBeInTheDocument()
    expect(cta.className).toContain('cta-primary')
    // 首页唯一的 cta-primary 主按钮
    expect(document.querySelectorAll('.cta-primary')).toHaveLength(1)
  })

  it('首屏包含下一餐卡片与营养师说知识气泡', () => {
    renderToday()
    expect(screen.getByRole('region', { name: '下一餐' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '营养师说' })).toBeInTheDocument()
    expect(screen.getByText(/知夏 · 今日知识/)).toBeInTheDocument()
  })

  it('首页不再堆砌三餐状态、坚持统计、勋章进度、健康提醒、运动入口', () => {
    renderToday()
    expect(screen.queryByText('今天三餐')).not.toBeInTheDocument()
    expect(screen.queryByText('累计记录日')).not.toBeInTheDocument()
    expect(screen.queryByText('下一步勋章')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '健康指标' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '运动记录' })).not.toBeInTheDocument()
    expect(screen.queryByText(/运动/)).not.toBeInTheDocument()
  })

  it('知识气泡可展开「为什么」并收进知识册', async () => {
    const user = userEvent.setup()
    renderToday()
    await user.click(screen.getByRole('button', { name: '展开说说为什么' }))
    expect(screen.getByText('为什么这样说')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /收进知识册/ }))
    expect(screen.getByRole('button', { name: '已收进知识册' })).toBeInTheDocument()
  })

  it('被移走的内容在记录页仍可查看，功能不丢失', () => {
    render(
      <MemoryRouter>
        <Records />
      </MemoryRouter>,
    )
    expect(screen.getByRole('region', { name: '今天三餐状态' })).toBeInTheDocument()
    expect(screen.getByText('累计记录日')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '健康指标' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '我想吃点别的' })).toBeInTheDocument()
  })
})
