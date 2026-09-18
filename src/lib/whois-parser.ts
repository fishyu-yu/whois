export type WhoisFields = Record<string, string | string[]>

// Keep registry-specific fields while exposing the same names as the RDAP parser.
const aliases: Record<string, string> = {
  domain: 'domain_name',
  roid: 'registry_domain_id',
  sponsoring_registrar: 'registrar',
  registrar_name: 'registrar',
  domain_name_commencement_date: 'creation_date',
  registration_time: 'creation_date',
  registered_on: 'creation_date',
  registered_date: 'creation_date',
  created: 'creation_date',
  created_on: 'creation_date',
  expiration_time: 'registry_expiry_date',
  expiry_date: 'registry_expiry_date',
  expire_date: 'registry_expiry_date',
  expires_on: 'registry_expiry_date',
  expires: 'registry_expiry_date',
  last_updated: 'updated_date',
  last_modified: 'updated_date',
  changed: 'updated_date',
  state: 'domain_status',
  status: 'domain_status',
  nserver: 'name_server',
  name_servers: 'name_server',
  registrant: 'registrant_name',
  registrant_contact_email: 'registrant_email',
}

export function parseWhoisResult(raw: string): WhoisFields {
  const parsed: WhoisFields = {}
  let blockKey = ''
  const append = (key: string, value: string) => {
    if (!value) return
    const previous = parsed[key]
    parsed[key] = previous ? [...(Array.isArray(previous) ? previous : [previous]), value] : value
  }

  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) { blockKey = ''; continue }
    if (/^\s*[%#>]/.test(line)) continue
    // JPRS uses [Domain Name] and a. [Domain Name]; Nominet uses indented blocks.
    const match = line.match(/^\s*(?:[a-z]\.\s*)?\[([^\]]+)\]\s*(.*)$/i)
      || line.match(/^\s*([^:]+):\s*(.*)$/)
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/[\s\/-]+/g, '_')
      blockKey = match[2].trim() ? '' : key
      append(key, match[2].trim())
    } else if (blockKey && /^\s+\S/.test(line)) {
      append(blockKey, line.trim())
    } else {
      blockKey = ''
    }
  }
  for (const [key, canonical] of Object.entries(aliases)) {
    if (parsed[key] && !parsed[canonical]) parsed[canonical] = parsed[key]
  }
  if (typeof parsed.domain_name === 'string' && /\s+Bundled Domain Name:/i.test(parsed.domain_name)) {
    const [domain, bundled] = parsed.domain_name.split(/\s+Bundled Domain Name:\s*/i)
    parsed.domain_name = domain.trim()
    parsed.bundled_domain_name = bundled.trim()
  }
  const nameserverBlock = raw.match(/^Name Servers Information:[ \t]*\r?\n[ \t]*\r?\n([\s\S]+?)(?:\r?\n[ \t]*\r?\n|(?![\s\S]))/im)
  if (!parsed.name_server && nameserverBlock) {
    parsed.name_server = nameserverBlock[1].trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  }
  if (parsed.domain_name_commencement_date) {
    for (const key of ['creation_date', 'registry_expiry_date']) {
      const date = parsed[key]
      if (typeof date === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(date)) {
        const [day, month, year] = date.split('-')
        parsed[key] = `${year}-${month}-${day}`
      }
    }
  }
  return parsed
}

export function isDomainUnregisteredFromWhois(raw: string): boolean {
  // Match explicit registry responses, never a word inside a disclaimer such as
  // "information available" or "service unavailable".
  return raw.split(/\r?\n/).some(line => /^(?:[%#]\s*)?(?:no matching record\.?|no match(?: for\b.*)?|not found\.?|no entries found\.?|no data found\.?|no object found\.?|the queried object does not exist\.?|status:\s*(?:available|free)|domain(?: name)?\s+.+\s+(?:is available|has not been registered)\.?)$/i.test(line.trim()))
}

export function assertWhoisDomainResponse(raw: string, domain?: string): WhoisFields {
  if (isDomainUnregisteredFromWhois(raw)) throw new Error('域名未注册')
  const parsed = parseWhoisResult(raw)
  if (!parsed.domain_name) {
    throw new Error('WHOIS 服务未返回域名记录（可能限流、拒绝访问或暂不可用）')
  }
  if (domain) {
    const names = Array.isArray(parsed.domain_name) ? parsed.domain_name : [parsed.domain_name]
    if (!names.some(name => {
      try { return new URL(`http://${name}`).hostname.toLowerCase() === domain } catch { return false }
    })) throw new Error('WHOIS 返回的域名与查询不匹配')
  }
  return parsed
}
