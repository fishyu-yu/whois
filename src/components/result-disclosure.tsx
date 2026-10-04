"use client"

import { useId, useState, type ReactNode } from "react"
import { ChevronDown, Server } from "lucide-react"

interface ResultDisclosureProps {
  title: string
  count?: number
  excludeFromImage?: boolean
  children: ReactNode
}

/** The same compact disclosure for parsed fields and the original response. */
export function ResultDisclosure({ title, count, excludeFromImage, children }: ResultDisclosureProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <section data-export-ignore={excludeFromImage || undefined} className="quiet-surface overflow-hidden rounded-lg">
      <button
        type="button"
        onClick={() => setOpen(previous => !previous)}
        aria-label={title}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="flex items-center gap-2 font-medium">
          <Server aria-hidden="true" className="size-4 shrink-0" />
          {title}
        </span>
        <span aria-hidden="true" className="flex shrink-0 items-center gap-3">
          {count !== undefined && <span className="text-xs tabular-nums">{count} 个字段</span>}
          <ChevronDown data-disclosure-chevron className={`size-4 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      <div id={panelId} hidden={!open} data-export-panel className="border-t border-border/45">
        {children}
      </div>
    </section>
  )
}
