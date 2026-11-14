import { Capacitor } from '@capacitor/core'

/**
 * Android WebView 不实现 Web Speech API，
 * 因此在打包成 App 后需要走原生语音识别。
 * 动态 import 保证浏览器 / 单元测试环境不会加载原生插件。
 */

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

interface NativeSpeechPlugin {
  requestPermissions: () => Promise<{ speechRecognition: string }>
  available: () => Promise<{ available: boolean }>
  start: (options: {
    language: string
    maxResults: number
    partialResults: boolean
    popup: boolean
  }) => Promise<void>
  stop: () => Promise<void>
  removeAllListeners: () => Promise<void>
  addListener: (
    event: 'partialResults',
    cb: (data: { matches?: string[] }) => void,
  ) => Promise<{ remove: () => Promise<void> }>
}

let pluginPromise: Promise<NativeSpeechPlugin> | null = null

async function loadPlugin(): Promise<NativeSpeechPlugin> {
  if (!pluginPromise) {
    pluginPromise = import('@capacitor-community/speech-recognition').then(
      mod => (mod as unknown as { SpeechRecognition: NativeSpeechPlugin }).SpeechRecognition,
    )
  }
  return pluginPromise
}

/** 启动一次原生语音识别；识别到的文字通过回调逐段返回 */
export async function startNativeSpeech(
  onPartial: (text: string) => void,
): Promise<void> {
  const SpeechRecognition = await loadPlugin()
  const permission = await SpeechRecognition.requestPermissions()
  if (permission.speechRecognition !== 'granted') {
    throw new Error('未获得麦克风权限，请在系统设置里允许「家庭营养师」使用麦克风。')
  }
  const { available } = await SpeechRecognition.available()
  if (!available) {
    throw new Error('这台设备暂时不支持语音识别，可以直接粘贴文字或上传录音文件。')
  }
  await SpeechRecognition.removeAllListeners()
  await SpeechRecognition.addListener('partialResults', data => {
    const text = (data.matches ?? []).join('').trim()
    if (text) onPartial(text)
  })
  await SpeechRecognition.start({
    language: 'zh-CN',
    maxResults: 3,
    partialResults: true,
    popup: false,
  })
}

export async function stopNativeSpeech(): Promise<void> {
  if (!isNativeApp()) return
  try {
    const SpeechRecognition = await loadPlugin()
    await SpeechRecognition.stop()
  } catch {
    // 停止失败不影响已识别的文字
  }
}
