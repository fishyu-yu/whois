import type { Page } from '@playwright/test'
import { detectQueryType, normalizeASN, normalizeIP } from '../../../src/lib/query-utils'

// Deterministic E2E fixtures only. Production always uses the existing Whois API.
export function whoisResponse(input: string) {
  const type = detectQueryType(input)
  const query = (type === 'ip' ? normalizeIP(input) : type === 'asn' ? normalizeASN(input) : input) || input
  const common = {
    creation_date: '2020-01-02T00:00:00Z', updated_date: '2024-01-02T00:00:00Z',
    registrant_name: 'Example, Inc. 网络服务', tech_email: 'network@example.test', abuse_email: 'abuse@example.test',
    registry_specific_note: `Complete field export for ${query}`,
  }
  const parsed = type === 'domain' ? {
    ...common, domain_name: query, registrar: 'Example Registrar', registry_expiry_date: '2035-01-02T00:00:00Z', name_server: ['ns1.example.test'], domain_status: ['ok'],
  } : {
    ...common, [type === 'ip' ? 'ip_address' : 'asn']: query,
    network_name: 'EXAMPLE-NET', organization: 'Example, Inc. 网络服务', registry: 'ARIN', status: ['active'],
    ...(type === 'ip' ? {
      ip_version: query.includes(':') ? 'v6' : 'v4',
      ip_range: query.includes(':') ? '2001:4860:: - 2001:4860:ffff:ffff:ffff:ffff:ffff:ffff' : '8.8.8.0 - 8.8.8.255',
      cidr: query.includes(':') ? ['2001:4860::/32'] : ['8.8.8.0/24'],
    } : { asn_range: query }),
  }
  return { success: true, query, type, data: { query, type, parsed, raw: JSON.stringify(parsed, null, 2), dataSource: type === 'domain' ? 'rdap-registry' : 'rdap-rir' } }
}

export async function mockWhoisApi(page: Page) {
  await page.route('**/api/whois', async route => {
    const { query } = route.request().postDataJSON()
    if (query === '8.8.4.4') {
      await route.fulfill({ status: 502, json: { success: false, error: 'RDAP 查询超时，请稍后重试', data: null } })
      return
    }
    await route.fulfill({ json: whoisResponse(query) })
  })
}
