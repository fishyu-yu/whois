"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Copy, Download, Share2, Clock, Globe, Server, Flag, User, ExternalLink } from "lucide-react"
import { formatDomainDisplay } from "@/lib/domain-utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useState } from "react"

// RDAP/EPP 域名状态字典（中文说明 + 严重程度用于排序）
const STATUS_INFO: Record<string, { label: string; severity: number }> = {
  ok: { label: "正常", severity: 0 },
  active: { label: "活跃", severity: 0 },
  clientHold: { label: "客户端暂停解析", severity: 3 },
  serverHold: { label: "服务端暂停解析", severity: 3 },
  redemptionPeriod: { label: "赎回期", severity: 3 },
  pendingDelete: { label: "等待删除", severity: 3 },
  inactive: { label: "未激活", severity: 2 },
  clientDeleteProhibited: { label: "客户端禁止删除", severity: 1 },
  serverDeleteProhibited: { label: "服务端禁止删除", severity: 1 },
  clientUpdateProhibited: { label: "客户端禁止更新", severity: 1 },
  serverUpdateProhibited: { label: "服务端禁止更新", severity: 1 },
  clientRenewProhibited: { label: "客户端禁止续费", severity: 1 },
  serverRenewProhibited: { label: "服务端禁止续费", severity: 1 },
  clientTransferProhibited: { label: "客户端禁止转移", severity: 2 },
  serverTransferProhibited: { label: "服务端禁止转移", severity: 2 },
  pendingCreate: { label: "等待创建", severity: 1 },
  pendingRenew: { label: "等待续费", severity: 1 },
  pendingTransfer: { label: "等待转移", severity: 1 },
  pendingUpdate: { label: "等待更新", severity: 1 },
  pendingRestore: { label: "等待恢复", severity: 2 },
  autoRenewPeriod: { label: "自动续费宽限期", severity: 0 },
  renewPeriod: { label: "续费宽限期", severity: 0 },
  addPeriod: { label: "新增宽限期", severity: 0 },
  transferPeriod: { label: "转移宽限期", severity: 0 },
  locked: { label: "锁定", severity: 2 },
}

