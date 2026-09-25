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
import { cn } from "@/lib/utils"
import { detectQueryType } from "@/lib/query-utils"
import { normalizeQueryInput } from "@/lib/query-path"
export { detectQueryType } from "@/lib/query-utils"

interface WhoisFormProps {
  onSubmit: (query: string, type: string, dataSource?: string) => void
  loading: boolean
  defaultValue?: string
}

export function WhoisForm({ onSubmit, loading, defaultValue }: WhoisFormProps) {
  const [query, setQuery] = useState(defaultValue || "")
  const detectedType = detectQueryType(normalizeQueryInput(query))
  const validation = query.trim() ? {
    isValid: detectedType !== 'unknown', type: detectedType,
    message: detectedType === 'unknown' ? '请输入有效的域名、IP / CIDR 或 ASN（1–4294967295）' : undefined,
  } : null
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (defaultValue !== undefined) setQuery(defaultValue)
  }, [defaultValue])

  const handleInputChange = (value: string) => {
    setQuery(value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || !query.trim() || (validation && !validation.isValid)) return

    const normalizedQuery = normalizeQueryInput(query)
    const autoDetected = detectQueryType(normalizedQuery)
    const detectedType = autoDetected

    if (detectedType === "unknown") {
      return
    }

    onSubmit(normalizedQuery, detectedType, "auto")
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
              aria-label="开始查询"
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
          "items-center gap-1.5 text-xs font-medium",
          validation?.isValid === false ? "mt-3 flex text-destructive" : "hidden"
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
