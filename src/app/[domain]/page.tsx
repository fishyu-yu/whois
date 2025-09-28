"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { WhoisForm } from "@/components/whois-form"
import { WhoisResult } from "@/components/whois-result"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Github, Clock, Trash2 } from "lucide-react"

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

export default function DomainPage() {
  const [currentResult, setCurrentResult] = useState<WhoisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])

  const routeParams = useParams()
  const domainParam = routeParams?.domain as string | string[] | undefined
  const domainSlug = Array.isArray(domainParam) ? domainParam.join("/") : domainParam
  // 为兼容旧代码的冗余引用，提供别名，避免运行时 ReferenceError
  const domain = domainSlug

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

  const clearHistory = () => {
    saveHistory([])
  }

  const handleQuery = async (query: string, type: string, dataSource?: string) => {
    // 更新地址栏路径，形如 /google.com，但不触发页面导航
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
      const whoisData: WhoisData = {
        query,
        type,
        result: result.data,
        timestamp: new Date().toISOString(),
      }

      setCurrentResult(whoisData)
      addHistory({ query, type, timestamp: whoisData.timestamp })
    } catch (error) {
      console.error("查询错误:", error)
      const errorData: WhoisData = {
        query,
        type,
        result: { error: "查询失败，请稍后重试" },
        timestamp: new Date().toISOString(),
      }
      setCurrentResult(errorData)
      addHistory({ query, type, timestamp: errorData.timestamp })
    } finally {
      setLoading(false)
    }
  }

  // 首次进入 /[domain]，自动发起查询（默认按域名类型）
  useEffect(() => {
    const q = decodeURIComponent(domainSlug || "")
    if (q) {
      // 初始访问无需再 pushState，当前路径已是 /q
      setTimeout(() => handleQuery(q, "domain"), 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainSlug])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 头部导航（整体居中、对称） */}
      <header className="safe-top">
        <div className="container mx-auto px-4">
          <div className="glass-nav glass-fade-in glass-hover rounded-[var(--radius-lg)] px-4 py-5 md:py-6">
            <div className="flex flex-col items-center gap-3">
              <h1 className="text-2xl font-bold text-center">Whois 查询工具</h1>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" asChild className="glass-active">
                  <a href="https://github.com/fishyu-yu/whois" target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4 mr-1" />
                    GitHub
                  </a>
                </Button>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容（垂直+水平居中） */}
      <main className="flex-1 px-4 py-8 safe-bottom">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 左侧：搜索与结果（更突出，占两列） */}
            <div className="md:col-span-2">
              <div className="glass-card glass-enter glass-hover w-full shadow-md rounded-[var(--radius-lg)] relative overflow-hidden">
                <div className="space-y-6 relative p-6">
                  {/* 卡片级加载遮罩 */}
                  {loading && (
                    <div
                      className="absolute inset-0 rounded-[var(--radius-lg)] z-20 glass-overlay glass-fade-in flex items-center justify-center"
                      aria-hidden
                    >
                      <div className="flex items-center gap-2 text-sm glass-chip px-4 py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground"></div>
                        正在查询，请稍候...
                      </div>
                    </div>
                  )}
                  <WhoisForm onSubmit={handleQuery} loading={loading} />
                  {!currentResult && (
                    <div className="p-4 rounded-[var(--radius-lg)] glass-panel text-sm text-muted-foreground glass-enter">
                      请输入域名进行查询，支持自动识别类型并展示结构化结果。
                    </div>
                  )}
                  <WhoisResult
                    data={currentResult}
                    onExport={() => currentResult && (function(data){
                      const exportData = {
                        query: data.query,
                        type: data.type,
                        result: data.result,
                        timestamp: data.timestamp,
                        exported_at: new Date().toISOString(),
                      }
                      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = `whois-${data.query}-${new Date().toISOString().split("T")[0]}.json`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      URL.revokeObjectURL(url)
                    })(currentResult)}
                    onShare={() => currentResult && (async function(data){
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: `Whois 查询结果 - ${data.query}`,
                            text: `查询对象: ${data.query}\n类型: ${data.type}\n时间: ${new Date(data.timestamp).toLocaleString()}`,
                            url: window.location.href,
                          })
                        } catch (error) {
                          console.error("分享失败:", error)
                        }
                      } else {
                        try {
                          await navigator.clipboard.writeText(window.location.href)
                          alert("链接已复制到剪贴板")
                        } catch (error) {
                          console.error("复制失败:", error)
                        }
                      }
                    })(currentResult)}
                  />
                </div>
              </div>
            </div>

            {/* 右侧：历史记录（粘性侧栏） */}
            <div className="md:col-span-1">
              <div className="md:sticky md:top-6 sm:static">
                <div className="glass-card glass-enter glass-hover w-full">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <h2 className="text-base font-semibold">查询历史</h2>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearHistory} 
                        disabled={history.length === 0 || loading} 
                        aria-disabled={history.length === 0 || loading}
                        className="glass-active"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />清空
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">仅在本地浏览器保存，点击可快速复查</p>
                    
                    {history.length === 0 ? (
                      <div className="text-sm text-muted-foreground glass-panel p-4 rounded-[var(--radius-lg)] text-center">
                        暂无历史记录
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {history.map((h, idx) => (
                          <div key={`${h.query}-${h.timestamp}-${idx}`} className="glass-panel glass-hover glass-active rounded-md p-3 transition-all duration-300">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3">
                              <button
                                className="text-left w-full sm:flex-1"
                                onClick={() => handleQuery(h.query, h.type)}
                                disabled={loading}
                                aria-label={`重新查询 ${h.query}`}
                              >
                                <div className="font-mono text-sm font-medium break-all">{h.query}</div>
                                <div className="text-xs text-muted-foreground mt-1">{new Date(h.timestamp).toLocaleString('zh-CN')}</div>
                              </button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleQuery(h.query, h.type)} 
                                disabled={loading}
                                className="glass-active shrink-0 w-full sm:w-auto"
                              >
                                重新查询
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

       {/* 页脚 */}
      <footer className="mt-8">
        <div className="container mx-auto px-4">
          <div className="glass-nav glass-fade-in glass-hover rounded-[var(--radius-lg)] px-4 py-6 text-center text-sm text-muted-foreground space-y-3 safe-bottom">
            <div className="space-y-1">
              <p>© 2025 Ryan Hang & Whale Education Co., Ltd. All rights reserved.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
              <a 
                href="https://github.com/fishyu-yu/whois" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors glass-active px-2 py-1 rounded"
              >
                <Github className="h-4 w-4" />
                GitHub 项目
              </a>
              <span className="hidden sm:inline">•</span>
              <span>基于 Next.js 和 Shadcn UI 构建</span>
              <span className="hidden sm:inline">•</span>
              <span>MIT Licensed</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}