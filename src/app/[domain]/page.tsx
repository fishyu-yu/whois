/**
 * 文件：src/app/[domain]/page.tsx
 * 用途：域名详情页组件
 * 修改记录：
 * - 2025-12-15: 重构为现代 UI 风格，匹配首页设计
 */
"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { WhoisForm } from "@/components/whois-form"
import { WhoisResult } from "@/components/whois-result"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Github } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface WhoisData {
  query: string
  type: string
  result: any
  timestamp: string
}

export default function DomainPage() {
  const [currentResult, setCurrentResult] = useState<WhoisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const routeParams = useParams()
  const domainParam = routeParams?.domain as string | string[] | undefined
  const domainSlug = Array.isArray(domainParam) ? domainParam.join("/") : domainParam
  const domain = domainSlug ? decodeURIComponent(domainSlug) : ""

  const handleQuery = async (query: string, type: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/whois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, type, dataSource: "rdap" }),
      });

      if (!response.ok) {
        let message = "查询失败"
        try {
          const err = await response.json()
          message = err?.error || err?.details || message
        } catch {}

        const errorData: WhoisData = {
          query,
          type,
          result: { error: message },
          timestamp: new Date().toISOString(),
        }
        setCurrentResult(errorData)
        return
      }

      const result = await response.json()
      const resultData = result.data || result;
      
      const whoisData: WhoisData = {
        query,
        type,
        result: resultData,
        timestamp: new Date().toISOString(),
      }
      setCurrentResult(whoisData)
    } catch {
      const errorData: WhoisData = {
        query,
        type,
        result: { error: "网络请求失败，请稍后重试" },
        timestamp: new Date().toISOString(),
      }
      setCurrentResult(errorData)
    } finally {
      setLoading(false)
      setHasSearched(true)
    }
  }

  useEffect(() => {
    if (domain && !hasSearched) {
      handleQuery(domain, "auto")
    }
  }, [domain, hasSearched])

  return (
    <main className="min-h-screen relative overflow-hidden bg-background selection:bg-primary/20">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 flex flex-col min-h-screen">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
           <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-full">
                <Link href="/">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
            </Button>
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">
                W
                </div>
                <span className="font-bold text-xl tracking-tight hidden sm:inline-block">Whois<span className="text-primary">.Lookup</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
             <Link href="https://github.com/FishYu/whois" target="_blank">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Github className="w-5 h-5" />
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center w-full max-w-5xl mx-auto">
          
          <div className="w-full mb-8">
             <WhoisForm onSubmit={handleQuery} loading={loading} defaultValue={domain} />
          </div>

          <div className="w-full transition-all duration-700">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground animate-pulse">
                    <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <p>正在查询 {domain} 的信息...</p>
                </div>
            ) : currentResult ? (
               <WhoisResult 
                 data={currentResult} 
                 onExport={() => {}} 
                 onShare={() => {}} 
               />
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <footer className="py-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Whale Education Co.,Ltd</p>
        </footer>
      </div>
    </main>
  )
}
