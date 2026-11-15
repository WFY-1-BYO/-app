import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { isBackRoute, MAIN_ROUTES } from '../lib/backRoutes'
import { installSwipeBack, SWIPE_BACK_MIN_DISTANCE_PX } from '../lib/swipeBack'

function touch(type: string, x: number, y: number): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', { value: [{ clientX: x, clientY: y }] })
  Object.defineProperty(event, 'changedTouches', { value: [{ clientX: x, clientY: y }] })
  return event
}

let cleanupSwipe: (() => void) | undefined

function stubMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

function renderAt(entries: string[], index = 0) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={index}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<div>首页内容</div>} />
          <Route path="/records" element={<div>记录页内容</div>} />
          <Route path="/mine" element={<div>我的页内容</div>} />
          <Route path="/settings" element={<div>设置页内容</div>} />
          <Route path="/onboarding" element={<div>档案页内容</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  stubMedia(false)
})

afterEach(() => {
  cleanupSwipe?.()
  cleanupSwipe = undefined
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('V1.7.1 二级页面返回', () => {
  describe('路由判定', () => {
    it('三个主导航页是根，不需要返回按钮', () => {
      expect(MAIN_ROUTES).toEqual(['/', '/records', '/mine'])
      for (const path of MAIN_ROUTES) expect(isBackRoute(path)).toBe(false)
    })

    it('设置、编辑档案等二级页面都需要返回入口', () => {
      for (const path of ['/settings', '/onboarding', '/meal/new', '/health', '/import']) {
        expect(isBackRoute(path)).toBe(true)
      }
    })
  })

  describe('左边缘右滑手势', () => {
    it('从左边缘向右滑超过阈值触发返回', () => {
      const onBack = vi.fn()
      cleanupSwipe = installSwipeBack(onBack)
      document.dispatchEvent(touch('touchstart', 10, 100))
      document.dispatchEvent(touch('touchend', 10 + SWIPE_BACK_MIN_DISTANCE_PX + 10, 100))
      expect(onBack).toHaveBeenCalledTimes(1)
    })

    it('位移不足、起手不在边缘、竖向滑动都不触发', () => {
      const onBack = vi.fn()
      cleanupSwipe = installSwipeBack(onBack)
      document.dispatchEvent(touch('touchstart', 10, 100))
      document.dispatchEvent(touch('touchend', 40, 100))
      expect(onBack).not.toHaveBeenCalled()

      document.dispatchEvent(touch('touchstart', 120, 100))
      document.dispatchEvent(touch('touchend', 260, 100))
      expect(onBack).not.toHaveBeenCalled()

      document.dispatchEvent(touch('touchstart', 10, 100))
      document.dispatchEvent(touch('touchend', 90, 320))
      expect(onBack).not.toHaveBeenCalled()
    })

    it('在输入框里起手不接管，避免影响光标定位', () => {
      const onBack = vi.fn()
      cleanupSwipe = installSwipeBack(onBack)
      document.body.innerHTML = '<input id="key" />'
      const input = document.getElementById('key')!
      input.dispatchEvent(touch('touchstart', 8, 100))
      document.dispatchEvent(touch('touchend', 140, 100))
      expect(onBack).not.toHaveBeenCalled()
    })

    it('touchcancel 后不会误触发', () => {
      const onBack = vi.fn()
      cleanupSwipe = installSwipeBack(onBack)
      document.dispatchEvent(touch('touchstart', 8, 100))
      document.dispatchEvent(touch('touchcancel', 8, 100))
      document.dispatchEvent(touch('touchend', 140, 100))
      expect(onBack).not.toHaveBeenCalled()
    })
  })

  describe('页面交互', () => {
    it('从设置页进入编辑档案后显示返回按钮与手势提示', () => {
      renderAt(['/settings', '/onboarding'], 1)
      expect(screen.getByText('档案页内容')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '返回上一页' })).toBeInTheDocument()
      expect(screen.getByText(/从屏幕左边缘向右滑也可返回/)).toBeInTheDocument()
    })

    it('点返回按钮回到设置页，不用再点底部 dock', async () => {
      const user = userEvent.setup()
      renderAt(['/settings', '/onboarding'], 1)
      await user.click(screen.getByRole('button', { name: '返回上一页' }))
      expect(await screen.findByText('设置页内容')).toBeInTheDocument()
      // 设置页本身也是二级页面，返回入口继续保留，可以再退回「我的」
      expect(screen.getByRole('button', { name: '返回上一页' })).toBeInTheDocument()
    })

    it('从左边缘右滑也能回上一页', () => {
      renderAt(['/settings', '/onboarding'], 1)
      act(() => {
        document.dispatchEvent(touch('touchstart', 8, 200))
        document.dispatchEvent(touch('touchend', 130, 205))
      })
      expect(screen.getByText('设置页内容')).toBeInTheDocument()
    })

    it('主导航页不显示返回按钮', () => {
      const home = renderAt(['/'])
      expect(screen.getByText('首页内容')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '返回上一页' })).not.toBeInTheDocument()
      home.unmount()

      renderAt(['/records'])
      expect(screen.getByText('记录页内容')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '返回上一页' })).not.toBeInTheDocument()
    })

    it('直接打开深链接没有上一页时回首页', async () => {
      const user = userEvent.setup()
      renderAt(['/onboarding'])
      await user.click(screen.getByRole('button', { name: '返回上一页' }))
      expect(await screen.findByText('首页内容')).toBeInTheDocument()
    })
  })
})
