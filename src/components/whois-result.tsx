/**
 * 文件：src/components/whois-result.tsx
 * 用途：展示 WHOIS/RDAP 查询结果，包含解析数据与原始文本的呈现与导出
 * 作者：Ryan
 * 创建日期：2025-09-25
 * 修改记录：
 * - 2025-09-25：添加中文文件头与 JSDoc 注释
 */
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

/**
 * WhoisResult 组件的属性
 * @property data - 查询结果数据对象，支持多种嵌套结构（result.raw/parsed 或 data.raw/parsed）
 * @property onExport - 导出动作回调（可选）
 * @property onShare - 分享动作回调（可选）
 */
interface WhoisResultProps {
  data: any
  onExport?: () => void
  onShare?: () => void
}

/**
 * 将状态码标准化为包含中文标签与严重程度的对象
 * 未知状态将以默认标签“未知状态”返回，严重程度为 1
 * @param code - RDAP/EPP 状态码
 * @returns 包含 code、label、severity 的对象
 */
const getStatusInfo = (code: string) => {
  const normalizedCode = (code || "").trim()
  const info = STATUS_INFO[normalizedCode]
  if (info) return { code: normalizedCode, ...info }
  return { code: normalizedCode, label: "未知状态", severity: 1 }
}

/**
 * WhoisResult 查询结果展示组件
 * 展示解析信息、状态概览、原始数据（含注册商/注册局 RDAP 原文），并提供导出与分享操作
 * @param props - 组件属性
 * @returns JSX.Element | null
 */
