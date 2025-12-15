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

export function WhoisForm({ onSubmit, loading, defaultValue }: WhoisFormProps) {
  const [query, setQuery] = useState(defaultValue || "")
  const [queryType, setQueryType] = useState("auto")
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

  const detectQueryType = (input: string): string => {
    const domainRegex = /^[a-zA-Z0-9\u00a0-\uffff]([a-zA-Z0-9\u00a0-\uffff-]{0,61}[a-zA-Z0-9\u00a0-\uffff])?(\.[a-zA-Z0-9\u00a0-\uffff]([a-zA-Z0-9\u00a0-\uffff-]{0,61}[a-zA-Z0-9\u00a0-\uffff])?)*$|^xn--[a-zA-Z0-9-]+(\.[a-zA-Z0-9\u00a0-\uffff]([a-zA-Z0-9\u00a0-\uffff-]{0,61}[a-zA-Z0-9\u00a0-\uffff])?)*$/
    const ipv4Regex = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.)){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$/
    const asnRegex = /^(AS)?\d{1,10}$/i

    if (ipv4Regex.test(input) || ipv6Regex.test(input)) return "ip"
    if (!input.includes('.') && !input.includes(':') && asnRegex.test(input)) return "asn"
    if (domainRegex.test(input)) return "domain"
    return "unknown"
  }

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
    const detectedType = queryType === "auto" ? autoDetected : queryType

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
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="relative group">
        <div 
          className={cn(
            "relative flex items-center w-full transition-all duration-300 rounded-2xl border bg-background/50 backdrop-blur-xl shadow-sm overflow-hidden",
            isFocused ? "ring-2 ring-primary/20 border-primary shadow-lg scale-[1.01]" : "border-border/50 hover:border-primary/50",
            validation?.isValid === false && "border-destructive ring-destructive/20"
          )}
        >
          <div className="pl-6 pr-4 py-4 flex items-center justify-center">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : getIcon()}
          </div>
          
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-muted-foreground/50 py-6 h-16 w-full"
            placeholder="请输入要查询的域名、IP 或 ASN 号码"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />

          <div className="pr-2">
            <Button 
              size="icon" 
              type="submit" 
              className={cn(
                "h-12 w-12 rounded-xl transition-all duration-300 shadow-md",
                query.trim() ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
              )}
              disabled={loading || (validation?.isValid === false)}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Validation Message */}
        <div className={cn(
          "absolute -bottom-8 left-0 text-sm font-medium transition-all duration-300 flex items-center gap-2",
          validation?.isValid === false ? "opacity-100 translate-y-0 text-destructive" : "opacity-0 -translate-y-2 pointer-events-none"
        )}>
          <AlertCircle className="w-4 h-4" />
          {validation?.message}
        </div>
      </form>

      <div className="flex flex-wrap gap-2 justify-center text-sm text-muted-foreground/80 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
        <span className="px-3 py-1 rounded-full bg-secondary/30 border border-secondary/20 hover:bg-secondary/50 cursor-pointer transition-colors" onClick={() => handleInputChange("baidu.com")}>baidu.com</span>
        <span className="px-3 py-1 rounded-full bg-secondary/30 border border-secondary/20 hover:bg-secondary/50 cursor-pointer transition-colors" onClick={() => handleInputChange("8.8.8.8")}>8.8.8.8</span>
        <span className="px-3 py-1 rounded-full bg-secondary/30 border border-secondary/20 hover:bg-secondary/50 cursor-pointer transition-colors" onClick={() => handleInputChange("AS15169")}>AS15169</span>
      </div>
    </div>
  )
}
