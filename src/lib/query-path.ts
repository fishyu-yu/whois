import { validateDomain } from './domain-utils'
import { detectQueryType, normalizeASN, normalizeIP } from './query-utils'

/** Accept a query or a root-relative query path in the search field. */
export function normalizeQueryInput(input: string): string {
  const value = input.trim().replace(/^\//, '')
  switch (detectQueryType(value)) {
    case 'ip': return normalizeIP(value)!
    case 'asn': return normalizeASN(value)!
    case 'domain': return validateDomain(value).punycode || value.toLowerCase()
    default: return value
  }
}

/** Keep IPv6 and CIDR readable, while escaping all other path characters. */
export function queryPath(query: string): string {
  const value = normalizeQueryInput(query)
  const encoded = encodeURIComponent(value)
  // Only valid network queries may introduce separators. Invalid paths must
  // never become a protocol-relative URL such as //example.com.
  return '/' + (detectQueryType(value) === 'ip' ? encoded.replace(/%3A/gi, ':').replace(/%2F/gi, '/') : encoded)
}

export function queryFromPath(pathname: string): string {
  const path = pathname.replace(/^\//, '').replace(/\/$/, '')
  try { return decodeURIComponent(path) } catch { return path }
}
