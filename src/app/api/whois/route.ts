import { NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

// 简单的内存缓存
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

interface WhoisRequest {
  query: string
  type: string
}

// 验证输入
function validateInput(query: string, type: string): { valid: boolean; error?: string } {
  if (!query || typeof query !== "string") {
    return { valid: false, error: "查询内容不能为空" }
  }

  const trimmedQuery = query.trim()
  if (trimmedQuery.length === 0) {
    return { valid: false, error: "查询内容不能为空" }
  }

  // 基本的安全检查，防止命令注入
  if (/[;&|`$(){}[\]\\]/.test(trimmedQuery)) {
    return { valid: false, error: "查询内容包含非法字符" }
  }

  return { valid: true }
}

// 执行whois查询
async function performWhoisQuery(query: string, type: string): Promise<any> {
  const cacheKey = `${type}:${query}`
  
  // 检查缓存
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    let command: string
    
    switch (type) {
      case "domain":
        command = `whois "${query}"`
        break
      case "ipv4":
      case "ipv6":
        command = `whois "${query}"`
        break
      case "asn":
        // ASN查询通常需要特殊处理
        const asnNumber = query.replace(/^AS/i, "")
        command = `whois "AS${asnNumber}"`
        break
      case "cidr":
        command = `whois "${query}"`
        break
      default:
        command = `whois "${query}"`
    }

    const { stdout, stderr } = await execAsync(command, {
      timeout: 30000, // 30秒超时
      maxBuffer: 1024 * 1024 // 1MB缓冲区
    })

    if (stderr && !stdout) {
      throw new Error(stderr)
    }

    const result = {
      raw: stdout,
      parsed: parseWhoisResult(stdout, type),
      query,
      type,
      timestamp: new Date().toISOString()
    }

    // 缓存结果
    cache.set(cacheKey, { data: result, timestamp: Date.now() })

    return result
  } catch (error: any) {
    // 如果系统没有whois命令，使用模拟数据
    if (error.message.includes("whois") && error.message.includes("not found")) {
      return getMockWhoisData(query, type)
    }
    throw error
  }
}

// 解析whois结果
function parseWhoisResult(raw: string, type: string): any {
  const lines = raw.split("\n").filter(line => line.trim())
  const parsed: any = {}

  for (const line of lines) {
    if (line.includes(":")) {
      const [key, ...valueParts] = line.split(":")
      const value = valueParts.join(":").trim()
      if (key && value) {
        const cleanKey = key.trim().toLowerCase().replace(/\s+/g, "_")
        if (parsed[cleanKey]) {
          if (Array.isArray(parsed[cleanKey])) {
            parsed[cleanKey].push(value)
          } else {
            parsed[cleanKey] = [parsed[cleanKey], value]
          }
        } else {
          parsed[cleanKey] = value
        }
      }
    }
  }

  return parsed
}

// 模拟数据（用于演示）
function getMockWhoisData(query: string, type: string): any {
  const mockData = {
    domain: {
      domain_name: query,
      registrar: "示例注册商",
      creation_date: "2020-01-01",
      expiration_date: "2025-01-01",
      name_servers: ["ns1.example.com", "ns2.example.com"],
      status: "ACTIVE"
    },
    ipv4: {
      ip_address: query,
      network: "192.168.0.0/24",
      organization: "示例组织",
      country: "CN",
      city: "北京"
    },
    ipv6: {
      ip_address: query,
      network: "2001:db8::/32",
      organization: "示例组织",
      country: "CN"
    },
    asn: {
      asn: query,
      organization: "示例ASN组织",
      country: "CN",
      description: "示例ASN描述"
    },
    cidr: {
      network: query,
      organization: "示例网络组织",
      country: "CN",
      description: "示例网络描述"
    }
  }

  return {
    raw: `模拟 ${type} 查询结果 for ${query}`,
    parsed: mockData[type as keyof typeof mockData] || { query, type, note: "模拟数据" },
    query,
    type,
    timestamp: new Date().toISOString(),
    mock: true
  }
}

export async function POST(request: NextRequest) {
  let requestBody: WhoisRequest | null = null;
  
  try {
    requestBody = await request.json()
    
    if (!requestBody) {
      return NextResponse.json(
        { 
          query: '',
          type: 'unknown',
          success: false,
          error: '请求体为空',
          data: null,
          timestamp: Date.now()
        },
        { status: 400 }
      )
    }

    const { query, type } = requestBody

    // 验证输入
    const validation = validateInput(query, type)
    if (!validation.valid) {
      return NextResponse.json(
        { 
          query: query || '',
          type: type || 'unknown',
          success: false,
          error: validation.error,
          data: null,
          timestamp: Date.now()
        },
        { status: 400 }
      )
    }

    // 执行查询
    const result = await performWhoisQuery(query.trim(), type)

    return NextResponse.json({
      query: query.trim(),
      type: type,
      success: true,
      data: result,
      error: null,
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error("Whois查询错误:", error)
    
    return NextResponse.json({
      query: requestBody?.query || 'unknown',
      type: requestBody?.type || 'unknown',
      success: false,
      error: "查询失败，请稍后重试",
      data: null,
      timestamp: Date.now()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const type = searchParams.get("type") || "auto"

  if (!query) {
    return NextResponse.json(
      { error: "缺少查询参数 q" },
      { status: 400 }
    )
  }

  try {
    const result = await performWhoisQuery(query, type)
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error("Whois查询错误:", error)
    
    return NextResponse.json(
      { 
        error: "查询失败",
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}