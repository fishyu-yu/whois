/**
 * 文件：src/components/whois-form.tsx
 * 用途：Whois 查询表单组件，负责输入、类型识别与提交
 * 作者：Ryan
 * 创建日期：2025-09-25
 * 修改记录：
 * - 2025-09-25：添加中文文件头与 JSDoc 注释
 * - 2025-12-15: 重构为现代 UI 风格
 */
"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Search, Loader2, Globe, Server, Network, AlertCircle, ArrowRight } from "lucide-react"
import { validateDomain } from "@/lib/domain-utils"
import { cn } from "@/lib/utils"

interface WhoisFormProps {
  onSubmit: (query: string, type: string, dataSource?: string) => void
  loading: boolean
  defaultValue?: string
}

export function detectQueryType(input: string): string {
  const domainRegex = /^[a-zA-Z0-9\u00a0-\uffff]([a-zA-Z0-9\u00a0-\uffff-]{0,61}[a-zA-Z0-9\u00a0-\uffff])?(\.[a-zA-Z0-9\u00a0-\uffff]([a-zA-Z0-9\u00a0-\uffff-]{0,61}[a-zA-Z0-9\u00a0-\uffff])?)*$|^xn--[a-zA-Z0-9-]+(\.[a-zA-Z0-9\u00a0-\uffff]([a-zA-Z0-9\u00a0-\uffff-]{0,61}[a-zA-Z0-9\u00a0-\uffff])?)*$/
  const ipv4Regex = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.)){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$/
  const asnRegex = /^(AS)?\d{1,10}$/i

  if (ipv4Regex.test(input) || ipv6Regex.test(input)) return "ip"
  if (!input.includes('.') && !input.includes(':') && asnRegex.test(input)) return "asn"
  if (domainRegex.test(input)) return "domain"
  return "unknown"
}

export function WhoisForm({ onSubmit, loading, defaultValue }: WhoisFormProps) {
  const [query, setQuery] = useState(defaultValue || "")
  const [validation, setValidation] = useState<{ isValid: boolean; message?: string; type?: string } | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (defaultValue) {
      handleInputChange(defaultValue)
    }
  }, []) // Run once on mount if defaultValue exists

  // If defaultValue updates (e.g. navigation), update query
  useEffect(() => {
    if (defaultValue && defaultValue !== query) {
        setQuery(defaultValue)
        handleInputChange(defaultValue)
    }
  }, [defaultValue])

  const handleInputChange = (value: string) => {
    setQuery(value)
    
    if (!value.trim()) {
      setValidation(null)
      return
    }

    const type = detectQueryType(value)
    
    if (type === "domain") {
      const res = validateDomain(value.trim())
      if (res.isValid) {
        setValidation({ isValid: true, type: "domain" })
      } else {
        setValidation({ isValid: false, message: res.errors[0], type: "domain" })
      }
    } else if (type === "ip") {
      setValidation({ isValid: true, type: "ip" })
    } else if (type === "asn") {
      setValidation({ isValid: true, type: "asn" })
    } else {
      setValidation({ isValid: false, message: "无效的查询格式", type: "unknown" })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || (validation && !validation.isValid)) return

    const autoDetected = detectQueryType(query.trim())
    const detectedType = autoDetected

    if (detectedType === "unknown") {
      setValidation({ isValid: false, message: "请输入有效的域名/IP/ASN", type: "unknown" })
      return
    }

    onSubmit(query.trim(), detectedType, "rdap")
  }

  const getIcon = () => {
    if (!validation?.type) return <Search className="w-5 h-5 text-muted-foreground" />
    switch (validation.type) {
      case "domain": return <Globe className="w-5 h-5 text-primary" />
      case "ip": return <Network className="w-5 h-5 text-primary" />
      case "asn": return <Server className="w-5 h-5 text-primary" />
      default: return <Search className="w-5 h-5 text-muted-foreground" />
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <form onSubmit={handleSubmit} className="group relative">
        <label htmlFor="whois-query" className="sr-only">域名、IP 或 ASN</label>
        <div 
          className={cn(
            "surface-shadow relative flex w-full items-center overflow-hidden rounded-lg border border-border/55 bg-card p-1.5 transition-all duration-300",
            isFocused ? "border-primary/45 ring-4 ring-primary/10" : "hover:border-foreground/15",
            validation?.isValid === false && "border-destructive/55 ring-4 ring-destructive/10"
          )}
        >
          <div className="relative z-10 flex size-11 shrink-0 items-center justify-center text-muted-foreground sm:ml-1">
            {loading ? <Loader2 className="size-5 animate-spin text-primary" /> : getIcon()}
          </div>
          
          <input
            id="whois-query"
            ref={inputRef}
            type="text"
            aria-invalid={validation?.isValid === false}
            aria-describedby={validation?.isValid === false ? "query-error" : undefined}
            className="relative z-10 h-14 min-w-0 flex-1 border-none bg-transparent px-2 text-base font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground/70 sm:px-3 sm:text-lg"
            placeholder="输入域名、IP 地址或 ASN"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />

          <div className={cn(
            "relative z-10 shrink-0 overflow-hidden transition-all duration-200",
            query.trim() ? "w-auto opacity-100" : "w-0 opacity-0"
          )}>
            <Button 
              type="submit" 
              className={cn(
                "h-11 px-4 transition-all sm:px-5",
                query.trim() ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
              )}
              disabled={loading || (validation?.isValid === false)}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              <span className="hidden sm:inline">开始查询</span>
            </Button>
          </div>
        </div>

        <div className={cn(
          "absolute -bottom-7 left-1 flex items-center gap-1.5 text-xs font-medium transition-all duration-200",
          validation?.isValid === false ? "translate-y-0 text-destructive opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
        )}>
          <AlertCircle className="size-3.5" />
          <span id="query-error" role="alert">{validation?.message}</span>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-xs text-muted-foreground">
        <span className="mr-1 font-medium">试试</span>
        {["baidu.com", "8.8.8.8", "AS15169"].map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => handleInputChange(example)}
            className="rounded-lg px-2.5 py-1.5 font-mono transition-colors hover:bg-accent hover:text-foreground"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  )
}
