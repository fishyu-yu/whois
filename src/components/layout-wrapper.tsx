"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function LayoutWrapper({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <div className={cn("relative flex min-h-screen flex-col overflow-hidden bg-background selection:bg-primary/20", className)}>
       <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="app-grid absolute inset-x-0 top-0 h-[560px] opacity-70 dark:opacity-30" />
          <div className="absolute -top-44 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px] dark:bg-primary/8" />
       </div>
       
       <div className="relative z-10 flex-1 flex flex-col">
          {children}
       </div>

       <footer className="relative z-10 mt-auto border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Whale Education Co., Ltd. · 域名与网络信息查询</p>
       </footer>
    </div>
  )
}
