"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Github, ArrowLeft, History } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface HeaderProps {
  showBack?: boolean
  showHistory?: boolean
  onHistoryClick?: () => void
  isHistoryActive?: boolean
  className?: string
}

export function Header({ 
  showBack = false, 
  showHistory = false, 
  onHistoryClick, 
  isHistoryActive = false,
  className
}: HeaderProps) {
  return (
    <header className={cn("sticky top-0 z-40 w-full border-b border-border/50 bg-background/95", className)}>
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-2">
          {showBack && (
            <Button variant="ghost" size="icon" asChild className="-ml-1 text-muted-foreground hover:text-foreground">
              <Link href="/" aria-label="返回首页">
                <ArrowLeft aria-hidden="true" className="size-5" />
              </Link>
            </Button>
          )}
          
          <Link href="/" className="flex min-h-11 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background">
            <Image src="/logo.svg" alt="" width={30} height={30} className="shrink-0" />
            <span className="whitespace-nowrap text-sm font-semibold tracking-tight sm:text-base">Whale Whois</span>
          </Link>
        </div>

        <nav aria-label="页面工具" className="ml-auto flex items-center gap-0.5 sm:gap-1">
          {showHistory && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onHistoryClick}
              aria-label="查询历史"
              aria-expanded={isHistoryActive}
              aria-controls="history-panel"
              title="查询历史"
              className={cn("text-muted-foreground hover:text-foreground", isHistoryActive && "bg-accent text-foreground")}
            >
              <History aria-hidden="true" className="size-5" />
            </Button>
          )}
          
          <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="https://github.com/fishyu-yu/whois" target="_blank" rel="noopener noreferrer" aria-label="打开 GitHub 仓库" title="GitHub 仓库">
              <Github aria-hidden="true" className="size-5" />
            </Link>
          </Button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
