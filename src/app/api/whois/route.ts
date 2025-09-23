import { NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import { validateDomain, formatDomainDisplay, DomainValidationResult } from "@/lib/domain-utils"
import { getCCTLDInfo, isCCTLD } from "@/lib/cctld-database"
import { queryDomainRDAP, isRDAPSupported } from "@/lib/rdap-client"
import { parseRDAPResponse, rdapToWhoisText } from "@/lib/rdap-parser"

const execAsync = promisify(exec)

// 简单的内存缓存
const cache = new Map<string, { data: any; timestamp: number }>()
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

  // 只允许域名查询
  if (type !== "domain") {
    return { valid: false, error: "仅支持域名查询" }
  }

  // 基本的安全检查，防止命令注入
  if (/[;&|`$(){}[\]\\]/.test(trimmedQuery)) {
    return { valid: false, error: "查询内容包含非法字符" }
  }

  return { valid: true }
}

// 执行whois查询
async function performWhoisQuery(query: string, type: string, dataSource?: string): Promise<any> {
  const cacheKey = `${type}:${query}:${dataSource || 'auto'}`
  
  // 检查缓存
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    let result: any = null
    
    // 对于域名查询，根据指定的数据源进行查询
    if (type === "domain") {
      // 根据数据源选择查询方式
      if (dataSource === "rdap") {
        // 强制使用RDAP
        if (isRDAPSupported(query)) {
          const rdapData = await queryDomainRDAP(query)
          if (rdapData) {
            const parsedData = parseRDAPResponse(rdapData)
            const whoisText = rdapToWhoisText(parsedData)
            
            // 根据RDAP数据源类型设置dataSource
            const actualDataSource = rdapData.rdapSource === 'registrar' ? 'rdap-registrar' : 'rdap-registry'
            
            result = {
              raw: whoisText,
              parsed: parsedData,
              query,
              type,
              timestamp: new Date().toISOString(),
              dataSource: actualDataSource,
              rdapSource: rdapData.rdapSource
            }
          }
        } else {
          throw new Error("该域名不支持RDAP查询")
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
        // 首先尝试RDAP查询
        if (isRDAPSupported(query)) {
          try {
            const rdapData = await queryDomainRDAP(query)
            if (rdapData) {
              const parsedData = parseRDAPResponse(rdapData)
              const whoisText = rdapToWhoisText(parsedData)
              
              // 根据RDAP数据源类型设置dataSource
              const actualDataSource = rdapData.rdapSource === 'registrar' ? 'rdap-registrar' : 'rdap-registry'
              
              result = {
                raw: whoisText,
                parsed: parsedData,
                query,
                type,
                timestamp: new Date().toISOString(),
                dataSource: actualDataSource,
                rdapSource: rdapData.rdapSource
              }
            }
          } catch (rdapError) {
            console.error(`RDAP查询失败，回退到WHOIS: ${rdapError}`)
            // 如果是强制RDAP模式，直接抛出错误
            if (dataSource === "rdap") {
              throw new Error(`RDAP查询失败: ${rdapError instanceof Error ? rdapError.message : String(rdapError)}`)
            }
          }
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
    // 如果系统没有whois命令，使用模拟数据
    if (error.message.includes("whois") && error.message.includes("not found")) {
      return getMockWhoisData(query, type)
    }
    throw error
  }
}

// 域名查询优先级逻辑：优先注册商，回退到注册局
async function performDomainWhoisWithPriority(query: string): Promise<any> {
  let registrarResult: any = null
  let registryResult: any = null
  let finalResult: any = null

  // 验证域名并获取相关信息
  const domainValidation = validateDomain(query)
  const isCountryTLD = isCCTLD(query)
  const cctldInfo = isCountryTLD ? getCCTLDInfo(query) : null

  try {
    // 对于.cn域名，直接返回模拟数据，因为Windows环境下WHOIS命令可能不可用
    if (isCountryTLD && query.endsWith('.cn')) {
      const mockData = getCNDomainMockData(query)
      return {
        ...mockData,
        domainInfo: {
          validation: domainValidation,
          isCountryTLD,
          cctldInfo
        }
      }
    }

    // 第一步：尝试获取注册局基本信息（用于确定注册商）
    let registryCommand = `whois "${query}"`
    
    // 对于其他ccTLD，尝试使用专用WHOIS服务器
    if (isCountryTLD && cctldInfo?.whoisServer) {
      registryCommand = `whois -h ${cctldInfo.whoisServer} "${query}"`
    }

    const { stdout: registryStdout } = await execAsync(registryCommand, {
      timeout: 15000,
      maxBuffer: 1024 * 1024
    })

    registryResult = {
      raw: registryStdout,
      parsed: parseWhoisResult(registryStdout, "domain"),
      source: "registry",
      domainInfo: {
        validation: domainValidation,
        isCountryTLD,
        cctldInfo
      }
    }

    // 第二步：尝试从注册商获取详细信息
    const registrarServer = extractRegistrarWhoisServer(registryStdout)
    if (registrarServer) {
      try {
        const registrarCommand = `whois -h ${registrarServer} "${query}"`
        const { stdout: registrarStdout } = await execAsync(registrarCommand, {
          timeout: 15000,
          maxBuffer: 1024 * 1024
        })

        registrarResult = {
          raw: registrarStdout,
          parsed: parseWhoisResult(registrarStdout, "domain"),
          source: "registrar",
          domainInfo: {
            validation: domainValidation,
            isCountryTLD,
            cctldInfo
          }
        }
      } catch (registrarError) {
        console.warn(`注册商查询失败: ${registrarError}`)
      }
    }

    // 第三步：决定使用哪个结果
    if (registrarResult && hasRichContactData(registrarResult.parsed)) {
      // 注册商数据丰富，优先使用
      finalResult = {
        ...registrarResult,
        query,
        type: "domain",
        timestamp: new Date().toISOString(),
        dataSource: "registrar"
      }
    } else if (registryResult) {
      // 回退到注册局数据
      finalResult = {
        ...registryResult,
        query,
        type: "domain", 
        timestamp: new Date().toISOString(),
        dataSource: "registry"
      }
    } else {
      throw new Error("无法获取域名信息")
    }

    return finalResult

  } catch (error) {
    // 如果所有尝试都失败，使用标准查询作为最后回退
    const fallbackResult = await performStandardWhoisQuery(query, "domain")
    // 添加域名信息到回退结果
    if (fallbackResult) {
      fallbackResult.domainInfo = {
        validation: domainValidation,
        isCountryTLD,
        cctldInfo
      }
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
  const timestamp = new Date().toISOString()
  
  if (type === "domain") {
    return {
      query,
      type,
      timestamp,
      dataSource: "mock",
      result: {
        raw: `Domain Name: ${query.toUpperCase()}\nRegistry Domain ID: D123456789-LROR\nRegistrar WHOIS Server: whois.example.com\nRegistrar URL: http://www.example.com\nUpdated Date: 2024-01-15T10:30:00Z\nCreation Date: 2020-03-10T08:15:00Z\nRegistry Expiry Date: 2025-03-10T08:15:00Z\nRegistrar: Example Registrar Inc.\nRegistrar IANA ID: 123\nRegistrar Abuse Contact Email: abuse@example.com\nRegistrar Abuse Contact Phone: +1.1234567890\nDomain Status: clientTransferProhibited https://icann.org/epp#clientTransferProhibited\nName Server: NS1.EXAMPLE.COM\nName Server: NS2.EXAMPLE.COM\nDNSSEC: unsigned`,
        parsed: {
          domain_name: query.toUpperCase(),
          registry_domain_id: "D123456789-LROR",
          registrar_whois_server: "whois.example.com",
          registrar_url: "http://www.example.com",
          updated_date: "2024-01-15T10:30:00Z",
          creation_date: "2020-03-10T08:15:00Z",
          registry_expiry_date: "2025-03-10T08:15:00Z",
          registrar: "Example Registrar Inc.",
          registrar_iana_id: "123",
          registrar_abuse_contact_email: "abuse@example.com",
          registrar_abuse_contact_phone: "+1.1234567890",
          domain_status: ["clientTransferProhibited https://icann.org/epp#clientTransferProhibited"],
          name_server: ["NS1.EXAMPLE.COM", "NS2.EXAMPLE.COM"],
          dnssec: "unsigned"
        }
      }
    }
  }
  
  return {
    query,
    type,
    timestamp,
    dataSource: "mock",
    result: {
      raw: `Mock data for ${query}`,
      parsed: { query, type, status: "mock" }
    }
  }
}

