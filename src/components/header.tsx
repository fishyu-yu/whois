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
    <header className={cn("glass sticky top-0 z-50 w-full", className)}>
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          {showBack && (
            <Button variant="ghost" size="icon" asChild className="-ml-1 size-9 text-muted-foreground hover:text-foreground">
              <Link href="/" aria-label="返回首页">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
          )}
          
          <Link href="/" className="group flex items-center gap-2.5">
            <Image src="/logo.svg" alt="" width={32} height={32} className="shrink-0 transition-transform duration-300 group-hover:scale-[1.05]" />
            <span className="text-sm font-semibold">Whale Whois</span>
          </Link>
        </div>

        <div className="flex items-center gap-1">
          {showHistory && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onHistoryClick}
              aria-label="查询历史"
              className={cn("size-9 text-muted-foreground hover:text-foreground", isHistoryActive && "bg-accent/60 text-foreground")}
            >
              <History className="w-5 h-5" />
            </Button>
          )}
          
          <Link href="https://github.com/fishyu-yu/whois" target="_blank" aria-label="打开 GitHub 仓库">
            <Button variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-foreground">
              <Github className="w-5 h-5" />
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
