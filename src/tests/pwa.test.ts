import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const pub = (name: string) => resolve(process.cwd(), 'public', name)
const read = (name: string) => readFileSync(pub(name), 'utf8')

describe('PWA 可安装配置（下载版与在线版共用）', () => {
  it('manifest 声明独立窗口、中文语言与全部安装字段', () => {
    const m = JSON.parse(read('manifest.webmanifest'))
    expect(m.name).toBe('家庭营养师')
    expect(m.display).toBe('standalone')
    expect(m.start_url).toBe('/')
    expect(m.scope).toBe('/')
    expect(m.background_color).toBe('#FAFAF7')
    expect(m.theme_color).toBe('#708B74')
    expect(m.lang).toBe('zh-CN')
    // V1.2 起运动不属于 App 范畴，描述里不得残留
    expect(m.description).not.toContain('运动')
  })

  it('提供 any 与 maskable 两组的 192/512 PNG 图标', () => {
    const m = JSON.parse(read('manifest.webmanifest'))
    expect(m.icons).toHaveLength(4)
    const expectIcon = (src: string, sizes: string, purpose: string) => {
      const icon = m.icons.find((i: { src: string }) => i.src === src)
      expect(icon, `缺少 ${src}`).toBeDefined()
      expect(icon.sizes).toBe(sizes)
      expect(icon.type).toBe('image/png')
      expect(icon.purpose).toBe(purpose)
      const file = pub(src.replace(/^\//, ''))
      expect(existsSync(file), `文件不存在: ${src}`).toBe(true)
      expect(statSync(file).size).toBeGreaterThan(1000)
    }
    expectIcon('/icon-192.png', '192x192', 'any')
    expectIcon('/icon-512.png', '512x512', 'any')
    expectIcon('/icon-maskable-192.png', '192x192', 'maskable')
    expectIcon('/icon-maskable-512.png', '512x512', 'maskable')
  })

  it('页面声明 apple-touch-icon 与视口，且不带运动描述', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
    expect(html).toContain('rel="apple-touch-icon" href="/icon-192.png"')
    expect(html).toContain('viewport-fit=cover')
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"')
    expect(html).not.toContain('运动')
  })

  it('service worker 升级缓存版本并预缓存 App 壳与全部图标', () => {
    const sw = read('sw.js')
    expect(sw).toContain("family-nutritionist-v3")
    expect(sw).toContain('manifest.webmanifest')
    expect(sw).toContain('icon-192.png')
    expect(sw).toContain('icon-maskable-512.png')
    // 预缓存必须容错，单个资源缺失不能让安装整体失败
    expect(sw).toContain('Promise.allSettled')
    // 文档网络优先，避免旧 index.html 顶住新版
    expect(sw).toContain("event.request.mode === 'navigate'")
  })
})