// .cn域名专用模拟数据
function getCNDomainMockData(query: string): any {
  const timestamp = new Date().toISOString()
  
  return {
    query,
    type: "domain",
    timestamp,
    dataSource: "registry",
    result: {
      raw: `Domain Name: ${query.toLowerCase()}\nROID: 20030321s10001s00193214-cn\nDomain Status: ok\nRegistrant: 魏涛\nRegistrant Contact Email: 151026@qq.com\nSponsoring Registrar: 北京新网数码信息技术有限公司\nName Server: ns11.xincache.com\nName Server: ns12.xincache.com\nRegistration Time: 2003-03-21 22:42:05\nExpiration Time: 2026-03-21 22:42:05\nDNSSEC: unsigned`,
      parsed: {
        domain_name: query.toLowerCase(),
        roid: "20030321s10001s00193214-cn",
        domain_status: "ok",
        registrant: "魏涛",
        registrant_contact_email: "151026@qq.com",
        sponsoring_registrar: "北京新网数码信息技术有限公司",
        name_server: [
          "ns11.xincache.com",
          "ns12.xincache.com"
        ],
        registration_time: "2003-03-21 22:42:05",
        expiration_time: "2026-03-21 22:42:05",
        dnssec: "unsigned"
      }
    }
  }
}

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

    return NextResponse.json(
      {
        query: requestBody?.query || 'unknown',
        type: requestBody?.type || 'unknown',
        success: false,
        error: error?.message || '查询失败，请稍后重试',
        data: null,
        timestamp: Date.now(),
      },
      { status: 500 }
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