/**
 * 复制文本到剪贴板。
 * 优先使用 Clipboard API（HTTPS / localhost），
 * 不可用时回退到 execCommand（兼容 HTTP 环境）。
 */
export function copyToClipboard(text: string): void {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {})
  } else {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}
