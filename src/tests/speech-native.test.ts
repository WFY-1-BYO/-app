import { beforeEach, describe, expect, it, vi } from 'vitest'

const isNativePlatform = vi.fn(() => false)

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNativePlatform() },
}))

const requestPermissions = vi.fn(async () => ({ speechRecognition: 'granted' }))
const available = vi.fn(async () => ({ available: true }))
const start = vi.fn(async (_options: {
  language: string
  maxResults: number
  partialResults: boolean
  popup: boolean
}) => {})
const stop = vi.fn(async () => {})
const removeAllListeners = vi.fn(async () => {})
let partialHandler: ((data: { matches?: string[] }) => void) | null = null
const addListener = vi.fn(
  async (_event: 'partialResults', cb: (data: { matches?: string[] }) => void) => {
    partialHandler = cb
    return { remove: async () => {} }
  },
)

vi.mock('@capacitor-community/speech-recognition', () => ({
  SpeechRecognition: {
    requestPermissions: () => requestPermissions(),
    available: () => available(),
    start: (options: {
      language: string
      maxResults: number
      partialResults: boolean
      popup: boolean
    }) => start(options),
    stop: () => stop(),
    removeAllListeners: () => removeAllListeners(),
    addListener: (event: 'partialResults', cb: (data: { matches?: string[] }) => void) =>
      addListener(event, cb),
  },
}))

describe('App 内原生语音识别', () => {
  beforeEach(() => {
    isNativePlatform.mockReturnValue(false)
    requestPermissions.mockClear()
    available.mockClear()
    start.mockClear()
    stop.mockClear()
    addListener.mockClear()
    partialHandler = null
  })

  it('浏览器环境判定为非 App，不会加载原生插件', async () => {
    const { isNativeApp } = await import('../lib/speechNative')
    expect(isNativeApp()).toBe(false)
  })

  it('App 环境判定为原生，语音能力直接视为可用', async () => {
    isNativePlatform.mockReturnValue(true)
    const { isNativeApp } = await import('../lib/speechNative')
    const { speechRecognitionAvailable } = await import('../lib/healthCapture')
    expect(isNativeApp()).toBe(true)
    expect(speechRecognitionAvailable()).toBe(true)
  })

  it('启动后把识别文字逐段回传给调用方', async () => {
    isNativePlatform.mockReturnValue(true)
    const { startNativeSpeech } = await import('../lib/speechNative')
    const chunks: string[] = []
    await startNativeSpeech(text => chunks.push(text))

    expect(requestPermissions).toHaveBeenCalledTimes(1)
    expect(addListener).toHaveBeenCalledTimes(1)
    expect(start).toHaveBeenCalledTimes(1)
    const options = start.mock.calls[0][0]
    expect(options.language).toBe('zh-CN')
    expect(options.partialResults).toBe(true)

    partialHandler?.({ matches: ['血压 128'] })
    partialHandler?.({ matches: ['82'] })
    expect(chunks).toEqual(['血压 128', '82'])
  })

  it('拒绝麦克风权限时给出可执行的提示，不静默失败', async () => {
    isNativePlatform.mockReturnValue(true)
    requestPermissions.mockResolvedValueOnce({ speechRecognition: 'denied' })
    const { startNativeSpeech } = await import('../lib/speechNative')
    await expect(startNativeSpeech(() => {})).rejects.toThrow('麦克风权限')
    expect(start).not.toHaveBeenCalled()
  })

  it('设备不支持原生识别时如实告知，不假装已启动', async () => {
    isNativePlatform.mockReturnValue(true)
    available.mockResolvedValueOnce({ available: false })
    const { startNativeSpeech } = await import('../lib/speechNative')
    await expect(startNativeSpeech(() => {})).rejects.toThrow('不支持语音识别')
    expect(start).not.toHaveBeenCalled()
  })

  it('浏览器环境调用停止不会触碰原生插件', async () => {
    isNativePlatform.mockReturnValue(false)
    const { stopNativeSpeech } = await import('../lib/speechNative')
    await stopNativeSpeech()
    expect(stop).not.toHaveBeenCalled()
  })
})
