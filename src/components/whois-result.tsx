"use client"

import { useState } from "react"
import { Copy, Download, Share2, Calendar, Globe, Server, User, Info, ExternalLink, Flag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"


interface WhoisData {
  query: string
  type: string
  result: any
  timestamp: string
  dataSource?: string  // 数据来源：registrar, registry, standard, rdap, rdap-registrar, rdap-registry
  rdapSource?: 'registrar' | 'registry'  // RDAP数据源类型
  domainInfo?: {       // 域名相关信息
    validation: any
    isCountryTLD: boolean
    cctldInfo: any
  }
}

interface WhoisResultProps {
  data: WhoisData | null
  onExport?: (data: WhoisData) => void
  onShare?: (data: WhoisData) => void
}

export function WhoisResult({ data, onExport, onShare }: WhoisResultProps) {
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  if (!data) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">请输入查询内容开始查询</p>
        </CardContent>
      </Card>
    )
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data.result, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("复制失败:", err)
    }
  }

  const handleExport = () => {
    if (!data) return;
    
    const exportData = {
      query: data.query,
      type: data.type,
      timestamp: data.timestamp,
      result: data.result
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whois-${data.query}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    onExport?.(data);
  };

  const handleCopyText = () => {
    if (!data) return;
    
    const textContent = `Whois查询结果
查询目标: ${data.query}
查询类型: ${data.type}
查询时间: ${new Date(data.timestamp).toLocaleString('zh-CN')}

${data.result}`;
    
    navigator.clipboard.writeText(textContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = async () => {
    if (!data) return;
    
    const shareData = {
      title: `Whois查询结果 - ${data.query}`,
      text: `查看 ${data.query} 的Whois查询结果`,
      url: window.location.href
    };
    
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        onShare?.(data);
      } catch (error) {
        // 用户取消分享或分享失败，回退到复制链接
        handleCopyLink();
      }
    } else {
      // 不支持原生分享，回退到复制链接
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('q', data?.query || '');
    url.searchParams.set('t', data?.type || '');
    
    navigator.clipboard.writeText(url.toString()).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const formatResult = (result: any): string => {
    if (typeof result === "string") {
      return result
    }
    return JSON.stringify(result, null, 2)
  }

  // 域名状态码解释
  const getStatusExplanation = (status: string) => {
    const statusMap: { [key: string]: { name: string; description: string; color: string } } = {
      'clientDeleteProhibited': {
        name: '客户端删除禁止',
        description: '注册商设置的保护状态，防止域名被意外删除',
        color: 'bg-green-100 text-green-800'
      },
      'clientTransferProhibited': {
        name: '客户端转移禁止',
        description: '注册商设置的保护状态，防止域名被转移到其他注册商',
        color: 'bg-blue-100 text-blue-800'
      },
      'clientUpdateProhibited': {
        name: '客户端更新禁止',
        description: '注册商设置的保护状态，防止域名信息被修改',
        color: 'bg-yellow-100 text-yellow-800'
      },
      'serverDeleteProhibited': {
        name: '服务器删除禁止',
        description: '注册局设置的保护状态，防止域名被删除',
        color: 'bg-green-100 text-green-800'
      },
      'serverTransferProhibited': {
        name: '服务器转移禁止',
        description: '注册局设置的保护状态，防止域名被转移',
        color: 'bg-blue-100 text-blue-800'
      },
      'serverUpdateProhibited': {
        name: '服务器更新禁止',
        description: '注册局设置的保护状态，防止域名信息被修改',
        color: 'bg-yellow-100 text-yellow-800'
      },
      'ok': {
        name: '正常状态',
        description: '域名处于正常状态，没有任何限制',
        color: 'bg-green-100 text-green-800'
      },
      'active': {
        name: '活跃状态',
        description: '域名处于活跃状态，可以正常使用',
        color: 'bg-green-100 text-green-800'
      },
      'inactive': {
        name: '非活跃状态',
        description: '域名未配置DNS服务器，无法解析',
        color: 'bg-red-100 text-red-800'
      },
      'pendingCreate': {
        name: '创建待处理',
        description: '域名注册请求正在处理中',
        color: 'bg-orange-100 text-orange-800'
      },
      'pendingDelete': {
        name: '删除待处理',
        description: '域名删除请求正在处理中',
        color: 'bg-red-100 text-red-800'
      }
    };

    // 清理状态码，移除链接和多余字符
    const cleanStatus = status.replace(/`[^`]*`/g, '').trim();
    
    return statusMap[cleanStatus] || {
      name: cleanStatus,
      description: '未知状态码',
      color: 'bg-gray-100 text-gray-800'
    };
  };

  // 解析和格式化 Whois 数据
  const parseWhoisData = (data: any) => {
    if (typeof data === 'string') {
      return { raw: data, parsed: null };
    }

    // 如果数据已经是解析后的格式
    if (data.parsed && typeof data.parsed === 'object') {
      return {
        raw: data.raw || JSON.stringify(data.parsed, null, 2),
        parsed: data.parsed
      };
    }

    return { raw: JSON.stringify(data, null, 2), parsed: data };
  };

  // 提取结构化信息
  const extractStructuredInfo = (rawData: string) => {
    const info: { [key: string]: any } = {};
    const lines = rawData.split('\n');
    
    // 字段映射 - 支持中文和英文字段
    const fieldMapping: { [key: string]: string } = {
      // 英文字段映射
      'Domain Name': '域名',
      'Registry Domain ID': '注册局域名ID',
      'Registrar WHOIS Server': '注册商WHOIS服务器',
      'Registrar URL': '注册商网址',
      'Updated Date': '更新日期',
      'Creation Date': '创建日期',
      'Registry Expiry Date': '到期日期',
      'Registrar': '注册商',
      'Registrar IANA ID': '注册商IANA ID',
      'Registrar Abuse Contact Email': '举报邮箱',
      'Registrar Abuse Contact Phone': '举报电话',
      'Domain Status': '域名状态',
      'Name Server': 'NS服务器',
      'DNSSEC': 'DNSSEC',
      'URL of the ICANN Whois Inaccuracy Complaint Form': 'ICANN投诉表单',
      'Registry': '注册局',
      // .cn域名特有字段映射（基于真实WHOIS返回格式）
      'ROID': '注册对象标识符',
      'Registrant': '注册人',
      'Registrant Contact Email': '注册人邮箱',
      'Sponsoring Registrar': '注册商',
      'Registration Time': '注册时间',
      'Expiration Time': '到期时间'
    };

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        if (value) {
          const mappedKey = fieldMapping[key] || key;
          
          // 处理多值字段
          if (['域名状态', 'NS服务器', 'Domain Status', 'Name Server'].includes(mappedKey)) {
            if (!info[mappedKey]) {
              info[mappedKey] = [];
            }
            if (Array.isArray(info[mappedKey])) {
              info[mappedKey].push(value);
            }
          } else {
            info[mappedKey] = value;
          }
        }
      }
    }
    
    return info;
  };

  // 格式化结构化信息显示
  const formatStructuredInfo = (info: { [key: string]: any }) => {
    let result = '';
    for (const [key, value] of Object.entries(info)) {
      if (Array.isArray(value)) {
        result += `${key}:\n`;
        value.forEach(item => {
          result += `  ${item}\n`;
        });
      } else {
        result += `${key}: ${value}\n`;
      }
    }
    return result;
  };

  // 获取数据来源信息
  const getDataSourceInfo = () => {
    const parsed = data.result.parsed || data.result
    const dataSource = data.dataSource || 'standard'
    
    let sourceType = ''
    let sourceName = ''
    let sourceIcon = null
    
    switch (dataSource) {
      case 'registrar':
        sourceType = '注册商数据'
        sourceName = parsed.registrar || parsed['Registrar'] || '未知注册商'
        sourceIcon = <User className="h-4 w-4" />
        break
      case 'registry':
        sourceType = '注册局数据'
        // 优先使用ccTLD信息
        if (data.domainInfo?.isCountryTLD && data.domainInfo?.cctldInfo) {
          sourceName = data.domainInfo.cctldInfo.registry || data.domainInfo.cctldInfo.country
        } else {
          // 根据域名后缀推断注册局
          if (data.query.endsWith('.com') || data.query.endsWith('.net')) {
            sourceName = 'VeriSign'
          } else if (data.query.endsWith('.org')) {
            sourceName = 'PIR (Public Interest Registry)'
          } else if (data.query.endsWith('.cn')) {
            sourceName = 'CNNIC'
          } else {
            sourceName = parsed.registry || parsed['Registry'] || '未知注册局'
          }
        }
        sourceIcon = data.domainInfo?.isCountryTLD ? <Flag className="h-4 w-4" /> : <Server className="h-4 w-4" />
        break
      case 'rdap-registrar':
        sourceType = 'RDAP注册商数据'
        sourceName = parsed.registrar || parsed['Registrar'] || 'Registration Data Access Protocol (注册商)'
        sourceIcon = <User className="h-4 w-4" />
        break
      case 'rdap-registry':
        sourceType = 'RDAP注册局数据'
        // 优先使用ccTLD信息
        if (data.domainInfo?.isCountryTLD && data.domainInfo?.cctldInfo) {
          sourceName = data.domainInfo.cctldInfo.registry || data.domainInfo.cctldInfo.country
        } else {
          // 根据域名后缀推断注册局
          if (data.query.endsWith('.com') || data.query.endsWith('.net')) {
            sourceName = 'VeriSign RDAP'
          } else if (data.query.endsWith('.org')) {
            sourceName = 'PIR RDAP'
          } else if (data.query.endsWith('.cn')) {
            sourceName = 'CNNIC RDAP'
          } else if (data.query.endsWith('.xyz')) {
            sourceName = 'CentralNic RDAP'
          } else {
            sourceName = 'Registration Data Access Protocol (注册局)'
          }
        }
        sourceIcon = data.domainInfo?.isCountryTLD ? <Flag className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />
        break
      case 'rdap':
        sourceType = 'RDAP数据'
        sourceName = 'Registration Data Access Protocol'
        sourceIcon = <ExternalLink className="h-4 w-4" />
        break
      default:
        sourceType = '标准查询'
        sourceName = 'WHOIS服务器'
        sourceIcon = <Globe className="h-4 w-4" />
    }
    
    return { sourceType, sourceName, sourceIcon }
  }

  const { sourceType, sourceName, sourceIcon } = getDataSourceInfo()

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "domain":
        return <Globe className="h-4 w-4" />
      case "ipv4":
      case "ipv6":
        return <Server className="h-4 w-4" />
      case "asn":
        return <User className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      domain: "域名",
      ipv4: "IPv4地址",
      ipv6: "IPv6地址",
      asn: "ASN号码",
      cidr: "CIDR网段",
      unknown: "未知类型"
    }
    return labels[type as keyof typeof labels] || type
  }

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg sm:text-xl">查询结果</CardTitle>
              <CardDescription className="text-sm">
                {data.query} ({data.type}) - {new Date(data.timestamp).toLocaleString('zh-CN')}
              </CardDescription>
              <div className="flex items-center gap-2 mt-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="flex items-center gap-1 cursor-help">
                      {sourceIcon}
                      {sourceType}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">数据来源详情</p>
                      <p className="text-sm">查询来源: {sourceName}</p>
                      {data.dataSource === 'rdap' && (
                        <p className="text-xs text-muted-foreground">
                          RDAP提供结构化的JSON数据，比传统WHOIS更准确
                        </p>
                      )}
                      {data.dataSource === 'registrar' && (
                        <p className="text-xs text-muted-foreground">
                          来自域名注册商的数据，通常包含详细的联系信息
                        </p>
                      )}
                      {data.dataSource === 'registry' && (
                        <p className="text-xs text-muted-foreground">
                          来自域名注册局的权威数据
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
                <span className="text-sm text-muted-foreground">
                  查询来源: {sourceName}
                </span>
              </div>
              
              {/* 显示域名验证信息 */}
              {data.domainInfo && data.type === 'domain' && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {data.domainInfo.validation?.isValid && (
                    <>
                      {data.domainInfo.validation.isSubdomain ? (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          子域名
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          根域名
                        </Badge>
                      )}
                      
                      {data.domainInfo.isCountryTLD && data.domainInfo.cctldInfo && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Flag className="h-3 w-3" />
                          {data.domainInfo.cctldInfo.country} ({data.domainInfo.cctldInfo.tld})
                        </Badge>
                      )}
                      
                      {data.domainInfo.validation.isIDN && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          国际化域名
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyText}
              >
                <Copy className="h-4 w-4 mr-1" />
                {copied ? "已复制" : "复制"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-1" />
                导出
              </Button>
              {typeof window !== 'undefined' && (navigator.share || navigator.clipboard) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  {linkCopied ? "链接已复制" : "分享"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Separator />
            
            {/* 如果是解析后的域名数据，显示格式化的信息 */}
             {(() => {
               const whoisData = parseWhoisData(data.result);
               
               // 首先尝试显示结构化格式
               if (typeof data.result === 'string') {
                 const structuredInfo = extractStructuredInfo(data.result);
                 const hasStructuredData = Object.keys(structuredInfo).length > 0;
                 
                 if (hasStructuredData) {
                   return (
                     <div className="space-y-6">
                       {/* 域名信息区块 */}
                       <Card className="p-4">
                         <h3 className="font-semibold mb-3 flex items-center">
                           <Globe className="h-4 w-4 mr-2" />
                           域名信息
                         </h3>
                         <div className="space-y-2 text-sm">
                           {structuredInfo['域名'] && (
                             <div><span className="font-medium">域名:</span> {structuredInfo['域名']}</div>
                           )}
                           {structuredInfo['创建日期'] && (
                             <div><span className="font-medium">创建日期:</span> {structuredInfo['创建日期']}</div>
                           )}
                           {structuredInfo['到期日期'] && (
                             <div><span className="font-medium">到期日期:</span> {structuredInfo['到期日期']}</div>
                           )}
                           {structuredInfo['更新日期'] && (
                             <div><span className="font-medium">更新日期:</span> {structuredInfo['更新日期']}</div>
                           )}
                           {structuredInfo['注册局'] && (
                             <div><span className="font-medium">注册局:</span> {structuredInfo['注册局']}</div>
                           )}
                         </div>
                       </Card>

                       {/* 注册商信息区块 */}
                       {(structuredInfo['注册商'] || structuredInfo['举报电话'] || structuredInfo['举报邮箱']) && (
                         <Card className="p-4">
                           <h3 className="font-semibold mb-3 flex items-center">
                             <User className="h-4 w-4 mr-2" />
                             注册商信息
                           </h3>
                           <div className="space-y-2 text-sm">
                             {structuredInfo['注册商'] && (
                               <div><span className="font-medium">注册商:</span> {structuredInfo['注册商']}</div>
                             )}
                             {structuredInfo['举报电话'] && (
                               <div><span className="font-medium">举报电话:</span> {structuredInfo['举报电话']}</div>
                             )}
                             {structuredInfo['举报邮箱'] && (
                               <div><span className="font-medium">举报邮箱:</span> {structuredInfo['举报邮箱']}</div>
                             )}
                           </div>
                         </Card>
                       )}

                       {/* DNS服务器信息区块 */}
                       {structuredInfo['NS服务器'] && (
                         <Card className="p-4">
                           <h3 className="font-semibold mb-3 flex items-center">
                             <Server className="h-4 w-4 mr-2" />
                             DNS服务器
                           </h3>
                           <div className="space-y-1 text-sm">
                             {Array.isArray(structuredInfo['NS服务器']) ? (
                               structuredInfo['NS服务器'].map((ns: string, index: number) => (
                                 <div key={index} className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                   {ns}
                                 </div>
                               ))
                             ) : (
                               <div className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                 {structuredInfo['NS服务器']}
                               </div>
                             )}
                           </div>
                         </Card>
                       )}

                       {/* 域名状态区块 */}
                       {structuredInfo['域名状态'] && (
                         <Card className="p-4">
                           <h3 className="font-semibold mb-3 flex items-center">
                             <Info className="h-4 w-4 mr-2" />
                             域名状态
                           </h3>
                           <div className="flex flex-wrap gap-2">
                             {Array.isArray(structuredInfo['域名状态']) ? (
                               (structuredInfo['域名状态'] as string[]).map((status: string, index: number) => {
                                 const statusInfo = getStatusExplanation(status);
                                 return (
                                   <Tooltip key={index}>
                                     <TooltipTrigger>
                                       <Badge 
                                         variant="secondary" 
                                         className={`${statusInfo.color} cursor-help`}
                                       >
                                         {statusInfo.name}
                                       </Badge>
                                     </TooltipTrigger>
                                     <TooltipContent>
                                       <p className="max-w-xs">{statusInfo.description}</p>
                                     </TooltipContent>
                                   </Tooltip>
                                 );
                               })
                             ) : (
                               <Badge variant="secondary">{structuredInfo['域名状态']}</Badge>
                             )}
                           </div>
                         </Card>
                       )}

                       {/* 其他信息区块 */}
                       {(() => {
                         const otherFields = Object.entries(structuredInfo).filter(([key]) => 
                           !['域名', '创建日期', '到期日期', '更新日期', '注册局', '注册商', '举报电话', '举报邮箱', 'NS服务器', '域名状态'].includes(key)
                         );
                         
                         if (otherFields.length > 0) {
                           return (
                             <Card className="p-4">
                               <h3 className="font-semibold mb-3 flex items-center">
                                 <Info className="h-4 w-4 mr-2" />
                                 其他信息
                               </h3>
                               <div className="space-y-2 text-sm">
                                 {otherFields.map(([key, value]) => (
                                   <div key={key}>
                                     <span className="font-medium">{key}:</span> {
                                       Array.isArray(value) ? value.join(', ') : String(value)
                                     }
                                   </div>
                                 ))}
                               </div>
                             </Card>
                           );
                         }
                         return null;
                       })()}

                       {/* 原始数据区块 */}
                       <Card className="p-4">
                         <h3 className="font-semibold mb-3">原始数据</h3>
                         <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                           <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap break-words overflow-x-auto">
                             {data.result}
                           </pre>
                         </div>
                       </Card>
                     </div>
                   );
                 }
               }
               
               // 如果是已解析的对象数据，显示详细卡片
               if (whoisData.parsed && typeof whoisData.parsed === 'object' && whoisData.parsed.domain_name) {
                 const parsed = whoisData.parsed;
                 
                 return (
                   <div className="space-y-6">
                     {/* 基本信息 */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <Card className="p-4">
                         <h3 className="font-semibold mb-3 flex items-center">
                           <Globe className="h-4 w-4 mr-2" />
                           基本信息
                         </h3>
                         <div className="space-y-2 text-sm">
                           <div><span className="font-medium">域名:</span> {parsed.domain_name}</div>
                           <div><span className="font-medium">注册商:</span> {parsed.registrar}</div>
                           <div><span className="font-medium">创建时间:</span> {parsed.creation_date ? new Date(parsed.creation_date).toLocaleDateString('zh-CN') : '未知'}</div>
                           <div><span className="font-medium">到期时间:</span> {parsed.registry_expiry_date ? new Date(parsed.registry_expiry_date).toLocaleDateString('zh-CN') : '未知'}</div>
                           <div><span className="font-medium">更新时间:</span> {parsed.updated_date ? new Date(parsed.updated_date).toLocaleDateString('zh-CN') : '未知'}</div>
                         </div>
                       </Card>
                       
                       <Card className="p-4">
                         <h3 className="font-semibold mb-3 flex items-center">
                           <Server className="h-4 w-4 mr-2" />
                           DNS 服务器
                         </h3>
                         <div className="space-y-1 text-sm">
                           {parsed.name_server && Array.isArray(parsed.name_server) ? (
                             parsed.name_server.map((ns: string, index: number) => (
                               <div key={index} className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                 {ns}
                               </div>
                             ))
                           ) : (
                             <div className="text-muted-foreground">无DNS服务器信息</div>
                           )}
                         </div>
                       </Card>
                     </div>

                     {/* 域名状态 */}
                     {parsed.domain_status && Array.isArray(parsed.domain_status) && (
                       <Card className="p-4">
                         <h3 className="font-semibold mb-3 flex items-center">
                           <Info className="h-4 w-4 mr-2" />
                           域名状态
                         </h3>
                         <div className="flex flex-wrap gap-2">
                           {parsed.domain_status.map((status: string, index: number) => {
                             const statusInfo = getStatusExplanation(status);
                             return (
                               <Tooltip key={index}>
                                 <TooltipTrigger>
                                   <Badge 
                                     variant="secondary" 
                                     className={`${statusInfo.color} cursor-help`}
                                   >
                                     {statusInfo.name}
                                   </Badge>
                                 </TooltipTrigger>
                                 <TooltipContent>
                                   <p className="max-w-xs">{statusInfo.description}</p>
                                 </TooltipContent>
                               </Tooltip>
                             );
                           })}
                         </div>
                       </Card>
                     )}

                     {/* 联系信息 */}
                     {(parsed.registrar_abuse_contact_email || parsed.registrar_abuse_contact_phone) && (
                       <Card className="p-4">
                         <h3 className="font-semibold mb-3 flex items-center">
                           <User className="h-4 w-4 mr-2" />
                           联系信息
                         </h3>
                         <div className="space-y-2 text-sm">
                           {parsed.registrar_abuse_contact_email && (
                             <div><span className="font-medium">滥用举报邮箱:</span> {parsed.registrar_abuse_contact_email}</div>
                           )}
                           {parsed.registrar_abuse_contact_phone && (
                             <div><span className="font-medium">滥用举报电话:</span> {parsed.registrar_abuse_contact_phone}</div>
                           )}
                         </div>
                       </Card>
                     )}

                     {/* 原始数据 */}
                     <Card className="p-4">
                       <h3 className="font-semibold mb-3">原始数据</h3>
                       <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                         <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap break-words overflow-x-auto">
                           {whoisData.raw}
                         </pre>
                       </div>
                     </Card>
                   </div>
                 );
               }
               
               // 如果不是解析后的域名数据，显示原始格式
               return (
                 <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                   <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap break-words overflow-x-auto">
                     {formatResult(data.result)}
                   </pre>
                 </div>
               );
             })()}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}