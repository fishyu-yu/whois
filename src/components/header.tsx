"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Github, ArrowLeft, History, Search } from "lucide-react"
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
    <header className={cn("sticky top-0 z-50 w-full glass", className)}>
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <Button variant="ghost" size="icon" asChild className="rounded-full -ml-2 text-muted-foreground hover:text-foreground">
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
          )}
          
          <Link href="/" className="flex items-center gap-2 group transition-opacity hover:opacity-80">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
              <Search className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg tracking-tight">
              Whois
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {showHistory && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onHistoryClick}
              className={cn("rounded-full text-muted-foreground hover:text-foreground transition-all", isHistoryActive && "bg-secondary text-foreground")}
            >
              <History className="w-5 h-5" />
            </Button>
          )}
          
          <Link href="https://github.com/FishYu/whois" target="_blank">
            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
              <Github className="w-5 h-5" />
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
