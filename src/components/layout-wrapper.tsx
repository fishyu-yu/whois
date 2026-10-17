"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function LayoutWrapper({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <div className={cn("relative flex min-h-dvh flex-col bg-background selection:bg-primary/15", className)}>
      <div className="flex min-w-0 flex-1 flex-col">
        {children}
      </div>

      <footer className="mt-auto px-4 pb-6 pt-10 text-center text-xs leading-relaxed text-muted-foreground sm:pb-7">
        <p>© {new Date().getFullYear()} Whale Education Co., Ltd.</p>
      </footer>
    </div>
  )
}
