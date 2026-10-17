"use client"

import { useId, useState, type ReactNode } from "react"
import { ChevronDown, Code2, List } from "lucide-react"

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
  const triggerId = useId()
  const Icon = excludeFromImage ? Code2 : List

  return (
    <section data-export-ignore={excludeFromImage || undefined} className="quiet-surface min-w-0 overflow-hidden rounded-xl">
      <div className="@container relative">
        <button
          id={triggerId}
          type="button"
          onClick={() => setOpen(previous => !previous)}
          aria-label={title}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-14 w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm text-foreground transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
        >
          <span className="flex min-w-0 items-center gap-2 font-medium">
            <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            {title}
          </span>
          <span aria-hidden="true" className="flex shrink-0 items-center gap-3 text-muted-foreground">
            {count !== undefined && <span className="hidden w-16 @sm:block" />}
            <ChevronDown data-disclosure-chevron className={`size-4 transition-transform duration-180 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
          </span>
        </button>
        {count !== undefined && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-12 hidden items-center text-xs tabular-nums text-muted-foreground @sm:flex">{count} 个字段</span>}
      </div>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!open}
        data-export-panel
        data-state={open ? 'open' : 'closed'}
        className="min-w-0 border-t border-border/60 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:duration-180"
      >
        {children}
      </div>
    </section>
  )
}
