import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { aiKeyStatus, hasAiKey, sealKey } from '../lib/aiKey'

export default function Settings() {
  const settings = useAppStore(state => state.data.settings)
  const updateSettings = useAppStore(state => state.updateSettings)
  const [keyInput, setKeyInput] = useState('')
  const [message, setMessage] = useState('')

  const keyReady = hasAiKey(settings)

  const saveKey = async () => {
    const plain = keyInput.trim()
    if (!plain) {
      setMessage('请先填写密钥再保存。')
      return
    }
    const sealed = await sealKey(plain)
    await updateSettings({ aiKeyEncrypted: sealed, aiProvider: 'remote' })
    setKeyInput('')
    setMessage('密钥已加密保存到本机，界面不会回显。在线识别已启用。')
  }

  const clearKey = async () => {
    await updateSettings({ aiKeyEncrypted: undefined, aiProvider: 'local' })
    setKeyInput('')
    setMessage('已清除密钥，所有识别回到本地规则，App 仍可正常使用。')
  }

  return (
    <div className="stack">
      <section className="card form-grid">
        <div>
          <h1 className="section-title">设置</h1>
          <p className="muted">这些设置只影响本机使用体验。</p>
        </div>

        <div className="form-row">
          <label htmlFor="assistant-toggle">显示悬浮营养师</label>
          <input
            id="assistant-toggle"
            type="checkbox"
            checked={settings.assistantEnabled}
            onChange={event =>
              void updateSettings({ assistantEnabled: event.target.checked })
            }
          />
        </div>

        <div className="form-row">
          <label htmlFor="ai-provider">AI 提供器</label>
          <select
            id="ai-provider"
            value={settings.aiProvider}
            onChange={event =>
              void updateSettings({
                aiProvider: event.target.value as 'local' | 'remote',
              })
            }
          >
            <option value="local">本地离线规则</option>
            <option value="remote">内置在线接口</option>
          </select>
          <p className="muted">
            第一版默认使用本地规则，断网时功能仍可用。填入密钥后自动切到内置在线接口。
          </p>
        </div>

        <div className="form-row">
          <label htmlFor="vivo-auth">vivo 健康授权</label>
          <input
            id="vivo-auth"
            type="checkbox"
            checked={settings.vivoHealthAuthorized}
            onChange={event =>
              void updateSettings({ vivoHealthAuthorized: event.target.checked })
            }
          />
        </div>

        <div className="form-row">
          <label htmlFor="notifications">重要提醒</label>
          <input
            id="notifications"
            type="checkbox"
            checked={settings.notificationsEnabled}
            onChange={event =>
              void updateSettings({ notificationsEnabled: event.target.checked })
            }
          />
        </div>
      </section>

      <section className="card form-grid" aria-label="AI 密钥设置">
        <h2 className="section-title">AI 密钥</h2>
        <p className="muted">接口地址已内置，你只需要填一次密钥。</p>

        <div className="form-row">
          <span>当前状态</span>
          <p className={`key-status ${keyReady ? 'on' : 'off'}`}>{aiKeyStatus(settings)}</p>
        </div>

        <div className="form-row">
          <label htmlFor="ai-key">AI 密钥（只填一次）</label>
          <input
            id="ai-key"
            type="password"
            autoComplete="off"
            value={keyInput}
            onChange={event => setKeyInput(event.target.value)}
            placeholder={keyReady ? '已设置；如需更换，直接输入新密钥' : '粘贴你的密钥'}
          />
        </div>

        <div className="row">
          <button type="button" className="button" onClick={() => void saveKey()}>
            {keyReady ? '更换密钥' : '保存密钥'}
          </button>
          {keyReady && (
            <button type="button" className="button ghost" onClick={() => void clearKey()}>
              清除密钥
            </button>
          )}
        </div>
        {message && <p className="muted">{message}</p>}

        <div className="key-disclaimer">
          <p className="muted">
            未填密钥时，配餐识别和健康数据留档都走本地规则，App 不会报错或卡住；填入后自动启用在线识别，之前标记「待识别」的留档也会自动重试，不需要重新上传。
          </p>
          <p className="muted">
            如实说明：这是纯前端的加密存储，密钥不会在界面明文回显，也不会写进导出的 NDM
            文档；但纯前端方案下，密钥仍可能被从本机代码或存储中提取，不等同于服务端级隐藏。请不要在共用设备上填入重要密钥。
          </p>
        </div>
      </section>
    </div>
  )
}