const getStatusInfo = (code: string) => {
  const normalizedCode = (code || "").trim()
  const info = STATUS_INFO[normalizedCode]
  if (info) return { code: normalizedCode, ...info }
  return { code: normalizedCode, label: "未知状态", severity: 1 }
}

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
     domainStatus: (() => {
       const st = parsed?.domainStatus || parsed?.domain_status || parsed?.status
       if (!st) return []
       return Array.isArray(st) ? st : [st]
     })()
   }
 
   const sortedStatuses = (normalized.domainStatus || [])
     .map((s: string) => getStatusInfo(s))
     .sort((a, b) => b.severity - a.severity || a.code.localeCompare(b.code))
 
   const copyToClipboard = (text: string) => {
     navigator.clipboard.writeText(text)
   }

  // 来源徽章
  const resolveDataSource = () => {
    // dataSource 只在外层 result 上（模拟/真实都有），某些情况下可能缺失
    return result?.dataSource || data?.dataSource || "auto"
  }

  const source = resolveDataSource()

  // 折叠状态：默认收起
  const [showRegistrarRaw, setShowRegistrarRaw] = useState(false)
  const [showRegistryRaw, setShowRegistryRaw] = useState(false)

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
        {!result.error && (parsed || raw) ? (
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
                      <label className="text-sm font-medium text-muted-foreground">到期日期</label>
                      <p className="text-sm bg-muted p-2 rounded">{normalized.expirationDate}</p>
                    </div>
                  )}

                  {normalized.nameServers && normalized.nameServers.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">名称服务器</label>
                      <div className="space-y-2">
                        {normalized.nameServers.map((ns: string, idx: number) => (
                          <p key={idx} className="text-sm bg-muted p-2 rounded">{ns}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {sortedStatuses && sortedStatuses.length > 0 ? (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">域名状态</label>
                      <div className="flex flex-wrap gap-2">
                        <TooltipProvider>
                          {sortedStatuses.map((s, idx) => (
                            <Tooltip key={`${s.code}-${idx}`}>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-xs">
                                  {s.code}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{s.label}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </TooltipProvider>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* 联系人信息 */}
                {(() => {
                  const contacts = {
                    registrant: {
                      name: parsed?.registrant_name,
                      organization: parsed?.registrant_organization,
                      email: parsed?.registrant_email,
                      phone: parsed?.registrant_phone,
                      country: parsed?.registrant_country,
                    },
                    administrative: {
                      name: parsed?.admin_name,
                      organization: parsed?.admin_organization,
                      email: parsed?.admin_email,
                      phone: parsed?.admin_phone,
                      country: (parsed as any)?.admin_country,
                    },
                    technical: {
                      name: parsed?.tech_name,
                      organization: parsed?.tech_organization,
                      email: parsed?.tech_email,
                      phone: parsed?.tech_phone,
                      country: (parsed as any)?.tech_country,
                    },
                    billing: {
                      name: parsed?.billing_name,
                      organization: parsed?.billing_organization,
                      email: parsed?.billing_email,
                      phone: parsed?.billing_phone,
                      country: parsed?.billing_country,
                    },
                  }
                  const hasAny = Object.values(contacts).some((c: any) => c && (c.name || c.organization || c.email || c.phone || c.country))
                  if (!hasAny) return null

                  const renderContactBlock = (title: string, c: any) => {
                    const fields = [
                      { label: '姓名', value: c?.name },
                      { label: '组织', value: c?.organization },
                      { label: '邮箱', value: c?.email },
                      { label: '电话', value: c?.phone },
                      { label: '国家/地区', value: c?.country },
                    ].filter(f => f.value)
                    if (fields.length === 0) return null
                    return (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground">{title}</label>
                        <div className="space-y-2">
                          {fields.map((f, idx) => (
                            <p key={idx} className="text-sm bg-muted p-2 rounded">
                              <span className="font-medium mr-2">{f.label}</span>
                              {f.value}
                            </p>
                          ))}
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <User className="h-4 w-4" />
                        联系人信息
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderContactBlock('注册人', contacts.registrant)}
                        {renderContactBlock('行政联系人', contacts.administrative)}
                        {renderContactBlock('技术联系人', contacts.technical)}
                        {renderContactBlock('账单联系人', contacts.billing)}
                      </div>
                    </div>
                  )
                })()}

              </div>
            )}

            <Separator />

            {sortedStatuses && sortedStatuses.length > 0 ? (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">状态概览</h3>
                <div className="flex flex-wrap gap-2">
                  <TooltipProvider>
                    {sortedStatuses.map((s, idx) => (
                      <Tooltip key={`overview-${s.code}-${idx}`}>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="text-xs">
                            {s.code}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{s.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                </div>
              </div>
            ) : null}

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

                {/* 新增：原始注册服务机构 RDAP 响应 */}
                {(() => {
                  // 向下兼容：字段可能在不同层级
                  const registrarRaw = result?.rdapRegistrarRaw || effective?.rdapRegistrarRaw || result?.result?.rdapRegistrarRaw || null
                  if (!registrarRaw) return null
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-base">原始注册服务机构 RDAP 响应</h4>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowRegistrarRaw(!showRegistrarRaw)}
                            aria-expanded={showRegistrarRaw}
                            aria-controls="registrar-rdap-raw"
                          >
                            {showRegistrarRaw ? "收起" : "展开"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => copyToClipboard(JSON.stringify(registrarRaw, null, 2))}>
                            <Copy className="h-4 w-4 mr-1" />复制
                          </Button>
                        </div>
                      </div>
                      {showRegistrarRaw && (
                        <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto whitespace-pre" id="registrar-rdap-raw">
                          {JSON.stringify(registrarRaw, null, 2)}
                        </pre>
                      )}
                    </div>
                  )
                })()}

                {/* 新增：原始注册管理机构 RDAP 响应 */}
                {(() => {
                  const registryRaw = result?.rdapRegistryRaw || effective?.rdapRegistryRaw || result?.result?.rdapRegistryRaw || null
                  if (!registryRaw) return null
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-base">原始注册管理机构 RDAP 响应</h4>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowRegistryRaw(!showRegistryRaw)}
                            aria-expanded={showRegistryRaw}
                            aria-controls="registry-rdap-raw"
                          >
                            {showRegistryRaw ? "收起" : "展开"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => copyToClipboard(JSON.stringify(registryRaw, null, 2))}>
                            <Copy className="h-4 w-4 mr-1" />复制
                          </Button>
                        </div>
                      </div>
                      {showRegistryRaw && (
                        <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto whitespace-pre" id="registry-rdap-raw">
                          {JSON.stringify(registryRaw, null, 2)}
                        </pre>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        ) : null}

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