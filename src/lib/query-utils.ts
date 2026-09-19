import { validateDomain } from './domain-utils'

export type QueryType = 'domain' | 'ip' | 'asn' | 'unknown'

/** Shared by the browser and API, including compressed and embedded IPv4 IPv6. */
export function parseIP(input: string): { address: string; family: 4 | 6; prefix?: number; value: bigint } | null {
  const [address, prefix, ...extra] = input.split('/')
  if (extra.length || !address || address.includes('%')) return null
  let canonical: string
  let family: 4 | 6
  let value: bigint
  if (/^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(address)) {
    family = 4
    canonical = address
    value = address.split('.').reduce((n, part) => (n << BigInt(8)) + BigInt(part), BigInt(0))
  } else {
    if (!address.includes(':') || !/^[\da-f:.]+$/i.test(address)) return null
    try { canonical = new URL(`http://[${address}]/`).hostname.slice(1, -1) } catch { return null }
    family = 6
    const halves = canonical.split('::')
    const left = halves[0] ? halves[0].split(':') : []
    const right = halves[1] ? halves[1].split(':') : []
    const parts = halves.length === 2 ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right] : left
    value = parts.reduce((n, part) => (n << BigInt(16)) + BigInt(`0x${part}`), BigInt(0))
  }
  if (prefix !== undefined && (!/^\d{1,3}$/.test(prefix) || Number(prefix) > (family === 4 ? 32 : 128))) return null
  return { address: canonical, family, value, ...(prefix === undefined ? {} : { prefix: Number(prefix) }) }
}

export function ipRange(input: string) {
  const ip = parseIP(input)
  if (!ip) return null
  const bits = ip.family === 4 ? 32 : 128
  const shift = BigInt(bits - (ip.prefix ?? bits))
  const start = (ip.value >> shift) << shift
  return { family: ip.family, start, end: start + (BigInt(1) << shift) - BigInt(1) }
}

export function normalizeIP(input: string): string | null {
  const ip = parseIP(input)
  if (!ip) return null
  if (ip.prefix === undefined) return ip.address
  const start = ipRange(input)!.start
  const address = ip.family === 4
    ? [24, 16, 8, 0].map(shift => Number((start >> BigInt(shift)) & BigInt(255))).join('.')
    : new URL(`http://[${Array.from({ length: 8 }, (_, i) => ((start >> BigInt((7 - i) * 16)) & BigInt(65535)).toString(16)).join(':')}]/`).hostname.slice(1, -1)
  return `${address}/${ip.prefix}`
}

export function normalizeASN(input: string): string | null {
  if (!/^(?:AS)?\d{1,10}$/i.test(input)) return null
  const number = Number(input.replace(/^AS/i, ''))
  return number >= 1 && number <= 4294967295 ? `AS${number}` : null
}

export function detectQueryType(input: string): QueryType {
  const value = input.trim()
  if (parseIP(value)) return 'ip'
  if (normalizeASN(value)) return 'asn'
  // Never reinterpret malformed network input as a domain.
  if (/^[\d.]+$/.test(value) || value.includes(':') || value.includes('/') || /^(?:AS)?\d+$/i.test(value)) return 'unknown'
  return validateDomain(value).isValid ? 'domain' : 'unknown'
}
