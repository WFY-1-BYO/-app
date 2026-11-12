import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Onboarding from '../pages/Onboarding'
import { emptyAppData, useAppStore } from '../store/appStore'

function renderOnboarding() {
  return render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<div>首页</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('功能五：个人档案与个性化目标', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({ data: structuredClone(emptyAppData), initialized: true })
  })

  it('首次启动展示档案创建表单和本地存储说明', () => {
    renderOnboarding()
    expect(screen.getByRole('form', { name: '创建个人档案' })).toBeInTheDocument()
    expect(screen.getByText(/这些信息只保存在本机/)).toBeInTheDocument()
    expect(screen.getByLabelText('昵称')).toBeInTheDocument()
    expect(screen.getByText('饮食目标')).toBeInTheDocument()
    expect(screen.getByText('口味偏好')).toBeInTheDocument()
    expect(screen.getByText('已填写疾病情况')).toBeInTheDocument()
  })

  it('必须填写昵称，否则不允许提交', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await user.click(screen.getByRole('button', { name: '保存并开始' }))
    expect(await screen.findByText('请先填写昵称。')).toBeInTheDocument()
    expect(useAppStore.getState().data.profile).toBeNull()
  })

  it('保存目标、口味、忌口、过敏和疾病信息到本地状态', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await user.type(screen.getByLabelText('昵称'), '小骑士')
    await user.click(screen.getByRole('button', { name: '减脂' }))
    await user.click(screen.getByRole('button', { name: '辣口' }))
    await user.click(screen.getByRole('button', { name: '高血压' }))
    await user.type(screen.getByLabelText(/食物过敏/), '花生、虾')
    await user.type(screen.getByLabelText(/明确忌口/), '香菜')
    await user.click(screen.getByRole('button', { name: '保存并开始' }))

    await waitFor(() => {
      expect(screen.getByText('首页')).toBeInTheDocument()
    })

    const profile = useAppStore.getState().data.profile
    expect(profile).not.toBeNull()
    expect(profile?.nickname).toBe('小骑士')
    expect(profile?.goal).toBe('lose_fat')
    expect(profile?.tastes).toEqual(['spicy'])
    expect(profile?.allergies).toEqual(['花生', '虾'])
    expect(profile?.avoid).toEqual(['香菜'])
    expect(profile?.diseases).toEqual(['hypertension'])
  })

  it('档案保存在本地，刷新后仍可读取', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await user.type(screen.getByLabelText('昵称'), '本地用户')
    await user.click(screen.getByRole('button', { name: '维持健康' }))
    await user.click(screen.getByRole('button', { name: '保存并开始' }))
    await waitFor(() => {
      expect(screen.getByText('首页')).toBeInTheDocument()
    })

    const raw = localStorage.getItem('family-nutritionist-data')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.profile.nickname).toBe('本地用户')
  })
})
