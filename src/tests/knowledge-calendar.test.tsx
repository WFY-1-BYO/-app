import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Knowledge from '../pages/Knowledge'
import { emptyAppData, useAppStore } from '../store/appStore'
import {
  archivedKnowledge,
  dailyKnowledge,
  initialKnowledge,
  isArchivedDate,
  knowledgeArchiveStart,
  knowledgeDatabase,
  monthArchive,
  monthGrid,
} from '../lib/knowledge'

describe('改动 7：知识日历式回看', () => {
  describe('每日知识归档', () => {
    it('同一天恒定一条，一天只推一条', () => {
      const first = dailyKnowledge('2026-11-13')
      const second = dailyKnowledge('2026-11-13')
      expect(first.id).toBe(second.id)
      expect(first.summary).toBeTruthy()
      const available = monthArchive(2026, 11, '2026-11-12', '2026-11-13').filter(
        cell => cell.item,
      )
      expect(available.map(cell => cell.date)).toEqual(['2026-11-12', '2026-11-13'])
      expect(available.every(cell => cell.item!.id === dailyKnowledge(cell.date).id)).toBe(true)
    })

    it('按天序轮换，连续覆盖全部知识且跨月不重复', () => {
      const total = knowledgeDatabase.length
      const dates = Array.from({ length: total }, (_, index) =>
        new Date(Date.UTC(2026, 10, 12 + index)).toISOString().slice(0, 10),
      )
      const ids = dates.map(date => dailyKnowledge(date).id)
      expect(new Set(ids).size).toBe(total)
      expect(dailyKnowledge('2026-12-01').id).not.toBe(dailyKnowledge('2026-11-01').id)
    })

    it('按日期归档：第 2 天可查看第 1 天，未来与起始日前不可回看', () => {
      const start = '2026-11-12'
      const today = '2026-11-13'
      expect(knowledgeArchiveStart(initialKnowledge(), today)).toBe(start)

      const day1 = archivedKnowledge('2026-11-12', start, today)
      const day2 = archivedKnowledge('2026-11-13', start, today)
      expect(day1).not.toBeNull()
      expect(day2).not.toBeNull()
      expect(day1!.id).toBe(dailyKnowledge('2026-11-12').id)
      expect(day1!.title).toBeTruthy()
      expect(day1!.why).toBeTruthy()

      expect(isArchivedDate('2026-11-11', start, today)).toBe(false)
      expect(isArchivedDate('2026-11-14', start, today)).toBe(false)
      expect(archivedKnowledge('2026-11-14', start, today)).toBeNull()
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

    it('系统日期早于知识库时退回今天，保证今天一定有知识', () => {
      expect(knowledgeArchiveStart(initialKnowledge(), '2026-01-01')).toBe('2026-01-01')
      expect(knowledgeArchiveStart([], '2026-11-13')).toBe('2026-11-13')
    })
  })

  describe('知识册页面', () => {
    beforeEach(() => {
      localStorage.clear()
      useAppStore.setState({
        data: { ...structuredClone(emptyAppData), knowledge: initialKnowledge() },
        initialized: true,
      })
    })

    it('提供日历视图，点某天显示当天知识', async () => {
      const user = userEvent.setup()
      render(<Knowledge />)

      expect(screen.getByRole('heading', { name: '知识册' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '知识日历' })).toBeInTheDocument()
      expect(screen.getByText(/一天只推一条/)).toBeInTheDocument()
      expect(screen.getByText(/从 .* 起 · 每天一条/)).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '全部知识' })).toBeInTheDocument()

      const enabled = screen
        .getAllByRole('button', { name: /查看 .* 的知识/ })
        .filter(button => !(button as HTMLButtonElement).disabled)
      expect(enabled.length).toBeGreaterThan(0)

      const target = enabled[0]
      const date = target.getAttribute('aria-label')!.match(/\d{4}-\d{2}-\d{2}/)![0]
      await user.click(target)

      const detail = screen.getByRole('article', { name: '这一天的知识' })
      expect(within(detail).getByText(new RegExp(date))).toBeInTheDocument()
      expect(within(detail).getByRole('heading')).toBeInTheDocument()
    })

    it('可以翻月回看，未来与未推送的日期不可点', async () => {
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
      expect(back.length).toBeGreaterThan(0)
    })

    it('保留分类筛选、展开为什么、收藏与已读', async () => {
      const user = userEvent.setup()
      render(<Knowledge />)

      await user.click(screen.getByRole('button', { name: '营养误区' }))
      const list = screen.getByRole('region', { name: '全部知识' })
      expect(within(list).queryByText('豆腐不是“没味道”，它是优质蛋白')).not.toBeInTheDocument()
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
