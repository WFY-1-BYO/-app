import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MealNew from '../pages/MealNew'
import { createDefaultProfile, emptyAppData, useAppStore } from '../store/appStore'
import {
  describeEstimate,
  estimateRange,
  getReferenceOption,
  hasAmountEstimate,
  levelText,
  localEstimateNote,
  perspectiveCorrection,
  photoGuide,
  rangeText,
  referenceOptions,
} from '../lib/reference'
import { createManualIngredient, recognizeIngredientsFromFile } from '../lib/ai'

describe('改动 6：参照物方案', () => {
  describe('参照物库', () => {
    it('提供四种参照物与标准尺寸', () => {
      expect(referenceOptions.map(item => item.id)).toEqual([
        'card',
        'checkerboard',
        'calibrated',
        'none',
      ])
      expect(getReferenceOption('card').size).toContain('85.6 × 54 mm')
      expect(getReferenceOption('checkerboard').size).toContain('100 × 100 mm')
      expect(getReferenceOption('calibrated').size).toContain('餐具校准')
    })

    it('拍摄指引写明同平面、完整入镜、不遮挡、45°–90°、不强制垂直', () => {
      const text = photoGuide.join(' ')
      expect(text).toContain('同一个平面')
      expect(text).toContain('完整入镜')
      expect(text).toContain('不遮挡')
      expect(text).toContain('45°–90°')
      expect(text).toContain('不要求完全垂直')
    })

    it('说明四角透视校正，倾斜照片可拉正为俯视图', () => {
      expect(perspectiveCorrection).toContain('四角')
      expect(perspectiveCorrection).toContain('透视变换')
      expect(perspectiveCorrection).toContain('俯视图')
      expect(perspectiveCorrection).toContain('85.6 × 54 mm')
    })

    it('三级降级 A / B / C 与可信标记', () => {
      expect(getReferenceOption('card').level).toBe('A')
      expect(getReferenceOption('checkerboard').level).toBe('A')
      expect(getReferenceOption('calibrated').level).toBe('B')
      expect(getReferenceOption('none').level).toBe('C')
      expect(getReferenceOption('card').confidence).toBe('high')
      expect(getReferenceOption('calibrated').confidence).toBe('confirm')
      expect(getReferenceOption('none').confidence).toBe('confirm')
      expect(levelText(getReferenceOption('card'))).toContain('克重区间')
      expect(levelText(getReferenceOption('calibrated'))).toContain('需确认')
      expect(levelText(getReferenceOption('none'))).toContain('只识别')
    })

    it('A 级给克重区间，B 级区间更宽，C 级不给克重', () => {
      const a = estimateRange(100, 'card')
      expect(a.min).toBeGreaterThan(0)
      expect(a.min).toBeLessThan(100)
      expect(a.max).toBeGreaterThan(100)
      expect(hasAmountEstimate(a)).toBe(true)

      const b = estimateRange(100, 'calibrated')
      expect(b.max - b.min).toBeGreaterThan(a.max - a.min)

      const c = estimateRange(100, 'none')
      expect(hasAmountEstimate(c)).toBe(false)
      expect(rangeText(c)).toContain('只识别品类与份数')
    })

    it('输出含「高可信 / 需确认」标记与估算区间', () => {
      const high = describeEstimate(estimateRange(100, 'card'), 'high')
      expect(high).toContain('高可信')
      expect(high).toMatch(/\d+–\d+ g/)
      const confirm = describeEstimate(estimateRange(100, 'none'), 'confirm')
      expect(confirm).toContain('需确认')
      expect(confirm).toContain('填写克重')
    })

    it('无 key 时参照物仍能本地校准估算', () => {
      expect(localEstimateNote).toContain('不依赖在线 AI 密钥')
      // 纯本地函数，不需要任何配置或密钥即可产出区间
      expect(hasAmountEstimate(estimateRange(150, 'card'))).toBe(true)
      expect(hasAmountEstimate(estimateRange(150, 'checkerboard'))).toBe(true)
    })
  })

  describe('识别与手动添加', () => {
    it('照片识别按参照物等级产出高可信 / 需确认标记', async () => {
      const file = new File(['x'], '米饭_鸡蛋.jpg', { type: 'image/jpeg' })

      const a = await recognizeIngredientsFromFile(file, 'card')
      expect(a.ingredients.length).toBeGreaterThan(0)
      expect(a.ingredients.every(item => item.estimateConfidence === 'high')).toBe(true)
      expect(a.ingredients.every(item => hasAmountEstimate(item.estimateRange))).toBe(true)
      expect(a.note).toContain('本地校准估算')

      const c = await recognizeIngredientsFromFile(file, 'none')
      expect(c.ingredients.every(item => item.estimateConfidence === 'confirm')).toBe(true)
      expect(c.ingredients.every(item => item.confirmedAmount === undefined)).toBe(true)
      expect(c.ingredients.every(item => item.portion === 1)).toBe(true)
      expect(c.ingredients.every(item => !hasAmountEstimate(item.estimateRange))).toBe(true)
    })

    it('手动填写的用量视为高可信', () => {
      const item = createManualIngredient('米饭', 150)
      expect(item.estimateConfidence).toBe('high')
      expect(item.confirmedAmount).toBe(150)
      expect(hasAmountEstimate(item.estimateRange)).toBe(true)
    })
  })

  describe('配餐页', () => {
    beforeEach(() => {
      localStorage.clear()
      useAppStore.setState({
        data: {
          ...structuredClone(emptyAppData),
          profile: createDefaultProfile({ nickname: '参照物测试', goal: 'maintain_health' }),
        },
        initialized: true,
      })
    })

    const renderPage = () =>
      render(
        <MemoryRouter initialEntries={['/meal/new']}>
          <Routes>
            <Route path="/meal/new" element={<MealNew />} />
            <Route path="/meal/:id" element={<div>配餐结果页</div>} />
            <Route path="/onboarding" element={<div>档案页</div>} />
          </Routes>
        </MemoryRouter>,
      )

    it('默认选中银行卡参照物，展示拍摄指引、透视校正与 A 级说明', () => {
      renderPage()
      expect(screen.getByRole('button', { name: '银行卡 / 身份证' }).getAttribute('aria-pressed')).toBe('true')
      expect(screen.getByRole('heading', { name: '怎么拍' })).toBeInTheDocument()
      photoGuide.forEach(line => expect(screen.getByText(line)).toBeInTheDocument())
      expect(screen.getByText(perspectiveCorrection)).toBeInTheDocument()
      expect(screen.getByText(/A 级/)).toBeInTheDocument()
      expect(screen.getByText(localEstimateNote)).toBeInTheDocument()
    })

    it('切换为「没有参照物」后显示 C 级说明', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(screen.getByRole('button', { name: '没有参照物' }))
      expect(screen.getByRole('button', { name: '没有参照物' }).getAttribute('aria-pressed')).toBe('true')
      expect(screen.getByText(/C 级/)).toBeInTheDocument()
      expect(screen.queryByText(/A 级/)).not.toBeInTheDocument()
    })

    it('手动添加食材显示高可信与估算区间，可直接生成菜谱', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.type(screen.getByLabelText('食材名称'), '米饭')
      await user.click(screen.getByRole('button', { name: '添加食材' }))

      expect(screen.getByText('高可信')).toBeInTheDocument()
      expect(screen.getByText(/估算区间约/)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '生成菜谱' }))
      await waitFor(() => expect(useAppStore.getState().data.mealSessions.length).toBe(1))
    })

    it('无参照物时只给品类与份数，确认用量前不能用于配餐', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(screen.getByRole('button', { name: '没有参照物' }))

      const file = new File(['x'], '米饭.jpg', { type: 'image/jpeg' })
      await user.upload(screen.getByLabelText('当次食材照片'), file)

      await waitFor(() => expect(screen.getByText('需确认')).toBeInTheDocument())
      expect(screen.getByText(/只识别品类与份数/)).toBeInTheDocument()
      expect(screen.getByText(/约 1 份/)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '生成菜谱' }))
      expect(useAppStore.getState().data.mealSessions.length).toBe(0)

      const amountInput = screen.getByLabelText('确认量')
      await user.clear(amountInput)
      await user.type(amountInput, '150')
      await user.click(screen.getByRole('button', { name: '确认用量' }))
      expect(screen.getByText('高可信')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '生成菜谱' }))
      await waitFor(() => expect(useAppStore.getState().data.mealSessions.length).toBe(1))
      expect(useAppStore.getState().data.mealSessions[0].ingredients[0].confirmedAmount).toBe(150)
    })
  })
})
