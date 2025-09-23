"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n"

const isBrowser = typeof window !== "undefined"

type QueryType = "domain" | "ipv4" | "ipv6" | "asn" | "cidr"

function normalizeTarget(input: string) {
  return input.trim()
}

export default function Page() {
  const { t, lang, setLang } = useI18n()
  const [type, setType] = useState<QueryType>("domain")
  const [target, setTarget] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const controllerRef = useRef<AbortController | null>(null)

  const historyKey = "whois.history.v1"
  const [history, setHistory] = useState<{ type: QueryType; target: string; at: number }[]>([])

  useEffect(() => {
    if (!isBrowser) return
    try {
      const raw = localStorage.getItem(historyKey)
      if (raw) setHistory(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    if (!isBrowser) return
    localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 100)))
  }, [history])

  async function onQuery() {
    const q = normalizeTarget(target)
    if (!q) return toast.error(lang === "zh" ? "请输入查询对象" : "Please enter a query")

    controllerRef.current?.abort()
    controllerRef.current = new AbortController()

    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/whois?type=${type}&q=${encodeURIComponent(q)}`, {
        signal: controllerRef.current.signal,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || (lang === "zh" ? "查询失败" : "Query failed"))
      setResult(data)
      setHistory((prev) => [{ type, target: q, at: Date.now() }, ...prev.filter((h) => !(h.type === type && h.target === q))])
    } catch (e: any) {
      if (e?.name === "AbortError") return
      toast.error(e?.message || (lang === "zh" ? "请求失败" : "Request failed"))
    } finally {
      setLoading(false)
    }
  }

  function onFillFromHistory(item: { type: QueryType; target: string }) {
    setType(item.type)
    setTarget(item.target)
  }

  function exportJSON() {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `whois-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function shareResult() {
    if (!result) return
    const text = `Whois Result\nType: ${type}\nTarget: ${target}\n\n${JSON.stringify(result, null, 2)}`
    if (navigator.share) {
      navigator.share({ title: "Whois Result", text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text)
      toast.success(lang === "zh" ? "结果已复制到剪贴板" : "Copied to clipboard")
    }
  }

  return (
    <main className="container mx-auto max-w-4xl p-4 md:p-8">
      <div className="mb-4 flex items-center justify-end gap-2 text-sm">
        <Button variant="outline" size="sm" onClick={() => setLang(lang === "zh" ? "en" : "zh")}>
          {lang === "zh" ? "English" : "中文"}
        </Button>
      </div>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={type} onValueChange={(v) => setType(v as QueryType)} className="w-full">
            <TabsList className="grid grid-cols-5 gap-2">
              <TabsTrigger value="domain">域名</TabsTrigger>
              <TabsTrigger value="ipv4">IPv4</TabsTrigger>
              <TabsTrigger value="ipv6">IPv6</TabsTrigger>
              <TabsTrigger value="asn">ASN</TabsTrigger>
              <TabsTrigger value="cidr">CIDR</TabsTrigger>
            </TabsList>
            <TabsContent value="domain" className="mt-4" />
            <TabsContent value="ipv4" className="mt-4" />
            <TabsContent value="ipv6" className="mt-4" />
            <TabsContent value="asn" className="mt-4" />
            <TabsContent value="cidr" className="mt-4" />
          </Tabs>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <Input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={
                type === "domain"
                  ? "例如: example.com"
                  : type === "ipv4"
                  ? "例如: 8.8.8.8"
                  : type === "ipv6"
                  ? "例如: 2001:4860:4860::8888"
                  : type === "asn"
                  ? "例如: AS15169 或 15169"
                  : "例如: 8.8.8.0/24"
              }
              onKeyDown={(e) => e.key === "Enter" && onQuery()}
            />
            <Button onClick={onQuery} disabled={loading} className="md:w-28">
              {loading ? (lang === "zh" ? "查询中..." : "Querying...") : t("query")}
            </Button>
          </div>

          {result && (
            <div className="mt-6 space-y-3">
              <div className="flex gap-2">
                <Button variant="secondary" onClick={exportJSON}>
                  {t("exporting")}
                </Button>
                <Button variant="secondary" onClick={shareResult}>
                  {t("share")}
                </Button>
              </div>
              <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-4 text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("history")}</CardTitle>
          <CardDescription>{lang === "zh" ? "最近的查询（本地存储）" : "Recent queries (local)"}</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noHistory")}</p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 20).map((h, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-md border p-2">
                  <div className="text-sm">
                    <span className="font-medium mr-2">{h.type.toUpperCase()}</span>
                    <span className="text-muted-foreground">{h.target}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => onFillFromHistory(h)}>
                    {t("fill")}
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setHistory([])}>
                  {t("clear")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
