/**
 * 文件：src/app/[domain]/page.tsx
 * 用途：域名详情页组件
 * 修改记录：
 * - 2025-12-15: 重构为现代 UI 风格，匹配首页设计
 * - 2025-12-15: 使用 LayoutWrapper 和 Header 组件统一 UI
 * - 2025-12-16: 极简主义设计重构
 */
"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { detectQueryType, WhoisForm } from "@/components/whois-form"
import { WhoisResult } from "@/components/whois-result"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Header } from "@/components/header"
import { Loader2, Search } from "lucide-react"

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
      const queryType = detectQueryType(domain)
      if (queryType === "unknown") {
        setCurrentResult({
          query: domain,
          type: queryType,
          result: { error: "无效的查询格式" },
          timestamp: new Date().toISOString(),
        })
        setHasSearched(true)
        return
      }

      handleQuery(domain, queryType)
    }
  }, [domain, hasSearched])

  return (
    <LayoutWrapper>
      <Header showBack={true} />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pb-12 pt-8 sm:px-6">
        <div className="loading-bridge mb-8 w-full pt-1">
            <div className="mb-3 flex items-center gap-2 px-1 text-sm font-medium text-muted-foreground">
              <Search className="size-4" />
              继续查询
            </div>
            <WhoisForm onSubmit={handleQuery} loading={loading} defaultValue={domain} />
        </div>

        <div className="min-h-[400px] w-full transition-all duration-500">
          {loading ? (
              <div className="quiet-surface loading-bridge flex flex-col items-center justify-center gap-5 rounded-lg py-24 text-muted-foreground">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-muted">
                    <Loader2 className="size-5 animate-spin text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">正在查询 {domain}</p>
                    <p className="mt-1 text-sm">正在连接 RDAP 数据源并整理结果</p>
                  </div>
              </div>
          ) : currentResult ? (
              <WhoisResult 
                key={`${currentResult.query}-${currentResult.timestamp}`}
                data={currentResult} 
                onExport={() => {}} 
                onShare={() => {}} 
              />
          ) : null}
        </div>
      </main>
    </LayoutWrapper>
  )
}
