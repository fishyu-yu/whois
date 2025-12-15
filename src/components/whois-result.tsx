/**
 * 文件：src/components/whois-result.tsx
 * 用途：Whois 查询结果展示组件
 * 修改记录：
 * - 2025-12-15: 重构为现代 UI 风格
 * - 2025-12-15: 完善详细信息展示，包括联系人、注册商等，并增加导出功能
 */
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Copy, Share2, Clock, Globe, Server, ChevronDown, ChevronUp, Check, ShieldCheck, Calendar, User, Building, Mail, Phone, MapPin, Download } from "lucide-react"
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
  if (!dateStr) return "N/A"
  try {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
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

// 隐私保护处理：隐藏部分邮箱字符
const maskEmail = (email: string) => {
  if (!email || !email.includes("@")) return email
  const [user, domain] = email.split("@")
  const maskedUser = user.length > 2 ? user.slice(0, 2) + "***" : user + "***"
  return `${maskedUser}@${domain}`
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

  // 辅助函数：从 parsed 对象中提取嵌套字段
  // 许多 Whois 解析库会将联系人信息放在 contacts 或类似结构中
  const getContact = (type: string) => {
      const contacts = parsed?.contacts || parsed?.contact || {}
      return contacts[type] || contacts[type.toLowerCase()] || null
  }

  // 整合并标准化数据
  const normalized = {
    domain: parsed?.domain || parsed?.domainName || parsed?.domain_name,
    registrar: parsed?.registrar || parsed?.sponsoringRegistrar || parsed?.sponsoring_registrar,
    registrarUrl: parsed?.registrarUrl || parsed?.registrar_url,
    registrarIanaId: parsed?.registrarIanaId || parsed?.registrar_iana_id,
    registrarPhone: parsed?.registrarPhone || parsed?.registrar_phone,
    registrarEmail: parsed?.registrarEmail || parsed?.registrar_email,
    whoisServer: parsed?.whoisServer || parsed?.whois_server,
    
    registrationDate: parsed?.registrationDate || parsed?.creationDate || parsed?.creation_date || parsed?.createdDate || parsed?.registration_time,
    expirationDate: parsed?.expirationDate || parsed?.registryExpiryDate || parsed?.registry_expiry_date || parsed?.expiryDate || parsed?.expiration_time,
    updatedDate: parsed?.updatedDate || parsed?.updated_date || parsed?.updateDate || parsed?.lastUpdated || parsed?.last_update,
    
    nameServers: (() => {
      const ns = parsed?.nameServers || parsed?.nameServer || parsed?.name_server || parsed?.name_servers || parsed?.nserver
      if (!ns) return []
      // 有些返回是字符串（空格分隔），有些是数组
      if (typeof ns === 'string') return ns.split(/\s+/)
      return Array.isArray(ns) ? ns : [ns]
    })(),
    
    domainStatus: (() => {
      const st = parsed?.domainStatus || parsed?.domain_status || parsed?.status || parsed?.state
      if (!st) return []
      // 同样处理字符串或数组
      if (typeof st === 'string') return st.split(/\s+/)
      return Array.isArray(st) ? st : [st]
    })(),
    
    dnssec: parsed?.dnssec || parsed?.DNSSEC,
    
    // 联系人信息
    registrant: getContact("registrant") || parsed?.registrant || {},
    admin: getContact("admin") || getContact("administrative") || parsed?.admin || {},
    tech: getContact("tech") || getContact("technical") || parsed?.tech || {},
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
          // 简单的 CSV 导出逻辑 (扁平化部分关键字段)
          const rows = [
              ["Field", "Value"],
              ["Domain Name", normalized.domain],
              ["Registrar", normalized.registrar],
              ["Registration Date", normalized.registrationDate],
              ["Expiration Date", normalized.expirationDate],
              ["Updated Date", normalized.updatedDate],
              ["Name Servers", normalized.nameServers.join("; ")],
              ["Status", normalized.domainStatus.join("; ")],
              ["Registrant Name", normalized.registrant.name || normalized.registrant.organization || ""],
              ["Registrant Email", normalized.registrant.email || ""],
              ["Raw Data", `"${raw.replace(/"/g, '""')}"`] // 简单的 CSV 转义
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

  // 渲染联系人卡片的辅助组件
  const ContactCard = ({ title, contact }: { title: string, contact: any }) => {
    if (!contact || Object.keys(contact).length === 0) return null
    
    // 尝试提取常用字段，兼容不同解析格式
    const name = contact.name || contact.Name
    const org = contact.organization || contact.org || contact.Organization
    const email = contact.email || contact.Email || contact["e-mail"]
    const phone = contact.phone || contact.Phone || contact["phone-number"]
    const street = contact.street || contact.address || contact.Street
    const city = contact.city || contact.City
    const state = contact.state || contact.State || contact.province
    const country = contact.country || contact.Country || contact["country-code"]

    const hasData = name || org || email || phone || street || city || country

    if (!hasData) return null

    return (
        <Card className="glass-card border-none h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                {(name || org) && (
                    <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                            {name && <p className="font-medium">{name}</p>}
                            {org && <p className="text-muted-foreground">{org}</p>}
                        </div>
                    </div>
                )}
                {email && (
                     <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-xs">{maskEmail(email)}</span>
                     </div>
                )}
                 {phone && (
                     <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-xs">{phone}</span>
                     </div>
                )}
                {(street || city || country) && (
                     <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="text-muted-foreground">
                            {street && <p>{street}</p>}
                            <p>{[city, state, country].filter(Boolean).join(", ")}</p>
                        </div>
                     </div>
                )}
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Header Card */}
      <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 mb-2 break-all">
            {normalized.domain || "查询结果"}
          </h2>
          <div className="flex flex-wrap gap-2 items-center text-muted-foreground">
            {normalized.registrar && (
              <span className="flex items-center gap-1.5 text-sm bg-secondary/30 px-3 py-1 rounded-full border border-secondary/20">
                <Globe className="w-3.5 h-3.5" />
                {normalized.registrar}
              </span>
            )}
            {daysRemaining !== null && (
              <span className={cn(
                "flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border",
                daysRemaining < 30 ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-green-500/10 text-green-600 border-green-500/20"
              )}>
                <Clock className="w-3.5 h-3.5" />
                {daysRemaining > 0 ? `剩余 ${daysRemaining} 天` : "已过期"}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
           <Button variant="outline" size="sm" onClick={() => handleExport('json')} className="h-9 gap-2">
             <Download className="w-4 h-4" />
             JSON
           </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="h-9 gap-2">
             <Download className="w-4 h-4" />
             CSV
           </Button>
           <Button variant="outline" size="sm" onClick={handleCopy} className="h-9 gap-2">
             {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
             复制
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Dates Card */}
        <Card className="glass-card border-none md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              关键日期
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">注册时间</p>
              <p className="font-mono text-sm">{formatDate(normalized.registrationDate)}</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">过期时间</p>
              <p className="font-mono text-sm">{formatDate(normalized.expirationDate)}</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">更新时间</p>
              <p className="font-mono text-sm">{formatDate(normalized.updatedDate)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Status & Registrar Info Card */}
        <Card className="glass-card border-none md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              域名状态 & 注册商
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div>
                <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">状态</h4>
                <div className="flex flex-wrap gap-2">
                {normalized.domainStatus.length > 0 ? (
                    normalized.domainStatus.map((status: string, i: number) => {
                    const info = getStatusInfo(status)
                    let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline"
                    
                    if (info.severity === 0) badgeVariant = "default" // Normal/Active
                    else if (info.severity === 1) badgeVariant = "secondary" // Prohibited/Locked
                    else if (info.severity >= 2) badgeVariant = "destructive" // Hold/Delete

                    return (
                        <TooltipProvider key={i}>
                        <Tooltip>
                            <TooltipTrigger>
                            <Badge variant={badgeVariant} className="px-3 py-1 text-sm font-normal cursor-help">
                                {info.label}
                            </Badge>
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

            <Separator />

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                    <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">注册商</h4>
                    <p className="font-medium">{normalized.registrar || "N/A"}</p>
                    {normalized.registrarIanaId && <p className="text-muted-foreground text-xs">IANA ID: {normalized.registrarIanaId}</p>}
                </div>
                <div>
                     <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Whois 服务器</h4>
                     <p className="font-mono text-xs">{normalized.whoisServer || "N/A"}</p>
                </div>
                 {normalized.registrarUrl && (
                    <div className="col-span-1 sm:col-span-2">
                         <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">注册商网址</h4>
                         <a href={normalized.registrarUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">
                             {normalized.registrarUrl}
                         </a>
                    </div>
                )}
             </div>

             {normalized.nameServers.length > 0 && (
              <div>
                 <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">DNS 服务器</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                   {normalized.nameServers.map((ns: string, i: number) => (
                     <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20 text-sm font-mono break-all">
                       <Server className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                       {ns}
                     </div>
                   ))}
                 </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Contact Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-1">
             <ContactCard title="注册人 (Registrant)" contact={normalized.registrant} />
         </div>
         <div className="md:col-span-1">
             <ContactCard title="管理联系人 (Admin)" contact={normalized.admin} />
         </div>
         <div className="md:col-span-1">
             <ContactCard title="技术联系人 (Tech)" contact={normalized.tech} />
         </div>
      </div>

      {/* Raw Data Toggle */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <button 
          onClick={() => setShowRaw(!showRaw)}
          className="w-full flex items-center justify-between p-4 bg-secondary/10 hover:bg-secondary/20 transition-colors"
        >
          <span className="font-medium flex items-center gap-2">
            <Server className="w-4 h-4" />
            原始 Whois 数据
          </span>
          {showRaw ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {showRaw && (
          <div className="p-0 bg-zinc-950 text-zinc-50 overflow-x-auto">
             <pre className="p-4 text-xs md:text-sm font-mono leading-relaxed whitespace-pre-wrap">
               {raw || JSON.stringify(data, null, 2)}
             </pre>
          </div>
        )}
      </div>

    </div>
  )
}
