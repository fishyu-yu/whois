import { NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import net from "net"
import { validateDomain, formatDomainDisplay, DomainValidationResult, getDomainWhoisServer } from "@/lib/domain-utils"
import { getCCTLDInfo, isCCTLD } from "@/lib/cctld-database"
import { queryDomainRDAP, isRDAPSupported } from "@/lib/rdap-client"
import { parseRDAPResponse, rdapToWhoisText } from "@/lib/rdap-parser"

const execAsync = promisify(exec)


// 简单的内存缓存
/**
 * 文件：src/app/api/whois/route.ts
 * 用途：提供域名 WHOIS/RDAP 查询的 API 路由，包含输入校验、RDAP 优先策略、注册商/注册局回退逻辑、结果缓存与标准 WHOIS 兼容。
 * 作者：Ryan
 * 创建日期：2025-09-25
 * 修改记录：
 * - 2025-09-25：添加中文 JSDoc 文件头与函数注释，补充关键逻辑与重要变量说明。
 */
const cache = new Map<string, { data: any; timestamp: number }>()
/** 缓存 TTL（毫秒），默认 5 分钟 */
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

interface WhoisRequest {
  query: string
  type: string
  dataSource?: string
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

  // 支持域名、IP、ASN 查询类型
  if (!["domain", "ip", "asn"].includes(type)) {
    return { valid: false, error: "不支持的查询类型" }
  }

  // 基本的安全检查，防止命令注入
  if (/[;&|`$(){}[\\]\\]/.test(trimmedQuery)) {
    return { valid: false, error: "查询内容包含非法字符" }
  }

  return { valid: true }
}

// 执行whois查询
async function performWhoisQuery(query: string, type: string, dataSource?: string): Promise<any> {
  const cacheKey = `${type}:${query}:${dataSource || 'rdap'}`
  
  // 检查缓存
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    let result: any = null
    
    // 对于域名查询，根据指定的数据源进行查询
    if (type === "domain") {
      // 取消提前“不支持后缀”判断，先尝试 RDAP（包含 IANA 引导），再按优先级回退到 WHOIS
      // 原逻辑：
      // const rdapSupported = isRDAPSupported(query)
      // const hasWhoisServer = !!getDomainWhoisServer(query)
      // if (!rdapSupported && !hasWhoisServer) {
      //   throw new Error("暂不支持该后缀")
      // }

      // 根据数据源选择查询方式
      if (!dataSource || dataSource === "rdap") {
        // 默认使用 RDAP，失败或无结果则回退到 WHOIS
        try {
          const rdapData = await queryDomainRDAP(query)
          if (rdapData) {
            const parsedData = parseRDAPResponse(rdapData)
            const whoisText = rdapToWhoisText(parsedData)
            const actualDataSource = rdapData.rdapSource === 'registrar' ? 'rdap-registrar' : 'rdap-registry'
            result = {
              raw: whoisText,
              parsed: parsedData,
              query,
              type,
              timestamp: new Date().toISOString(),
              dataSource: actualDataSource,
              rdapSource: rdapData.rdapSource,
              rdapRegistryRaw: (rdapData as any).registryRaw || null,
              rdapRegistrarRaw: (rdapData as any).registrarRaw || null
            }
          }
        } catch (e: any) {
          if (e?.message === 'RDAP_NOT_FOUND') {
            throw new Error('域名未注册')
          }
          console.warn(`RDAP 查询失败，回退到 WHOIS: ${e?.message || e}`)
        }

        // 如果 RDAP 未得到结果，则回退到 WHOIS
        if (!result) {
          try {
            result = await performDomainWhoisWithPriority(query)
          } catch (fallbackErr) {
            console.warn(`注册局/注册商 WHOIS 回退失败，改用标准 WHOIS: ${fallbackErr}`)
          }

          if (!result) {
            result = await performStandardWhoisQuery(query, type)
          }
        }
      } else if (dataSource === "whois") {
        // 强制使用传统WHOIS
        result = await performStandardWhoisQuery(query, type)
      } else if (dataSource === "registrar") {
        // 优先使用注册商数据
        result = await performDomainWhoisWithPriority(query)
        if (result) {
          result.dataSource = "registrar"
        }
      } else if (dataSource === "registry") {
        // 优先使用注册局数据
        result = await performDomainWhoisWithPriority(query)
        if (result) {
          result.dataSource = "registry"
        }
      } else {
        // 自动选择 (默认行为)
        // 直接尝试RDAP查询（支持动态引导），失败或不支持则回退到WHOIS
        try {
          const rdapData = await queryDomainRDAP(query)
          if (rdapData) {
            const parsedData = parseRDAPResponse(rdapData)
            const whoisText = rdapToWhoisText(parsedData)
            const actualDataSource = rdapData.rdapSource === 'registrar' ? 'rdap-registrar' : 'rdap-registry'
            result = {
              raw: whoisText,
              parsed: parsedData,
              query,
              type,
              timestamp: new Date().toISOString(),
              dataSource: actualDataSource,
              rdapSource: rdapData.rdapSource,
              rdapRegistryRaw: (rdapData as any).registryRaw || null,
              rdapRegistrarRaw: (rdapData as any).registrarRaw || null
            }
          }
        } catch (rdapError: any) {
          if (rdapError?.message === 'RDAP_NOT_FOUND') {
            throw new Error('域名未注册')
          }
          console.error(`RDAP查询失败，回退到WHOIS: ${rdapError}`)
        }
        
        // 如果RDAP失败或不支持，使用传统WHOIS
        if (!result) {
          result = await performDomainWhoisWithPriority(query)
        }
      }
    } else {
      // 非域名查询使用原有逻辑
      result = await performStandardWhoisQuery(query, type)
    }

    // 缓存结果
    cache.set(cacheKey, { data: result, timestamp: Date.now() })

    return result
  } catch (error: any) {
    // 如果系统没有 whois 命令，不再返回模拟数据，改为结构化错误
    if (error?.message?.includes("whois") && error?.message?.includes("not found")) {
      if (type === "domain") {
        const validation = validateDomain(query)
        const tld = (validation as DomainValidationResult)?.tld || null
        const rdapSupported = tld ? isRDAPSupported(tld) : false
        const hasWhoisServer = !!getDomainWhoisServer(query)
        if (!rdapSupported && !hasWhoisServer) {
          throw new Error(`暂不支持该后缀（.${tld || '未知'}）`)
        }
      }
      throw new Error("系统未安装 whois，请使用 RDAP 或安装 whois 工具后重试")
    }
    throw error
  }
}

// 域名查询优先级逻辑：优先注册商，回退到注册局
async function performDomainWhoisWithPriority(query: string): Promise<any> {
  let registrarResult: any = null
  let registryResult: any = null
  let finalResult: any = null

  const domainValidation = validateDomain(query)
  const isCountryTLD = isCCTLD(query)
  const cctldInfo = isCountryTLD ? getCCTLDInfo(query) : null

  try {
    // 第一步：尝试获取注册局基本信息（优先选择专用WHOIS服务器；ccTLD 走 TCP 43）
    const preferredServer = isCountryTLD ? (cctldInfo?.whoisServer || null) : (getDomainWhoisServer(query) || null)
    let registryStdout = ''
    if (preferredServer) {
      try {
        registryStdout = await tcpWhoisQuery(preferredServer, query)
      } catch (tcpErr) {
        console.warn(`TCP WHOIS 注册局查询失败，回退系统whois: ${tcpErr}`)
        const { stdout } = await execAsync(`whois -h ${preferredServer} "${query}"`, { timeout: 15000, maxBuffer: 1024 * 1024 })
        registryStdout = stdout
      }
    } else {
      const { stdout } = await execAsync(`whois "${query}"`, { timeout: 15000, maxBuffer: 1024 * 1024 })
      registryStdout = stdout
    }

    // 未注册判断（注册局原文）
    if (isDomainUnregisteredFromWhois(registryStdout)) {
      throw new Error('域名未注册')
    }

    registryResult = {
      raw: registryStdout,
      parsed: parseWhoisResult(registryStdout, "domain"),
      source: "registry",
      domainInfo: { validation: domainValidation, isCountryTLD, cctldInfo }
    }

    // 第二步：尝试从注册商获取详细信息（优先 TCP 43）
    const registrarServer = extractRegistrarWhoisServer(registryStdout)
    if (registrarServer) {
      try {
        const registrarStdout = await tcpWhoisQuery(registrarServer, query)
        // 未注册判断（注册商原文）
        if (isDomainUnregisteredFromWhois(registrarStdout)) {
          throw new Error('域名未注册')
        }
        registrarResult = {
          raw: registrarStdout,
          parsed: parseWhoisResult(registrarStdout, "domain"),
          source: "registrar",
          domainInfo: { validation: domainValidation, isCountryTLD, cctldInfo }
        }
      } catch (registrarTcpErr) {
        console.warn(`TCP WHOIS 注册商查询失败，尝试系统whois: ${registrarTcpErr}`)
        try {
          const { stdout: registrarStdout } = await execAsync(`whois -h ${registrarServer} "${query}"`, { timeout: 15000, maxBuffer: 1024 * 1024 })
          if (isDomainUnregisteredFromWhois(registrarStdout)) {
            throw new Error('域名未注册')
          }
          registrarResult = {
            raw: registrarStdout,
            parsed: parseWhoisResult(registrarStdout, "domain"),
            source: "registrar",
            domainInfo: { validation: domainValidation, isCountryTLD, cctldInfo }
          }
        } catch (registrarError) {
          console.warn(`注册商查询失败: ${registrarError}`)
        }
      }
    }

    // 第三步：决定使用哪个结果
    if (registrarResult && hasRichContactData(registrarResult.parsed)) {
      finalResult = { ...registrarResult, query, type: "domain", timestamp: new Date().toISOString(), dataSource: "registrar" }
    } else if (registryResult) {
      finalResult = { ...registryResult, query, type: "domain", timestamp: new Date().toISOString(), dataSource: "registry" }
    } else {
      throw new Error("无法获取域名信息")
    }

    return finalResult
  } catch (error) {
    const fallbackResult = await performStandardWhoisQuery(query, "domain")
    if (fallbackResult) {
      fallbackResult.domainInfo = { validation: domainValidation, isCountryTLD, cctldInfo }
    }
    return fallbackResult
  }
}

// 标准Whois查询（原有逻辑）
async function performStandardWhoisQuery(query: string, type: string): Promise<any> {
  let command: string
  
  switch (type) {
    case "domain":
      command = `whois "${query}"`
      break
    default:
      command = `whois "${query}"`
  }

  const { stdout, stderr } = await execAsync(command, {
    timeout: 30000,
    maxBuffer: 1024 * 1024
  })

  if (stderr && !stdout) {
    throw new Error(stderr)
  }

  // 未注册判断（标准WHOIS原文）
  if (type === 'domain' && isDomainUnregisteredFromWhois(stdout)) {
    throw new Error('域名未注册')
  }

  return {
    raw: stdout,
    parsed: parseWhoisResult(stdout, type),
    query,
    type,
    timestamp: new Date().toISOString(),
    dataSource: "standard"
  }
}

// 从注册局响应中提取注册商Whois服务器
function extractRegistrarWhoisServer(whoisOutput: string): string | null {
  const lines = whoisOutput.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim().toLowerCase()
    
    // 常见的注册商Whois服务器字段
    if (trimmedLine.startsWith('registrar whois server:') ||
        trimmedLine.startsWith('whois server:') ||
        trimmedLine.startsWith('registrar whois:')) {
      const server = line.split(':')[1]?.trim()
      if (server && server.includes('.')) {
        return server
      }
    }
  }
  
  return null
}

// 检查解析结果是否包含丰富的联系信息
function hasRichContactData(parsed: any): boolean {
  if (!parsed || typeof parsed !== 'object') {
    return false
  }

  // 检查是否有详细的联系信息字段
  const contactFields = [
    'registrant_name', 'registrant_email', 'registrant_phone',
    'admin_name', 'admin_email', 'admin_phone',
    'tech_name', 'tech_email', 'tech_phone',
    'registrant contact', 'administrative contact', 'technical contact'
  ]

  const hasContactInfo = contactFields.some(field => {
    const value = parsed[field] || parsed[field.replace('_', ' ')]
    return value && value.toString().trim().length > 0
  })

  return hasContactInfo
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
        const cleanKey = key.trim().toLowerCase().replace(/[\s\/-]+/g, "_")
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
// 新增：判断 WHOIS 原文是否表示未注册
function isDomainUnregisteredFromWhois(raw: string): boolean {
  const text = (raw || '').toLowerCase()
  const patterns = [
    'no match for',
    'not found',
    'no entries found',
    'no data found',
    'the queried object does not exist',
    'status: available',
    'domain available',
    'no object found',
    'available',
    'not been registered'
  ]
  return patterns.some(p => text.includes(p))
}

// 模拟数据功能已删除
export async function POST(request: NextRequest) {
  let requestBody: WhoisRequest | null = null
  let rawBody: string | null = null

  try {
    // 通过克隆请求体来分别尝试 json 和 text，避免重复读取导致的错误
    const jsonReq = request.clone()
    try {
      requestBody = await jsonReq.json()
    } catch {
      const textReq = request.clone()
      rawBody = await textReq.text()
      try {
        requestBody = JSON.parse(rawBody) as WhoisRequest
      } catch {
        return NextResponse.json(
          {
            query: '',
            type: 'unknown',
            success: false,
            error: '请求体不是有效的 JSON',
            data: null,
            timestamp: Date.now(),
          },
          { status: 400 }
        )
      }
    }

    if (!requestBody) {
      return NextResponse.json(
        {
          query: '',
          type: 'unknown',
          success: false,
          error: '请求体为空',
          data: null,
          timestamp: Date.now(),
        },
        { status: 400 }
      )
    }

    const { query, type: rawType, dataSource } = requestBody
    const type = rawType || 'domain'

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
          timestamp: Date.now(),
        },
        { status: 400 }
      )
    }

    // 执行查询，传递数据源参数
    const result = await performWhoisQuery(query.trim(), type, dataSource)

    return NextResponse.json({
      query: query.trim(),
      type: type,
      success: true,
      data: result,
      error: null,
      timestamp: Date.now(),
    })
  } catch (error: any) {
    console.error('Whois查询错误:', error)

    const msg = String(error?.message || '')
    const isNotSupported = msg.includes('暂不支持')
    const isUnregistered = msg.includes('未注册')
    const status = isUnregistered ? 404 : (isNotSupported ? 400 : 500)

    return NextResponse.json(
      {
        query: requestBody?.query || 'unknown',
        type: requestBody?.type || 'unknown',
        success: false,
        error: error?.message || '查询失败，请稍后重试',
        data: null,
        timestamp: Date.now(),
      },
      { status }
    )
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
    const msg = String(error?.message || '')
    const isNotSupported = msg.includes('暂不支持')
    const isUnregistered = msg.includes('未注册')
    const status = isUnregistered ? 404 : (isNotSupported ? 400 : 500)
    
    return NextResponse.json(
      { 
        error: "查询失败",
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status }
    )
  }
}

// 纯 Node TCP 43 WHOIS 查询，避免依赖系统 whois 命令
async function tcpWhoisQuery(server: string, query: string, port = 43, timeoutMs = 12000): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const socket = new net.Socket()
    let timedOut = false

    const cleanup = () => {
      try { socket.destroy() } catch {}
    }

    socket.setTimeout(timeoutMs)

    socket.on('timeout', () => {
      timedOut = true
      cleanup()
      reject(new Error(`WHOIS TCP timeout after ${timeoutMs}ms`))
    })

    socket.on('error', (err) => {
      cleanup()
      reject(err)
    })

    socket.connect(port, server, () => {
      const payload = `${query}\r\n`
      socket.write(payload, 'utf8')
    })

    socket.on('data', (data) => {
      chunks.push(Buffer.from(data))
    })

    socket.on('end', () => {
      if (timedOut) return
      const raw = Buffer.concat(chunks).toString('utf8')
      resolve(raw)
    })

    socket.on('close', () => {
      // 如果close时还没有返回且没有timeout，尝试返回现有数据
      if (!timedOut && chunks.length > 0) {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw)
      }
    })
  })
}