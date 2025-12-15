/**
 * 文件：src/app/[domain]/page.tsx
 * 用途：域名详情页组件
 * 修改记录：
 * - 2025-12-15: 重构为现代 UI 风格，匹配首页设计
 * - 2025-12-15: 使用 LayoutWrapper 和 Header 组件统一 UI
 */
"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { WhoisForm } from "@/components/whois-form"
import { WhoisResult } from "@/components/whois-result"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Header } from "@/components/header"

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
    <LayoutWrapper>
      <Header showBack={true} />

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
    </LayoutWrapper>
  )
}
