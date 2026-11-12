import { useRef, useState } from 'react'
import JSZip from 'jszip'
import { useAppStore } from '../store/appStore'
import { exportNdm, mergeAppData, parseNdm } from '../lib/ndm'
import { readFileText } from '../lib/file'

export default function ImportExport() {
  const data = useAppStore(state => state.data)
  const replaceData = useAppStore(state => state.replaceData)
  const [message, setMessage] = useState('')
  const [summary, setSummary] = useState<{
    added: number
    skipped: number
    conflicts: string[]
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const downloadText = (filename: string, text: string, type = 'text/markdown') => {
    const blob = new Blob([text], { type: `${type};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportLightweight = () => {
    const ndm = exportNdm(data, 'current-device')
    const date = new Date().toISOString().slice(0, 10)
    downloadText(`营养师数据_${date}_current-device.ndm.md`, ndm)
    setMessage('已导出轻量数据文档。')
    setSummary(null)
  }

  const exportFullBackup = async () => {
    const ndm = exportNdm(data, 'current-device')
    const zip = new JSZip()
    zip.file('data.ndm.md', ndm)
    zip.file(
      'assets/README.txt',
      '本备份包保存 NDM 数据文档。\n如果原始照片已单独保存，请将它们放入 assets/images/，并保持与 data.ndm.md 中的相对路径一致。',
    )
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const date = new Date().toISOString().slice(0, 10)
    link.download = `营养师数据_${date}_current-device.zip`
    link.click()
    URL.revokeObjectURL(url)
    setMessage('已导出完整备份包。')
    setSummary(null)
  }

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await readFileText(file)
      const parsed = parseNdm(text)
      const result = mergeAppData(data, parsed.data)
      await replaceData(result.data)
      setSummary({
        added: result.added,
        skipped: result.skipped,
        conflicts: result.conflicts,
      })
      setMessage(
        result.conflicts.length === 0
          ? '导入完成。'
          : '导入完成，但有冲突需要你确认。',
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导入失败。')
      setSummary(null)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <h1 className="section-title">NDM 导入导出</h1>
        <p className="muted">
          数据使用本软件专用的 Markdown 格式保存。轻量文档适合查看，完整备份包适合恢复。
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="button" onClick={exportLightweight}>
            导出轻量数据文档
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => void exportFullBackup()}
          >
            导出完整备份包
          </button>
        </div>
        {message && <p className="muted" style={{ marginTop: 12 }}>{message}</p>}
      </section>

      <section className="card stack">
        <h2 className="section-title">导入数据</h2>
        <p className="muted">
          选择 `.ndm.md` 文件。系统会先解析、去重和检查冲突，不会直接覆盖现有数据。
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".ndm.md,.md,text/markdown"
          onChange={event => void importFile(event)}
          aria-label="导入 NDM 数据文档"
        />

        {summary && (
          <div className="card" style={{ boxShadow: 'none' }}>
            <strong>导入结果</strong>
            <p>新增：{summary.added}</p>
            <p>跳过：{summary.skipped}</p>
            <p>冲突：{summary.conflicts.length}</p>
            {summary.conflicts.length > 0 && (
              <ul>
                {summary.conflicts.map(conflict => (
                  <li key={conflict}>{conflict}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
