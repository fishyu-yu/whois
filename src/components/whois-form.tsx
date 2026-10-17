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

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Search, Loader2, Globe, Server, Network, AlertCircle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { detectQueryType } from "@/lib/query-utils"
import { normalizeQueryInput } from "@/lib/query-path"
import { validateDomain } from "@/lib/domain-utils"
export { detectQueryType } from "@/lib/query-utils"

interface WhoisFormProps {
  onSubmit: (query: string, type: string, dataSource?: string) => void
  loading: boolean
  defaultValue?: string
  compact?: boolean
}

export function WhoisForm({ onSubmit, loading, defaultValue, compact = false }: WhoisFormProps) {
  const [query, setQuery] = useState(defaultValue || "")
  const { normalizedQuery, detectedType, isNormalizedSubdomain } = useMemo(() => {
    const normalizedQuery = normalizeQueryInput(query)
    const detectedType = detectQueryType(normalizedQuery)
    const domainValidation = detectedType === "domain" ? validateDomain(query.trim().replace(/^\//, "")) : null
    return { normalizedQuery, detectedType, isNormalizedSubdomain: domainValidation?.type === "subdomain" }
  }, [query])
  const [isFocused, setIsFocused] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const composingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasQuery = Boolean(query.trim())
  const isValid = hasQuery && detectedType !== "unknown"
  const showError = hasQuery && !isValid && !isComposing
  const typeLabel = !isValid ? "自动识别查询类型" : detectedType === "domain" ? "域名" : detectedType === "asn" ? "ASN" : normalizedQuery.includes("/") ? "CIDR 网段" : "IP 地址"

  useEffect(() => {
    if (defaultValue !== undefined) setQuery(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || composingRef.current) return
      const isSlash = event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey
      const isCommandK = event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey
      if (!isSlash && !isCommandK) return

      // Leave typing and keyboard controls owned by existing editors and popovers alone.
      const target = event.target instanceof Element ? event.target : document.activeElement
      if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"]')) return
      if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"], [role="menu"][data-state="open"], [role="listbox"]')) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener("keydown", focusSearch)
    return () => document.removeEventListener("keydown", focusSearch)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (composingRef.current || !isValid) return
    onSubmit(normalizedQuery, detectedType, "auto")
  }

  const getIcon = () => {
    switch (detectedType) {
      case "domain": return <Globe className="size-5" />
      case "ip": return <Network className="size-5" />
      case "asn": return <Server className="size-5" />
      default: return <Search className="size-5" />
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <form onSubmit={handleSubmit} className="group relative" aria-busy={loading}>
        <label htmlFor="whois-query" className="sr-only">域名、IP 或 ASN</label>
        <div 
          className={cn(
            "surface-shadow relative w-full rounded-2xl border border-border bg-card p-2 transition-[border-color,box-shadow] duration-150 sm:rounded-[1.4rem] sm:p-2.5",
            isFocused ? "border-primary/60 ring-4 ring-primary/10" : "hover:border-foreground/25",
            showError && "border-destructive/60 ring-2 ring-destructive/10"
          )}
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <div aria-hidden="true" className={cn("flex size-11 shrink-0 items-center justify-center text-muted-foreground", isValid && "text-primary")}>
              {getIcon()}
            </div>
          
          <input
            id="whois-query"
            ref={inputRef}
            type="text"
            aria-invalid={showError}
            aria-describedby={showError ? "query-error" : isNormalizedSubdomain ? "query-domain-hint" : undefined}
            aria-keyshortcuts="/ Control+k Meta+k"
            className={cn("h-14 min-w-0 flex-1 border-none bg-transparent px-1 font-mono text-base text-foreground outline-none placeholder:font-sans placeholder:text-sm placeholder:text-muted-foreground sm:px-2 sm:text-lg sm:placeholder:text-base", compact && "h-12")}
            placeholder="输入域名、IP 地址或 ASN"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onCompositionStart={() => {
              composingRef.current = true
              setIsComposing(true)
            }}
            onCompositionEnd={() => {
              composingRef.current = false
              setIsComposing(false)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (composingRef.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) event.preventDefault()
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />

            <Button 
              type="submit" 
              aria-label="开始查询"
              title={loading ? "继续查询将替换当前请求" : "开始查询"}
              className="size-11 rounded-xl p-0 sm:w-24 sm:px-4"
              disabled={!isValid || isComposing}
            >
              {loading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <ArrowRight aria-hidden="true" className="size-4" />}
              <span className="hidden sm:inline">查询</span>
            </Button>
          </div>
          {!compact && (
            <div className="flex min-h-8 items-center justify-between gap-3 px-3 pb-1 pt-1 text-xs text-muted-foreground">
              <span>{typeLabel}</span>
              <span className="hidden items-center gap-1.5 sm:inline-flex" aria-hidden="true">
                <kbd className="rounded border border-border px-1.5 py-0.5 font-sans text-[10px]">Enter</kbd>
                查询
              </span>
            </div>
          )}
        </div>

        <div className={cn(
          "items-center gap-1.5 text-xs font-medium",
          showError ? "mt-3 flex text-destructive" : "hidden"
        )}>
          <AlertCircle aria-hidden="true" className="size-3.5 shrink-0" />
          <span id="query-error" role="alert">{showError ? "请输入有效的域名、IP / CIDR 或 ASN（1–4294967295）" : ""}</span>
        </div>
        {isNormalizedSubdomain && (
          <p id="query-domain-hint" className="mt-3 text-center text-xs text-muted-foreground" aria-live="polite">
            将查询注册域名 <span className="font-mono font-medium text-foreground">{normalizedQuery}</span>（已自动移除子域名）
          </p>
        )}
      </form>
      {!compact && <div className="flex flex-wrap items-center justify-center gap-1 text-xs text-muted-foreground sm:gap-2">
        <span className="mr-1">试试</span>
        {["google.com", "8.8.8.8", "AS15169"].map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setQuery(example)
              inputRef.current?.focus()
            }}
            className="min-h-11 rounded-lg px-2.5 font-mono transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {example}
          </button>
        ))}
      </div>}
    </div>
  )
}
