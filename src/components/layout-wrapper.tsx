"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function LayoutWrapper({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <div className={cn("relative flex min-h-screen flex-col overflow-x-hidden bg-background selection:bg-primary/15", className)}>
      <div className="flex flex-1 flex-col">
        {children}
      </div>

      <footer className="mt-auto py-7 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Whale Education Co., Ltd.</p>
      </footer>
    </div>
  )
}
