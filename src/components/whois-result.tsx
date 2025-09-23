"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Copy, Download, Share2, Clock, Globe, Server, Flag, User, ExternalLink } from "lucide-react"
import { formatDomainDisplay } from "@/lib/domain-utils"

interface WhoisResultProps {
  data: any
  onExport?: () => void
  onShare?: () => void
}

export function WhoisResult({ data, onExport, onShare }: WhoisResultProps) {
  if (!data || !data.result) return null

  // 可能的形态：
  // 1) 扁平：{ raw, parsed, dataSource, ... }
  // 2) 包在 data 内：{ data: { raw, parsed } }
  // 3) 模拟数据：{ dataSource: 'mock', result: { raw, parsed } }
  const result = data.result

  // 先定位有效的 raw/parsed 容器
  const effective = (result && (result.raw || result.parsed))
    ? result
    : (result?.result && (result.result.raw || result.result.parsed))
      ? result.result
      : (result?.data && (result.data.raw || result.data.parsed))
        ? result.data
        : null

  const parsed = effective?.parsed || null
  const raw = effective?.raw || ""

  // 统一字段名（兼容 snake_case 与 camelCase，以及 .cn 模拟字段）
  const normalized = {
    domain: parsed?.domain || parsed?.domain_name,
    registrar: parsed?.registrar || parsed?.sponsoring_registrar,
    registrationDate: parsed?.registrationDate || parsed?.creation_date || parsed?.registration_time,
    expirationDate: parsed?.expirationDate || parsed?.registry_expiry_date || parsed?.expiration_time,
    nameServers: (() => {
      const ns = parsed?.nameServers || parsed?.name_server || parsed?.name_servers
      if (!ns) return []
      return Array.isArray(ns) ? ns : [ns]
    })(),
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // 来源徽章
  const resolveDataSource = () => {
    // dataSource 只在外层 result 上（模拟/真实都有），某些情况下可能缺失
    return result?.dataSource || data?.dataSource || "auto"
  }

  const source = resolveDataSource()

  const getDataSourceIcon = (dataSource: string) => {
    switch (dataSource) {
      case 'rdap-registry':
      case 'registry':
        return <Flag className="h-4 w-4" />
      case 'rdap-registrar':
      case 'registrar':
        return <User className="h-4 w-4" />
      case 'rdap':
        return <ExternalLink className="h-4 w-4" />
      case 'whois':
      case 'standard':
        return <Server className="h-4 w-4" />
      case 'mock':
        return <Globe className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  const getDataSourceLabel = (dataSource: string) => {
    switch (dataSource) {
      case 'rdap-registry':
        return 'RDAP 注册局'
      case 'rdap-registrar':
        return 'RDAP 注册商'
      case 'registry':
        return '注册局'
      case 'registrar':
        return '注册商'
      case 'rdap':
        return 'RDAP'
      case 'whois':
        return '传统 WHOIS'
      case 'standard':
        return '标准查询'
      case 'mock':
        return '模拟数据'
      case 'auto':
        return '自动选择'
      default:
        return '未知来源'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
             <CardTitle className="text-xl">查询结果</CardTitle>
             <CardDescription className="flex items-center gap-2 mt-2">
               <Clock className="h-4 w-4" />
               {new Date(result.timestamp || data.timestamp).toLocaleString('zh-CN')}
             </CardDescription>
           </div>
           <div className="flex items-center gap-2">
             <Badge variant="secondary" className="flex items-center gap-1">
               {getDataSourceIcon(source)}
               {getDataSourceLabel(source)}
             </Badge>
           </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 查询信息 */}
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Globe className="h-4 w-4" />
          <span className="font-medium">查询目标:</span>
          <code className="bg-background px-2 py-1 rounded text-sm">{data.query}</code>
        </div>

        {/* 错误处理 */}
        {result.error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive font-medium">查询失败</p>
            <p className="text-sm text-muted-foreground mt-1">{result.error}</p>
          </div>
        )}

        {/* 成功结果 */}
        {!result.error && (parsed || raw) && (
          <div className="space-y-4">
            {/* 解析后的数据 */}
            {parsed && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  域名信息
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {normalized.domain && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">域名</label>
                      <p className="font-mono text-sm bg-muted p-2 rounded">{normalized.domain}</p>
                    </div>
                  )}
                  
                  {normalized.registrar && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">注册商</label>
                      <p className="text-sm bg-muted p-2 rounded">{normalized.registrar}</p>
                    </div>
                  )}
                  
                  {normalized.registrationDate && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">注册日期</label>
                      <p className="text-sm bg-muted p-2 rounded">{normalized.registrationDate}</p>
                    </div>
                  )}
                  
                  {normalized.expirationDate && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">过期日期</label>
                      <p className="text-sm bg-muted p-2 rounded">{normalized.expirationDate}</p>
                    </div>
                  )}
                  
                  {normalized.nameServers && normalized.nameServers.length > 0 && (
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">名称服务器</label>
                      <div className="bg-muted p-2 rounded">
                        {normalized.nameServers.map((ns: string, index: number) => (
                          <p key={index} className="font-mono text-sm">{ns}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* 原始数据 */}
            {raw && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">原始数据</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(raw)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    复制
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
                  {raw}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
          <Button variant="outline" size="sm" onClick={onShare}>
            <Share2 className="h-4 w-4 mr-1" />
            分享
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}