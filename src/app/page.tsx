"use client"

import { useState, useEffect } from "react"
import { WhoisForm } from "@/components/whois-form"
import { WhoisResult } from "@/components/whois-result"
import { HistoryPanel } from "@/components/history-panel"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { History, Github, X } from "lucide-react"

interface WhoisData {
  query: string
  type: string
  result: any
  timestamp: string
}

export default function Home() {
  const [currentResult, setCurrentResult] = useState<WhoisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<WhoisData[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // 从本地存储加载历史记录
  useEffect(() => {
    const savedHistory = localStorage.getItem("whois-history")
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory))
      } catch (error) {
        console.error("加载历史记录失败:", error)
      }
    }
  }, [])
  const handleQuery = async (query: string, type: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/whois", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, type }),
      })

      if (!response.ok) {
        throw new Error("查询失败")
      }

      const result = await response.json()
      const whoisData: WhoisData = {
        query,
        type,
        result: result.data,
        timestamp: new Date().toISOString(),
      }

      setCurrentResult(whoisData)
      
      // 添加到历史记录
      const newHistory = [whoisData, ...history.slice(0, 9)] // 保留最近10条记录
      setHistory(newHistory)
      
      // 保存到本地存储
      localStorage.setItem("whois-history", JSON.stringify(newHistory))
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

  const handleSelectHistory = (data: WhoisData) => {
    setCurrentResult(data)
    setShowHistory(false)
  }

  const handleClearHistory = () => {
    setHistory([])
    localStorage.removeItem("whois-history")
  }

  const handleDeleteHistoryItem = (index: number) => {
    const newHistory = history.filter((_, i) => i !== index)
    setHistory(newHistory)
    localStorage.setItem("whois-history", JSON.stringify(newHistory))
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
    <div className="min-h-screen bg-background">
      {/* 头部导航 */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Whois 查询工具</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? <X className="h-4 w-4 mr-1" /> : <History className="h-4 w-4 mr-1" />}
              {showHistory ? "关闭历史" : `历史记录 (${history.length})`}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4 mr-1" />
                GitHub
              </a>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* 查询表单 */}
            <WhoisForm onSubmit={handleQuery} loading={loading} />

            {/* 查询结果 */}
            <WhoisResult
              data={currentResult}
              onExport={handleExport}
              onShare={handleShare}
            />

            {/* 功能介绍 */}
            {!currentResult && !showHistory && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">🌍 全面支持</CardTitle>
                    <CardDescription>
                      支持域名、IPv4/IPv6地址、ASN号码和CIDR网段查询
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">📱 响应式设计</CardTitle>
                    <CardDescription>
                      完美适配移动端、平板和桌面设备，支持PWA安装
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">🌈 主题切换</CardTitle>
                    <CardDescription>
                      内置亮/暗色主题，自动匹配系统主题偏好
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">📚 历史记录</CardTitle>
                    <CardDescription>
                      本地存储查询历史，支持快速检索和重复查询
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">📦 结果导出</CardTitle>
                    <CardDescription>
                      支持查询结果导出和分享，便于保存和传播
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">🚀 高性能</CardTitle>
                    <CardDescription>
                      基于Next.js构建，支持无服务器部署和缓存优化
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            )}
          </div>

          {/* 历史记录面板 */}
          {showHistory && (
            <div className="lg:col-span-1">
              <HistoryPanel
                history={history}
                onSelectHistory={handleSelectHistory}
                onClearHistory={handleClearHistory}
                onDeleteItem={handleDeleteHistoryItem}
              />
            </div>
          )}
        </div>
      </main>

      {/* 页脚 */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© 2024 Whois 查询工具. 基于 Next.js 和 Shadcn UI 构建.</p>
        </div>
      </footer>
    </div>
  )
}
