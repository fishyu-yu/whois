export function csvContent(rows: unknown[][]): string {
  return '\uFEFF' + rows.map(row => row.map(value => {
    let text = Array.isArray(value) ? value.join('; ') : value == null ? '' : String(value)
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`
    return `"${text.replace(/"/g, '""')}"`
  }).join(',')).join('\r\n')
}

export function exportBasename(query: string): string {
  return `whois-${query.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') || 'query'}`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Allow the browser to start reading the download before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Capture an isolated copy so export never changes the live result or scroll. */
export async function exportResultImage(element: HTMLElement, query: string): Promise<void> {
  const { toBlob } = await import('html-to-image')
  await document.fonts.ready

  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-100000px;top:0;pointer-events:none;'
  container.setAttribute('aria-hidden', 'true')
  const snapshot = element.cloneNode(true) as HTMLElement
  snapshot.querySelectorAll('[data-export-ignore]').forEach(node => node.remove())
  const backgroundColor = getComputedStyle(document.body).backgroundColor
  Object.assign(snapshot.style, {
    width: `${element.clientWidth + 48}px`, maxWidth: 'none', margin: '0', padding: '24px',
    boxSizing: 'border-box', backgroundColor,
  })
  for (const node of [snapshot, ...snapshot.querySelectorAll<HTMLElement>('*')]) {
    node.style.setProperty('animation', 'none', 'important')
    node.style.setProperty('transition', 'none', 'important')
    if (node.classList.contains('truncate')) {
      Object.assign(node.style, { whiteSpace: 'normal', overflow: 'visible', overflowWrap: 'anywhere' })
    }
  }
  container.appendChild(snapshot)
  document.body.appendChild(container)
  try {
    const width = snapshot.scrollWidth
    const height = snapshot.scrollHeight
    // Bound canvas memory on mobile and avoid silently clipping long results.
    const pixelRatio = Math.min(2, 8192 / width, 8192 / height, Math.sqrt(16_000_000 / (width * height)))
    if (pixelRatio < 0.5) throw new Error('查询结果过长，无法生成清晰图片，请使用 JSON 或 CSV 导出。')
    const blob = await toBlob(snapshot, { backgroundColor, pixelRatio, width, height })
    if (!blob) throw new Error('图片生成失败，请重试。')
    downloadBlob(blob, `${exportBasename(query)}.png`)
  } finally {
    container.remove()
  }
}
