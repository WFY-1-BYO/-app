import { useRef, useState } from 'react'
import JSZip from 'jszip'
import { useAppStore } from '../store/appStore'
import { exportNdm, mergeAppData, parseNdm } from '../lib/ndm'
import { readFileText } from '../lib/file'

type Feedback = { tone: 'success' | 'error' | 'info'; text: string } | null

export default function ImportExport() {
  const data = useAppStore(state => state.data)
  const replaceData = useAppStore(state => state.replaceData)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [busy, setBusy] = useState<'export' | 'exportFull' | 'import' | null>(null)
  const [summary, setSummary] = useState<{
    added: number
    skipped: number
    conflicts: string[]
    fileName: string
  } | null>(null)
  const [lastExport, setLastExport] = useState<{ fileName: string; size: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const formatSize = (bytes: number) =>
    bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`

  const downloadBlob = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const exportLightweight = async () => {
    setBusy('export')
    setFeedback(null)
    try {
      const ndm = exportNdm(data, 'current-device')
      const date = new Date().toISOString().slice(0, 10)
      const fileName = `营养师数据_${date}_current-device.ndm.md`
      const blob = new Blob([ndm], { type: 'text/markdown;charset=utf-8' })
      downloadBlob(fileName, blob)
      setLastExport({ fileName, size: formatSize(blob.size) })
      setFeedback({
        tone: 'success',
        text: `导出成功：${fileName}（${formatSize(blob.size)}）。文件已开始下载；如果浏览器里没有弹出，请到通知栏或下载列表找一下。`,
      })
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? `导出失败：${error.message}` : '导出失败，请重试。',
      })
    } finally {
      setBusy(null)
    }
  }

  const exportFullBackup = async () => {
    setBusy('exportFull')
    setFeedback(null)
    try {
      const ndm = exportNdm(data, 'current-device')
      const zip = new JSZip()
      zip.file('data.ndm.md', ndm)
      zip.file(
        'assets/README.txt',
        '本备份包保存 NDM 数据文档。\n如果原始照片已单独保存，请将它们放入 assets/images/，并保持与 data.ndm.md 中的相对路径一致。',
      )
      const blob = await zip.generateAsync({ type: 'blob' })
      const date = new Date().toISOString().slice(0, 10)
      const fileName = `营养师数据_${date}_current-device.zip`
      downloadBlob(fileName, blob)
      setLastExport({ fileName, size: formatSize(blob.size) })
      setFeedback({
        tone: 'success',
        text: `备份包导出成功：${fileName}（${formatSize(blob.size)}）。文件已开始下载；如果浏览器里没有弹出，请到通知栏或下载列表找一下。`,
      })
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? `导出失败：${error.message}` : '导出失败，请重试。',
      })
    } finally {
      setBusy(null)
    }
  }

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy('import')
    setFeedback({ tone: 'info', text: `正在解析 ${file.name}，请稍等……` })
    setSummary(null)
    try {
      const text = await readFileText(file)
      const parsed = parseNdm(text)
      const result = mergeAppData(data, parsed.data)
      // 文件根本不是 NDM 文档时如实报错，不静默「导入完成 0 条」
      if (result.added === 0 && parsed.warnings.length > 0) {
        throw new Error('这不是有效的 NDM 数据文档（没有解析到任何数据）。请确认选择的是本 App 导出的 .ndm.md 文件。')
      }
      await replaceData(result.data)
      setSummary({
        added: result.added,
        skipped: result.skipped,
        conflicts: result.conflicts,
        fileName: file.name,
      })
      setFeedback({
        tone: result.conflicts.length > 0 ? 'info' : 'success',
        text:
          result.conflicts.length === 0
            ? `导入完成：新增 ${result.added} 条，跳过重复 ${result.skipped} 条，没有冲突。`
            : `导入完成：新增 ${result.added} 条，跳过重复 ${result.skipped} 条；有 ${result.conflicts.length} 处冲突需要你在下面确认。`,
      })
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? `导入失败：${error.message}` : '导入失败：文件读不出来，请确认是 .ndm.md 文档。',
      })
    } finally {
      setBusy(null)
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
          <button
            type="button"
            className="button"
            disabled={busy !== null}
            onClick={() => void exportLightweight()}
          >
            {busy === 'export' ? '正在导出……' : '导出轻量数据文档'}
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busy !== null}
            onClick={() => void exportFullBackup()}
          >
            {busy === 'exportFull' ? '正在打包……' : '导出完整备份包'}
          </button>
        </div>
        {lastExport && (
          <p className="muted export-result" style={{ marginTop: 12 }}>
            最近一次导出：{lastExport.fileName}（{lastExport.size}）
          </p>
        )}
        {feedback && (
          <p className={`feedback feedback-${feedback.tone}`} role="status">
            {feedback.text}
          </p>
        )}
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
          disabled={busy !== null}
          aria-label="导入 NDM 数据文档"
        />
        {busy === 'import' && <p className="feedback feedback-info">正在解析文件……</p>}

        {summary && (
          <div className="card" style={{ boxShadow: 'none' }}>
            <strong>导入结果：{summary.fileName}</strong>
            <p>
              新增 {summary.added} 条 · 跳过重复 {summary.skipped} 条 · 冲突{' '}
              {summary.conflicts.length} 处
            </p>
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
