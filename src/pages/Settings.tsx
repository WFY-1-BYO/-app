import { useAppStore } from '../store/appStore'

export default function Settings() {
  const settings = useAppStore(state => state.data.settings)
  const updateSettings = useAppStore(state => state.updateSettings)

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
            第一版默认使用本地规则，断网时功能仍可用。在线接口需要配置后才生效。
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
    </div>
  )
}
