import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Knowledge from '../pages/Knowledge'
import { emptyAppData, useAppStore } from '../store/appStore'
import {
  initialKnowledge,
  knowledgeArchiveStart,
  knowledgeByDate,
  monthArchive,
  monthGrid,
} from '../lib/knowledge'
import type { KnowledgeItem } from '../types'

function withDates(items: KnowledgeItem[], dates: string[]): KnowledgeItem[] {
  return items.map((item, index) => ({
    ...item,
    date: dates[index] ?? item.createdAt.slice(0, 10),
  }))
}

describe('改动 7：知识日历式回看', () => {
  describe('知识册按真实记录归档', () => {
    it('monthArchive 只点亮已记入知识册的日期', () => {
      const items = withDates(initialKnowledge(), ['2026-11-12', '2026-11-13'])
      const cells = monthArchive(2026, 11, items)
      const available = cells.filter(cell => cell.item)
      expect(available.map(cell => cell.date).sort()).toEqual(['2026-11-12', '2026-11-13'])
      const other = cells.find(cell => cell.date === '2026-11-14')
      expect(other?.item).toBeNull()
    })

    it('knowledgeByDate 按日期取回对应条目', () => {
      const items = withDates(initialKnowledge(), ['2026-11-12', '2026-11-13'])
      const found = knowledgeByDate(items, '2026-11-13')
      expect(found).toBeTruthy()
      expect(found!.title).toBe(initialKnowledge()[1].title)
    })

    it('归档起始日取最早一条的日期', () => {
      const items = withDates(initialKnowledge(), ['2026-11-12', '2026-11-20'])
      expect(knowledgeArchiveStart(items, '2026-11-25')).toBe('2026-11-12')
      expect(knowledgeArchiveStart([], '2026-11-13')).toBe('2026-11-13')
      expect(knowledgeArchiveStart(items, '2026-11-01')).toBe('2026-11-01')
    })

    it('日历网格以周一开头、按周补齐且日期连续', () => {
      const grid = monthGrid(2026, 11)
      expect(grid.length % 7).toBe(0)
      expect(new Date(`${grid[0].date}T00:00:00Z`).getUTCDay()).toBe(1)
      expect(grid.filter(cell => cell.inMonth).length).toBe(30)
      expect(
        grid.every(
          (cell, index) =>
            index === 0 ||
            Date.parse(cell.date) - Date.parse(grid[index - 1].date) === 86400000,
        ),
      ).toBe(true)
    })
  })

  describe('知识册页面', () => {
    beforeEach(() => {
      localStorage.clear()
      const items = withDates(initialKnowledge(), [
        '2026-11-12',
        '2026-11-13',
        '2026-11-14',
      ])
      useAppStore.setState({
        data: { ...structuredClone(emptyAppData), knowledge: items },
        initialized: true,
      })
    })

    it('提供日历视图，点某天显示当天知识', async () => {
      const user = userEvent.setup()
      render(<Knowledge />)

      expect(screen.getByRole('heading', { name: '知识册' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '知识日历' })).toBeInTheDocument()
      expect(screen.getByText(/每天由 AI 生成一条/)).toBeInTheDocument()
      expect(screen.getByText(/从 .* 起 · 每天一条/)).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '已记录的知识' })).toBeInTheDocument()

      const enabled = screen
        .getAllByRole('button', { name: /查看 .* 的知识/ })
        .filter(button => !(button as HTMLButtonElement).disabled)
      expect(enabled.length).toBe(3)

      const target = enabled[0]
      const date = target.getAttribute('aria-label')!.match(/\d{4}-\d{2}-\d{2}/)![0]
      await user.click(target)

      const detail = screen.getByRole('article', { name: '这一天的知识' })
      expect(within(detail).getByText(new RegExp(date))).toBeInTheDocument()
      expect(within(detail).getByRole('heading')).toBeInTheDocument()
    })

    it('可以翻月回看，未来与未记录的日期不可点', async () => {
      const user = userEvent.setup()
      render(<Knowledge />)

      await user.click(screen.getByRole('button', { name: '上个月' }))
      const past = screen
        .getAllByRole('button', { name: /查看 .* 的知识/ })
        .filter(button => !(button as HTMLButtonElement).disabled)
      expect(past.length).toBe(0)

      await user.click(screen.getByRole('button', { name: '下个月' }))
      const back = screen
        .getAllByRole('button', { name: /查看 .* 的知识/ })
        .filter(button => !(button as HTMLButtonElement).disabled)
      expect(back.length).toBe(3)
    })

    it('保留分类筛选、展开为什么、收藏与已读', async () => {
      const user = userEvent.setup()
      render(<Knowledge />)

      await user.click(screen.getByRole('button', { name: '营养误区' }))
      const list = screen.getByRole('region', { name: '已记录的知识' })
      expect(within(list).getByText('主食不是敌人')).toBeInTheDocument()

      await user.click(screen.getAllByRole('button', { name: '为什么' })[0])
      expect(screen.getByText('为什么这样说')).toBeInTheDocument()

      await user.click(screen.getAllByRole('button', { name: '收藏' })[0])
      await waitFor(() =>
        expect(screen.getByRole('button', { name: '已收藏' })).toBeInTheDocument(),
      )
    })
  })
})
