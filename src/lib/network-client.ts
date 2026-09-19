import { tcpWhoisQuery } from './whois-client'
import { ipRange, parseIP } from './query-utils'
import { NetworkQueryError, parseNetworkRDAP, parseNetworkWhois } from './network-parser'

type NetworkType = 'ip' | 'asn'
type Bootstrap = [string[], string[]][]
const registries: Record<string, { name: string; whois: string }> = {
  'rdap.arin.net': { name: 'ARIN', whois: 'whois.arin.net' },
  'rdap.db.ripe.net': { name: 'RIPE NCC', whois: 'whois.ripe.net' },
  'rdap.apnic.net': { name: 'APNIC', whois: 'whois.apnic.net' },
  'rdap.lacnic.net': { name: 'LACNIC', whois: 'whois.lacnic.net' },
  'rdap.afrinic.net': { name: 'AFRINIC', whois: 'whois.afrinic.net' },
  // LACNIC delegates Brazilian resources to NIC.br.
  'rdap.registro.br': { name: 'Registro.br · LACNIC', whois: 'whois.registro.br' },
}
const bootstrapCache = new Map<string, { services: Bootstrap; expires: number }>()
const pending = new Map<string, Promise<Bootstrap>>()

function safeRDAP(url: string) {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || !registries[parsed.hostname] || parsed.username || parsed.password || parsed.port) {
    throw new NetworkQueryError('无效的 RDAP 服务地址')
  }
  return parsed
}

async function fetchJSON(url: string, bootstrap = false): Promise<{ data: any; url: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    for (let redirects = 0; redirects < 4; redirects++) {
      if (!bootstrap) safeRDAP(url)
      const response = await fetch(url, {
        headers: { Accept: 'application/rdap+json, application/json', 'User-Agent': 'WHOIS-Tool/1.0' },
        redirect: 'manual', signal: controller.signal,
      })
      if ([301, 302, 303, 307, 308].includes(response.status) && !bootstrap) {
        const location = response.headers.get('location')
        await response.body?.cancel()
        if (!location) throw new NetworkQueryError('RDAP 转介缺少地址')
        url = new URL(location, url).href
        continue
      }
      if (!response.ok && response.status !== 404) {
        await response.body?.cancel()
        throw new NetworkQueryError(`RDAP 服务暂不可用（HTTP ${response.status}）`)
      }
      const reader = response.body?.getReader()
      if (!reader) throw new NetworkQueryError('RDAP 服务返回空响应')
      const chunks: Uint8Array[] = []
      let size = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > 2 * 1024 * 1024) {
          await reader.cancel()
          throw new NetworkQueryError('RDAP 响应超过 2 MiB 限制')
        }
        chunks.push(value)
      }
      let data: any
      try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch {
        throw new NetworkQueryError('RDAP 服务返回无效的 JSON 数据')
      }
      if (!response.ok) {
        if (response.status === 404 && !bootstrap && data?.errorCode === 404) throw new NetworkQueryError('未找到该 IP/ASN 的注册记录', 404)
        throw new NetworkQueryError(`RDAP 服务暂不可用（HTTP ${response.status}）`)
      }
      return { data, url }
    }
    throw new NetworkQueryError('RDAP 转介次数超过限制')
  } catch (error) {
    if (controller.signal.aborted) throw new NetworkQueryError('RDAP 查询超时，请稍后重试')
    if (error instanceof NetworkQueryError) throw error
    throw new NetworkQueryError('RDAP 连接失败，请稍后重试')
  } finally { clearTimeout(timer) }
}

async function loadBootstrap(kind: string): Promise<Bootstrap> {
  const cached = bootstrapCache.get(kind)
  if (cached && cached.expires > Date.now()) return cached.services
  if (pending.has(kind)) return pending.get(kind)!
  const request = (async () => {
    try {
      const { data } = await fetchJSON(`https://data.iana.org/rdap/${kind}.json`, true)
      if (!Array.isArray(data.services) || !data.services.every((entry: any) => Array.isArray(entry) && Array.isArray(entry[0]) && Array.isArray(entry[1]) && entry[0].every((value: any) => typeof value === 'string') && entry[1].every((value: any) => typeof value === 'string'))) {
        throw new NetworkQueryError('IANA 网络服务引导表格式错误')
      }
      bootstrapCache.set(kind, { services: data.services, expires: Date.now() + 86400000 })
      return data.services as Bootstrap
    } catch (error) {
      if (cached) return cached.services
      throw error
    }
  })()
  pending.set(kind, request)
  try { return await request } finally { pending.delete(kind) }
}

