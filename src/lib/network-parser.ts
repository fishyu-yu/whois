import { parseRDAPResponse } from './rdap-parser'
import { parseWhoisResult, type WhoisFields } from './whois-parser'
import { ipRange, normalizeASN, parseIP } from './query-utils'

export class NetworkQueryError extends Error {
  constructor(message: string, public status = 502) { super(message) }
}

export function assertNetworkRDAP(data: any, query: string, type: 'ip' | 'asn') {
  if (!data || data.objectClassName !== (type === 'ip' ? 'ip network' : 'autnum')) {
    throw new NetworkQueryError('RDAP 服务未返回有效的网络记录')
  }
  if (type === 'ip') {
    const requested = ipRange(query)!
    const start = parseIP(data.startAddress || '')
    const end = parseIP(data.endAddress || '')
    if (!start || !end || start.family !== requested.family || end.family !== requested.family || start.value > requested.start || end.value < requested.end) {
      throw new NetworkQueryError('RDAP 返回的 IP 范围与查询不匹配')
    }
  } else {
    const number = Number(query.slice(2))
    if (!Number.isInteger(data.startAutnum) || !Number.isInteger(data.endAutnum) || data.startAutnum < 0 || data.endAutnum > 4294967295 || data.startAutnum > number || data.endAutnum < number) {
      throw new NetworkQueryError('RDAP 返回的 ASN 范围与查询不匹配')
    }
  }
}

export function parseNetworkRDAP(data: any, query: string, type: 'ip' | 'asn'): WhoisFields {
  assertNetworkRDAP(data, query, type)
  const common = parseRDAPResponse(data)
  const parsed: WhoisFields = {}
  for (const [key, value] of Object.entries(common)) {
    if (value && !['domain_name', 'registry_domain_id', 'domain_status', 'registrar_whois_server', 'registrar_abuse_contact_email', 'registrar_abuse_contact_phone'].includes(key)) parsed[key] = value
  }
  const put = (key: string, value: any) => { if (value !== undefined && value !== null && value !== '') parsed[key] = Array.isArray(value) ? value.map(String) : String(value) }
  put(type === 'ip' ? 'ip_address' : 'asn', query)
  put('handle', data.handle)
  put('network_name', data.name)
  put('network_type', data.type)
  put('country', data.country)
  put('status', data.status)
  put('whois_server', data.port43)
  put('organization', common.registrant_organization || common.registrant_name)
  put('abuse_email', common.registrar_abuse_contact_email)
  put('abuse_phone', common.registrar_abuse_contact_phone)
  if (type === 'ip') {
    put('ip_version', data.ipVersion || (parseIP(query)?.family === 4 ? 'v4' : 'v6'))
    put('start_address', data.startAddress)
    put('end_address', data.endAddress)
    put('ip_range', `${data.startAddress} - ${data.endAddress}`)
    put('parent_handle', data.parentHandle)
    const cidrs = data.cidr0_cidrs?.map((cidr: any) => `${cidr.v4prefix || cidr.v6prefix}/${cidr.length}`)
    if (cidrs?.length) put('cidr', cidrs)
  } else {
    put('asn_range', data.startAutnum === data.endAutnum ? `AS${data.startAutnum}` : `AS${data.startAutnum} - AS${data.endAutnum}`)
  }
  const remarks = data.remarks?.flatMap((remark: any) => remark.description || [])
  if (remarks?.length) put('remarks', remarks)
  return parsed
}

export function parseNetworkWhois(raw: string, query: string, type: 'ip' | 'asn'): WhoisFields {
  if (/^(?:%\s*)?(?:ERROR:\s*101:|no (?:match|entries|data|objects?)\b|not found\b)/im.test(raw)) {
    throw new NetworkQueryError('未找到该 IP/ASN 的注册记录', 404)
  }
  let parsed = parseWhoisResult(raw)
  // ARIN's CIDR search can return parent and child records together. Keep the
  // most-specific enclosing record and its own organization/contact block.
  if (type === 'ip') {
    const positions = [...raw.matchAll(/^NetRange:/gim)].map(match => match.index!)
    if (positions.length > 1) {
      const requested = ipRange(query)!
      let bestSize: bigint | undefined
      for (let i = 0; i < positions.length; i++) {
        const block = parseWhoisResult(raw.slice(positions[i], positions[i + 1]))
        if (typeof block.netrange !== 'string') continue
        const [first, last] = block.netrange.split(/\s*-\s*/)
        const start = parseIP(first)
        const end = parseIP(last || '')
        if (!start || !end || start.family !== requested.family || end.family !== requested.family || start.value > requested.start || end.value < requested.end) continue
        const size = end.value - start.value
        if (bestSize === undefined || size <= bestSize) { bestSize = size; parsed = block }
      }
      if (bestSize === undefined) throw new NetworkQueryError('WHOIS 返回的 IP 范围与查询不匹配')
    }
  }
  const first = (...keys: string[]) => {
    for (const key of keys) if (parsed[key]) return Array.isArray(parsed[key]) ? parsed[key][0] : parsed[key]
    return undefined
  }
  if (type === 'ip') {
    const range = first('netrange', 'inetnum', 'inet6num', 'cidr')
    const requested = ipRange(query)!
    const ends = range?.split(/\s*-\s*/)
    const start = ends?.length === 2 ? parseIP(ends[0]) : null
    const end = ends?.length === 2 ? parseIP(ends[1]) : null
    const returned = range ? ipRange(range) : null
    if (!(start && end && start.family === requested.family && end.family === requested.family && start.value <= requested.start && end.value >= requested.end)
      && !(returned && returned.family === requested.family && returned.start <= requested.start && returned.end >= requested.end)) {
      throw new NetworkQueryError('WHOIS 服务未返回匹配的 IP 记录（可能限流或暂不可用）')
    }
    parsed.ip_address = query
    parsed.ip_range = range!
    parsed.ip_version = `v${requested.family}`
  } else {
    const range = first('aut_num', 'asnumber')
    const ends = range?.split(/\s*-\s*/).map(part => normalizeASN(part))
    const number = Number(query.slice(2))
    if (!ends?.[0] || number < Number(ends[0].slice(2)) || number > Number((ends[1] || ends[0]).slice(2))) {
      throw new NetworkQueryError('WHOIS 服务未返回匹配的 ASN 记录（可能限流或暂不可用）')
    }
    parsed.asn = query
    parsed.asn_range = range!
  }
  const aliases: Record<string, string | undefined> = {
    network_name: first('netname', 'asname', 'as_name'),
    organization: first('orgname', 'org_name', 'owner', 'descr', 'organization', 'org'),
    handle: first('nethandle', 'handle'),
    creation_date: first('regdate', 'created', 'creation_date'),
    updated_date: first('updated', 'last_modified', 'changed', 'updated_date'),
    abuse_email: first('orgabuseemail', 'abuse_mailbox'),
    abuse_phone: first('orgabusephone'),
    tech_email: first('orgtechemail'), tech_phone: first('orgtechphone'),
    tech_name: first('orgtechname'),
  }
  for (const [key, value] of Object.entries(aliases)) if (value) parsed[key] = value
  return parsed
}
