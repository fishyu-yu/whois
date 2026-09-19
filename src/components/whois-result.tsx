/**
 * 文件：src/components/whois-result.tsx
 * 用途：Whois 查询结果展示组件
 * 修改记录：
 * - 2025-12-15: 重构为现代 UI 风格
 * - 2025-12-15: 完善详细信息展示，包括联系人、注册商等，并增加导出功能
 * - 2025-12-16: 极简主义设计重构 (Apple Style)
 */
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Copy, Globe, Server, ChevronDown, ChevronUp, Check, ShieldCheck, Calendar, User, Mail, Phone, MapPin, Download, AlertTriangle, CircleCheck, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { csvContent, exportBasename } from "@/lib/export-utils"

// RDAP/EPP 域名状态字典
const STATUS_INFO: Record<string, { label: string; severity: number; description?: string }> = {
  ok: { label: "正常", severity: 0, description: "域名状态正常，可以解析和续费" },
  active: { label: "活跃", severity: 0 },
  clienthold: { label: "暂停解析 (Client)", severity: 3, description: "注册商暂停了解析，通常是因为未验证邮箱或欠费" },
  serverhold: { label: "暂停解析 (Server)", severity: 3, description: "注册局暂停了解析，通常涉及法律或滥用问题" },
  redemptionperiod: { label: "赎回期", severity: 3, description: "域名已过期并进入赎回期，恢复费用较高" },
  pendingdelete: { label: "等待删除", severity: 3, description: "域名即将被删除并释放" },
  inactive: { label: "未激活", severity: 2 },
  clientDeleteProhibited: { label: "禁止删除 (Client)", severity: 1 },
  serverDeleteProhibited: { label: "禁止删除 (Server)", severity: 1 },
  clientUpdateProhibited: { label: "禁止更新 (Client)", severity: 1 },
  serverUpdateProhibited: { label: "禁止更新 (Server)", severity: 1 },
  clientRenewProhibited: { label: "禁止续费 (Client)", severity: 1 },
  serverRenewProhibited: { label: "禁止续费 (Server)", severity: 1 },
  clientTransferProhibited: { label: "禁止转移 (Client)", severity: 1, description: "域名锁定，防止被恶意转移" },
  serverTransferProhibited: { label: "禁止转移 (Server)", severity: 1 },
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

const canonicalizeStatus = (code: string) => (code || "")
  .trim()
  .replace(/[\s\-_]+/g, "")
  .toLowerCase()

const STATUS_INFO_CANONICAL: Record<string, { label: string; severity: number; description?: string }> = Object.fromEntries(
  Object.entries(STATUS_INFO).map(([key, info]) => [canonicalizeStatus(key), info])
)

interface WhoisResultProps {
  data: any
  onExport?: () => void
  onShare?: () => void
}

const getStatusInfo = (code: string) => {
  const codeNoSpaces = (code || "").trim().replace(/[\s\-_]+/g, "")
  const canonical = canonicalizeStatus(code)
  const info = STATUS_INFO_CANONICAL[canonical]
  if (info) return { code: codeNoSpaces, ...info }
  return { code: codeNoSpaces, label: codeNoSpaces || "未知状态", severity: 1 }
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "未知"
  try {
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  } catch {
    return dateStr
  }
}

const calculateDaysRemaining = (dateStr?: string) => {
  if (!dateStr) return null
  try {
    const target = new Date(dateStr).getTime()
    if (Number.isNaN(target)) return null
    const now = new Date().getTime()
    const diff = target - now
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  } catch {
    return null
  }
}

const formatDisplayValue = (value: any): string => {
  if (Array.isArray(value)) return value.map(formatDisplayValue).filter(Boolean).join("\n")
  if (value && typeof value === "object") return JSON.stringify(value, null, 2)
  return value === undefined || value === null ? "" : String(value)
}

export function WhoisResult({ data }: WhoisResultProps) {
  const [showRaw, setShowRaw] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  if (!data || !data.result) return null

  const result = data.result

  if (result?.error) {
    return (
      <div className="result-flow mx-auto w-full max-w-5xl space-y-4 pb-12">
        <div className="quiet-surface rounded-lg p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-destructive">查询失败</p>
              <h1 className="mt-2 truncate text-2xl font-semibold text-foreground sm:text-3xl">
                {data.query || "查询结果"}
              </h1>
              <p className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-muted/70 p-4 text-sm leading-6 text-muted-foreground">
                {result.error}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const effective = (result && (result.raw || result.parsed))
    ? result
    : (result?.result && (result.result.raw || result.result.parsed))
      ? result.result
      : (result?.data && (result.data.raw || result.data.parsed))
        ? result.data
        : null
 
  const parsed = effective?.parsed || null
  const queryType = effective?.type || data.type
  const isNetwork = queryType === 'ip' || queryType === 'asn'
  const queryTitle = isNetwork ? effective?.query || data.query : null
  const networkFields = queryType === 'ip'
    ? [["网络名称", parsed?.network_name], ["IP 版本", parsed?.ip_version], ["IP 范围", parsed?.ip_range], ["CIDR 网段", parsed?.cidr], ["所属组织", parsed?.organization], ["注册地区", parsed?.country], ["分配类型", parsed?.network_type], ["注册机构", parsed?.registry], ["记录标识", parsed?.handle], ["状态", parsed?.status]]
    : [["ASN", parsed?.asn], ["网络名称", parsed?.network_name], ["ASN 范围", parsed?.asn_range], ["所属组织", parsed?.organization], ["注册地区", parsed?.country], ["分配类型", parsed?.network_type], ["注册机构", parsed?.registry], ["记录标识", parsed?.handle], ["状态", parsed?.status]]
  const rdapRawPayload: Record<string, any> = {}
  if (effective?.rdapRegistryRaw) rdapRawPayload.registry = effective.rdapRegistryRaw
  if (effective?.rdapRegistrarRaw) rdapRawPayload.registrar = effective.rdapRegistrarRaw
  const raw = Object.keys(rdapRawPayload).length > 0
    ? JSON.stringify(rdapRawPayload, null, 2)
    : effective?.raw || ""

  const pickValue = (...keys: string[]) => {
    if (!parsed) return undefined
    for (const key of keys) {
      const v = (parsed as any)[key]
      if (v === undefined || v === null) continue
      if (typeof v === "string" && v.trim().length === 0) continue
      if (Array.isArray(v) && v.length === 0) continue
      return v
    }
    return undefined
  }

  const getContact = (type: string) => {
      const contacts = parsed?.contacts || parsed?.contact || {}
      return contacts[type] || contacts[type.toLowerCase()] || null
  }

  const normalized = {
    domain: parsed?.domain || parsed?.domainName || parsed?.domain_name,
    registrar: parsed?.registrar || parsed?.sponsoringRegistrar || parsed?.sponsoring_registrar,
    registrarUrl: parsed?.registrarUrl || parsed?.registrar_url,
    registrarIanaId: parsed?.registrarIanaId || parsed?.registrar_iana_id,
    registrarPhone: parsed?.registrarPhone || parsed?.registrar_phone,
    registrarEmail: parsed?.registrarEmail || parsed?.registrar_email,
    whoisServer: parsed?.whoisServer || parsed?.whois_server || parsed?.registrar_whois_server,
    registrarAbuseEmail: parsed?.registrar_abuse_contact_email || parsed?.registrarAbuseContactEmail,
    registrarAbusePhone: parsed?.registrar_abuse_contact_phone || parsed?.registrarAbuseContactPhone,
    
    registrationDate: parsed?.registrationDate || parsed?.creationDate || parsed?.creation_date || parsed?.createdDate || parsed?.registration_time,
    expirationDate: parsed?.expirationDate || parsed?.registryExpiryDate || parsed?.registry_expiry_date || parsed?.expiryDate || parsed?.expiry_date || parsed?.expiration_time || parsed?.expires,
    updatedDate: parsed?.updatedDate || parsed?.updated_date || parsed?.updateDate || parsed?.lastUpdated || parsed?.last_update,
    
    nameServers: (() => {
      const ns = parsed?.nameServers || parsed?.nameServer || parsed?.name_server || parsed?.name_servers || parsed?.nserver
      if (!ns) return []
      if (typeof ns === 'string') return ns.split(/\s+/)
      return Array.isArray(ns) ? ns : [ns]
    })(),
    
    domainStatus: (() => {
      const st = parsed?.domainStatus || parsed?.domain_status || parsed?.status || parsed?.state
      if (!st) return []
      if (typeof st === 'string') return st.split(/\s+/)
      return Array.isArray(st) ? st : [st]
    })(),
    
    dnssec: parsed?.dnssec || parsed?.DNSSEC,
    
    registrant: {
      name: pickValue("registrant_name", "registrant", "registrant_contact", "registrant_contact_name"),
      organization: pickValue("registrant_organization", "registrant_org", "registrant_organization_name"),
      email: pickValue("registrant_email", "registrant_contact_email", "registrant_email_address"),
      phone: pickValue("registrant_phone", "registrant_contact_phone", "registrant_phone_number", "registrant_tel"),
      fax: pickValue("registrant_fax", "registrant_contact_fax"),
      title: pickValue("registrant_title", "registrant_contact_title"),
      role: pickValue("registrant_role", "registrant_contact_role"),
      address: pickValue("registrant_address", "registrant_contact_address"),
      street: pickValue("registrant_street", "registrant_street_address", "registrant_contact_street"),
      city: pickValue("registrant_city", "registrant_contact_city"),
      state: pickValue("registrant_state", "registrant_province", "registrant_contact_state"),
      postalCode: pickValue("registrant_postal_code", "registrant_zip", "registrant_contact_postal_code"),
      country: pickValue("registrant_country", "registrant_country_code"),
      ...getContact("registrant")
    },
    admin: {
      name: pickValue("admin_name", "administrative_contact", "admin", "admin_contact_name", "administrative_contact_name"),
      organization: pickValue("admin_organization", "admin_org", "administrative_contact_organization"),
      email: pickValue("admin_email", "admin_contact_email", "administrative_contact_email"),
      phone: pickValue("admin_phone", "admin_contact_phone", "administrative_contact_phone"),
      fax: pickValue("admin_fax", "admin_contact_fax", "administrative_contact_fax"),
      title: pickValue("admin_title", "administrative_contact_title"),
      role: pickValue("admin_role", "administrative_contact_role"),
      address: pickValue("admin_address", "administrative_contact_address"),
      street: pickValue("admin_street", "admin_street_address", "administrative_contact_street"),
      city: pickValue("admin_city", "administrative_contact_city"),
      state: pickValue("admin_state", "admin_province", "administrative_contact_state"),
      postalCode: pickValue("admin_postal_code", "admin_zip", "administrative_contact_postal_code"),
      country: pickValue("admin_country", "administrative_contact_country"),
      ...getContact("admin")
    },
    tech: {
      name: pickValue("tech_name", "technical_contact", "tech", "tech_contact_name"),
      organization: pickValue("tech_organization", "tech_org", "technical_contact_organization"),
      email: pickValue("tech_email", "tech_contact_email", "technical_contact_email"),
      phone: pickValue("tech_phone", "tech_contact_phone", "technical_contact_phone"),
      fax: pickValue("tech_fax", "tech_contact_fax", "technical_contact_fax"),
      title: pickValue("tech_title", "technical_contact_title"),
      role: pickValue("tech_role", "technical_contact_role"),
      address: pickValue("tech_address", "technical_contact_address"),
      street: pickValue("tech_street", "tech_street_address", "technical_contact_street"),
      city: pickValue("tech_city", "technical_contact_city"),
      state: pickValue("tech_state", "tech_province", "technical_contact_state"),
      postalCode: pickValue("tech_postal_code", "tech_zip", "technical_contact_postal_code"),
      country: pickValue("tech_country", "technical_contact_country"),
      ...getContact("tech")
    },
    billing: {
      name: pickValue("billing_name", "billing_contact_name"),
      organization: pickValue("billing_organization", "billing_org", "billing_contact_organization"),
      email: pickValue("billing_email", "billing_contact_email"),
      phone: pickValue("billing_phone", "billing_contact_phone"),
      fax: pickValue("billing_fax", "billing_contact_fax"),
      title: pickValue("billing_title", "billing_contact_title"),
      role: pickValue("billing_role", "billing_contact_role"),
      address: pickValue("billing_address", "billing_contact_address"),
      street: pickValue("billing_street", "billing_street_address", "billing_contact_street"),
      city: pickValue("billing_city", "billing_contact_city"),
      state: pickValue("billing_state", "billing_province", "billing_contact_state"),
      postalCode: pickValue("billing_postal_code", "billing_zip", "billing_contact_postal_code"),
      country: pickValue("billing_country", "billing_contact_country"),
      ...getContact("billing")
    }
  }

  const daysRemaining = calculateDaysRemaining(normalized.expirationDate)
  const allFields = Object.entries(parsed || {}).filter(([, value]) => {
    if (value === undefined || value === null) return false
    if (typeof value === "string") return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    return true
  })

  const sourceLabel = (() => {
    switch (effective?.dataSource) {
      case "rdap-registrar": return "RDAP · 注册商"
      case "rdap-registry": return "RDAP · 注册局"
      case "registrar": return "WHOIS · 注册商"
      case "registry": return "WHOIS · 注册局"
      case "standard": return "WHOIS"
      case "rdap-rir": return `RDAP · ${parsed?.registry || '区域注册机构'}`
      case "whois-rir": return `WHOIS · ${parsed?.registry || '区域注册机构'}`
      default: return null
    }
  })()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(raw)
      setCopied(true)
      setCopyError(false)
      setTimeout(() => setCopied(false), 2000)
    } catch { setCopyError(true) }
  }

  const handleExport = (format: 'json' | 'csv') => {
      let content = ""
      let type = ""
      let filename = exportBasename(queryTitle || normalized.domain || data.query || 'query')

      if (format === 'json') {
          content = JSON.stringify(data, null, 2)
          type = "application/json"
          filename += ".json"
      } else {
          const rows = isNetwork ? [
              ["字段", "值"],
              [queryType === 'ip' ? 'IP / CIDR' : 'ASN', queryTitle],
              ...allFields.map(([key, value]) => [key, formatDisplayValue(value)]),
              ["原始数据", raw],
          ] : [
              ["字段", "值"],
              ["域名", normalized.domain],
              ["注册商", normalized.registrar],
              ["注册时间", normalized.registrationDate],
              ["到期时间", normalized.expirationDate],
              ["更新时间", normalized.updatedDate],
              ["DNS 服务器", normalized.nameServers.join("; ")],
              ["状态", normalized.domainStatus.join("; ")],
              ["注册人名称", normalized.registrant.name || normalized.registrant.organization || ""],
              ["注册人邮箱", normalized.registrant.email || ""],
              ["原始数据", raw]
          ]
          content = csvContent(rows)
          type = "text/csv"
          filename += ".csv"
      }

      const blob = new Blob([content], { type })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
  }

  const ContactCard = ({ title, contact, alwaysShow = false }: { title: string, contact: any, alwaysShow?: boolean }) => {
    if (!contact || Object.keys(contact).length === 0) {
      if (!alwaysShow) return null
    }

    const name = contact?.name || contact?.Name
    const org = contact?.organization || contact?.org || contact?.Organization
    const email = contact?.email || contact?.Email || contact?.["e-mail"]
    const phone = contact?.phone || contact?.Phone || contact?.["phone-number"]
    const fax = contact?.fax || contact?.Fax
    const titleText = contact?.title || contact?.Title
    const role = contact?.role || contact?.Role
    const street = contact?.street || contact?.address || contact?.Street
    const city = contact?.city || contact?.City
    const state = contact?.state || contact?.State || contact?.province
    const postalCode = contact?.postalCode || contact?.postal_code || contact?.zip
    const country = contact?.country || contact?.Country || contact?.["country-code"]

    const hasData = name || org || email || phone || fax || titleText || role || street || city || state || postalCode || country

    if (!hasData && !alwaysShow) return null

    return (
      <Card className="h-full gap-0 py-0">
        <CardHeader className="border-b border-border/45 px-5 py-4 sm:px-5">
        <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <User className="size-3.5" />
          {title}
        </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3 px-5 py-5 sm:px-5">
          {hasData ? (
            <>
              {(name || org || titleText || role) && (
                <div>
                   {name && <div className="whitespace-pre-wrap break-words font-medium text-foreground">{formatDisplayValue(name)}</div>}
                   {org && <div className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{formatDisplayValue(org)}</div>}
                   {(titleText || role) && <div className="mt-1 text-xs text-muted-foreground">{[titleText, role].map(formatDisplayValue).filter(Boolean).join(" · ")}</div>}
                </div>
              )}
              
              {(email || phone || fax) && (
                 <div className="pt-2 space-y-2">
                    {email && (
                      <div className="flex min-w-0 items-start gap-2 text-sm">
                        <Mail className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 whitespace-pre-wrap break-all font-mono text-xs leading-5" title={formatDisplayValue(email)}>{formatDisplayValue(email)}</span>
                      </div>
                    )}
                    {phone && (
                      <div className="flex min-w-0 items-start gap-2 text-sm">
                        <Phone className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 whitespace-pre-wrap break-all font-mono text-xs leading-5">{formatDisplayValue(phone)}</span>
                      </div>
                    )}
                    {fax && <p className="break-all pl-5.5 font-mono text-xs text-muted-foreground">传真：{formatDisplayValue(fax)}</p>}
                 </div>
              )}

              {(street || city || state || postalCode || country) && (
                <div className="pt-2 flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 break-words">
                    {street && <p className="whitespace-pre-wrap">{formatDisplayValue(street)}</p>}
                    <p>{[city, state, postalCode, country].map(formatDisplayValue).filter(Boolean).join(", ")}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
             <div className="flex flex-col items-center justify-center py-7 text-muted-foreground">
               <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-muted">
                 <ShieldCheck className="size-4" />
               </div>
               <p className="text-xs font-medium">隐私保护已开启</p>
             </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="result-flow mx-auto w-full max-w-5xl space-y-4 pb-12">
      
      {/* Header Section */}
      <div className="quiet-surface flex flex-col justify-between gap-5 rounded-lg p-5 md:flex-row md:items-end sm:p-6">
        <div className="min-w-0">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <CircleCheck className="size-3.5" />
            查询完成
          </p>
          <h1 className="break-all text-3xl font-semibold text-foreground sm:text-4xl">
            {queryTitle || normalized.domain || "查询结果"}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(isNetwork ? parsed?.network_name : normalized.registrar) && (
              <Badge variant="secondary" className="max-w-full truncate rounded-lg px-2.5 py-1 font-normal">
                {isNetwork ? parsed?.network_name : normalized.registrar}
              </Badge>
            )}
            {sourceLabel && (
              <Badge variant="outline" className="rounded-lg px-2.5 py-1 font-normal">
                {sourceLabel}
              </Badge>
            )}
            {daysRemaining !== null && (
              <Badge variant="outline" className={cn(
                "rounded-lg border-0 px-2.5 py-1 font-normal",
                daysRemaining < 30 ? "bg-red-500/10 text-red-700 dark:text-red-400" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              )}>
                {daysRemaining > 0 ? `剩余 ${daysRemaining} 天` : "已过期"}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex w-full flex-wrap gap-2 md:w-auto md:justify-end">
           <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
             <Download className="w-4 h-4" />
             JSON
           </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
             <Download className="w-4 h-4" />
             CSV
           </Button>
           <Button variant="secondary" size="sm" onClick={handleCopy}>
             {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
             {copied ? '已复制' : copyError ? '复制失败，请重试' : '复制'}
           </Button>
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        
        {/* Dates Card */}
        <Card className="gap-0 py-0 lg:col-span-1">
          <CardHeader className="border-b border-border/45 px-5 py-4 sm:px-5">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="size-4 text-primary" />
              关键日期
            </CardTitle>
            <CardDescription>{isNetwork ? '网络资源登记时间' : '注册生命周期'}</CardDescription>
          </CardHeader>
          
          <CardContent className="divide-y divide-border/45 px-5 sm:px-5">
            <div className="py-4">
              <p className="mb-1 text-xs text-muted-foreground">注册时间</p>
              <p className="font-mono text-sm font-medium">{formatDate(normalized.registrationDate)}</p>
            </div>
            {!isNetwork && <div className="py-4">
              <p className="mb-1 text-xs text-muted-foreground">过期时间</p>
              <div className="flex items-center gap-2">
                 <p className="font-mono text-sm font-medium">{formatDate(normalized.expirationDate)}</p>
                 {daysRemaining !== null && daysRemaining < 30 && (
                   <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger>
                         <AlertTriangle className="w-4 h-4 text-orange-500" />
                       </TooltipTrigger>
                       <TooltipContent>域名即将过期</TooltipContent>
                     </Tooltip>
                   </TooltipProvider>
                 )}
              </div>
            </div>}
            <div className="py-4">
              <p className="mb-1 text-xs text-muted-foreground">更新时间</p>
              <p className="font-mono text-sm font-medium">{formatDate(normalized.updatedDate)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Status & Registrar Info Card */}
        {isNetwork ? <Card className="min-w-0 gap-0 py-0 lg:col-span-2">
          <CardHeader className="border-b border-border/45 px-5 py-4 sm:px-5">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Globe className="size-4 text-primary" />
              {queryType === 'ip' ? 'IP 信息' : 'ASN 信息'}
            </CardTitle>
            <CardDescription>{queryType === 'ip' ? '地址范围、所属组织与分配信息' : '自治系统、所属组织与注册信息'}</CardDescription>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-x-8 px-5 py-1 sm:grid-cols-2 sm:px-5">
            {networkFields.filter(([, value]) => formatDisplayValue(value)).map(([label, value]) => (
              <div key={label} className="min-w-0 py-4">
                <p className="mb-1 text-xs text-muted-foreground">{label}</p>
                <p className="whitespace-pre-wrap break-all text-sm font-medium leading-6">{formatDisplayValue(value)}</p>
              </div>
            ))}
          </CardContent>
        </Card> : <Card className="gap-0 py-0 lg:col-span-2">
          <CardHeader className="border-b border-border/45 px-5 py-4 sm:px-5">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Globe className="size-4 text-primary" />
              域名信息
            </CardTitle>
            <CardDescription>注册商、状态与名称服务器</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-7 px-5 py-5 sm:px-5 md:grid-cols-2">
            <div>
                <p className="mb-3 text-xs font-medium text-muted-foreground">域名状态</p>
                <div className="flex flex-wrap gap-2">
                {normalized.domainStatus.length > 0 ? (
                    normalized.domainStatus.map((status: string, i: number) => {
                    const info = getStatusInfo(status)
                    const isNormal = info.severity === 0
                    const isWarning = info.severity === 2
                    const isDanger = info.severity >= 3
                    
                    return (
                        <TooltipProvider key={i}>
                        <Tooltip>
                            <TooltipTrigger>
                            <span className={cn(
                                "cursor-help rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                                isNormal && "bg-green-500/10 text-green-700 dark:text-green-400",
                                isWarning && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
                                isDanger && "bg-red-500/10 text-red-700 dark:text-red-400",
                                info.severity === 1 && "bg-secondary text-secondary-foreground"
                            )}>
                                {info.label}
                            </span>
                            </TooltipTrigger>
                            <TooltipContent>
                            <p>{info.description || info.code}</p>
                            </TooltipContent>
                        </Tooltip>
                        </TooltipProvider>
                    )
                    })
                ) : (
                    <span className="text-muted-foreground text-sm">无状态信息</span>
                )}
                </div>
            </div>

            <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">注册商</p>
                <p className="text-sm font-semibold">{normalized.registrar || "未知"}</p>
                {normalized.registrarUrl && (
                  <a href={normalized.registrarUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    访问注册商 <ExternalLink className="size-3" />
                  </a>
                )}
                {normalized.registrarIanaId && <p className="text-muted-foreground text-xs mt-1">IANA ID: {normalized.registrarIanaId}</p>}
                
                {(normalized.registrarAbuseEmail || normalized.registrarAbusePhone) && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">滥用投诉</p>
                        {normalized.registrarAbuseEmail && <p className="whitespace-pre-wrap break-all font-mono text-xs">{formatDisplayValue(normalized.registrarAbuseEmail)}</p>}
                        {normalized.registrarAbusePhone && <p className="text-xs font-mono">{normalized.registrarAbusePhone}</p>}
                    </div>
                )}
            </div>
            
            <div className="md:col-span-2">
               <p className="mb-3 text-xs font-medium text-muted-foreground">DNS 服务器</p>
               <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                   {normalized.nameServers.map((ns: string, i: number) => (
                     <div key={i} className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/75 px-3 py-2 font-mono text-xs text-foreground/80">
                       <Server className="size-3.5 text-muted-foreground" />
                       <span className="truncate">{ns}</span>
                     </div>
                   ))}
                   {normalized.nameServers.length === 0 && <span className="text-sm text-muted-foreground">无名称服务器信息</span>}
               </div>
            </div>
          </CardContent>
        </Card>}
      </div>
      
      {/* Contact Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
         <ContactCard title={isNetwork ? '资源持有人' : '注册人'} contact={normalized.registrant} alwaysShow={!isNetwork} />
         <ContactCard title="管理员" contact={normalized.admin} alwaysShow={!isNetwork} />
         <ContactCard title="技术联系" contact={normalized.tech} alwaysShow={!isNetwork} />
         {isNetwork ? <ContactCard title="滥用投诉" contact={{ email: parsed?.abuse_email, phone: parsed?.abuse_phone }} /> : <ContactCard title="账单联系" contact={normalized.billing} />}
      </div>

      {/* Every parsed field is retained here, including registry-specific WHOIS fields. */}
      {allFields.length > 0 && (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border/45 px-5 py-4 sm:px-5">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Server className="size-4 text-primary" />
              全部查询字段
            </CardTitle>
            <CardDescription>数据源返回并成功解析的全部字段</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-x-8 px-5 sm:grid-cols-2 sm:px-5">
            {allFields.map(([key, value]) => (
              <div key={key} className="min-w-0 border-b border-border/45 py-4 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
                <p className="break-all font-mono text-[11px] text-muted-foreground">{key}</p>
                <p className="mt-1 whitespace-pre-wrap break-all text-sm leading-6 text-foreground">{formatDisplayValue(value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Raw Data Toggle */}
      <div className="quiet-surface overflow-hidden rounded-lg">
        <button 
          onClick={() => setShowRaw(!showRaw)}
          className="flex w-full items-center justify-between p-4 transition-colors hover:bg-muted/60"
          aria-expanded={showRaw}
        >
          <span className="font-medium flex items-center gap-2 text-sm text-muted-foreground">
            <Server className="w-4 h-4" />
            原始查询数据
          </span>
          {showRaw ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        
        {showRaw && (
          <div className="max-h-[500px] overflow-x-auto border-t bg-muted/30">
             <pre className="whitespace-pre-wrap p-5 font-mono text-xs leading-relaxed text-muted-foreground selection:bg-primary/20 sm:p-6">
               {raw || JSON.stringify(data, null, 2)}
             </pre>
          </div>
        )}
      </div>

    </div>
  )
}
