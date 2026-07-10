/**
 * 文件：src/app/page.tsx
 * 用途：首页组件，集成 WhoisForm 和 WhoisResult
 * 修改记录：
 * - 2025-12-15: 重构为现代 UI 风格，添加动态背景和布局
 * - 2025-12-15: 使用 LayoutWrapper 和 Header 组件统一 UI
 * - 2025-12-16: 极简主义设计重构
 */
"use client"

import { useState, useEffect } from "react"
import { WhoisForm } from "@/components/whois-form"
import { WhoisResult } from "@/components/whois-result"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { History, X, Clock, Database, ShieldCheck, Network, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

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
    <LayoutWrapper>
      <Header 
        showHistory={true} 
        onHistoryClick={() => setShowHistory(!showHistory)}
        isHistoryActive={showHistory}
      />

      <main className="flex w-full flex-1 flex-col items-center">
        
        {/* Search Section */}
        <section className={cn(
          "w-full px-4 transition-all duration-500 sm:px-6",
          currentResult 
            ? "mx-auto max-w-6xl pb-6 pt-8"
            : "mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center py-20 sm:py-28"
        )}>
          {!currentResult && (
             <div className="mb-10 max-w-3xl text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                  <span className="size-1.5 rounded-full bg-primary shadow-[0_0_0_4px_oklch(0.56_0.21_256/0.12)]" />
                  RDAP · WHOIS 网络信息查询
                </div>
                <h1 className="text-balance text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-6xl lg:text-7xl">
                  看清一个域名的
                  <span className="block text-primary">完整网络画像</span>
                </h1>
                <p className="text-balance mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  聚合注册信息、关键日期、域名状态与 DNS 数据，快速查询域名、IP 地址和 ASN。
                </p>
             </div>
          )}

          <div className={cn(
            "w-full transition-all duration-500",
            !currentResult && "animate-in fade-in slide-in-from-bottom-6 duration-700"
          )}>
            <WhoisForm onSubmit={handleQuery} loading={loading} defaultValue={currentResult?.query} />
          </div>

          {!currentResult && (
            <div className="mt-12 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { icon: Database, title: "结构化数据", description: "清晰呈现注册与解析信息" },
                { icon: Network, title: "多类型查询", description: "支持域名、IP 与 ASN" },
                { icon: ShieldCheck, title: "本地历史", description: "查询记录仅保存在浏览器" },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-border/70 bg-card/65 p-4 text-left backdrop-blur-sm">
                  <item.icon className="mb-3 size-4 text-primary" />
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          )}

          {!currentResult && history.length > 0 && (
             <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <span className="mr-1 text-xs font-medium text-muted-foreground">最近查询</span>
                {history.slice(0, 3).map((item, i) => (
                  <button 
                    key={i}
                    onClick={() => handleQuery(item.query, item.type)}
                    className="group inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {item.query}
                    <ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
             </div>
          )}
        </section>

        {/* Result Area */}
        <section className={cn(
          "w-full px-4 pb-12 transition-all duration-500 sm:px-6",
          currentResult ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12 pointer-events-none hidden"
        )}>
          {currentResult && (
              <WhoisResult 
                data={currentResult} 
                onExport={() => {}} 
                onShare={() => {}} 
              />
          )}
        </section>
      </main>

      {/* History Sidebar/Overlay - Apple Style */}
      <div className={cn(
        "fixed inset-0 z-50 transition-all duration-300",
        showHistory ? "visible" : "invisible pointer-events-none"
      )}>
        <div 
          className={cn(
            "absolute inset-0 bg-foreground/10 backdrop-blur-[2px] transition-opacity duration-300 dark:bg-black/40",
            showHistory ? "opacity-100" : "opacity-0"
          )} 
          onClick={() => setShowHistory(false)} 
        />
        
        <div className={cn(
          "absolute inset-y-0 right-0 w-full max-w-md transform border-l border-border bg-background/95 p-5 shadow-2xl backdrop-blur-xl transition-transform duration-300 sm:p-6",
          showHistory ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="mb-6 flex items-start justify-between border-b border-border/70 pb-5">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <Clock className="size-4 text-primary" />
                查询历史
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground">最近的 20 条查询保存在此设备</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="关闭历史记录" className="rounded-lg" onClick={() => setShowHistory(false)}>
              <X className="size-4" />
            </Button>
          </div>
          
          <div className="-mr-2 h-[calc(100vh-112px)] space-y-2 overflow-y-auto pr-2">
            {history.map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  handleQuery(item.query, item.type)
                  setShowHistory(false)
                }}
                className="group w-full rounded-xl border border-transparent p-3.5 text-left transition-colors hover:border-border hover:bg-card"
              >
                <div className="truncate font-mono text-sm font-semibold transition-colors group-hover:text-primary">{item.query}</div>
                <div className="mt-2 flex justify-between text-[11px] font-medium text-muted-foreground">
                  <span className="uppercase tracking-wider opacity-70">{item.type}</span>
                  <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
            {history.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-muted-foreground">
                 <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-muted">
                   <History className="size-4" />
                 </div>
                 <p className="text-sm font-medium text-foreground">暂无历史记录</p>
                 <p className="mt-1 text-xs">完成一次查询后会显示在这里</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  )
}
