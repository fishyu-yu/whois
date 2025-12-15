"use client"

import { ReactNode } from "react"

export function LayoutWrapper({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen relative overflow-hidden bg-background selection:bg-primary/20">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 flex flex-col min-h-screen">
        {children}
        
        {/* Footer */}
        <footer className="py-8 text-center text-sm text-muted-foreground animate-in fade-in duration-1000 delay-500 mt-auto">
          <p>© {new Date().getFullYear()} Whale Education Co.,Ltd Copyright All</p>
        </footer>
      </div>
    </main>
  )
}
