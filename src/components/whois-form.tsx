/**
 * 文件：src/components/whois-form.tsx
 * 用途：Whois 查询表单组件，负责输入、类型识别与提交
 * 作者：Ryan
 * 创建日期：2025-09-25
 * 修改记录：
 * - 2025-09-25：添加中文文件头与 JSDoc 注释
 */
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Globe, Flag } from "lucide-react"
import { validateDomain } from "@/lib/domain-utils"

/**
 * WhoisForm 组件的属性
 * @property onSubmit - 查询提交回调：(query, type, dataSource)
 * @property loading - 加载状态，禁用输入与按钮
 */
interface WhoisFormProps {
  onSubmit: (query: string, type: string, dataSource?: string) => void
  loading: boolean
}

/**
 * WhoisForm 查询表单组件
 * 负责输入交互、类型选择与触发查询
 * @param props - 组件属性
 * @returns 查询表单 UI
 */
export function WhoisForm({ onSubmit, loading }: WhoisFormProps) {
  /** 当前输入的查询字符串 */ const [query, setQuery] = useState("")
  /** 当前选择的查询类型。'auto' 自动识别；'domain' 指定域名；'ip'/'asn' 暂不支持 */ const [queryType, setQueryType] = useState("auto")
  /** 域名验证结果（仅在识别为域名时生成）；包含 isValid、errors、isCCTLD、isIDN 等字段 */ const [domainValidation, setDomainValidation] = useState<any>(null)

  /**
   * 自动检测输入的查询类型（域名 / IP / ASN / 未知）
   * 使用宽松域名正则以支持国际化域名（IDN）与 punycode 前缀 xn--
   * @param input - 待检测的字符串
   * @returns 'domain' | 'ip' | 'asn' | 'unknown'
   */
  const detectQueryType = (input: string): string => {
    // 域名检测 - 支持国际化域名和更多字符
    const domainRegex = /^[a-zA-Z0-9\u00a0-\uffff]([a-zA-Z0-9\u00a0-\uffff-]{0,61}[a-zA-Z0-9\u00a0-\uffff])?(\.[a-zA-Z0-9\u00a0-\uffff]([a-zA-Z0-9\u00a0-\uffff-]{0,61}[a-zA-Z0-9\u00a0-\uffff])?)*$|^xn--[a-zA-Z0-9-]+(\.[a-zA-Z0-9\u00a0-\uffff]([a-zA-Z0-9\u00a0-\uffff-]{0,61}[a-zA-Z0-9\u00a0-\uffff])?)*$/
    // 简单IP检测（IPv4/IPv6 近似）
    const ipv4Regex = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.)){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$/
    // ASN 检测：AS 或纯数字（不含点/冒号）
    const asnRegex = /^(AS)?\d{1,10}$/i

    if (ipv4Regex.test(input) || ipv6Regex.test(input)) return "ip"
    if (!input.includes('.') && !input.includes(':') && asnRegex.test(input)) return "asn"
    if (domainRegex.test(input)) return "domain"
    return "unknown"
  }

  /**
   * 输入变化处理：更新 query 并在识别为域名时触发验证
   * @param value - 新的输入值
   */
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

  /**
   * 表单提交：校验输入、决定查询类型并触发回调
   * - 暂不支持 IP/ASN 查询，会弹出提示
   * - 根据用户选择或自动检测决定最终类型
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    const autoDetected = detectQueryType(query.trim())
    const detectedType = queryType === "auto" ? autoDetected : queryType

    if (detectedType === "unknown") {
      alert("请输入有效的域名/IP/ASN，例如 example.com、1.1.1.1 或 AS13335")
      return
    }

    onSubmit(query.trim(), detectedType, "rdap")
  }

  /**
   * 生成类型 Badge 显示（域名/IP/未知）
   * @param input - 输入字符串
   * @returns JSX.Element | null
   */
  const getQueryTypeBadge = (input: string) => {
    if (!input.trim()) return null
    const type = detectQueryType(input.trim())
    const typeLabels = {
      domain: "域名",
      ip: "IP",
      unknown: "未知"
    }
    return (
      <Badge variant={type === "unknown" ? "destructive" : "secondary"}>
        {typeLabels[type as keyof typeof typeLabels]}
      </Badge>
    )
  }

  return (
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold">Whois 查询</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            输入域名、IP 地址或 ASN 进行查询
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="例如: example.com、1.1.1.1、AS13335"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                disabled={loading}
                className="w-full text-sm sm:text-base glass-active"
                aria-label="查询输入"
              />
              
              {/* 域名验证信息显示 */}
              {domainValidation && (
                <div className="mt-2 space-y-2 glass-enter">
                  {domainValidation.isValid ? (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1 glass-panel">
                        <Globe className="h-3 w-3" />
                        {domainValidation.type === 'domain' ? '根域名' : '子域名'}
                      </Badge>
                      
                      {domainValidation.isCCTLD && (
                        <Badge variant="secondary" className="flex items-center gap-1 glass-panel">
                          <Flag className="h-3 w-3" />
                          国家顶级域名
                        </Badge>
                      )}
                      
                      {domainValidation.isIDN && (
                        <Badge variant="secondary" className="flex items-center gap-1 glass-panel">
                          <Globe className="h-3 w-3" />
                          国际化域名
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="glass-panel p-3 rounded-[var(--radius-lg)] border-destructive/20 bg-destructive/5">
                      <p className="text-destructive text-sm font-medium">域名格式错误</p>
                      {domainValidation.errors && domainValidation.errors.length > 0 && (
                        <ul className="text-xs text-destructive/80 mt-1 space-y-1">
                          {domainValidation.errors.map((error: string, idx: number) => (
                            <li key={idx}>• {error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={queryType} onValueChange={(v) => setQueryType(v)}>
                <SelectTrigger className="w-full glass-active" aria-label="选择查询类型">
                  <SelectValue placeholder="自动识别" />
                </SelectTrigger>
                <SelectContent className="glass-panel">
                  <SelectItem value="auto">自动识别</SelectItem>
                  <SelectItem value="domain">域名</SelectItem>
                  <SelectItem value="ip">IP</SelectItem>
                  <SelectItem value="asn">ASN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              disabled={loading || !query.trim()}
              className="w-full sm:w-auto min-w-[100px] glass-active glass-hover interactive"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full ui-icon ui-icon-sm border-b-2 border-white ui-icon--before"></div>
                  查询中...
                </>
              ) : (
                <>
                  <Search className="ui-icon ui-icon-sm ui-icon--before" />
                  查询
                </>
              )}
            </Button>
          </div>

          {query.trim() && (
            <div className="glass-panel glass-enter p-3 rounded-soft">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>检测到类型:</span>
                <Badge variant="secondary" className="text-xs glass-panel">
                  {detectQueryType(query.trim())}
                </Badge>
                <span className="mx-1">•</span>
                <span>当前选择:</span>
                <Badge variant="outline" className="text-xs glass-panel">
                  {queryType}
                </Badge>
              </div>
            </div>
          )}
        </form>
      </div>
  )
}