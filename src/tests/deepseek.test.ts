import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AiNotConfiguredError,
  DEEPSEEK_MODEL,
  chatWithDeepSeek,
  extractHealthMetricsWithAI,
  mapAiMetricType,
} from '../lib/deepseek'
import { emptyAppData } from '../store/appStore'
import { sealKey } from '../lib/aiKey'

const settingsWithKey = async () => ({
  ...emptyAppData.settings,
  aiKeyEncrypted: await sealKey('sk-test-key'),
})

const okResponse = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })

describe('V1.4 改动 12：DeepSeek API 真实接入', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => okResponse('好的')),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('chatWithDeepSeek 用 OpenAI 兼容协议调用 api.deepseek.com，并带上密钥与模型名', async () => {
    const settings = await settingsWithKey()
    const reply = await chatWithDeepSeek(settings, [
      { role: 'system', content: '你是知夏' },
      { role: 'user', content: '解读这一餐' },
    ])
    expect(reply).toBe('好的')

    const fetchMock = vi.mocked(globalThis.fetch)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.deepseek.com/chat/completions')
    const headers = (init?.headers ?? {}) as Record<string, string>
    expect(headers.Authorization).toBe('Bearer sk-test-key')
    const body = JSON.parse(String(init?.body))
    expect(body.model).toBe(DEEPSEEK_MODEL)
    // deepseek-chat 已于 2026-07-24 下线，文本与视觉都必须走 deepseek-flash
    expect(DEEPSEEK_MODEL).toBe('deepseek-flash')
    expect(body.thinking).toEqual({ type: 'disabled' })
    expect(body.messages.length).toBe(2)
    expect(body.stream).toBe(false)
  })

  it('没填密钥时给出明确指引而不是发请求', async () => {
    await expect(
      chatWithDeepSeek(emptyAppData.settings, [{ role: 'user', content: 'hi' }]),
    ).rejects.toBeInstanceOf(AiNotConfiguredError)
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled()
  })

  it('密钥错误（401）与余额不足（402）给出可理解的中文提示', async () => {
    const settings = await settingsWithKey()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('unauthorized', { status: 401 })),
    )
    await expect(
      chatWithDeepSeek(settings, [{ role: 'user', content: 'hi' }]),
    ).rejects.toThrow(/401/)

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('payment required', { status: 402 })),
    )
    await expect(
      chatWithDeepSeek(settings, [{ role: 'user', content: 'hi' }]),
    ).rejects.toThrow(/余额不足/)
  })

  it('extractHealthMetricsWithAI 只输出 JSON 也能解析，中文指标名映射回内部类型', async () => {
    const settings = await settingsWithKey()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        okResponse(
          '```json\n[{"label":"收缩压","value":128,"unit":"mmHg"},{"label":"空腹血糖","value":5.4},{"label":"未知项目","value":9}]```',
        ),
      ),
    )
    const metrics = await extractHealthMetricsWithAI(settings, '血压 128/78，血糖 5.4')
    expect(metrics.length).toBe(3)
    expect(mapAiMetricType('收缩压')).toBe('systolic_pressure')
    expect(mapAiMetricType('空腹血糖')).toBe('blood_glucose')
    expect(mapAiMetricType('未知项目')).toBeNull()
  })

  it('模型没按格式回答时返回空数组，交回本地规则兜底', async () => {
    const settings = await settingsWithKey()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => okResponse('我无法解析这份报告。')),
    )
    expect(await extractHealthMetricsWithAI(settings, '文字')).toEqual([])
  })

  it('healthCapture 能把 AI 指标转成正式记录（映射不上的丢弃）', async () => {
    const { metricsFromAiMetrics, createHealthUpload } = await import(
      '../lib/healthCapture'
    )
    const upload = createHealthUpload({
      kind: 'file',
      fileName: '化验单.txt',
      hasKey: false,
    }).upload
    const result = metricsFromAiMetrics(upload, [
      { label: '舒张压', value: 78 },
      { label: '神秘指标', value: 3 },
    ])
    expect(result.metrics.length).toBe(1)
    expect(result.metrics[0].type).toBe('diastolic_pressure')
    expect(result.upload.status).toBe('recognized')
    expect(result.upload.metricIds).toEqual([result.metrics[0].id])
  })
})
