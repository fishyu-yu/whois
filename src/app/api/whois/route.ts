import { NextRequest, NextResponse } from 'next/server'
import { domainToASCII } from 'node:url'
import { validateDomain } from '@/lib/domain-utils'
import { queryDomainRDAP } from '@/lib/rdap-client'
import { parseRDAPResponse, rdapToWhoisText } from '@/lib/rdap-parser'
import { queryDomainWhois } from '@/lib/whois-client'
import { detectQueryType, normalizeASN, normalizeIP } from '@/lib/query-utils'
import { queryNetworkRDAP, queryNetworkWhois } from '@/lib/network-client'
import { NetworkQueryError } from '@/lib/network-parser'

export const runtime = 'nodejs'

const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000
const SOURCES = ['auto', 'rdap', 'whois', 'registrar', 'registry'] as const
type DataSource = typeof SOURCES[number]

class QueryError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

function normalizeRequest(body: unknown) {
  if (!body || typeof body !== 'object') throw new QueryError('请求体必须是 JSON 对象', 400)
  const { query, type: requestedType, dataSource = 'auto' } = body as Record<string, unknown>
  if (typeof query !== 'string' || !query.trim()) throw new QueryError('查询内容不能为空', 400)
  let normalized = query.trim()
  const type = !requestedType || requestedType === 'auto'
    ? detectQueryType(normalized)
    : requestedType
  if (typeof dataSource !== 'string' || !SOURCES.includes(dataSource as DataSource)) {
    throw new QueryError('不支持的数据源', 400)
  }
  if (type === 'domain') {
    const validation = validateDomain(normalized)
    if (!validation.isValid) throw new QueryError(validation.errors.join('；'), 400)
    normalized = domainToASCII(normalized).toLowerCase()
    if (!normalized || !validateDomain(normalized).isValid || !/^[a-z0-9.-]+$/.test(normalized)) {
      throw new QueryError('无效的国际化域名', 400)
    }
  } else if (type === 'ip') {
    const ip = normalizeIP(normalized)
    if (!ip) {
      throw new QueryError('无效的 IP 地址或 CIDR 网段', 400)
    }
    normalized = ip
  } else if (type === 'asn') {
    const asn = normalizeASN(normalized)
    if (!asn) {
      throw new QueryError('无效的 ASN', 400)
    }
    normalized = asn
  } else {
    throw new QueryError('不支持的查询类型', 400)
  }
  if (type !== 'domain' && dataSource === 'registrar') throw new QueryError('IP/ASN 没有域名注册商数据源，请使用自动、RDAP 或 WHOIS', 400)
  return { query: normalized, type, dataSource: dataSource as DataSource }
}

async function performQuery(query: string, type: string, dataSource: DataSource) {
  const key = `${type}:${query}:${dataSource}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data

  let result: any
  if (type === 'domain') {
    if (dataSource === 'auto' || dataSource === 'rdap') {
      try {
        const rdap = await queryDomainRDAP(query)
        if (!rdap) throw new Error('RDAP 服务未返回域名记录')
        const parsed = parseRDAPResponse(rdap)
        result = {
          query, type, raw: rdapToWhoisText(parsed), parsed,
          timestamp: new Date().toISOString(),
          dataSource: rdap.rdapSource === 'registrar' ? 'rdap-registrar' : 'rdap-registry',
          rdapSource: rdap.rdapSource,
          rdapRegistryRaw: rdap.registryRaw || null,
          rdapRegistrarRaw: rdap.registrarRaw || null,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message === 'RDAP_NOT_FOUND') throw new QueryError('域名未注册', 404)
        if (dataSource === 'rdap') {
          throw new QueryError(`RDAP 查询不可用：${message}。可切换到自动或 WHOIS 数据源。`, 502)
        }
      }
    }
    // All domain WHOIS paths use Node TCP, including explicit WHOIS and GET.
    if (!result) result = await queryDomainWhois(query, dataSource === 'registry' ? 'registry' : 'registrar')
  } else {
    const networkType = type as 'ip' | 'asn'
    if (dataSource === 'auto' || dataSource === 'rdap') {
      try { result = await queryNetworkRDAP(query, networkType) } catch (error) {
        // Some RIR RDAP services intermittently return 404 for allocated
        // resources. In auto mode, confirm through WHOIS before reporting it.
        if (dataSource === 'rdap') throw error
      }
    }
    if (!result) result = await queryNetworkWhois(query, networkType)
  }
  // Bound memory and never cache failures or empty responses.
  if (cache.size >= 500) cache.delete(cache.keys().next().value!)
  cache.set(key, { data: result, timestamp: Date.now() })
  return result
}

async function handleQuery(body: unknown) {
  let query = ''
  let type = 'unknown'
  try {
    const input = normalizeRequest(body)
    query = input.query
    type = input.type
    const data = await performQuery(query, type, input.dataSource)
    return NextResponse.json({ query, type, success: true, data, error: null, timestamp: Date.now() })
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询失败，请稍后重试'
    const status = error instanceof QueryError || error instanceof NetworkQueryError ? error.status
      : message.includes('未注册') ? 404 : message.includes('暂不支持') ? 400 : 502
    return NextResponse.json({ query, type, success: false, error: message, data: null, timestamp: Date.now() }, { status })
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ success: false, error: '请求体不是有效的 JSON', data: null }, { status: 400 })
  }
  return handleQuery(body)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  return handleQuery({
    query: searchParams.get('q'),
    type: searchParams.get('type') || 'auto',
    dataSource: searchParams.get('dataSource') || 'auto',
  })
}
