import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Settings from '../pages/Settings'
import Onboarding from '../pages/Onboarding'
import { emptyAppData, useAppStore, createDefaultProfile } from '../store/appStore'
import { installNativeTextGuards } from '../lib/nativeUi'

let uninstall: (() => void) | undefined

beforeEach(() => {
  localStorage.clear()
  useAppStore.setState({ data: structuredClone(emptyAppData), initialized: true })
})

afterEach(() => {
  uninstall?.()
  uninstall = undefined
})

function withRouter(ui: ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('V1.7.1 输入框粘贴能力', () => {
  it('设置页 DeepSeek 密钥框可以整段粘贴，不必一个字一个字敲', async () => {
    const user = userEvent.setup()
    uninstall = installNativeTextGuards(document)
    withRouter(<Settings />)

    const input = screen.getByLabelText('DeepSeek 密钥（只填一次）') as HTMLInputElement
    await user.click(input)
    await user.paste('sk-deepseek-test-key-1234567890')

    expect(input.value).toBe('sk-deepseek-test-key-1234567890')
  })

  it('长按密钥框时不拦 contextmenu，系统才能弹出「粘贴」', async () => {
    const user = userEvent.setup()
    uninstall = installNativeTextGuards(document)
    withRouter(<Settings />)

    const input = screen.getByLabelText('DeepSeek 密钥（只填一次）')
    const longPress = new Event('contextmenu', { bubbles: true, cancelable: true })
    input.dispatchEvent(longPress)
    expect(longPress.defaultPrevented).toBe(false)

    await user.click(input)
    await user.paste('sk-from-clipboard')
    expect((input as HTMLInputElement).value).toBe('sk-from-clipboard')
  })

  it('编辑个人档案里的昵称、备注等文本域同样可以粘贴', async () => {
    const user = userEvent.setup()
    uninstall = installNativeTextGuards(document)
    useAppStore.setState({
      data: {
        ...structuredClone(emptyAppData),
        profile: createDefaultProfile({
          nickname: '原来',
          goal: 'maintain_health',
          allergies: [],
          avoid: [],
          tastes: [],
          diseases: [],
        }),
      },
      initialized: true,
    })
    withRouter(<Onboarding />)

    const nickname = screen.getByLabelText('昵称') as HTMLInputElement
    await user.clear(nickname)
    await user.click(nickname)
    await user.paste('粘贴进来的昵称')
    expect(nickname.value).toBe('粘贴进来的昵称')

    const note = screen.getByLabelText('医生或临床营养师给出的饮食限制') as HTMLTextAreaElement
    await user.click(note)
    await user.paste('少盐、忌油炸')
    expect(note.value).toBe('少盐、忌油炸')
  })

  it('焦点在输入框时不清除选区，静态文字仍会清除', () => {
    uninstall = installNativeTextGuards(document)
    document.body.innerHTML = '<div id="text">营养估算</div><input id="field" />'
    const textNode = document.getElementById('text')!.firstChild!
    const input = document.getElementById('field')! as HTMLInputElement
    const selection = document.getSelection()!
    selection.removeAllRanges()
    const range = document.createRange()
    range.selectNodeContents(textNode)
    selection.addRange(range)

    input.focus()
    document.dispatchEvent(new Event('selectionchange'))
    expect(selection.isCollapsed).toBe(false)

    input.blur()
    document.dispatchEvent(new Event('selectionchange'))
    expect(selection.isCollapsed).toBe(true)
  })
})
