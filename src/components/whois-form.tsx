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
   * 自动检测输入的查询类型（域名 / IP / 未知）
   * 使用宽松域名正则以支持国际化域名（IDN）与 punycode 前缀 xn--
   * @param input - 待检测的字符串
   * @returns 'domain' | 'ip' | 'unknown'
   */
  const detectQueryType = (input: string): string => {
    // 域名检测 - 支持国际化域名和更多字符
    const domainRegex = /^[a-zA-Z0-9\u00a0-\uffff]([a-zA-Z0-9\u00a0-\uffff-]{0,61}[a-zA-Z0-9\u00a0-\uffff])?(\.[a-zA-Z0-9\u00a0-\uffff]([a-zA-Z0-9\u00a0-\uffff-]{0,61}[a-zA-Z0-9\u00a0-\uffff])?)*$|^xn--[a-zA-Z0-9-]+(\.[a-zA-Z0-9\u00a0-\uffff]([a-zA-Z0-9\u00a0-\uffff-]{0,61}[a-zA-Z0-9\u00a0-\uffff])?)*$/
    // 简单IP检测（IPv4/IPv6 近似）
    const ipv4Regex = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.)){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$/

    if (ipv4Regex.test(input) || ipv6Regex.test(input)) return "ip"
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

    // 暂不支持 IP/ASN 查询
    if (queryType === "ip" || queryType === "asn") {
      alert("当前版本暂不支持 IP 或 ASN 查询，敬请期待")
      return
    }

    const autoDetected = detectQueryType(query.trim())
    const detectedType = queryType === "auto" ? autoDetected : queryType

    if (detectedType === "unknown") {
      alert("请输入有效的域名，如 example.com")
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">Whois 查询</CardTitle>
        <CardDescription className="text-sm sm:text-base">
          输入域名进行查询（IP/ASN 功能即将支持）
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="例如: example.com 或 1.1.1.1"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                disabled={loading}
                className="w-full text-sm sm:text-base"
                aria-label="查询输入"
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

            {/* 类型选择 */}
            <div className="sm:w-40 w-full">
              <Select value={queryType} onValueChange={(v) => setQueryType(v)}>
                <SelectTrigger className="w-full" aria-label="选择查询类型">
                  <SelectValue placeholder="自动识别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">自动识别</SelectItem>
                  <SelectItem value="domain">域名</SelectItem>
                  <SelectItem value="ip" disabled>IP（暂不支持）</SelectItem>
                  <SelectItem value="asn" disabled>ASN（暂不支持）</SelectItem>
                </SelectContent>
              </Select>
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
              <span className="mx-1">•</span>
              <span>当前选择:</span>
              <Badge variant="outline" className="text-xs">
                {queryType}
              </Badge>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}