import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Onboarding from '../pages/Onboarding'
import Mine from '../pages/Mine'
import { emptyAppData, useAppStore, createDefaultProfile } from '../store/appStore'

function renderOnboarding() {
  return render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/mine" element={<Mine />} />
        <Route path="/" element={<div>首页</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('改动 5：营养档案再次打开回填', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const seedProfile = () =>
    createDefaultProfile({
      nickname: '小骑士',
      goal: 'lose_fat',
      sex: 'female',
      birthDate: '1995-06-01',
      heightCm: 165,
      weightKg: 55,
      activityLevel: 'moderate',
      tastes: ['spicy', 'light'],
      allergies: ['花生', '虾'],
      avoid: ['香菜'],
      diseases: ['hypertension'],
      doctorRestrictions: '每日钠摄入需控制',
    })

  it('已有档案时再次打开，所有字段预填原值', () => {
    const profile = seedProfile()
    useAppStore.setState({
      data: { ...structuredClone(emptyAppData), profile },
      initialized: true,
    })
    renderOnboarding()

    expect(screen.getByRole('form', { name: '编辑个人档案' })).toBeInTheDocument()
    expect(screen.getByLabelText('昵称')).toHaveValue('小骑士')
    expect(screen.getByLabelText('生理性别')).toHaveValue('female')
    expect(screen.getByLabelText('出生年份')).toHaveValue(1995)
    expect(screen.getByLabelText('出生月份')).toHaveValue(6)
    expect(screen.getByLabelText('出生日期（日）')).toHaveValue(1)
    expect(screen.getByLabelText('身高（cm）')).toHaveValue(165)
    expect(screen.getByLabelText('体重（kg）')).toHaveValue(55)
    expect(screen.getByRole('button', { name: '中等活动' }).className).toContain('active')
    expect(screen.getByLabelText(/食物过敏/)).toHaveValue('花生、虾')
    expect(screen.getByLabelText(/明确忌口/)).toHaveValue('香菜')
    expect(screen.getByLabelText(/医生或临床营养师/)).toHaveValue('每日钠摄入需控制')
    expect(screen.getByRole('button', { name: '减脂' }).className).toContain('active')
    expect(screen.getByRole('button', { name: '辣口' }).className).toContain('active')
    expect(screen.getByRole('button', { name: '高血压' }).className).toContain('active')
  })

  it('编辑保存后保留 id 与创建时间，只更新修改时间', async () => {
    const profile = seedProfile()
    useAppStore.setState({
      data: { ...structuredClone(emptyAppData), profile },
      initialized: true,
    })
    const user = userEvent.setup()
    renderOnboarding()

    await user.clear(screen.getByLabelText('昵称'))
    await user.type(screen.getByLabelText('昵称'), '新昵称')
    await user.click(screen.getByRole('button', { name: '保存修改' }))

    await waitFor(() => {
      expect(useAppStore.getState().data.profile?.nickname).toBe('新昵称')
    })
    const saved = useAppStore.getState().data.profile!
    expect(saved.id).toBe(profile.id)
    expect(saved.createdAt).toBe(profile.createdAt)
    expect(saved.tastes).toEqual(['spicy', 'light'])
    expect(saved.doctorRestrictions).toBe('每日钠摄入需控制')
  })

  it('无档案时仍为创建态，不出现编辑提示', () => {
    useAppStore.setState({
      data: structuredClone(emptyAppData),
      initialized: true,
    })
    renderOnboarding()
    expect(screen.getByRole('form', { name: '创建个人档案' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存并开始' })).toBeInTheDocument()
    expect(screen.getByLabelText('昵称')).toHaveValue('')
  })
})
