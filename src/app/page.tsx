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
import { History, X, Search, Clock } from "lucide-react"
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

      <div className="flex-1 flex flex-col items-center w-full transition-all duration-700">
        
        {/* Search Section */}
        <div className={cn(
          "w-full px-4 transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
          currentResult 
            ? "pt-8 pb-4 max-w-5xl mx-auto" 
            : "flex-1 flex flex-col justify-center items-center -mt-20 max-w-3xl mx-auto"
        )}>
          {!currentResult && (
             <div className="text-center space-y-6 mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground">
                  Whois<span className="text-primary">.Lookup</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed font-light">
                  简洁、快速且全面的域名情报查询工具。
                </p>
             </div>
          )}

          <div className={cn(
            "w-full transition-all duration-500",
            !currentResult && "animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-100"
          )}>
            <WhoisForm onSubmit={handleQuery} loading={loading} defaultValue={currentResult?.query} />
          </div>

          {!currentResult && history.length > 0 && (
             <div className="mt-8 flex flex-wrap justify-center gap-2 animate-in fade-in duration-1000 delay-300">
                <span className="text-sm text-muted-foreground mr-2 py-1">最近查询：</span>
                {history.slice(0, 3).map((item, i) => (
                  <button 
                    key={i}
                    onClick={() => handleQuery(item.query, item.type)}
                    className="text-sm px-3 py-1 rounded-full bg-secondary/30 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.query}
                  </button>
                ))}
             </div>
          )}
        </div>

        {/* Result Area */}
        <div className={cn(
          "w-full px-4 pb-12 transition-all duration-700 delay-100",
          currentResult ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12 pointer-events-none hidden"
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

      {/* History Sidebar/Overlay - Apple Style */}
      <div className={cn(
        "fixed inset-0 z-50 transition-all duration-300",
        showHistory ? "visible" : "invisible pointer-events-none"
      )}>
        <div 
          className={cn(
            "absolute inset-0 bg-background/20 backdrop-blur-sm transition-opacity duration-300",
            showHistory ? "opacity-100" : "opacity-0"
          )} 
          onClick={() => setShowHistory(false)} 
        />
        
        <div className={cn(
          "absolute inset-y-0 right-0 w-full max-w-sm bg-background/80 backdrop-blur-xl border-l border-border shadow-2xl p-6 transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          showHistory ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-semibold text-xl tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              历史记录
            </h3>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary" onClick={() => setShowHistory(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="space-y-2 overflow-y-auto h-[calc(100vh-120px)] -mr-4 pr-4">
            {history.map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  handleQuery(item.query, item.type)
                  setShowHistory(false)
                }}
                className="w-full text-left p-4 rounded-2xl hover:bg-secondary/50 transition-all group border border-transparent hover:border-border/50"
              >
                <div className="font-medium text-lg group-hover:text-primary transition-colors truncate">{item.query}</div>
                <div className="text-xs text-muted-foreground flex justify-between mt-1 font-medium">
                  <span className="uppercase tracking-wider opacity-70">{item.type}</span>
                  <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
            {history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
                 <History className="w-12 h-12 mb-4 opacity-20" />
                 <p className="text-sm">暂无历史记录</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  )
}
