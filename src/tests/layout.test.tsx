import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AppShell from '../components/AppShell'

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

function renderShell(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="*" element={<div>页面内容</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('V1.3 双端导航适配', () => {
  it('手机宽度使用底部三段导航，不渲染左侧导航', () => {
    stubMedia(false)
    const { container } = renderShell()

    expect(container.querySelector('.bottom-nav')).not.toBeNull()
    expect(container.querySelector('.side-nav')).toBeNull()
    expect(container.querySelector('.app-shell')?.className).not.toContain('tablet-layout')

    const nav = screen.getByRole('navigation', { name: '主导航' })
    expect(nav).toHaveTextContent('今天')
    expect(nav).toHaveTextContent('记录')
    expect(nav).toHaveTextContent('我的')
    expect(container.querySelectorAll('svg.nav-icon')).toHaveLength(3)
    expect(container.textContent).not.toContain('🍽')
  })

  it('平板宽度使用左侧导航栏，含副标题、品牌与版本信息', () => {
    stubMedia(true)
    const { container } = renderShell('/records')

    expect(container.querySelector('.side-nav')).not.toBeNull()
    expect(container.querySelector('.bottom-nav')).toBeNull()
    expect(container.querySelector('.app-shell')?.className).toContain('tablet-layout')

    const aside = screen.getByRole('complementary', { name: '侧边主导航' })
    expect(aside).toHaveTextContent('家庭营养师')
    expect(aside).toHaveTextContent('本地 · 单用户')
    expect(aside).toHaveTextContent('下一餐 · 知识')
    expect(aside).toHaveTextContent('趋势 · 历史')
    expect(aside).toHaveTextContent('档案 · 数据')
    expect(aside).toHaveTextContent('数据存于本机')
    expect(aside).toHaveTextContent('NDM 可导出迁移')
    expect(container.querySelectorAll('svg.nav-icon')).toHaveLength(3)
  })

  it('平板侧栏高亮当前路由对应的入口', () => {
    stubMedia(true)
    const { container } = renderShell('/records')
    const links = container.querySelectorAll('.side-nav-links a')
    expect(links).toHaveLength(3)
    expect(links[0].className).not.toContain('active')
    expect(links[1].className).toContain('active')
  })

  it('没有 matchMedia 的环境默认按手机布局渲染', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { container } = renderShell()
    expect(container.querySelector('.bottom-nav')).not.toBeNull()
    expect(container.querySelector('.side-nav')).toBeNull()
  })

  it('导航中不出现运动相关入口', () => {
    stubMedia(true)
    const { container } = renderShell()
    expect(container.textContent).not.toContain('运动')
  })
})
