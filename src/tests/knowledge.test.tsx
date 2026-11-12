import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Knowledge from '../pages/Knowledge'
import { emptyAppData, useAppStore } from '../store/appStore'
import { dailyKnowledge, initialKnowledge } from '../lib/knowledge'

describe('功能二：首页知识与知识册', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      data: { ...structuredClone(emptyAppData), knowledge: initialKnowledge() },
      initialized: true,
    })
  })

  it('初始化时预置轻量化营养知识', async () => {
    await useAppStore.getState().initialize()
    const knowledge = useAppStore.getState().data.knowledge
    expect(knowledge.length).toBeGreaterThan(0)
    expect(knowledge.every(item => item.summary.length > 0)).toBe(true)
    expect(knowledge.every(item => item.why.length > 0)).toBe(true)
  })

  it('每日知识按日期稳定返回，不随机跳变', () => {
    const first = dailyKnowledge('2026-11-12')
    const second = dailyKnowledge('2026-11-12')
    expect(first.id).toBe(second.id)
    expect(first.summary).toBeTruthy()
  })

  it('知识册展示分类、摘要和“为什么”解释', async () => {
    const user = userEvent.setup()
    render(<Knowledge />)

    expect(screen.getByRole('heading', { name: '知识册' })).toBeInTheDocument()
    expect(screen.getAllByText(/为什么/).length).toBeGreaterThan(0)

    const firstWhyButton = screen.getAllByRole('button', { name: '为什么' })[0]
    await user.click(firstWhyButton)

    await waitFor(() => {
      expect(screen.getByText('为什么这样说')).toBeInTheDocument()
    })
  })

  it('展开知识会记录已读，收藏可切换', async () => {
    const user = userEvent.setup()
    render(<Knowledge />)

    const firstWhyButton = screen.getAllByRole('button', { name: '为什么' })[0]
    await user.click(firstWhyButton)

    await waitFor(() => {
      const first = useAppStore.getState().data.knowledge[0]
      expect(first.readAt).toBeTruthy()
    })

    const firstFavoriteButton = screen.getAllByRole('button', { name: '收藏' })[0]
    await user.click(firstFavoriteButton)

    await waitFor(() => {
      expect(useAppStore.getState().data.knowledge[0].favorite).toBe(true)
    })
    expect(screen.getByRole('button', { name: '已收藏' })).toBeInTheDocument()
  })
})
