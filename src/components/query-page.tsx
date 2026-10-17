/**
 * 首页和分享链接共用的查询页面。保留 URL、查询规范化与本地历史的数据流。
 */
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { usePathname } from "next/navigation"
import dynamic from "next/dynamic"
import { WhoisForm } from "@/components/whois-form"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Header } from "@/components/header"
import { HistoryPanel, type HistoryItem } from "@/components/history-panel"
import { ArrowUpRight, Loader2, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { detectQueryType } from "@/lib/query-utils"
import { normalizeQueryInput, queryFromPath, queryPath } from "@/lib/query-path"

interface WhoisData {
  query: string
  type: string
  result: any
  timestamp: string
}

const HISTORY_STORAGE_KEY = "whois_history"
const WhoisResult = dynamic(() => import("@/components/whois-result").then(module => module.WhoisResult), {
  loading: () => <p role="status" className="mx-auto max-w-5xl rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">正在准备查询结果…</p>,
})

export function QueryPage() {
  const pathname = usePathname()
  const [currentResult, setCurrentResult] = useState<WhoisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeQuery, setActiveQuery] = useState("")
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const handledQuery = useRef("")
  const requestId = useRef(0)
  const activeRequest = useRef<AbortController | null>(null)
  const isCompact = loading || Boolean(currentResult)

  // 更新地址栏而不触发路由重载，前进/后退仍由 usePathname 同步。
  const updateURLPath = (query: string, mode: "push" | "replace") => {
    const path = queryPath(query)
    if (window.location.pathname !== path) {
      window.history[mode === "push" ? "pushState" : "replaceState"](null, "", path)
    }
  }

  useEffect(() => {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]")
      if (Array.isArray(parsed)) {
        setHistory(parsed.filter((item): item is HistoryItem =>
          Boolean(item && typeof item.query === "string" && typeof item.type === "string" && typeof item.timestamp === "string")
        ).slice(0, 20))
      }
    } catch { /* 历史记录不可用时仍可正常查询。 */ }
    return () => {
      // Invalidate the latest numeric request sequence, rather than a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestId.current++
      handledQuery.current = ""
      activeRequest.current?.abort()
    }
  }, [])

  const handleQuery = useCallback(async (input: string, type: string, dataSource = "auto", mode: "push" | "replace" = "push") => {
    const query = normalizeQueryInput(input)
    const id = ++requestId.current
    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    handledQuery.current = query
    const addHistory = (item: HistoryItem) => setHistory(previous => {
      const list = [item, ...previous.filter(h => !(h.query === item.query && h.type === item.type))].slice(0, 20)
      try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(list)) } catch {}
      return list
    })
    updateURLPath(query, mode)
    setActiveQuery(query)
    setLoading(true)
    // Load result presentation alongside the actual request, keeping it off the
    // home page's critical path without delaying a fast API response.
    void import("@/components/whois-result").catch(() => {})

    try {
      const response = await fetch("/api/whois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, type, dataSource }),
        signal: controller.signal,
      })
      if (id !== requestId.current) return

      if (!response.ok) {
        let message = "查询失败"
        try {
          const error = await response.json()
          message = error?.error || error?.details || message
        } catch {}
        if (id !== requestId.current) return
        const errorData: WhoisData = { query, type, result: { error: message }, timestamp: new Date().toISOString() }
        setCurrentResult(errorData)
        addHistory({ query, type, timestamp: errorData.timestamp })
        return
      }

      const result = await response.json()
      if (id !== requestId.current) return
      const canonicalQuery = result.query || query
      handledQuery.current = canonicalQuery
      setActiveQuery(canonicalQuery)
      updateURLPath(canonicalQuery, "replace")
      const newData: WhoisData = {
        query: canonicalQuery,
        type: result.type || type,
        result: result.data || result,
        timestamp: new Date().toISOString(),
      }
      setCurrentResult(newData)
      addHistory({ query: canonicalQuery, type: newData.type, timestamp: newData.timestamp })
    } catch (error) {
      if (id !== requestId.current || controller.signal.aborted) return
      console.error(error)
      setCurrentResult({ query, type, result: { error: "网络请求失败" }, timestamp: new Date().toISOString() })
    } finally {
      if (id === requestId.current) {
        setLoading(false)
        activeRequest.current = null
      }
    }
  }, [])

  useEffect(() => {
    const query = normalizeQueryInput(queryFromPath(pathname))
    if (query) {
      if (query !== handledQuery.current) void handleQuery(query, detectQueryType(query), "auto", "replace")
    } else {
      requestId.current++
      activeRequest.current?.abort()
      activeRequest.current = null
      handledQuery.current = ""
      setActiveQuery("")
      setCurrentResult(null)
      setLoading(false)
    }
  }, [pathname, handleQuery])

  return (
    <LayoutWrapper>
      <Header showHistory onHistoryClick={() => setShowHistory(previous => !previous)} isHistoryActive={showHistory} />
      <main id="main-content" className="flex min-w-0 w-full flex-1 flex-col items-center" data-view={isCompact ? "result" : "home"}>
        <section aria-label="Whois 查询" data-state={isCompact ? "compact" : "open"} className={cn(
          "view-shell mx-auto w-full max-w-5xl px-4 sm:px-6",
          "flex flex-col items-center"
        )}>
            <div className="hero-transition w-full text-center" data-state={isCompact ? "compact" : "open"} aria-hidden={isCompact} inert={isCompact}>
              <div className="overflow-hidden">
              <p className="mb-5 text-xs font-medium tracking-[0.18em] text-primary">Whale Whois</p>
              <h1 aria-label="Whois 查询" className="text-balance text-[clamp(1.875rem,4.2vw,3.25rem)] font-medium leading-[1.25] tracking-tight text-foreground">
                探索域名与网络信息
              </h1>
              <p className="mx-auto mt-5 max-w-lg text-balance text-sm leading-7 text-muted-foreground sm:text-base">
                每一个地址，都有迹可循。<br className="sm:hidden" />输入域名、IP、CIDR 或 ASN，<br className="hidden sm:block" />
                清晰了解背后的注册与网络信息。
              </p>
              </div>
            </div>
          <div className="search-dock mx-auto w-full max-w-3xl">
            <WhoisForm onSubmit={handleQuery} loading={loading} defaultValue={activeQuery} compact={isCompact} />
          </div>
          {!isCompact && (
            <>
              {history.length > 0 && (
                <nav aria-label="最近查询" className="history-transition mt-7 flex max-w-2xl flex-wrap items-center justify-center gap-1.5">
                  <span className="mr-1 text-xs text-muted-foreground">最近查询</span>
                  {history.slice(0, 3).map(item => (
                    <button key={`${item.type}-${item.query}`} type="button" onClick={() => void handleQuery(item.query, item.type)}
                      className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-lg px-3 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                      <span className="break-all font-mono">{item.query}</span><ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
                    </button>
                  ))}
                </nav>
              )}
              <div className="feature-transition mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs leading-5 text-muted-foreground sm:mt-12">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5" aria-hidden="true" />RDAP 优先 · WHOIS 回退</span>
                <span>支持 IPv4 / IPv6 与中文域名</span>
              </div>
            </>
          )}
        </section>

        {isCompact && (
          <section aria-label="查询结果" className="result-stage w-full min-w-0 px-4 pb-10 sm:px-6 sm:pb-14">
            {loading ? (
              <div role="status" className="loading-bridge mx-auto flex w-full max-w-5xl items-center gap-4 rounded-2xl border border-border bg-card p-6 sm:p-8">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Loader2 className="size-5 animate-spin" aria-hidden="true" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">正在查询</p>
                  <p className="mt-1 break-all font-mono text-sm text-muted-foreground">{activeQuery}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">正在获取注册信息，你可以随时开始下一次查询。</p>
                </div>
              </div>
            ) : currentResult && (
              <WhoisResult key={`${currentResult.query}-${currentResult.timestamp}`} data={currentResult} />
            )}
          </section>
        )}
      </main>
      <HistoryPanel open={showHistory} onClose={() => setShowHistory(false)} history={history} activeQuery={activeQuery}
        onSelect={item => { setShowHistory(false); void handleQuery(item.query, item.type) }} />
    </LayoutWrapper>
  )
}
