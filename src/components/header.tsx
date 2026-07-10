"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Github, ArrowLeft, History, Radar } from "lucide-react"
import Link from "next/link"
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
    <header className={cn("glass sticky top-0 z-50 w-full", className)}>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          {showBack && (
            <Button variant="ghost" size="icon" asChild className="-ml-2 rounded-lg text-muted-foreground hover:text-foreground">
              <Link href="/" aria-label="返回首页">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
          )}
          
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20 transition-transform group-hover:scale-[1.03]">
              <Radar className="size-[18px]" />
            </div>
            <div className="leading-none">
              <span className="block text-sm font-semibold tracking-tight">鲸探 Whois</span>
              <span className="mt-1 hidden text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:block">Network intelligence</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1">
          {showHistory && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onHistoryClick}
              aria-label="查询历史"
              className={cn("rounded-lg text-muted-foreground hover:text-foreground", isHistoryActive && "bg-accent text-foreground")}
            >
              <History className="w-5 h-5" />
            </Button>
          )}
          
          <Link href="https://github.com/FishYu/whois" target="_blank" aria-label="打开 GitHub 仓库">
            <Button variant="ghost" size="icon" className="rounded-lg text-muted-foreground hover:text-foreground">
              <Github className="w-5 h-5" />
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
