import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import NutritionPie from '../components/NutritionPie'
import FloatingAssistant from '../components/FloatingAssistant'
import { emptyAppData, useAppStore } from '../store/appStore'
import type { NutritionSummary } from '../types'

const css = readFileSync(resolve(process.cwd(), 'src/styles/app.css'), 'utf8')
const pieSource = readFileSync(
  resolve(process.cwd(), 'src/components/NutritionPie.tsx'),
  'utf8',
)

const palette = [
  '#FAFAF7',
  '#708B74',
  '#292D2A',
  '#7A807B',
  '#E7A56F',
  '#E4E8E2',
]

describe('V1.3 Design Tokens 统一（图 1）', () => {
  it('色板收敛到低饱和 6 色，移除红色失败色', () => {
    expect(css).not.toContain('#d97966')
    expect(css).not.toContain('--danger')
    expect(css).not.toContain('.button.danger')
    expect(css).toContain('--notice-ink: #7a807b')
    for (const color of ['#fafaf7', '#708b74', '#292d2a', '#7a807b', '#e7a56f', '#e4e8e2']) {
      expect(css).toContain(color)
    }
  })

  it('字阶变量与正文行高符合规范', () => {
    expect(css).toContain('--fs-hero: 28px')
    expect(css).toContain('--fs-title: 22px')
    expect(css).toContain('--fs-card-title: 19px')
    expect(css).toContain('--fs-section: 16px')
    expect(css).toContain('--fs-body: 14px')
    expect(css).toContain('--fs-hint: 12px')
    expect(css).toContain('--fs-label: 11px')
    expect(css).toContain('font-variant-numeric: tabular-nums')
    expect(css).toMatch(/body\s*\{[^}]*line-height:\s*1\.5/)
  })

  it('卡片圆角 16、双层轻阴影、内边距 13–16，主 CTA 高 56', () => {
    expect(css).toContain('--radius: 16px')
    expect(css).toMatch(/--shadow:\s*0 1px 2px[^;]*0 8px 24px/)
    expect(css).toMatch(/\.card\s*\{[^}]*padding:\s*16px/)
    expect(css).toMatch(/\.button\.cta-primary\s*\{[^}]*height:\s*56px/)
  })

  it('次按钮白底描边，所有按钮触控目标 ≥ 44dp', () => {
    expect(css).toMatch(/\.button\.secondary\s*\{[^}]*background:\s*#fff/)
    expect(css).toMatch(/\.button\s*\{[^}]*min-height:\s*44px/)
    expect(css).toMatch(/\.button\.small\s*\{[^}]*min-height:\s*44px/)
    expect(css).toContain('button.chip {\n  min-height: 44px;')
  })

  it('悬浮球手机 56dp / 平板 64dp', () => {
    expect(css).toMatch(/\.assistant\s*\{[^}]*width:\s*56px/)
    expect(css).toMatch(/\.assistant\.assistant-tablet\s*\{[^}]*width:\s*64px/)
  })

  it('存在减少动效降级规则', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('transition-duration: 0.01ms !important')
  })

  it('供能环只使用 6 色板中的颜色', () => {
    expect(pieSource).not.toContain('#dfb56d')
    expect(pieSource).not.toContain('#d98c6a')
    expect(pieSource).not.toContain('#eef1ee')
    const nutrition: NutritionSummary = {
      calories: 548,
      carbs: 60,
      protein: 40,
      fat: 18,
      carbsRatio: 44,
      proteinRatio: 33,
      fatRatio: 23,
    }
    const { container } = render(<NutritionPie nutrition={nutrition} />)
    const strokes = Array.from(container.querySelectorAll('circle')).map(
      circle => circle.getAttribute('stroke')?.toUpperCase() ?? '',
    )
    for (const stroke of strokes) {
      expect(palette).toContain(stroke)
    }
    expect(container.textContent).toContain('548')
    expect(container.textContent).toContain('碳水 44%（60g）')
  })

  it('悬浮球默认停靠由 CSS 控制，不写死左上角坐标压住页头', () => {
    expect(emptyAppData.settings.assistantPosition.x).toBeLessThan(0)
    expect(css).toMatch(/\.assistant\s*\{[^}]*right:\s*20px/)
    expect(css).toMatch(
      /\.app-shell\.tablet-layout \.assistant\s*\{[^}]*right:\s*32px/,
    )
    useAppStore.setState({
      data: structuredClone(emptyAppData),
      initialized: true,
    })
    const { container } = render(<FloatingAssistant />)
    const button = container.querySelector('.assistant') as HTMLElement
    expect(button).not.toBeNull()
    expect(button.style.left).toBe('')
    expect(button.style.top).toBe('')
  })
})
