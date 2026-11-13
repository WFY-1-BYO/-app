import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Settings from '../pages/Settings'
import { emptyAppData, useAppStore } from '../store/appStore'
import { AI_ENDPOINT, aiKeyStatus, hasAiKey, openKey, sealKey } from '../lib/aiKey'
import { exportNdm } from '../lib/ndm'

const secret = 'sk-test-secret-123'

const freshSettings = () => structuredClone(emptyAppData.settings)

describe('改动 9：AI 密钥加密设置', () => {
  describe('密钥库', () => {
    it('接口地址内置，用户无需填写', () => {
      expect(AI_ENDPOINT.startsWith('https://')).toBe(true)
      expect(AI_ENDPOINT.length).toBeGreaterThan(10)
    })

    it('状态可查，但界面只显示状态不回显明文', () => {
      expect(hasAiKey(freshSettings())).toBe(false)
      expect(aiKeyStatus(freshSettings())).toBe('未设置')
      expect(aiKeyStatus({ ...freshSettings(), aiKeyEncrypted: 'sealed' })).toBe(
        '已设置（加密保存）',
      )
    })

    it('加密结果不含明文，且可还原供在线识别使用', async () => {
      const sealed = await sealKey(secret)
      expect(sealed.length).toBeGreaterThan(0)
      expect(sealed).not.toContain(secret)
      expect(await openKey(sealed)).toBe(secret)
      expect(await openKey(undefined)).toBeNull()
    })

    it('空密钥不产生密文', async () => {
      expect(await sealKey('   ')).toBe('')
    })
  })

  describe('设置页', () => {
    beforeEach(() => {
      localStorage.clear()
      useAppStore.setState({ data: structuredClone(emptyAppData), initialized: true })
    })

    it('输入框为密码类型，无密钥时说明本地降级', () => {
      render(<Settings />)
      const input = screen.getByLabelText('AI 密钥（只填一次）') as HTMLInputElement
      expect(input.type).toBe('password')
      expect(screen.getByText('未设置')).toBeInTheDocument()
      expect(screen.getByText(/未填密钥时/)).toBeInTheDocument()
      expect(screen.getByText(/接口地址已内置/)).toBeInTheDocument()
      expect(screen.getByText(/不等同于服务端级隐藏/)).toBeInTheDocument()
    })

    it('保存后只显示状态、清空输入、密钥不明文落盘也不进 NDM', async () => {
      const user = userEvent.setup()
      render(<Settings />)

      await user.type(screen.getByLabelText('AI 密钥（只填一次）'), secret)
      await user.click(screen.getByRole('button', { name: '保存密钥' }))

      await waitFor(() =>
        expect(hasAiKey(useAppStore.getState().data.settings)).toBe(true),
      )
      const stored = useAppStore.getState().data.settings.aiKeyEncrypted!
      expect(stored).not.toContain(secret)
      expect((screen.getByLabelText('AI 密钥（只填一次）') as HTMLInputElement).value).toBe('')
      expect(screen.getByText('已设置（加密保存）')).toBeInTheDocument()
      expect(screen.queryByText(secret)).not.toBeInTheDocument()
      expect(useAppStore.getState().data.settings.aiProvider).toBe('remote')
      expect(exportNdm(useAppStore.getState().data, 'test-device')).not.toContain(secret)
    })

    it('清除密钥后回到本地规则，App 不报错不阻塞', async () => {
      const user = userEvent.setup()
      render(<Settings />)

      await user.type(screen.getByLabelText('AI 密钥（只填一次）'), secret)
      await user.click(screen.getByRole('button', { name: '保存密钥' }))
      await waitFor(() =>
        expect(screen.getByRole('button', { name: '清除密钥' })).toBeInTheDocument(),
      )

      await user.click(screen.getByRole('button', { name: '清除密钥' }))
      await waitFor(() =>
        expect(hasAiKey(useAppStore.getState().data.settings)).toBe(false),
      )
      expect(useAppStore.getState().data.settings.aiProvider).toBe('local')
      expect(screen.getByText('未设置')).toBeInTheDocument()
      expect(screen.getByText(/所有识别回到本地规则/)).toBeInTheDocument()
    })
  })
})
