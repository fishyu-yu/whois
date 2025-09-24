"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2, Globe, Flag, Server, User, ExternalLink } from "lucide-react"
import { validateDomain, formatDomainDisplay } from "@/lib/domain-utils"

interface WhoisFormProps {
  onSubmit: (query: string, type: string, dataSource?: string) => void
  loading: boolean
}

export function WhoisForm({ onSubmit, loading }: WhoisFormProps) {
  const [query, setQuery] = useState("")
  const [queryType, setQueryType] = useState("auto")
  const [domainValidation, setDomainValidation] = useState<any>(null)

  const detectQueryType = (input: string): string => {
    // 域名检测 - 支持国际化域名和更多字符
    const domainRegex = /^[a-zA-Z0-9\u00a0-\uffff]([a-zA-Z0-9\u00a0-\uffff-]{0,61}[a-zA-Z0-9\u00a0-\uffff])?(\.[a-zA-Z0-9\u00a0-\uffff]([a-zA-Z0-9\u00a0-\uffff-]{0,61}[a-zA-Z0-9\u00a0-\uffff])?)*$|^xn--[a-zA-Z0-9-]+(\.[a-zA-Z0-9\u00a0-\uffff]([a-zA-Z0-9\u00a0-\uffff-]{0,61}[a-zA-Z0-9\u00a0-\uffff])?)*$/

    if (domainRegex.test(input)) return "domain"
    return "unknown"
  }

  const handleInputChange = (value: string) => {
    setQuery(value)
    
    // 如果输入看起来像域名，进行验证
    const detectedType = detectQueryType(value)
    if (detectedType === "domain" && value.trim()) {
      const validation = validateDomain(value.trim())
      setDomainValidation(validation)
    } else {
      setDomainValidation(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    const detectedType = queryType === "auto" ? detectQueryType(query.trim()) : queryType
    onSubmit(query.trim(), detectedType, "rdap")
  }

  const getQueryTypeBadge = (input: string) => {
    if (!input.trim()) return null
    const type = detectQueryType(input.trim())
    const typeLabels = {
      domain: "域名",
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
          输入域名进行查询
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="例如: example.com, google.com, github.com"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                disabled={loading}
                className="w-full text-sm sm:text-base"
              />
              
              {/* 域名验证信息显示 */}
              {domainValidation && (
                <div className="mt-2 space-y-2">
                  {domainValidation.isValid ? (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {domainValidation.type === 'domain' ? '根域名' : '子域名'}
                      </Badge>
                      
                      {domainValidation.isCCTLD && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Flag className="h-3 w-3" />
                          {domainValidation.country} (.{domainValidation.tld})
                        </Badge>
                      )}
                      
                      {domainValidation.isIDN && (
                        <Badge variant="outline">
                          国际化域名 (IDN)
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-red-600">
                      {domainValidation.errors.join(', ')}
                    </div>
                  )}
                  
                  {/* IDN转换显示 */}
                  {domainValidation.isValid && domainValidation.isIDN && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {domainValidation.unicode && (
                        <div>Unicode: {domainValidation.unicode}</div>
                      )}
                      {domainValidation.punycode && (
                        <div>Punycode: {domainValidation.punycode}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
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