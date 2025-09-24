"use client"

import { useState } from "react"
import { WhoisForm } from "@/components/whois-form"
import { WhoisResult } from "@/components/whois-result"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Github } from "lucide-react"

interface WhoisData {
  query: string
  type: string
  result: any
  timestamp: string
}

export default function Home() {
  const [currentResult, setCurrentResult] = useState<WhoisData | null>(null)
  const [loading, setLoading] = useState(false)

  const handleQuery = async (query: string, type: string, dataSource?: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/whois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, type, dataSource: "rdap" }),
      });

      if (!response.ok) {
        let message = "查询失败"
        try {
          const err = await response.json()
          message = err?.error || err?.details || message
        } catch {}

        setCurrentResult({
          query,
          type,
          result: { error: message },
          timestamp: new Date().toISOString(),
        })
        return
      }

      const result = await response.json()
      const whoisData: WhoisData = {
        query,
        type,
        result: result.data,
        timestamp: new Date().toISOString(),
      }

      setCurrentResult(whoisData)
    } catch (error) {
      console.error("查询错误:", error)
      setCurrentResult({
        query,
        type,
        result: { error: "查询失败，请稍后重试" },
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = (data: WhoisData) => {
    const exportData = {
      query: data.query,
      type: data.type,
      result: data.result,
      timestamp: data.timestamp,
      exported_at: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `whois-${data.query}-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleShare = async (data: WhoisData) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Whois 查询结果 - ${data.query}`,
          text: `查询对象: ${data.query}\n类型: ${data.type}\n时间: ${new Date(data.timestamp).toLocaleString()}`,
          url: window.location.href,
        })
      } catch (error) {
        console.error("分享失败:", error)
      }
    } else {
      // 降级到复制链接
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert("链接已复制到剪贴板")
      } catch (error) {
        console.error("复制失败:", error)
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 头部导航（整体居中、对称） */}
      <header className="border-b safe-top">
        <div className="container mx-auto px-4 py-6">
           <div className="flex flex-col items-center gap-3">
             <h1 className="text-2xl font-bold text-center">Whois 查询工具</h1>
             <div className="flex items-center justify-center gap-2">
               <Button variant="outline" size="sm" asChild>
                 <a href="https://github.com/fishyu-yu/whois" target="_blank" rel="noopener noreferrer">
                   <Github className="h-4 w-4 mr-1" />
                   GitHub
                 </a>
               </Button>
               <ThemeToggle />
             </div>
           </div>
         </div>
       </header>

       {/* 主要内容（垂直+水平居中） */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 safe-bottom">
         <div className="w-full max-w-2xl mx-auto space-y-8">
           {/* 中心聚焦卡片：表单 + 结果 */}
           <Card className="w-full shadow-md rounded-xl">
             <CardContent className="space-y-6">
               <WhoisForm onSubmit={handleQuery} loading={loading} />
               <WhoisResult
                 data={currentResult}
                 onExport={() => currentResult && handleExport(currentResult)}
                 onShare={() => currentResult && handleShare(currentResult)}
               />
             </CardContent>
           </Card>

          {/* 已移除功能介绍区块，保持页面简洁聚焦 */}
         </div>
       </main>

       {/* 页脚 */}
       <footer className="border-t mt-8">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground space-y-3 safe-bottom">
           <div className="space-y-1">
             <p>© 2025 Ryan Hang & Whale Education Co., Ltd. All rights reserved.</p>
           </div>
           <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
             <a 
               href="https://github.com/fishyu-yu/whois" 
               target="_blank" 
               rel="noopener noreferrer"
               className="flex items-center gap-1 hover:text-foreground transition-colors"
             >
               <Github className="h-4 w-4" />
               GitHub 项目
             </a>
             <span className="hidden sm:inline">•</span>
             <span>基于 Next.js 和 Shadcn UI 构建</span>
             <span className="hidden sm:inline">•</span>
             <span>Licensed under AGPL-3.0</span>
           </div>
         </div>
       </footer>
    </div>
  )
}
