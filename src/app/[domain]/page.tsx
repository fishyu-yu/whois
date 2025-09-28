"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { WhoisResult } from "@/components/whois-result"
import { Button } from "@/components/ui/button"

interface WhoisData {
  query: string
  type: string
  result: any
  timestamp: string
}

export default function DomainPage() {
  const params = useParams()
  const domain = decodeURIComponent(String(params?.domain || ""))
  const [data, setData] = useState<WhoisData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!domain) return
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/whois", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: domain, type: "domain", dataSource: "rdap" }),
        })
        const json = await res.json()
        const whoisData: WhoisData = {
          query: domain,
          type: "domain",
          result: json?.data,
          timestamp: new Date().toISOString(),
        }
        setData(whoisData)
      } catch (err) {
        setData({ query: domain, type: "domain", result: { error: "查询失败" }, timestamp: new Date().toISOString() })
      } finally {
        setLoading(false)
      }
    })()
  }, [domain])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">查询对象: <code className="font-mono break-all">{domain}</code></h1>
        <Button asChild variant="outline" className="glass-active">
          <a href="/">返回首页</a>
        </Button>
      </div>
      <div className="glass-card glass-enter glass-hover w-full">
        <div className="p-6">
          {!data && (
            <div className="text-sm text-muted-foreground">正在加载查询结果...</div>
          )}
          {data && (
            <WhoisResult 
              data={data}
              onShare={() => {
                const url = new URL(`/${encodeURIComponent(domain)}`, window.location.origin).toString()
                navigator.clipboard.writeText(url).then(() => alert("链接已复制到剪贴板")).catch(() => alert("复制失败"))
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}