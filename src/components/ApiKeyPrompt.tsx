import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { markApiKeyPromptSeen, shouldShowApiKeyPrompt } from '../lib/apiKeyPrompt'

/**
 * 首次打开 App 时的密钥引导。
 * 拍照识别食材、健康报告解读、配餐 AI 点评都依赖 DeepSeek，没填密钥时会
 * 回退到本地规则 —— 所以第一次启动就把这件事说清楚，并给一条直达设置的路。
 * 只弹一次，密钥本身不在这里输入、不回显、不进产物。
 */
export default function ApiKeyPrompt() {
  const settings = useAppStore(state => state.data.settings)
  const initialized = useAppStore(state => state.initialized)
  const navigate = useNavigate()
  const [visible, setVisible] = useState(
    () => initialized && shouldShowApiKeyPrompt(settings),
  )

  if (!visible) return null

  const dismiss = (goToSettings: boolean) => {
    markApiKeyPromptSeen()
    setVisible(false)
    if (goToSettings) navigate('/settings')
  }

  return (
    <div className="api-key-prompt-backdrop">
      <section
        className="card api-key-prompt-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-prompt-title"
      >
        <img src="/assistant.png" alt="知夏" className="api-key-prompt-avatar" />
        <h2 id="api-key-prompt-title" className="section-title">
          先填一次 DeepSeek 密钥
        </h2>
        <p className="muted">
          照片识别食材、让知夏用 AI 解读这一餐，都需要连接 DeepSeek。第一次打开先填一次，之后就不用再管。
        </p>
        <ul className="api-key-prompt-list">
          <li>去 DeepSeek 开放平台创建密钥（sk- 开头）</li>
          <li>在「我的 → 设置 → DeepSeek 密钥」里粘贴保存</li>
          <li>密钥只加密存在这台设备，不随安装包分发、不写进导出文件</li>
        </ul>
        <div className="row api-key-prompt-actions">
          <button type="button" className="button" onClick={() => dismiss(true)}>
            去填写密钥
          </button>
          <button type="button" className="button ghost" onClick={() => dismiss(false)}>
            稍后再说
          </button>
        </div>
        <p className="muted api-key-prompt-foot">
          暂时不填也能用：配餐、记录、勋章都在本机完成，只是拍照识别会回退到简单的本地匹配。
        </p>
      </section>
    </div>
  )
}
