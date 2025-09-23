"use client"

import { useState, useEffect } from "react"
import { Search, Trash2, Clock, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface WhoisData {
  query: string
  type: string
  result: any
  timestamp: string
}

interface HistoryPanelProps {
  history: WhoisData[]
  onSelectHistory: (data: WhoisData) => void
  onClearHistory: () => void
  onDeleteItem: (index: number) => void
}

export function HistoryPanel({ 
  history, 
  onSelectHistory, 
  onClearHistory, 
  onDeleteItem 
}: HistoryPanelProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [filteredHistory, setFilteredHistory] = useState<WhoisData[]>([])

  useEffect(() => {
    let filtered = history

    // 按搜索词过滤
    if (searchTerm.trim()) {
      filtered = filtered.filter(item =>
        item.query.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 按类型过滤
    if (typeFilter !== "all") {
      filtered = filtered.filter(item => item.type === typeFilter)
    }

    setFilteredHistory(filtered)
  }, [history, searchTerm, typeFilter])

  const getTypeLabel = (type: string) => {
    const labels = {
      domain: "域名",
      ipv4: "IPv4",
      ipv6: "IPv6",
      asn: "ASN",
      cidr: "CIDR",
      unknown: "未知"
    }
    return labels[type as keyof typeof labels] || type
  }

  const getUniqueTypes = () => {
    const types = new Set(history.map(item => item.type))
    return Array.from(types)
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return "刚刚"
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString()
  }

  if (history.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            暂无查询历史记录
          </p>
          <p className="text-sm text-muted-foreground text-center mt-2">
            开始查询后，历史记录将显示在这里
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full h-fit">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-lg">查询历史</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClearHistory}
              disabled={history.length === 0}
              className="text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              清空
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索历史记录..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
            className="text-xs"
          >
            全部 ({history.length})
          </Button>
          {['domain', 'ipv4', 'ipv6', 'asn', 'cidr'].map((type) => {
            const count = history.filter(item => item.type === type).length;
            if (count === 0) return null;
            return (
              <Button
                key={type}
                variant={typeFilter === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter(type)}
                className="text-xs"
              >
                {type.toUpperCase()} ({count})
              </Button>
            );
          })}
        </div>

        <Separator />

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchTerm || typeFilter !== 'all' ? '没有找到匹配的记录' : '暂无查询历史'}
              </p>
            </div>
          ) : (
            filteredHistory.map((item, index) => (
              <div
                key={`${item.timestamp}-${index}`}
                className="group flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onSelectHistory(item)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      {getTypeLabel(item.type)}
                    </Badge>
                    <span className="text-sm font-medium truncate">
                      {item.query}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(item.timestamp)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    const originalIndex = history.findIndex(h => 
                      h.timestamp === item.timestamp && h.query === item.query
                    )
                    if (originalIndex !== -1) {
                      onDeleteItem(originalIndex)
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* 统计信息 */}
        {filteredHistory.length > 0 && (
          <>
            <Separator />
            <div className="text-xs text-muted-foreground">
              显示 {filteredHistory.length} / {history.length} 条记录
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}