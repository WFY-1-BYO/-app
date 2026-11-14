import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Onboarding from '../pages/Onboarding'
import { emptyAppData, useAppStore } from '../store/appStore'

const renderOnboarding = () =>
  render(
    <MemoryRouter>
      <Onboarding />
    </MemoryRouter>,
  )

beforeEach(() => {
  localStorage.clear()
  useAppStore.setState({ data: structuredClone(emptyAppData), initialized: true })
})

describe('V1.4 改动 1：出生日期直接填年月日', () => {
  it('显示年、月、日三个数字输入框，而不是日期选择器', () => {
    renderOnboarding()
    expect(document.querySelector('input[type=\'date\']')).toBeNull()
    expect(screen.getByLabelText('出生年份')).toBeInTheDocument()
    expect(screen.getByLabelText('出生月份')).toBeInTheDocument()
    expect(screen.getByLabelText('出生日期（日）')).toBeInTheDocument()
    expect(screen.getByText(/直接填数字就行/)).toBeInTheDocument()
  })

  it('年月日填完整后保存，档案里是标准日期', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await user.type(screen.getByLabelText('昵称'), '测试用户')
    await user.type(screen.getByLabelText('出生年份'), '1998')
    await user.type(screen.getByLabelText('出生月份'), '5')
    await user.type(screen.getByLabelText('出生日期（日）'), '20')
    await user.click(screen.getByRole('button', { name: '保存并开始' }))

    await waitFor(() => {
      expect(useAppStore.getState().data.profile?.birthDate).toBe('1998-05-20')
    })
  })

  it('只填年不填月日时给出明确提示，不静默丢失', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await user.type(screen.getByLabelText('昵称'), '测试用户')
    await user.type(screen.getByLabelText('出生年份'), '1998')
    await user.click(screen.getByRole('button', { name: '保存并开始' }))

    expect(screen.getByText(/要填完整/)).toBeInTheDocument()
    expect(useAppStore.getState().data.profile).toBeNull()
  })

  it('日期非法（13 月）也不允许保存', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await user.type(screen.getByLabelText('昵称'), '测试用户')
    await user.type(screen.getByLabelText('出生年份'), '1998')
    await user.type(screen.getByLabelText('出生月份'), '13')
    await user.type(screen.getByLabelText('出生日期（日）'), '1')
    await user.click(screen.getByRole('button', { name: '保存并开始' }))

    expect(screen.getByText(/要填完整/)).toBeInTheDocument()
    expect(useAppStore.getState().data.profile).toBeNull()
  })

  it('全空时允许保存（生日是选填）', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await user.type(screen.getByLabelText('昵称'), '测试用户')
    await user.click(screen.getByRole('button', { name: '保存并开始' }))

    await waitFor(() => {
      expect(useAppStore.getState().data.profile?.nickname).toBe('测试用户')
    })
    expect(useAppStore.getState().data.profile?.birthDate).toBeUndefined()
  })
})

describe('V1.4 改动 2：日常活动水平讲解', () => {
  it('每档都有生活场景解释，并有「选低了更保守」的引导', () => {
    renderOnboarding()
    // 默认「轻度活动」，解释随之显示
    expect(screen.getByText(/散步、做家务、骑车通勤/)).toBeInTheDocument()
    expect(screen.getByText(/不确定就往低选/)).toBeInTheDocument()
  })

  it('切换活动档位时解释跟着切换', async () => {
    const user = userEvent.setup()
    renderOnboarding()
    await user.click(screen.getByRole('button', { name: '活动较多' }))
    expect(screen.getByText(/每周锻炼 5 次以上/)).toBeInTheDocument()
  })
})

describe('V1.4 改动 3：口味偏好自定义', () => {
  it('预设口味之外可以自己添加，添加后出现在标签里并随档案保存', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await user.type(
      screen.getByLabelText('自定义口味'),
      '不吃香菜',
    )
    await user.click(screen.getByRole('button', { name: '添加口味' }))

    expect(screen.getByRole('button', { name: /不吃香菜/ })).toBeInTheDocument()

    await user.type(screen.getByLabelText('昵称'), '测试用户')
    await user.click(screen.getByRole('button', { name: '保存并开始' }))

    await waitFor(() => {
      expect(useAppStore.getState().data.profile?.customTastes).toEqual(['不吃香菜'])
    })
  })

  it('点一下自定义标签可以移除', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    await user.type(screen.getByLabelText('自定义口味'), '爱喝汤')
    await user.click(screen.getByRole('button', { name: '添加口味' }))
    expect(screen.getByRole('button', { name: /爱喝汤/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /移除自定义口味 爱喝汤/ }))
    expect(screen.queryByRole('button', { name: /爱喝汤/ })).toBeNull()
  })

  it('已有档案的自定义口味会回填', () => {
    useAppStore.setState({
      data: {
        ...structuredClone(emptyAppData),
        profile: {
          ...emptyAppData.profile!,
          id: 'profile-test',
          nickname: '老用户',
          goal: 'maintain_health',
          allergies: [],
          avoid: [],
          tastes: [],
          customTastes: ['少油'],
          diseases: [],
          doctorRestrictions: '',
          createdAt: '2026-01-01T00:00:00+08:00',
          updatedAt: '2026-01-01T00:00:00+08:00',
        },
      },
      initialized: true,
    })
    renderOnboarding()
    expect(screen.getByRole('button', { name: /少油/ })).toBeInTheDocument()
  })
})
