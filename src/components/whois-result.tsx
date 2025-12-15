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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Copy, Share2, Clock, Globe, Server, ChevronDown, ChevronUp, Check, ShieldCheck, Calendar, User, Building, Mail, Phone, MapPin, Download, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

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
    return new Date(dateStr).toLocaleDateString("zh-CN", {
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
    const now = new Date().getTime()
    const diff = target - now
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  } catch {
    return null
  }
}

const maskEmail = (email: string) => {
  return email
}

export function WhoisResult({ data, onExport, onShare }: WhoisResultProps) {
  const [showRaw, setShowRaw] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!data || !data.result) return null

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
      country: pickValue("registrant_country", "registrant_country_code"),
      ...getContact("registrant")
    },
    admin: {
      name: pickValue("admin_name", "administrative_contact", "admin", "admin_contact_name", "administrative_contact_name"),
      organization: pickValue("admin_organization", "admin_org", "administrative_contact_organization"),
      email: pickValue("admin_email", "admin_contact_email", "administrative_contact_email"),
      phone: pickValue("admin_phone", "admin_contact_phone", "administrative_contact_phone"),
      country: pickValue("admin_country", "administrative_contact_country"),
      ...getContact("admin")
    },
    tech: {
      name: pickValue("tech_name", "technical_contact", "tech", "tech_contact_name"),
      organization: pickValue("tech_organization", "tech_org", "technical_contact_organization"),
      email: pickValue("tech_email", "tech_contact_email", "technical_contact_email"),
      phone: pickValue("tech_phone", "tech_contact_phone", "technical_contact_phone"),
      country: pickValue("tech_country", "technical_contact_country"),
      ...getContact("tech")
    },
    billing: {
      name: pickValue("billing_name", "billing_contact_name"),
      organization: pickValue("billing_organization", "billing_org", "billing_contact_organization"),
      email: pickValue("billing_email", "billing_contact_email"),
      phone: pickValue("billing_phone", "billing_contact_phone"),
      country: pickValue("billing_country", "billing_contact_country"),
      ...getContact("billing")
    }
  }

  const daysRemaining = calculateDaysRemaining(normalized.expirationDate)

  const handleCopy = () => {
    navigator.clipboard.writeText(raw)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExport = (format: 'json' | 'csv') => {
      let content = ""
      let type = ""
      let filename = `whois-${normalized.domain || 'query'}`

      if (format === 'json') {
          content = JSON.stringify(data, null, 2)
          type = "application/json"
          filename += ".json"
      } else {
          const rows = [
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
              ["原始数据", `"${raw.replace(/"/g, '""')}"`]
          ]
          content = rows.map(r => r.join(",")).join("\n")
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
    const street = contact?.street || contact?.address || contact?.Street
    const city = contact?.city || contact?.City
    const state = contact?.state || contact?.State || contact?.province
    const country = contact?.country || contact?.Country || contact?.["country-code"]

    const hasData = name || org || email || phone || street || city || country

    if (!hasData && !alwaysShow) return null

    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 h-full transition-all hover:shadow-md">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <User className="w-4 h-4" />
          {title}
        </h3>
        
        <div className="space-y-3">
          {hasData ? (
            <>
              {(name || org) && (
                <div>
                   {name && <div className="font-medium text-foreground">{name}</div>}
                   {org && <div className="text-sm text-muted-foreground">{org}</div>}
                </div>
              )}
              
              {(email || phone) && (
                 <div className="pt-2 space-y-2">
                    {email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-mono text-xs">{maskEmail(email)}</span>
                      </div>
                    )}
                    {phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-mono text-xs">{phone}</span>
                      </div>
                    )}
                 </div>
              )}

              {(street || city || country) && (
                <div className="pt-2 flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <div>
                    {street && <p>{street}</p>}
                    <p>{[city, state, country].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
             <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/50">
               <ShieldCheck className="w-8 h-8 mb-2 opacity-20" />
               <p className="text-sm">隐私保护已开启</p>
             </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight mb-2">
            {normalized.domain || "查询结果"}
          </h1>
          <div className="flex flex-wrap gap-3 items-center">
            {normalized.registrar && (
              <Badge variant="secondary" className="font-normal text-sm px-3 py-1 bg-secondary/50 hover:bg-secondary/70">
                {normalized.registrar}
              </Badge>
            )}
            {daysRemaining !== null && (
              <Badge variant="outline" className={cn(
                "font-normal text-sm px-3 py-1 border-0",
                daysRemaining < 30 ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"
              )}>
                {daysRemaining > 0 ? `剩余 ${daysRemaining} 天` : "已过期"}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
           <Button variant="ghost" size="sm" onClick={() => handleExport('json')} className="h-9 gap-2 rounded-full hover:bg-secondary">
             <Download className="w-4 h-4" />
             导出 JSON
           </Button>
            <Button variant="ghost" size="sm" onClick={() => handleExport('csv')} className="h-9 gap-2 rounded-full hover:bg-secondary">
             <Download className="w-4 h-4" />
             导出 CSV
           </Button>
           <Button variant="ghost" size="sm" onClick={handleCopy} className="h-9 gap-2 rounded-full hover:bg-secondary">
             {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
             复制
           </Button>
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dates Card */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 lg:col-span-1">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            关键日期
          </h3>
          
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">注册时间</p>
              <p className="text-lg font-medium font-mono">{formatDate(normalized.registrationDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">过期时间</p>
              <div className="flex items-center gap-2">
                 <p className="text-lg font-medium font-mono">{formatDate(normalized.expirationDate)}</p>
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
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">更新时间</p>
              <p className="text-lg font-medium font-mono">{formatDate(normalized.updatedDate)}</p>
            </div>
          </div>
        </div>

        {/* Status & Registrar Info Card */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 lg:col-span-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            域名信息
          </h3>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
                <p className="text-sm text-muted-foreground mb-3">域名状态</p>
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
                                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-help",
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
                <p className="text-sm text-muted-foreground mb-2">注册商</p>
                <p className="font-medium text-base">{normalized.registrar || "未知"}</p>
                {normalized.registrarIanaId && <p className="text-muted-foreground text-xs mt-1">IANA ID: {normalized.registrarIanaId}</p>}
                
                {(normalized.registrarAbuseEmail || normalized.registrarAbusePhone) && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">滥用投诉</p>
                        {normalized.registrarAbuseEmail && <p className="text-xs font-mono">{maskEmail(normalized.registrarAbuseEmail)}</p>}
                        {normalized.registrarAbusePhone && <p className="text-xs font-mono">{normalized.registrarAbusePhone}</p>}
                    </div>
                )}
            </div>
            
            <div className="md:col-span-2">
               <p className="text-sm text-muted-foreground mb-3">DNS 服务器</p>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {normalized.nameServers.map((ns: string, i: number) => (
                     <div key={i} className="flex items-center gap-2 text-sm font-mono text-foreground/80">
                       <Server className="w-3.5 h-3.5 text-muted-foreground/50" />
                       {ns}
                     </div>
                   ))}
               </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
         <ContactCard title="注册人" contact={normalized.registrant} alwaysShow />
         <ContactCard title="管理员" contact={normalized.admin} alwaysShow />
         <ContactCard title="技术联系" contact={normalized.tech} alwaysShow />
         <ContactCard title="账单联系" contact={normalized.billing} />
      </div>

      {/* Raw Data Toggle */}
      <div className="rounded-2xl border border-border/50 overflow-hidden bg-card shadow-sm">
        <button 
          onClick={() => setShowRaw(!showRaw)}
          className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
        >
          <span className="font-medium flex items-center gap-2 text-sm text-muted-foreground">
            <Server className="w-4 h-4" />
            查看原始数据
          </span>
          {showRaw ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        
        {showRaw && (
          <div className="border-t border-border/50 bg-secondary/10 overflow-x-auto max-h-[500px]">
             <pre className="p-6 text-xs font-mono leading-relaxed whitespace-pre-wrap text-muted-foreground selection:bg-primary/20">
               {raw || JSON.stringify(data, null, 2)}
             </pre>
          </div>
        )}
      </div>

    </div>
  )
}
