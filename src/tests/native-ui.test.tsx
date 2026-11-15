import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { installNativeTextGuards, EDITABLE_SELECTOR } from '../lib/nativeUi'

const repoFile = (relative: string) => readFileSync(resolve(process.cwd(), relative), 'utf8')
const css = repoFile('src/index.css')
const mainActivity = repoFile(
  'android/app/src/main/java/com/family/nutritionist/MainActivity.java',
)

let uninstall: (() => void) | undefined

afterEach(() => {
  uninstall?.()
  uninstall = undefined
  document.body.innerHTML = ''
})

describe('原生观感：长按静态文字不弹复制 / 剪切菜单', () => {
  it('全局关闭文字选择、长按呼出与点击高亮', () => {
    expect(css).toContain('-webkit-touch-callout: none')
    expect(css).toContain('-webkit-user-select: none')
    expect(css).toContain('user-select: none')
    expect(css).toContain('-webkit-tap-highlight-color: transparent')
  })

  it('所有需要用户输入的文本框都能长按呼出粘贴菜单', () => {
    expect(css).toMatch(/input,[\s\S]*?textarea,[\s\S]*?select,[\s\S]*?\[contenteditable='true'\]/)
    // .app-shell * 特异性高于 input，必须用 !important 才能放行
    expect(css).toContain('-webkit-touch-callout: default !important')
    expect(css).toContain('user-select: text !important')
    expect(EDITABLE_SELECTOR).toContain('input')
    expect(EDITABLE_SELECTOR).toContain('textarea')
    expect(EDITABLE_SELECTOR).toContain('select')
  })

  it('安卓层按命中区域区分：输入框放行粘贴，静态文字消费长按', () => {
    expect(mainActivity).toContain('setOnLongClickListener')
    expect(mainActivity).toContain('getHitTestResult()')
    expect(mainActivity).toContain('WebView.HitTestResult.EDIT_TEXT_TYPE')
    expect(mainActivity).toContain('return false')
    expect(mainActivity).toContain('return true')
    expect(mainActivity).toContain('getBridge().getWebView()')
    // 不能再无条件禁用整个 WebView 的长按，否则输入框粘贴菜单也一起没了
    expect(mainActivity).not.toContain('setLongClickable(false)')
  })

  it('静态文字的 contextmenu / selectstart / dragstart 被拦截', () => {
    document.body.innerHTML = '<div id="text">今天午餐建议</div>'
    const target = document.getElementById('text')!
    uninstall = installNativeTextGuards(document)

    for (const type of ['contextmenu', 'selectstart', 'dragstart']) {
      const event = new Event(type, { bubbles: true, cancelable: true })
      target.dispatchEvent(event)
      expect(event.defaultPrevented, type).toBe(true)
    }
  })

  it('输入框内的长按 / 选择事件放行', () => {
    document.body.innerHTML = '<label for="key">密钥</label><input id="key" type="password" />'
    const input = document.getElementById('key')!
    uninstall = installNativeTextGuards(document)

    const contextMenu = new Event('contextmenu', { bubbles: true, cancelable: true })
    input.dispatchEvent(contextMenu)
    expect(contextMenu.defaultPrevented).toBe(false)

    const selectStart = new Event('selectstart', { bubbles: true, cancelable: true })
    input.dispatchEvent(selectStart)
    expect(selectStart.defaultPrevented).toBe(false)
  })

  it('静态文字上残留的选区会被清除', () => {
    document.body.innerHTML = '<div id="text">营养估算</div>'
    const textNode = document.getElementById('text')!.firstChild!
    const range = document.createRange()
    range.selectNodeContents(textNode)
    const selection = document.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    uninstall = installNativeTextGuards(document)

    document.dispatchEvent(new Event('selectionchange'))
    expect(selection?.isCollapsed).toBe(true)
  })

  it('卸载后恢复原状', () => {
    document.body.innerHTML = '<div id="text">记录</div>'
    const target = document.getElementById('text')!
    const cleanup = installNativeTextGuards(document)
    cleanup()

    const event = new Event('contextmenu', { bubbles: true, cancelable: true })
    target.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})
