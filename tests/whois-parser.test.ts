import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assertWhoisDomainResponse, isDomainUnregisteredFromWhois, parseWhoisResult } from '../src/lib/whois-parser'
import { formatWhoisQuery } from '../src/lib/whois-client'

test('CNNIC fields, repeated nameservers and Chinese text are preserved', () => {
  const parsed = assertWhoisDomainResponse(`Domain Name: example.cn
ROID: test-cn
Domain Status: ok
Registrant: 示例公司
Registrant Contact Email: contact@example.cn
Sponsoring Registrar: 示例注册商
Registration Time: 2020-01-02 03:04:05
Expiration Time: 2030-01-02 03:04:05
Name Server: ns1.example.cn
Name Server: ns2.example.cn`, 'example.cn')
  assert.equal(parsed.domain_name, 'example.cn')
  assert.equal(parsed.registrar, '示例注册商')
  assert.equal(parsed.registrant_name, '示例公司')
  assert.equal(parsed.creation_date, '2020-01-02 03:04:05')
  assert.equal(parsed.registry_expiry_date, '2030-01-02 03:04:05')
  assert.deepEqual(parsed.name_server, ['ns1.example.cn', 'ns2.example.cn'])
  assert.equal(parsed.roid, 'test-cn')
})

test('explicit unregistered messages do not match disclaimers or outages', () => {
  for (const text of ['No matching record.', 'No match for "example.cn".', 'NOT FOUND', 'Status: available']) {
    assert.equal(isDomainUnregisteredFromWhois(text), true, text)
  }
  for (const text of ['Service unavailable', 'Information available at https://example.cn', 'Registrant: Available Limited', 'Domain Name: available.cn']) {
    assert.equal(isDomainUnregisteredFromWhois(text), false, text)
  }
  assert.throws(() => assertWhoisDomainResponse('No matching record.'), /未注册/)
  assert.throws(() => assertWhoisDomainResponse('Service unavailable'), /未返回域名记录/)
  assert.throws(() => assertWhoisDomainResponse('Domain Name: different.cn', 'example.cn'), /不匹配/)
})

test('JPRS bracket fields and English query formatting', () => {
  const parsed = parseWhoisResult('a. [Domain Name] EXAMPLE.CO.JP\nn. [Name Server] ns.example.jp\n[Created on] 2020/01/02\n[Expires on] 2030/01/31')
  assert.equal(parsed.domain_name, 'EXAMPLE.CO.JP')
  assert.equal(parsed.name_server, 'ns.example.jp')
  assert.equal(parsed.creation_date, '2020/01/02')
  assert.equal(formatWhoisQuery('whois.jprs.jp', 'example.jp'), 'example.jp/e')
  assert.equal(formatWhoisQuery('whois.denic.de', 'example.de'), '-T dn,ace example.de')
})

test('Nominet multiline blocks and HKIRC bundled names', () => {
  const uk = parseWhoisResult('    Domain name:\n        example.co.uk\n\n    Registered on: 01-Jan-2020\n    Name servers:\n        ns1.example.uk\n        ns2.example.uk')
  assert.equal(uk.domain_name, 'example.co.uk')
  assert.deepEqual(uk.name_server, ['ns1.example.uk', 'ns2.example.uk'])
  const hk = assertWhoisDomainResponse('Domain Name: EXAMPLE.HK Bundled Domain Name: 示例.HK\nDomain Name Commencement Date: 04-05-2004\nExpiry Date: 16-11-2035\nRegistrar Name: Example\nName Servers Information:\n\nNS1.EXAMPLE.HK\nNS2.EXAMPLE.HK\n\nStatus Information:', 'example.hk')
  assert.equal(hk.domain_name, 'EXAMPLE.HK')
  assert.equal(hk.bundled_domain_name, '示例.HK')
  assert.equal(hk.creation_date, '2004-05-04')
  assert.equal(hk.registry_expiry_date, '2035-11-16')
  assert.deepEqual(hk.name_server, ['NS1.EXAMPLE.HK', 'NS2.EXAMPLE.HK'])
})
