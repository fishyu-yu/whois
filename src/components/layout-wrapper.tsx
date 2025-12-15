"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function LayoutWrapper({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <div className={cn("min-h-screen flex flex-col bg-background relative selection:bg-primary/20", className)}>
       {/* Subtle background glow */}
       <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/5 rounded-full blur-[120px] opacity-50 dark:opacity-20" />
       </div>
       
       <div className="relative z-10 flex-1 flex flex-col">
          {children}
       </div>

       <footer className="relative z-10 py-8 text-center text-sm text-muted-foreground mt-auto">
          <p>© {new Date().getFullYear()} Whale Education Co.,Ltd. All rights reserved.</p>
       </footer>
    </div>
  )
}
