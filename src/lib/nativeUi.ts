/**
 * WebView 原生观感兜底。
 *
 * CSS 已经关闭静态文字的 user-select / touch-callout，但部分 Android WebView
 * 长按仍会走原生 ActionMode 弹出「复制 / 分享 / 全选 / 朗读」。这里在 capture
 * 阶段拦掉 contextmenu / selectstart / dragstart，并清除残留选区。
 *
 * 可编辑区域（输入框、文本域、select、contenteditable、data-allow-select）
 * 一律放行：用户要能在设置页粘贴 DeepSeek 密钥、在备注里编辑文字。
 * 绝不拦截 paste / copy / cut 事件，也不清掉输入框里的选区。
 */

export const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [data-allow-select="true"]'

function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false
  return target.closest(EDITABLE_SELECTOR) !== null
}

/** 安装拦截；返回卸载函数，便于测试或热更新时清理。 */
export function installNativeTextGuards(doc: Document = document): () => void {
  const block = (event: Event) => {
    if (isEditableTarget(event.target)) return
    event.preventDefault()
  }

  const clearStraySelection = () => {
    // 焦点在输入框里时完全不碰选区，避免破坏「长按 → 全选 → 粘贴」的流程
    if (isEditableTarget(doc.activeElement)) return
    const selection = doc.getSelection?.()
    if (!selection || selection.isCollapsed) return
    const anchor = selection.anchorNode
    const element = anchor instanceof Element ? anchor : anchor?.parentElement ?? null
    if (element && isEditableTarget(element)) return
    selection.removeAllRanges()
  }

  doc.addEventListener('contextmenu', block, true)
  doc.addEventListener('selectstart', block, true)
  doc.addEventListener('dragstart', block, true)
  doc.addEventListener('selectionchange', clearStraySelection)

  return () => {
    doc.removeEventListener('contextmenu', block, true)
    doc.removeEventListener('selectstart', block, true)
    doc.removeEventListener('dragstart', block, true)
    doc.removeEventListener('selectionchange', clearStraySelection)
  }
}
