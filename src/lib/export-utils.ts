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
