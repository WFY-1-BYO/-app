import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useIsTablet } from '../lib/breakpoint'
import { deviceProfileLabel, resolveDeviceProfile } from '../lib/deviceProfile'

const repoFile = (relative: string) => readFileSync(resolve(process.cwd(), relative), 'utf8')

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

function Probe() {
  return <div data-testid="is-tablet">{useIsTablet() ? 'tablet' : 'phone'}</div>
}

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="*" element={<div>页面内容</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

const buildGradle = repoFile('android/app/build.gradle')
const workflow = repoFile('.github/workflows/build.yml')
const phoneEnv = repoFile('.env.phone')
const padEnv = repoFile('.env.pad')
const phoneManifest = repoFile('android/app/src/phone/AndroidManifest.xml')
const padManifest = repoFile('android/app/src/pad/AndroidManifest.xml')

describe('V1.7 手机 / 平板分版', () => {
  beforeEach(() => {
    delete window.__FN_DEVICE_PROFILE__
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    delete window.__FN_DEVICE_PROFILE__
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  describe('设备档解析', () => {
    it('默认自动适配，标签为空', () => {
      expect(resolveDeviceProfile()).toBe('auto')
      expect(deviceProfileLabel('auto')).toBe('')
    })

    it('构建时指定 pad / phone 即可锁定布局', () => {
      vi.stubEnv('VITE_DEVICE_PROFILE', 'pad')
      expect(resolveDeviceProfile()).toBe('pad')
      expect(deviceProfileLabel('pad')).toBe('平板端')
      vi.stubEnv('VITE_DEVICE_PROFILE', 'phone')
      expect(resolveDeviceProfile()).toBe('phone')
      expect(deviceProfileLabel('phone')).toBe('手机端')
    })

    it('未知值回落自动适配；宿主注入优先级最高', () => {
      vi.stubEnv('VITE_DEVICE_PROFILE', 'unknown')
      expect(resolveDeviceProfile()).toBe('auto')
      window.__FN_DEVICE_PROFILE__ = 'pad'
      expect(resolveDeviceProfile()).toBe('pad')
    })
  })

  describe('布局锁定', () => {
    it('平板包即使窄窗口也走平板布局', () => {
      stubMedia(false)
      vi.stubEnv('VITE_DEVICE_PROFILE', 'pad')
      render(<Probe />)
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('tablet')
    })

    it('手机包即使宽窗口也走手机布局', () => {
      stubMedia(true)
      vi.stubEnv('VITE_DEVICE_PROFILE', 'phone')
      render(<Probe />)
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('phone')
    })

    it('自动档仍按屏幕宽度判断', () => {
      stubMedia(true)
      render(<Probe />)
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('tablet')
    })

    it('平板包渲染侧栏、标注版本；手机包渲染底部导航', () => {
      stubMedia(false)
      vi.stubEnv('VITE_DEVICE_PROFILE', 'pad')
      const pad = renderShell()
      expect(pad.container.querySelector('.app-shell')?.className).toContain('device-pad')
      expect(pad.container.querySelector('.side-nav')).not.toBeNull()
      expect(pad.container.querySelector('.bottom-nav')).toBeNull()
      expect(screen.getByText(/v1\.7 · 平板端 · 数据存于本机/)).toBeInTheDocument()
      pad.unmount()

      stubMedia(true)
      vi.stubEnv('VITE_DEVICE_PROFILE', 'phone')
      const phone = renderShell()
      expect(phone.container.querySelector('.app-shell')?.className).toContain('device-phone')
      expect(phone.container.querySelector('.bottom-nav')).not.toBeNull()
      expect(phone.container.querySelector('.side-nav')).toBeNull()
    })
  })

  describe('两个独立安装包', () => {
    it('两个 env 文件分别声明设备档，不含密钥', () => {
      expect(phoneEnv).toContain('VITE_DEVICE_PROFILE=phone')
      expect(padEnv).toContain('VITE_DEVICE_PROFILE=pad')
      expect(phoneEnv + padEnv).not.toMatch(/sk-|api[_-]?key|secret/i)
    })

    it('Gradle 两个 flavor 使用不同包名、应用名与版本后缀', () => {
      expect(buildGradle).toContain("flavorDimensions += 'device'")
      expect(buildGradle).toContain("applicationId 'com.family.nutritionist.phone'")
      expect(buildGradle).toContain("applicationId 'com.family.nutritionist.pad'")
      expect(buildGradle).toContain("versionNameSuffix '-phone'")
      expect(buildGradle).toContain("versionNameSuffix '-pad'")
      expect(buildGradle).toContain('家庭营养师·手机')
      expect(buildGradle).toContain('家庭营养师·平板')
      expect(buildGradle).toContain('versionCode 18')
    })

    it('手机竖屏、平板横竖屏自由，主清单用分版应用名', () => {
      expect(phoneManifest).toContain('android:screenOrientation="portrait"')
      expect(padManifest).toContain('android:screenOrientation="unspecified"')
      const mainManifest = repoFile('android/app/src/main/AndroidManifest.xml')
      expect(mainManifest).toContain('${appLabel}')
    })

    it('CI 分别构建并上传两个 APK', () => {
      expect(workflow).toContain('pnpm build:phone')
      expect(workflow).toContain('pnpm build:pad')
      expect(workflow).toContain('node scripts/sync-device-assets.mjs')
      expect(workflow).toContain('assemblePhoneRelease assemblePadRelease')
      expect(workflow).toContain('family-nutritionist-phone.apk')
      expect(workflow).toContain('family-nutritionist-pad.apk')
    })

    it('package.json 提供分版构建命令', () => {
      const pkg = JSON.parse(repoFile('package.json')) as { version: string; scripts: Record<string, string> }
      expect(pkg.version).toBe('1.7.0')
      expect(pkg.scripts['build:phone']).toContain('--mode phone')
      expect(pkg.scripts['build:pad']).toContain('--mode pad')
      expect(pkg.scripts['sync:devices']).toContain('sync-device-assets.mjs')
    })
  })
})
