import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { emptyAppData, useAppStore, createDefaultProfile } from '../store/appStore'
import { initialKnowledge } from '../lib/knowledge'
import { computeMedals } from '../lib/medals'
import { exportNdm } from '../lib/ndm'
import Today from '../pages/Today'
import Records from '../pages/Records'
import Mine from '../pages/Mine'
import Medals from '../pages/Medals'

const src = resolve(process.cwd(), 'src')

describe('改动 3+4：运动相关内容全部删除', () => {
  it('运动专属源码与测试文件已删除', () => {
    expect(existsSync(resolve(src, 'lib/exercise.ts'))).toBe(false)
    expect(existsSync(resolve(src, 'pages/Exercise.tsx'))).toBe(false)
    expect(existsSync(resolve(src, 'tests/exercise.test.tsx'))).toBe(false)
  })

  it('类型、数据域、勋章分组不再包含运动', () => {
    const data = structuredClone(emptyAppData)
    expect('exerciseLogs' in data).toBe(false)
    const medals = computeMedals(data)
    expect(medals.some(medal => String(medal.group) === 'exercise')).toBe(false)
    expect(medals.some(medal => /运动/.test(medal.name + medal.condition))).toBe(false)
    expect(Object.keys(data.settings)).not.toContain('exercise')
  })

  it('NDM 导出不含运动记录段', () => {
    const ndm = exportNdm(emptyAppData, 'test-device')
    expect(ndm).not.toContain('运动记录')
    expect(ndm).not.toContain('运动背景')
  })

  it('各主页面均无运动字样或运动入口', () => {
    localStorage.clear()
    useAppStore.setState({
      data: {
        ...structuredClone(emptyAppData),
        profile: createDefaultProfile({ nickname: '删除验证', goal: 'maintain_health' }),
        knowledge: initialKnowledge(),
      },
      initialized: true,
    })
    const pages = [Today, Records, Mine, Medals]
    pages.forEach(Page => {
      const { unmount } = render(
        <MemoryRouter>
          <Page />
        </MemoryRouter>,
      )
      expect(screen.queryByText(/运动/)).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /运动记录/ })).not.toBeInTheDocument()
      unmount()
    })
  })

  it('知识库不再包含运动与饮食分类', () => {
    expect(initialKnowledge().some(item => /运动/.test(item.category + item.title + item.relatedFeature))).toBe(false)
  })
})
