import net from 'node:net'
import { getDomainWhoisServer, validateDomain } from './domain-utils'
import { getCCTLDInfo } from './cctld-database'
import { assertWhoisDomainResponse } from './whois-parser'

export function formatWhoisQuery(server: string, domain: string): string {
  if (server === 'whois.jprs.jp') return `${domain}/e`
  if (server === 'whois.denic.de') return `-T dn,ace ${domain}`
  return domain
}

/** A bounded TCP request; works on Windows and Node hosts without a whois binary. */
export function tcpWhoisQuery(server: string, query: string, port = 43, timeoutMs = 12000): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    const chunks: Buffer[] = []
    let size = 0
    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.destroy()
      if (error) reject(error)
      else if (!size) reject(new Error(`WHOIS ${server} 返回空响应`))
      else resolve(Buffer.concat(chunks).toString('utf8'))
    }
    // A total deadline also bounds peers that keep streaming small chunks.
    const timer = setTimeout(() => finish(new Error(`WHOIS ${server}:${port} 连接超时，请检查 TCP ${port} 出站访问`)), timeoutMs)
    socket.on('error', error => finish(new Error(`WHOIS ${server}:${port} 连接失败：${error.message}`)))
    socket.on('data', chunk => {
      size += chunk.length
      if (size > 1024 * 1024) finish(new Error('WHOIS 响应超过 1 MiB 限制'))
      else chunks.push(Buffer.from(chunk))
    })
    socket.on('end', () => finish())
    socket.on('close', () => finish())
    socket.connect(port, server, () => socket.write(`${query}\r\n`, 'utf8'))
  })
}

function extractWhoisServer(raw: string, iana = false): string | null {
  const pattern = iana ? /^whois:\s*(\S+)\s*$/im : /^(?:registrar whois server|whois server|registrar whois):\s*(\S+)\s*$/im
  const server = raw.match(pattern)?.[1].toLowerCase()
  return server && /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(server) ? server : null
}

const discoveredServers = new Map<string, { server: string; timestamp: number }>()

export async function queryDomainWhois(domain: string, preferSource: 'registrar' | 'registry' = 'registrar') {
  const validation = validateDomain(domain)
  let server = getDomainWhoisServer(domain)
  if (!server) {
    const cached = discoveredServers.get(validation.tld)
    server = cached && Date.now() - cached.timestamp < 86400000 ? cached.server : null
    if (!server) {
      const iana = await tcpWhoisQuery('whois.iana.org', validation.tld)
      server = extractWhoisServer(iana, true)
      if (!server) throw new Error(`暂不支持该后缀（.${validation.tld}）：IANA 未提供 WHOIS 服务`)
      discoveredServers.set(validation.tld, { server, timestamp: Date.now() })
    }
  }
  const registryRaw = await tcpWhoisQuery(server, formatWhoisQuery(server, domain))
  const registryParsed = assertWhoisDomainResponse(registryRaw, domain)
  const base = {
    raw: registryRaw,
    parsed: registryParsed,
    query: domain,
    type: 'domain',
    timestamp: new Date().toISOString(),
    dataSource: 'registry',
    registryRaw,
    domainInfo: { validation, isCountryTLD: validation.isCCTLD, cctldInfo: getCCTLDInfo(validation.tld) },
  }
  const registrarServer = extractWhoisServer(registryRaw)
  if (preferSource !== 'registry' && registrarServer && registrarServer !== server) {
    try {
      const registrarRaw = await tcpWhoisQuery(registrarServer, formatWhoisQuery(registrarServer, domain))
      const registrarParsed = assertWhoisDomainResponse(registrarRaw, domain)
      return { ...base, raw: registrarRaw, parsed: { ...registryParsed, ...registrarParsed }, dataSource: 'registrar', registrarRaw }
    } catch {
      // A registrar outage or stale referral must not discard an existing registry record.
    }
  }
  return base
}
