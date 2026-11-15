import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ApiKeyPrompt from '../components/ApiKeyPrompt'
import {
  API_KEY_PROMPT_STORAGE_KEY,
  markApiKeyPromptSeen,
  resetApiKeyPrompt,
  shouldShowApiKeyPrompt,
} from '../lib/apiKeyPrompt'
import { emptyAppData, useAppStore } from '../store/appStore'

const freshSettings = () => structuredClone(emptyAppData.settings)

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  } as Storage
}

function renderPrompt() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ApiKeyPrompt />
      <Routes>
        <Route path="/settings" element={<div>设置页已打开</div>} />
        <Route path="/" element={<div>首页</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('V1.7 首次启动：DeepSeek 密钥引导', () => {
  beforeEach(() => {
    localStorage.clear()
    resetApiKeyPrompt()
    useAppStore.setState({ data: structuredClone(emptyAppData), initialized: true })
  })

  describe('提醒条件', () => {
    it('首次打开且未填密钥时提醒', () => {
      expect(shouldShowApiKeyPrompt(freshSettings(), memoryStorage())).toBe(true)
    })

    it('已经填过密钥就不再提醒', () => {
      const settings = { ...freshSettings(), aiKeyEncrypted: 'ndmseal1:aes:xxx' }
      expect(shouldShowApiKeyPrompt(settings, memoryStorage())).toBe(false)
    })

    it('看过一次之后不再重复打扰', () => {
      const storage = memoryStorage()
      markApiKeyPromptSeen(storage)
      expect(storage.getItem(API_KEY_PROMPT_STORAGE_KEY)).toBe('seen')
      expect(shouldShowApiKeyPrompt(freshSettings(), storage)).toBe(false)
    })

    it('本地存储不可用时仍然提醒，不抛错', () => {
      expect(shouldShowApiKeyPrompt(freshSettings(), null)).toBe(true)
      expect(() => markApiKeyPromptSeen(null)).not.toThrow()
    })
  })

  describe('弹窗交互', () => {
    it('第一次打开就说明拍照识别需要密钥，并给出填写路径', () => {
      renderPrompt()
      const dialog = screen.getByRole('dialog', { name: '先填一次 DeepSeek 密钥' })
      expect(dialog).toBeInTheDocument()
      expect(dialog).toHaveTextContent('照片识别食材')
      expect(dialog).toHaveTextContent('设置 → DeepSeek 密钥')
      expect(dialog).toHaveTextContent('不随安装包分发')
      expect(screen.getByRole('button', { name: '去填写密钥' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '稍后再说' })).toBeInTheDocument()
    })

    it('点「稍后再说」关闭并记住，下次打开不再弹', async () => {
      const user = userEvent.setup()
      const first = renderPrompt()
      await user.click(screen.getByRole('button', { name: '稍后再说' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(localStorage.getItem(API_KEY_PROMPT_STORAGE_KEY)).toBe('seen')
      first.unmount()

      renderPrompt()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('点「去填写密钥」直达设置页', async () => {
      const user = userEvent.setup()
      renderPrompt()
      await user.click(screen.getByRole('button', { name: '去填写密钥' }))
      expect(await screen.findByText('设置页已打开')).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('已经有密钥时不弹窗', () => {
      useAppStore.setState({
        data: {
          ...structuredClone(emptyAppData),
          settings: { ...freshSettings(), aiKeyEncrypted: 'ndmseal1:aes:xxx' },
        },
        initialized: true,
      })
      renderPrompt()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
