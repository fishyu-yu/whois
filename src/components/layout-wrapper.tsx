"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function LayoutWrapper({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <div className={cn("relative flex min-h-screen flex-col overflow-hidden bg-background selection:bg-primary/20", className)}>
      <div className="signal-field pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="app-grid absolute inset-x-0 top-0 h-[640px] opacity-75 dark:opacity-45" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col">
        {children}
      </div>

      <footer className="relative z-10 mt-auto border-t border-border/45 bg-background/55 py-6 text-center text-xs text-muted-foreground backdrop-blur-xl">
        <p>© {new Date().getFullYear()} Whale Education Co., Ltd. · 域名与网络信息查询</p>
      </footer>
    </div>
  )
}
