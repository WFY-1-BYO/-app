import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Knowledge from '../pages/Knowledge'
import { emptyAppData, useAppStore } from '../store/appStore'
import { generateDailyKnowledgeContent } from '../lib/knowledgeGen'
import { dateKey } from '../lib/id'
import type { AppSettings } from '../types'

describe('功能二：每日知识与知识册', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      data: { ...structuredClone(emptyAppData) },
      initialized: true,
    })
  })

  it('全新用户初始化后知识册为空，待当天生成', async () => {
    await useAppStore.getState().initialize()
    expect(useAppStore.getState().data.knowledge).toHaveLength(0)
  })

  it('ensureTodayKnowledge 当天只生成并记入一条知识（幂等）', async () => {
    await useAppStore.getState().ensureTodayKnowledge()
    const first = useAppStore.getState().data.knowledge
    expect(first).toHaveLength(1)
    expect(first[0].date).toBe(dateKey(new Date()))
    expect(first[0].summary.length).toBeGreaterThan(0)
    expect(first[0].why.length).toBeGreaterThan(0)
    // 再次调用不应重复生成
    await useAppStore.getState().ensureTodayKnowledge()
    expect(useAppStore.getState().data.knowledge).toHaveLength(1)
  })

  it('generateDailyKnowledgeContent 无密钥时回退内置库且字段完整', async () => {
    const gen = await generateDailyKnowledgeContent(
      '2026-11-15',
      {} as unknown as AppSettings,
      {},
    )
    expect(gen.title).toBeTruthy()
    expect(gen.summary).toBeTruthy()
    expect(gen.why).toBeTruthy()
  })

  it('知识册展示分类、摘要和“为什么”解释', async () => {
    await useAppStore.getState().ensureTodayKnowledge()
    const user = userEvent.setup()
    render(<Knowledge />)
    expect(screen.getByRole('heading', { name: '知识册' })).toBeInTheDocument()
    expect(screen.getAllByText(/为什么/).length).toBeGreaterThan(0)
    await user.click(screen.getAllByRole('button', { name: '为什么' })[0])
    await waitFor(() => {
      expect(screen.getByText('为什么这样说')).toBeInTheDocument()
    })
  })

  it('展开知识会记录已读，收藏可切换', async () => {
    await useAppStore.getState().ensureTodayKnowledge()
    const user = userEvent.setup()
    render(<Knowledge />)
    await user.click(screen.getAllByRole('button', { name: '为什么' })[0])
    await waitFor(() => {
      expect(useAppStore.getState().data.knowledge[0].readAt).toBeTruthy()
    })
    await user.click(screen.getAllByRole('button', { name: '收藏' })[0])
    await waitFor(() => {
      expect(useAppStore.getState().data.knowledge[0].favorite).toBe(true)
    })
    expect(screen.getByRole('button', { name: '已收藏' })).toBeInTheDocument()
  })
})
