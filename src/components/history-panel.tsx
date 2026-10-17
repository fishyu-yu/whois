"use client"

import { useEffect, useRef } from "react"
import { Clock3, Globe2, History, Network, Server, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface HistoryItem {
  query: string
  type: string
  timestamp: string
}

interface HistoryPanelProps {
  open: boolean
  onClose: () => void
  history: HistoryItem[]
  activeQuery: string
  onSelect: (item: HistoryItem) => void
}

/** Native modal provides an inert background, focus containment and Escape support. */
export function HistoryPanel({ open, onClose, history, activeQuery, onSelect }: HistoryPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!open) { if (dialog.open) dialog.close(); return }
    const trigger = document.querySelector<HTMLButtonElement>('button[aria-controls="history-panel"]')
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
      if (dialog.open) dialog.close()
      trigger?.focus()
    }
  }, [open])

  return (
    <dialog ref={dialogRef} id="history-panel" aria-labelledby="history-title" aria-describedby="history-description"
      onCancel={event => { event.preventDefault(); onClose() }}
      onKeyDown={event => {
        if (event.key !== "Tab") return
        // Native dialogs keep the page inert; explicitly wrap the boundary so
        // keyboard focus also stays out of browser chrome during repeated tabs.
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'))
          .filter(control => control.getClientRects().length > 0)
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
      onClick={event => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
      }}
      className="history-panel fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-80 max-w-[calc(100vw-1.5rem)] border-0 border-r border-border bg-card p-0 text-foreground shadow-xl sm:w-86">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-5">
          <div className="pt-2">
            <h2 id="history-title" className="flex items-center gap-2 text-base font-medium"><Clock3 className="size-4 text-primary" aria-hidden="true" />查询历史</h2>
            <p id="history-description" className="mt-2 text-xs leading-5 text-muted-foreground">最近 20 条查询，仅保存在此设备。</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="关闭历史记录" onClick={onClose} autoFocus><X className="size-4" aria-hidden="true" /></Button>
        </div>
        <nav aria-label="历史查询记录" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          {history.length ? (
            <ul className="space-y-1">
              {history.map(item => {
                const Icon = item.type === "domain" ? Globe2 : item.type === "asn" ? Server : Network
                const active = item.query === activeQuery
                const date = new Date(item.timestamp)
                return (
                  <li key={`${item.type}-${item.query}`}>
                    <button type="button" onClick={() => onSelect(item)} aria-current={active ? "true" : undefined}
                      className={cn("flex min-h-18 w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-accent", active && "bg-accent")}>
                      <Icon className={cn("mt-0.5 size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block break-all font-mono text-sm leading-5">{item.query}</span>
                        <span className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span className="uppercase">{item.type === "ip" && item.query.includes("/") ? "IP / CIDR" : item.type}</span>
                          {!Number.isNaN(date.valueOf()) && <time dateTime={item.timestamp}>{date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}</time>}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="flex h-full min-h-64 flex-col items-center justify-center px-5 pb-12 text-center">
              <History className="mb-5 size-7 text-muted-foreground" strokeWidth={1.25} aria-hidden="true" />
              <p className="text-sm font-medium">暂无历史记录</p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">从一个域名或地址开始，<br />你的最近查询会显示在这里。</p>
            </div>
          )}
        </nav>
        <p className="border-t border-border px-5 py-4 text-xs leading-5 text-muted-foreground">无需登录，随时继续探索。</p>
      </div>
    </dialog>
  )
}
