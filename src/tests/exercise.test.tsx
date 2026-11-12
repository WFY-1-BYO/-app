import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Exercise from '../pages/Exercise'
import { createDefaultProfile, emptyAppData, useAppStore } from '../store/appStore'
import { recommendExercise, suggestMealAdjustment } from '../lib/exercise'
import { createMealSession } from '../lib/mealPlanner'
import type { ExerciseLog } from '../types'

function makeLog(overrides: Partial<ExerciseLog>): ExerciseLog {
  return {
    id: 'e1',
    status: 'planned',
    type: '跑步',
    start: '2026-11-12T10:00:00+08:00',
    durationMin: 20,
    intensity: 'medium',
    source: 'manual',
    createdAt: '2026-11-12T10:00:00+08:00',
    updatedAt: '2026-11-12T10:00:00+08:00',
    sourceDevice: 'test-device',
    ...overrides,
  }
}

describe('功能三：运动建议与动态配餐', () => {
  beforeEach(() => {
    localStorage.clear()
    const profile = createDefaultProfile({
      nickname: '运动用户',
      goal: 'maintain_health',
      tastes: ['light'],
    })
    useAppStore.setState({
      data: { ...structuredClone(emptyAppData), profile },
      initialized: true,
    })
  })

  it('根据个人目标推荐合适的运动方向', () => {
    const gain = createDefaultProfile({ goal: 'gain_muscle' })
    const lose = createDefaultProfile({ goal: 'lose_fat' })
    const maintain = createDefaultProfile({ goal: 'maintain_health' })
    expect(recommendExercise(gain)).toContain('力量训练')
    expect(recommendExercise(lose)).toContain('150')
    expect(recommendExercise(maintain)).toContain('散步')
  })

  it('计划运动不会提前计入营养调整', () => {
    const planned = makeLog({ status: 'planned' })
    expect(suggestMealAdjustment(planned)).toContain('先不调整饮食')
  })

  it('完成 20 分钟以上运动后建议补充蛋白质', () => {
    const completed = makeLog({ status: 'completed', durationMin: 20 })
    expect(suggestMealAdjustment(completed)).toContain('适当补充蛋白质')
  })

  it('取消运动后建议按原计划吃饭', () => {
    const cancelled = makeLog({ status: 'cancelled' })
    expect(suggestMealAdjustment(cancelled)).toContain('按原计划正常吃')
  })

  it('运动页面可保存记录，并按状态给出动态配餐建议', async () => {
    const user = userEvent.setup()
    render(<Exercise />)

    await user.selectOptions(screen.getByLabelText('运动项目'), '跑步')
    await user.clear(screen.getByLabelText(/时长/))
    await user.type(screen.getByLabelText(/时长/), '25')
    await user.click(screen.getByRole('button', { name: '已完成' }))
    await user.click(screen.getByRole('button', { name: '保存运动记录' }))

    await waitFor(() => {
      expect(useAppStore.getState().data.exerciseLogs.length).toBe(1)
    })

    const log = useAppStore.getState().data.exerciseLogs[0]
    expect(log.type).toBe('跑步')
    expect(log.durationMin).toBe(25)
    expect(log.status).toBe('completed')
    expect(screen.getByText(/适当补充蛋白质/)).toBeInTheDocument()
  })

  it('完成的运动可以关联配餐并更新配餐理由', async () => {
    const profile = useAppStore.getState().data.profile!
    const session = createMealSession({
      profile,
      mealType: 'dinner',
      ingredients: [
        {
          id: 'rice',
          name: '米饭',
          source: 'current',
          estimatedAmount: 150,
          confirmedAmount: 150,
          unit: 'g',
          state: 'raw',
          used: true,
        },
      ],
      sourceDevice: 'test-device',
    })
    await useAppStore.getState().addMealSession(session)

    const user = userEvent.setup()
    render(<Exercise />)

    await user.selectOptions(
      screen.getByLabelText('关联配餐（可选）'),
      session.id,
    )
    await user.click(screen.getByRole('button', { name: '已完成' }))
    await user.click(screen.getByRole('button', { name: '保存运动记录' }))

    await waitFor(() => {
      const updated = useAppStore
        .getState()
        .data.mealSessions.find(item => item.id === session.id)
      expect(updated?.reason).toContain('运动')
    })
  })
})
