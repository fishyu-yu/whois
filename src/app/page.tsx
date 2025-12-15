/**
 * 文件：src/app/page.tsx
 * 用途：首页组件，集成 WhoisForm 和 WhoisResult
 * 修改记录：
 * - 2025-12-15: 重构为现代 UI 风格，添加动态背景和布局
 */
"use client"

import { useState, useEffect } from "react"
import { WhoisForm } from "@/components/whois-form"
import { WhoisResult } from "@/components/whois-result"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Github, History } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface WhoisData {
  query: string
  type: string
  result: any
  timestamp: string
}

interface HistoryItem {
  query: string
  type: string
  timestamp: string
}

const HISTORY_STORAGE_KEY = "whois_history"

export default function Home() {
  const [currentResult, setCurrentResult] = useState<WhoisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // 在地址栏中更新路径但不触发页面导航
  const updateURLPath = (q: string) => {
    try {
      const seg = encodeURIComponent((q || "").trim())
      if (!seg) return
      window.history.pushState(null, "", `/${seg}`)
    } catch {}
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
      if (raw) {
        const parsed: HistoryItem[] = JSON.parse(raw)
        setHistory(Array.isArray(parsed) ? parsed.slice(0, 20) : [])
      }
    } catch {}
  }, [])

  const saveHistory = (list: HistoryItem[]) => {
    setHistory(list)
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(list.slice(0, 20)))
    } catch {}
  }

  const addHistory = (item: HistoryItem) => {
    const deduped = [item, ...history.filter(h => !(h.query === item.query && h.type === item.type))]
    saveHistory(deduped.slice(0, 20))
  }

  const handleQuery = async (query: string, type: string) => {
    updateURLPath(query)
    setLoading(true)
    // Optional: Clear previous result to show transition clearly
    // setCurrentResult(null) 
    
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
        addHistory({ query, type, timestamp: errorData.timestamp })
        return
      }

      const result = await response.json()
      const resultData = result.data || result;

      const newData: WhoisData = {
        query,
        type,
        result: resultData,
        timestamp: new Date().toISOString(),
      }
      setCurrentResult(newData)
      addHistory({ query, type, timestamp: newData.timestamp })
      
    } catch (err) {
      console.error(err)
      const errorData: WhoisData = {
        query,
        type,
        result: { error: "网络请求失败" },
        timestamp: new Date().toISOString(),
      }
      setCurrentResult(errorData)
    } finally {
      setLoading(false)
    }
  }

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
        <header className="flex justify-between items-center mb-16 md:mb-24">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">
              W
            </div>
            <span className="font-bold text-xl tracking-tight">Whois<span className="text-primary">.Lookup</span></span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
             <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowHistory(!showHistory)}
              className={cn("transition-colors rounded-full", showHistory && "bg-secondary text-secondary-foreground")}
            >
              <History className="w-5 h-5" />
            </Button>
            <Link href="https://github.com/FishYu/whois" target="_blank">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Github className="w-5 h-5" />
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center w-full max-w-5xl mx-auto transition-all duration-500">
          
          <div className={cn(
            "text-center space-y-6 mb-12 transition-all duration-700 w-full ease-out",
            currentResult ? "translate-y-0" : "translate-y-[10vh]"
          )}>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70 pb-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
              探索域名的<br className="md:hidden" /> <span className="text-gradient">数字足迹</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">
              极速查询域名、IP 地址和 ASN 信息。深入了解互联网基础设施的每一个角落。
            </p>

            <div className="pt-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
              <WhoisForm onSubmit={handleQuery} loading={loading} />
            </div>
          </div>

          {/* Result Area */}
          <div className={cn(
            "w-full transition-all duration-700 delay-100",
            currentResult ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12 pointer-events-none absolute"
          )}>
            {currentResult && (
               <WhoisResult 
                 data={currentResult} 
                 onExport={() => {}} 
                 onShare={() => {}} 
               />
            )}
          </div>
        </div>

        {/* History Sidebar/Overlay */}
        {showHistory && (
          <>
            <div className="fixed inset-0 bg-background/20 backdrop-blur-sm z-40" onClick={() => setShowHistory(false)} />
            <div className="fixed inset-y-0 right-0 w-80 bg-background/90 backdrop-blur-xl border-l border-border shadow-2xl z-50 p-6 transform transition-transform duration-300 animate-in slide-in-from-right">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  搜索历史
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>关闭</Button>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-100px)] custom-scrollbar pr-2">
                {history.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      handleQuery(item.query, item.type)
                      setShowHistory(false)
                    }}
                    className="w-full text-left p-3 rounded-xl hover:bg-secondary/50 transition-colors group border border-transparent hover:border-border/50"
                  >
                    <div className="font-medium group-hover:text-primary transition-colors truncate">{item.query}</div>
                    <div className="text-xs text-muted-foreground flex justify-between mt-1">
                      <span className="uppercase bg-secondary/30 px-1.5 py-0.5 rounded text-[10px]">{item.type}</span>
                      <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
                {history.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">暂无历史记录</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="py-8 text-center text-sm text-muted-foreground animate-in fade-in duration-1000 delay-500">
          <p>© {new Date().getFullYear()} Whale Education Co.,Ltd</p>
        </footer>
      </div>
    </main>
  )
}
