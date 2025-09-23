"use client"
import { createContext, useContext, useMemo, useState } from "react"

type Dict = Record<string, Record<string, string>>

const dict: Dict = {
  zh: {
    title: "Whois 查询",
    subtitle: "支持域名 / IPv4 / IPv6 / ASN / CIDR",
    query: "查询",
    exporting: "导出JSON",
    share: "分享结果",
    history: "历史记录",
    noHistory: "暂无历史记录",
    fill: "回填",
    clear: "清空",
  },
  en: {
    title: "Whois Lookup",
    subtitle: "Domains / IPv4 / IPv6 / ASN / CIDR",
    query: "Query",
    exporting: "Export JSON",
    share: "Share",
    history: "History",
    noHistory: "No history yet",
    fill: "Fill",
    clear: "Clear",
  },
}

type Lang = keyof typeof dict

const I18nCtx = createContext<{ lang: Lang; t: (k: string) => string; setLang: (l: Lang) => void } | null>(null)

export function I18nProvider({ defaultLang = "zh", children }: { defaultLang?: Lang; children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(defaultLang)
  const value = useMemo(() => ({
    lang,
    setLang,
    t: (k: string) => dict[lang][k] ?? k,
  }), [lang])
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nCtx)
  if (!ctx) throw new Error("I18nProvider missing")
  return ctx
}