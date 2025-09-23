"use client"

import { useState } from "react"
import { Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface WhoisFormProps {
  onSubmit: (query: string, type: string) => void
  loading: boolean
}

export function WhoisForm({ onSubmit, loading }: WhoisFormProps) {
  const [query, setQuery] = useState("")
  const [queryType, setQueryType] = useState("auto")

  const detectQueryType = (input: string): string => {
    // IPv4 检测
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
    // IPv6 检测
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/
    // ASN 检测
    const asnRegex = /^AS\d+$/i
    // CIDR 检测
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
    // 域名检测
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

    if (ipv4Regex.test(input)) return "ipv4"
    if (ipv6Regex.test(input)) return "ipv6"
    if (asnRegex.test(input)) return "asn"
    if (cidrRegex.test(input)) return "cidr"
    if (domainRegex.test(input)) return "domain"
    return "unknown"
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    const detectedType = queryType === "auto" ? detectQueryType(query.trim()) : queryType
    onSubmit(query.trim(), detectedType)
  }

  const getQueryTypeBadge = (input: string) => {
    if (!input.trim()) return null
    const type = detectQueryType(input.trim())
    const typeLabels = {
      domain: "域名",
      ipv4: "IPv4",
      ipv6: "IPv6",
      asn: "ASN",
      cidr: "CIDR",
      unknown: "未知"
    }
    return (
      <Badge variant={type === "unknown" ? "destructive" : "secondary"}>
        {typeLabels[type as keyof typeof typeLabels]}
      </Badge>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">Whois 查询</CardTitle>
        <CardDescription className="text-sm sm:text-base">
          输入域名、IP地址、ASN号码或CIDR网段进行查询
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="例如: example.com, 8.8.8.8, AS15169, 192.168.1.0/24"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
                className="w-full text-sm sm:text-base"
              />
            </div>
            <Button 
              type="submit" 
              disabled={loading || !query.trim()}
              className="w-full sm:w-auto min-w-[100px]"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  查询中...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  查询
                </>
              )}
            </Button>
          </div>
          
          {query.trim() && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>检测到类型:</span>
              <Badge variant="secondary" className="text-xs">
                {detectQueryType(query.trim())}
              </Badge>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}