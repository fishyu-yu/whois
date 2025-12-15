"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Github, ArrowLeft, History } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface HeaderProps {
  showBack?: boolean
  showHistory?: boolean
  onHistoryClick?: () => void
  isHistoryActive?: boolean
}

export function Header({ 
  showBack = false, 
  showHistory = false, 
  onHistoryClick, 
  isHistoryActive = false 
}: HeaderProps) {
  return (
    <header className="flex justify-between items-center mb-12 md:mb-20 h-16">
      <div className="flex items-center gap-4">
        {showBack && (
          <Button variant="ghost" size="icon" asChild className="rounded-full -ml-2">
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
        )}
        
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
            W
          </div>
          <span className="font-bold text-xl tracking-tight">
            Whois<span className="text-primary">.Lookup</span>
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {showHistory && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onHistoryClick}
            className={cn("transition-colors rounded-full", isHistoryActive && "bg-secondary text-secondary-foreground")}
          >
            <History className="w-5 h-5" />
          </Button>
        )}
        
        <Link href="https://github.com/FishYu/whois" target="_blank">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Github className="w-5 h-5" />
          </Button>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  )
}
