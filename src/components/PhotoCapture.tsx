import { useRef } from 'react'

/**
 * 统一的「拍摄 / 上传」双按钮。
 *
 * 替代浏览器默认的「选择文件」原生按钮：
 * - 拍摄：带 capture 属性，手机上直接调起相机；
 * - 上传：不带 capture，从相册或文件里选。
 * 两个入口共用同一个 onFile 回调，调用方不感知来源差异。
 */
export default function PhotoCapture({
  label,
  hint,
  accept = 'image/*',
  disabled = false,
  allowCamera = true,
  uploadLabel = '上传图片',
  onFile,
}: {
  label: string
  hint?: string
  accept?: string
  disabled?: boolean
  /** 非图片文件（PDF/CSV 等）没有「拍摄」，可关闭 */
  allowCamera?: boolean
  uploadLabel?: string
  onFile: (file: File) => void | Promise<void>
}) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  const handle = async (
    event: React.ChangeEvent<HTMLInputElement>,
    reset: () => void,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    reset()
    await onFile(file)
  }

  return (
    <div className="capture-group" aria-label={label}>
      {allowCamera && (
        <input
          ref={cameraRef}
          type="file"
          accept={accept}
          capture="environment"
          className="visually-hidden-input"
          aria-label={`${label}：拍摄`}
          tabIndex={-1}
          onChange={event => void handle(event, () => {
            if (cameraRef.current) cameraRef.current.value = ''
          })}
        />
      )}
      <input
        ref={uploadRef}
        type="file"
        accept={accept}
        className="visually-hidden-input"
        aria-label={`${label}：上传`}
        tabIndex={-1}
        onChange={event => void handle(event, () => {
          if (uploadRef.current) uploadRef.current.value = ''
        })}
      />
      <div className="capture-buttons">
        {allowCamera && (
          <button
            type="button"
            className="button capture-camera"
            disabled={disabled}
            onClick={() => cameraRef.current?.click()}
          >
            <span aria-hidden>📷</span> 拍摄
          </button>
        )}
        <button
          type="button"
          className="button secondary capture-upload"
          disabled={disabled}
          onClick={() => uploadRef.current?.click()}
        >
          <span aria-hidden>🖼️</span> {uploadLabel}
        </button>
      </div>
      {hint && <p className="muted capture-hint">{hint}</p>}
    </div>
  )
}
