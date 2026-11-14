import { beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Health from '../pages/Health'
import { emptyAppData, useAppStore } from '../store/appStore'
import { exportNdm, parseNdm } from '../lib/ndm'
import {
  createHealthUpload,
  hasAiKey,
  recognizeHealthText,
  reprocessHealthUpload,
  speechRecognitionAvailable,
} from '../lib/healthCapture'
import type { HealthUpload } from '../types'

const withKey = (key?: string) => ({
  ...structuredClone(emptyAppData.settings),
  aiKeyEncrypted: key,
})

describe('改动 8：健康数据拍照 / 语音 / 文件录入', () => {
  describe('留档与识别逻辑', () => {
    it('未填密钥时只留档待识别，不产生假指标', () => {
      expect(hasAiKey(withKey())).toBe(false)
      expect(hasAiKey(withKey('encrypted'))).toBe(true)

      const result = createHealthUpload({
        kind: 'photo',
        fileName: '收缩压120.jpg',
        hasKey: false,
      })
      expect(result.upload.status).toBe('pending')
      expect(result.upload.fileName).toBe('收缩压120.jpg')
      expect(result.metrics.length).toBe(0)
      expect(result.upload.metricIds.length).toBe(0)
    })

    it('填入密钥后对同一份留档重新识别，不需要重新上传', () => {
      const pending = createHealthUpload({
        kind: 'photo',
        fileName: '收缩压120.jpg',
        hasKey: false,
      }).upload

      expect(reprocessHealthUpload(pending, false).metrics.length).toBe(0)

      const again = reprocessHealthUpload(pending, true)
      expect(again.upload.id).toBe(pending.id)
      expect(again.upload.fileName).toBe(pending.fileName)
      expect(again.upload.status).toBe('recognized')
      expect(again.metrics.length).toBe(1)
      expect(again.metrics[0].type).toBe('systolic_pressure')
      expect(again.metrics[0].value).toBe(120)
      expect(again.upload.metricIds).toEqual(again.metrics.map(metric => metric.id))
    })

    it('有密钥时上传即识别，识别不到仍如实留档', () => {
      const ok = createHealthUpload({
        kind: 'voice',
        fileName: '语音记录.txt',
        rawText: '空腹血糖 5.4，体重 62',
        hasKey: true,
      })
      expect(ok.upload.status).toBe('recognized')
      expect(ok.metrics.map(metric => metric.type)).toEqual(['blood_glucose', 'weight'])

      const none = createHealthUpload({
        kind: 'file',
        fileName: '体检报告.pdf',
        hasKey: true,
      })
      expect(none.upload.status).toBe('pending')
      expect(none.metrics.length).toBe(0)
    })

    it('语音转文字可从文本提取指标，浏览器能力可判断', () => {
      expect(recognizeHealthText('收缩压 120 舒张压 78').map(item => item.value)).toEqual([
        120, 78,
      ])
      expect(typeof speechRecognitionAvailable()).toBe('boolean')
    })
  })

  describe('NDM 导出导入', () => {
    it('附件只按文件名关联，不把图片二进制写进正文', () => {
      const upload: HealthUpload = {
        id: 'upload-1',
        kind: 'photo',
        fileName: '收缩压120.jpg',
        status: 'pending',
        metricIds: [],
        createdAt: '2026-11-13T08:00:00+08:00',
        updatedAt: '2026-11-13T08:00:00+08:00',
        sourceDevice: 'test-device',
      }
      const ndm = exportNdm(
        { ...structuredClone(emptyAppData), healthUploads: [upload] },
        'test-device',
      )
      expect(ndm).toContain('健康上传留档')
      expect(ndm).toContain('收缩压120.jpg')
      expect(ndm).not.toContain('data:image')
      expect(ndm).not.toMatch(/[A-Za-z0-9+/]{200,}/)

      const parsed = parseNdm(ndm)
      expect(parsed.warnings.length).toBe(0)
      expect(parsed.data.healthUploads.length).toBe(1)
      expect(parsed.data.healthUploads[0].fileName).toBe('收缩压120.jpg')
      expect(parsed.data.healthUploads[0].rawText).toBeUndefined()
    })
  })

  describe('健康页', () => {
    beforeEach(() => {
      localStorage.clear()
      useAppStore.setState({ data: structuredClone(emptyAppData), initialized: true })
    })

    it('无密钥时上传显示待识别留档，并给出语音能力降级提示', async () => {
      const user = userEvent.setup()
      render(<Health />)

      const supported = speechRecognitionAvailable()
      expect(
        screen.getByText(
          supported ? /点「开始语音转文字」/ : /当前环境不支持语音转文字/,
        ),
      ).toBeInTheDocument()

      const file = new File(['x'], '收缩压120.jpg', { type: 'image/jpeg' })
      await user.upload(screen.getByLabelText('拍照（血压计、化验单、体检报告）'), file)

      await waitFor(() =>
        expect(useAppStore.getState().data.healthUploads.length).toBe(1),
      )
      expect(screen.getByText('待识别')).toBeInTheDocument()
      expect(useAppStore.getState().data.healthMetrics.length).toBe(0)
      expect(screen.getByText(/只留档、不假装已识别/)).toBeInTheDocument()
    })

    it('填入密钥后自动重新识别同一份留档，不需重新上传', async () => {
      const user = userEvent.setup()
      render(<Health />)

      const file = new File(['x'], '收缩压120.jpg', { type: 'image/jpeg' })
      await user.upload(screen.getByLabelText('拍照（血压计、化验单、体检报告）'), file)
      await waitFor(() =>
        expect(useAppStore.getState().data.healthUploads.length).toBe(1),
      )

      await act(async () => {
        useAppStore.setState({
          data: {
            ...useAppStore.getState().data,
            settings: {
              ...useAppStore.getState().data.settings,
              aiKeyEncrypted: 'encrypted-test',
            },
          },
        })
      })

      await waitFor(() =>
        expect(useAppStore.getState().data.healthUploads[0].status).toBe('recognized'),
      )
      expect(useAppStore.getState().data.healthMetrics.length).toBe(1)
      expect(screen.getByText(/收缩压：120/)).toBeInTheDocument()
      expect(screen.getByText('已识别')).toBeInTheDocument()
    })

    it('手动录入仍作为兜底保留，已确认数值给出趋势评价', async () => {
      const user = userEvent.setup()
      render(<Health />)

      await user.selectOptions(screen.getByLabelText('指标类型'), '收缩压')
      await user.clear(screen.getByLabelText(/数值/))
      await user.type(screen.getByLabelText(/数值/), '118')
      await user.click(screen.getByRole('button', { name: '保存健康指标' }))

      await waitFor(() =>
        expect(useAppStore.getState().data.healthMetrics.length).toBe(1),
      )
      expect(screen.getByText(/收缩压在常见参考范围内/)).toBeInTheDocument()
      expect(screen.getByText('手动录入（兜底）')).toBeInTheDocument()
    })
  })
})
