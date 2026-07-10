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
  const [activeQuery, setActiveQuery] = useState("")
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const isCompact = loading || Boolean(currentResult)

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
    setActiveQuery(query)
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
          "view-shell w-full px-4 sm:px-6",
          isCompact
            ? "mx-auto max-w-6xl pb-4 pt-8"
            : "mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center py-20 sm:py-28"
        )}>
          <div
            data-state={isCompact ? "compact" : "open"}
            className="hero-transition mb-10 max-w-4xl text-center"
            aria-hidden={isCompact}
          >
                <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  <span className="size-1.5 rounded-full bg-primary" />
                  RDAP / WHOIS
                </div>
                <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                  查清域名背后的
                  <span className="block text-primary">注册与网络信号</span>
                </h1>
                <p className="text-balance mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  聚合注册信息、关键日期、域名状态与 DNS 数据，快速查询域名、IP 地址和 ASN。
                </p>
          </div>

          <div className={cn(
            "search-dock w-full",
            isCompact ? "max-w-4xl" : "max-w-none"
          )}>
            <WhoisForm onSubmit={handleQuery} loading={loading} defaultValue={currentResult?.query} />
          </div>

          <div
            data-state={isCompact ? "compact" : "open"}
            className="feature-transition mt-12 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3"
            aria-hidden={isCompact}
          >
              {[
                { icon: Database, title: "结构化数据", description: "清晰呈现注册与解析信息" },
                { icon: Network, title: "多类型查询", description: "支持域名、IP 与 ASN" },
                { icon: ShieldCheck, title: "本地历史", description: "查询记录仅保存在浏览器" },
              ].map((item) => (
                <div key={item.title} className="panel rounded-lg p-4 text-left">
                  <div className="mb-3 flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                    <item.icon className="size-4 text-primary" />
                  </div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                </div>
              ))}
          </div>

          {history.length > 0 && (
             <div
               data-state={isCompact ? "compact" : "open"}
               className="history-transition mt-6 flex flex-wrap items-center justify-center gap-2"
               aria-hidden={isCompact}
             >
                <span className="mr-1 text-xs font-medium text-muted-foreground">最近查询</span>
                {history.slice(0, 3).map((item, i) => (
                  <button 
                    key={i}
                    onClick={() => handleQuery(item.query, item.type)}
                    className="group inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/45 hover:text-foreground"
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
          "result-stage w-full px-4 pb-12 sm:px-6",
          loading || currentResult ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}>
          {loading && (
            <div className="mx-auto mb-6 w-full max-w-6xl">
              <div className="panel loading-bridge overflow-hidden rounded-lg p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">正在整理网络信号</p>
                    <p className="mt-2 truncate font-mono text-lg font-semibold">{activeQuery || "查询中"}</p>
                  </div>
                  <div className="signal-loader" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            </div>
          )}
          {currentResult && (
              <WhoisResult 
                key={`${currentResult.query}-${currentResult.timestamp}`}
                data={currentResult} 
                onExport={() => {}} 
                onShare={() => {}} 
              />
          )}
        </section>
      </main>

      {/* History Sidebar/Overlay */}
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
          "panel absolute inset-y-0 right-0 w-full max-w-md transform rounded-none border-y-0 border-r-0 p-5 shadow-2xl transition-transform duration-300 sm:p-6",
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
            <Button variant="ghost" size="icon" aria-label="关闭历史记录" onClick={() => setShowHistory(false)}>
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
                className="group w-full rounded-lg border border-transparent p-3.5 text-left transition-colors hover:border-border hover:bg-card/70"
              >
                <div className="truncate font-mono text-sm font-semibold transition-colors group-hover:text-primary">{item.query}</div>
                <div className="mt-2 flex justify-between text-[11px] font-medium text-muted-foreground">
                  <span className="uppercase tracking-wider opacity-70">{item.type}</span>
                  <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
            {history.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-muted-foreground">
                 <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted">
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