/** RFC 9224: most-specific enclosing prefix / ASN allocation wins. */
export function findNetworkService(services: Bootstrap, query: string, type: NetworkType): string[] {
  let bestSize: bigint | undefined
  let servers: string[] = []
  for (const [ranges, urls] of services) {
    for (const range of ranges) {
      let size: bigint
      if (type === 'ip') {
        const requested = ipRange(query)!
        const allocation = ipRange(range)
        if (!allocation || allocation.family !== requested.family || allocation.start > requested.start || allocation.end < requested.end) continue
        size = allocation.end - allocation.start
      } else {
        if (!/^\d+(?:-\d+)?$/.test(range)) continue
        const [start, last] = range.split('-').map(Number)
        const end = last ?? start
        const number = Number(query.slice(2))
        if (number < start || number > end) continue
        size = BigInt(end - start)
      }
      const valid = urls.filter(url => { try { safeRDAP(url); return true } catch { return false } })
      if (valid.length && (bestSize === undefined || size < bestSize)) { bestSize = size; servers = valid }
    }
  }
  return servers
}

export async function queryNetworkRDAP(query: string, type: NetworkType) {
  const kind = type === 'asn' ? 'asn' : parseIP(query)?.family === 4 ? 'ipv4' : 'ipv6'
  const servers = findNetworkService(await loadBootstrap(kind), query, type)
  if (!servers.length) throw new NetworkQueryError('IANA 未提供该 IP/ASN 的 RDAP 服务；可尝试 WHOIS 查询')
  let lastError: unknown
  for (const server of servers) {
    try {
      const path = type === 'asn' ? `autnum/${query.slice(2)}` : `ip/${query}`
      const { data, url } = await fetchJSON(`${server.replace(/\/+$/, '')}/${path}`)
      const parsed = parseNetworkRDAP(data, query, type)
      parsed.registry = registries[new URL(url).hostname].name
      return { query, type, parsed, raw: JSON.stringify(data, null, 2), timestamp: new Date().toISOString(), dataSource: 'rdap-rir' }
    } catch (error) {
      if (error instanceof NetworkQueryError && error.status === 404) throw error
      lastError = error
    }
  }
  throw lastError
}

export async function queryNetworkWhois(query: string, type: NetworkType) {
  const discovery = await tcpWhoisQuery('whois.iana.org', type === 'ip' ? query.split('/')[0] : query.slice(2))
  let server = discovery.match(/^whois:\s*(\S+)/im)?.[1].toLowerCase()
  const allowed = Object.values(registries)
  if (!server || !allowed.some(registry => registry.whois === server)) {
    if (/^(?:inetnum|inet6num|as-block|aut-num):/im.test(discovery) || /^(?:%\s*)?No match for /im.test(discovery)) {
      throw new NetworkQueryError('IANA 未提供该 IP/ASN 的 WHOIS 服务（可能为保留或未分配资源）', 404)
    }
    throw new NetworkQueryError('IANA WHOIS 服务未返回有效的转介记录')
  }
  const visited = new Set<string>()
  for (let hop = 0; hop < 3; hop++) {
    visited.add(server)
    const flag = type === 'asn' ? 'a' : query.includes('/') ? 'r' : 'n'
    const command = server === 'whois.arin.net' ? `${flag} + ${type === 'asn' ? query.slice(2) : query}` : query
    const raw = await tcpWhoisQuery(server, command)
    const referral = raw.match(/^(?:ReferralServer|refer):\s*(?:whois:\/\/)?([a-z0-9.-]+)(?::43)?\s*$/im)?.[1].toLowerCase()
    if (referral && allowed.some(registry => registry.whois === referral) && !visited.has(referral)) { server = referral; continue }
    const parsed = parseNetworkWhois(raw, query, type)
    parsed.registry = allowed.find(registry => registry.whois === server)!.name
    parsed.whois_server = server
    return { query, type, raw, parsed, timestamp: new Date().toISOString(), dataSource: 'whois-rir' }
  }
  throw new NetworkQueryError('WHOIS 转介次数超过限制')
}