export function WhoisResult({ data, onExport, onShare }: WhoisResultProps) {
  // Hooks 必须在组件顶部调用，避免条件调用导致报错
  const [showRegistrarRaw, setShowRegistrarRaw] = useState(false)
  const [showRegistryRaw, setShowRegistryRaw] = useState(false)
  if (!data || !data.result) return null
 
  /**
   * 根据不同返回形态提取有效的 raw/parsed 容器
   * 兼容多层 result.data 或 result.result 结构
   */
  const result = data.result
  const effective = (result && (result.raw || result.parsed))
    ? result
    : (result?.result && (result.result.raw || result.result.parsed))
      ? result.result
      : (result?.data && (result.data.raw || result.data.parsed))
        ? result.data
        : null
 
  const parsed = effective?.parsed || null
  const raw = effective?.raw || ""
 
  /**
   * 将不同命名风格（snake_case/camelCase）与可选字段统一到 normalized
   */
  const normalized = {
    domain: parsed?.domain || parsed?.domain_name,
    registrar: parsed?.registrar || parsed?.sponsoring_registrar,
    registrationDate: parsed?.registrationDate || parsed?.creation_date || parsed?.registration_time,
    expirationDate: parsed?.expirationDate || parsed?.registry_expiry_date || parsed?.expiration_time,
    updatedDate: parsed?.updated_date || parsed?.update_date || parsed?.last_update || parsed?.last_updated,
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
 
  /**
   * 将文本复制到剪贴板
   * @param text - 待复制文本
   */
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  /**
   * 解析数据来源（注册商/注册局/RDAP/WHOIS/模拟），兼容不同层级字段
   * @returns 数据来源标识字符串
   */
  const resolveDataSource = () => {
    // dataSource 只在外层 result 上（模拟/真实都有），某些情况下可能缺失
    return result?.dataSource || data?.dataSource || "auto"
  }

  const source = resolveDataSource()

  /**
   * 根据数据来源选择对应的图标
   * @param dataSource - 数据来源标识
   * @returns 对应的 React 图标组件
   */
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

  /**
   * 将数据来源标识转换为中文可读标签
   * @param dataSource - 数据来源标识
   * @returns 中文标签字符串
   */
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
    <div className="glass-card glass-enter glass-hover w-full">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
             <h2 className="text-xl font-semibold">查询结果</h2>
             <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
               <Clock className="h-4 w-4" />
               {new Date(result.timestamp || data.timestamp).toLocaleString('zh-CN')}
             </p>
           </div>
           <div className="flex items-center gap-2">
             <Badge variant="secondary" className="flex items-center gap-1 glass-panel">
               {getDataSourceIcon(source)}
               {getDataSourceLabel(source)}
             </Badge>
           </div>
        </div>

        <div className="space-y-6">
          {/* 查询信息 */}
          <div className="glass-panel glass-enter flex items-center gap-2 p-3 rounded-[var(--radius-lg)]">
            <Globe className="h-4 w-4" />
            <span className="font-medium">查询目标:</span>
            <code className="glass-panel px-2 py-1 rounded text-sm">{data.query}</code>
          </div>

          {/* 错误处理 */}
          {result.error && (
            <div className="glass-panel glass-enter p-4 border-destructive/20 bg-destructive/5 rounded-[var(--radius-lg)]">
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
                        <p className="font-mono text-sm glass-panel p-2 rounded">{normalized.domain}</p>
                    </div>
                  )}
                  
                  {normalized.registrar && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">注册商</label>
                      <p className="text-sm glass-panel p-2 rounded">{normalized.registrar}</p>
                    </div>
                  )}
                  
                  {normalized.registrationDate && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">注册日期</label>
                      <p className="text-sm glass-panel p-2 rounded">{normalized.registrationDate}</p>
                    </div>
                  )}

                  {normalized.updatedDate && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">更新时间</label>
                      <p className="text-sm glass-panel p-2 rounded">{normalized.updatedDate}</p>
                    </div>
                  )}

                  {normalized.expirationDate && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">到期日期</label>
                      <p className="text-sm glass-panel p-2 rounded">{normalized.expirationDate}</p>
                    </div>
                  )}

                  {(() => {
                    // 计算剩余到期天数
                    const exp = normalized.expirationDate
                    if (!exp) return null
                    const expDate = new Date(String(exp))
                    if (isNaN(expDate.getTime())) return null
                    const now = new Date()
                    const diffMs = expDate.getTime() - now.getTime()
                    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
                    const display = days >= 0 ? `${days} 天` : `已过期 ${Math.abs(days)} 天`
                    return (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground">剩余到期天数</label>
                        <p className="text-sm glass-panel p-2 rounded">{display}</p>
                      </div>
                    )
                  })()}
                  {normalized.nameServers && normalized.nameServers.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">名称服务器</label>
                      <div className="space-y-2">
                        {normalized.nameServers.map((ns: string, idx: number) => (
                          <p key={idx} className="text-sm glass-panel p-2 rounded">{ns}</p>
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
                                <Badge variant="outline" className="text-xs glass-panel">
                                  {s.code}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="glass-panel">
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
                  // 根据域名判断是否为 .CN，以便调整"组织"字段标签为"注册人/机构"
                  const currentDomain = normalized.domain || (typeof parsed?.domain_name === 'string' ? parsed?.domain_name : '')
                  const isCN = (currentDomain || '').toLowerCase().endsWith('.cn')

                  const contacts = {
                    registrant: {
                      name: parsed?.registrant_name || parsed?.registrant,
                      organization: parsed?.registrant_organization,
                      email: parsed?.registrant_email || parsed?.registrant_contact_email,
                      phone: parsed?.registrant_phone || (parsed as any)?.registrant_contact_phone,
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

                  const renderContactBlock = (title: string, c: any, orgLabel?: string) => {
                    const fields = [
                      { label: '姓名', value: c?.name },
                      { label: orgLabel || '组织', value: c?.organization },
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
                            <p key={idx} className="text-sm glass-panel p-2 rounded">
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
                        {renderContactBlock('注册人', contacts.registrant, isCN ? '注册人/机构' : '组织')}
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
                          <Badge variant="secondary" className="text-xs glass-panel">
                            {s.code}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="glass-panel">
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
                    className="glass-active glass-hover"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    复制
                  </Button>
                </div>
                <pre className="glass-panel p-4 rounded-[var(--radius-lg)] text-sm overflow-x-auto whitespace-pre-wrap">
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
                            className="glass-active"
                          >
                            {showRegistrarRaw ? "收起" : "展开"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => copyToClipboard(JSON.stringify(registrarRaw, null, 2))} className="glass-active glass-hover">
                            <Copy className="h-4 w-4 mr-1" />复制
                          </Button>
                        </div>
                      </div>
                      {showRegistrarRaw && (
                        <pre className="glass-panel p-4 rounded-[var(--radius-lg)] text-sm overflow-x-auto whitespace-pre" id="registrar-rdap-raw">
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
                            className="glass-active"
                          >
                            {showRegistryRaw ? "收起" : "展开"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => copyToClipboard(JSON.stringify(registryRaw, null, 2))} className="glass-active glass-hover">
                            <Copy className="h-4 w-4 mr-1" />复制
                          </Button>
                        </div>
                      </div>
                      {showRegistryRaw && (
                        <pre className="glass-panel p-4 rounded-[var(--radius-lg)] text-sm overflow-x-auto whitespace-pre" id="registry-rdap-raw">
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

        <div className="glass-panel glass-enter flex items-center gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={onExport} className="glass-active glass-hover">
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
          <Button variant="outline" size="sm" onClick={onShare} className="glass-active glass-hover">
            <Share2 className="h-4 w-4 mr-1" />
            分享
          </Button>
        </div>
      </div>
    </div>
  </div>
  )
}