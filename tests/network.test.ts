import assert from 'node:assert/strict'
import net from 'node:net'
import { after, before, test, mock } from 'node:test'
import { NextRequest } from 'next/server'
import { GET, POST } from '../src/app/api/whois/route'
import { detectQueryType, normalizeIP, normalizeASN, parseIP } from '../src/lib/query-utils'
import { findNetworkService } from '../src/lib/network-client'
import { parseNetworkRDAP, parseNetworkWhois } from '../src/lib/network-parser'
import { csvContent, exportBasename } from '../src/lib/export-utils'

test('browser/API input validation: compressed IPv6, mapped addresses, CIDR, ASN limits and whitespace', () => {
  for (const query of ['8.8.8.8', ' 8.8.8.8 ', '2001:4860::8888', '::', '::1', '::ffff:192.0.2.1', '8.8.8.8/0', '8.8.8.8/32', '2001:4860::1/128']) assert.equal(detectQueryType(query), 'ip', query)
  for (const query of ['AS1', 'as0000015169', '4294967295', ' 15169 ']) assert.equal(detectQueryType(query), 'asn', query)
  for (const query of ['AS0', '0', 'AS4294967296', 'AS-1', '1.2.3.256', '1.2.3.04', '1.2.3', '1.1.1.1/', '1.1.1.1/33', '1.1.1.1/-1', '1.1.1.1/2/3', '2001:::1', '::/129', 'fe80::1%eth0', '8.8.8.8\nAS1']) assert.equal(detectQueryType(query), 'unknown', query)
  for (const query of ['baidu.cn', '中文.cn', 'as123.example']) assert.equal(detectQueryType(query), 'domain', query)
  assert.equal(normalizeIP('8.8.8.9/24'), '8.8.8.0/24')
  assert.equal(normalizeIP('2001:4860:4860::8888/32'), '2001:4860::/32')
  assert.equal(normalizeASN('as0000015169'), 'AS15169')
  for (const query of ['::', '::1', '::ffff:192.0.2.1', '1:2:3:4:5:6:7:8']) assert.equal(parseIP(query)?.family, net.isIP(query))
})

test('IANA selection uses enclosing range and longest prefix, checks IPv6 family and HTTPS endpoints', () => {
  const arin = ['https://rdap.arin.net/registry/']
  const apnic = ['https://rdap.apnic.net/']
  assert.deepEqual(findNetworkService([[['8.0.0.0/8'], arin], [['8.8.0.0/16'], apnic]], '8.8.8.8', 'ip'), apnic)
  assert.deepEqual(findNetworkService([[['8.8.8.0/24'], arin]], '8.8.0.0/16', 'ip'), [])
  assert.deepEqual(findNetworkService([[['2001:4860::/32'], arin]], '2001:4860::1', 'ip'), arin)
  assert.deepEqual(findNetworkService([[['0.0.0.0/0'], arin]], '::1', 'ip'), [])
  assert.deepEqual(findNetworkService([[['100-200'], arin], [['151'], apnic]], 'AS151', 'asn'), apnic)
  assert.deepEqual(findNetworkService([[['0.0.0.0/0'], ['http://rdap.arin.net/', 'https://127.0.0.1/', 'https://rdap.arin.net:123/']]], '8.8.8.8', 'ip'), [])
})

const entity = (role: string, name: string, email: string) => ({ objectClassName: 'entity', roles: [role], vcardArray: ['vcard', [['fn', {}, 'text', name], ['email', {}, 'text', email]]] })
const ipFixture = (start = '8.8.8.0', end = '8.8.8.255') => ({
  objectClassName: 'ip network', startAddress: start, endAddress: end, name: 'EXAMPLE-NET', handle: 'NET-EXAMPLE', status: ['active'], country: 'US',
  events: [{ eventAction: 'registration', eventDate: '2020-01-02T00:00:00Z' }, { eventAction: 'last changed', eventDate: '2024-02-03T00:00:00Z' }],
  entities: [{ ...entity('registrant', 'Example Network', 'owner@example.test'), entities: [entity('abuse', 'Abuse', 'abuse@example.test')] }],
})
const asnFixture = (number = 15169) => ({ ...ipFixture(), objectClassName: 'autnum', startAutnum: number, endAutnum: number })

test('RDAP parser preserves network facts, nested contacts and dates without domain-only fields', () => {
  const parsed = parseNetworkRDAP(ipFixture(), '8.8.8.8', 'ip')
  assert.equal(parsed.ip_range, '8.8.8.0 - 8.8.8.255')
  assert.equal(parsed.organization, 'Example Network')
  assert.equal(parsed.abuse_email, 'abuse@example.test')
  assert.equal(parsed.creation_date, '2020-01-02T00:00:00Z')
  assert.equal(parsed.updated_date, '2024-02-03T00:00:00Z')
  assert.equal(parsed.domain_name, undefined)
  assert.equal(parsed.domain_status, undefined)
  assert.equal(parseNetworkRDAP(asnFixture(), 'AS15169', 'asn').asn, 'AS15169')
  for (const value of [{}, { errorCode: 429 }, { ...ipFixture(), startAddress: '1.1.1.0' , endAddress: '1.1.1.255' }, { ...ipFixture(), endAddress: '8.8.8.7' }]) assert.throws(() => parseNetworkRDAP(value, '8.8.8.8', 'ip'))
  assert.throws(() => parseNetworkRDAP(ipFixture(), '8.8.0.0/16', 'ip'))
  assert.throws(() => parseNetworkRDAP(asnFixture(1), 'AS15169', 'asn'))
  assert.throws(() => parseNetworkRDAP({ ...asnFixture(), startAutnum: '15169' }, 'AS15169', 'asn'))
})

test('WHOIS parser handles ARIN, RIPE/APNIC/AFRINIC and LACNIC formats and rejects service errors', () => {
  assert.equal(parseNetworkWhois('NetRange: 8.8.8.0 - 8.8.8.255\nNetName: GOGL\nOrgName: Example, Inc.\nRegDate: 2020-01-01\nUpdated: 2024-01-01\n', '8.8.8.8', 'ip').organization, 'Example, Inc.')
  assert.equal(parseNetworkWhois('inet6num: 2001:4860::/32\nnetname: EXAMPLE\n', '2001:4860::1', 'ip').ip_version, 'v6')
  assert.equal(parseNetworkWhois('aut-num: AS15169\nas-name: EXAMPLE\n', 'AS15169', 'asn').network_name, 'EXAMPLE')
  assert.equal(parseNetworkWhois('ASNumber: 100 - 200\nASName: EXAMPLE\n', 'AS151', 'asn').asn_range, '100 - 200')
  assert.equal(parseNetworkWhois('inetnum: 200.1.0.0/16\nowner: Example Brasil\n', '200.1.2.3', 'ip').organization, 'Example Brasil')
  for (const raw of ['Service unavailable', '%ERROR:201: access denied', 'NetRange: 1.1.1.0 - 1.1.1.255', 'Domain Name: example.com', '']) assert.throws(() => parseNetworkWhois(raw, '8.8.8.8', 'ip'))
  assert.throws(() => parseNetworkWhois('%ERROR:101: no entries found', 'AS15169', 'asn'), { status: 404 })
  const multi = 'NetRange: 8.0.0.0 - 8.255.255.255\nNetName: PARENT\nOrgName: Parent Registry\n\nNetRange: 8.8.8.0 - 8.8.8.255\nNetName: CHILD\nOrgName: Actual Holder\n'
  const specific = parseNetworkWhois(multi, '8.8.8.128/25', 'ip')
  assert.equal(specific.network_name, 'CHILD')
  assert.equal(specific.organization, 'Actual Holder')
  assert.equal(parseNetworkWhois(multi, '8.8.0.0/16', 'ip').network_name, 'PARENT')
  assert.throws(() => parseNetworkWhois(multi, '9.9.9.9', 'ip'))
})

test('CSV quoting preserves commas, multiline data, Chinese text and safe filenames', () => {
  assert.equal(csvContent([['组织', 'Example, "Inc."'], ['备注', 'line1\nline2'], ['字段', '=1+1']]), '\uFEFF"组织","Example, ""Inc."""\r\n"备注","line1\nline2"\r\n"字段","\'=1+1"')
  assert.equal(exportBasename('2001:4860::/32'), 'whois-2001_4860___32')
})

const calls: string[] = []
const hosts: string[] = []
const whoisCalls: { server: string; query: string }[] = []
const sockets = new Set<net.Socket>()
let respond: (url: string, init?: RequestInit) => Response | Promise<Response>
let whoisRespond: (query: string, server: string) => string
const server = net.createServer(socket => {
  sockets.add(socket)
  socket.on('close', () => sockets.delete(socket))
  const host = hosts.shift()!
  socket.once('data', chunk => {
    const query = chunk.toString().trim()
    whoisCalls.push({ server: host, query })
    socket.end(whoisRespond(query, host))
  })
})

before(async () => {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as net.AddressInfo).port
  const original = net.Socket.prototype.connect
  mock.method(net.Socket.prototype, 'connect', function (this: net.Socket, ...args: any[]) {
    if (args[0] === 43) { hosts.push(args[1]); return Reflect.apply(original, this, [{ port, host: '127.0.0.1' }, args[2]]) }
    return Reflect.apply(original, this, args)
  })
  mock.method(globalThis, 'fetch', async (input: string, init?: RequestInit) => {
    calls.push(input)
    if (input.startsWith('https://data.iana.org/')) {
      const range = input.endsWith('asn.json') ? '1-4294967295' : input.endsWith('ipv6.json') ? '::/0' : '0.0.0.0/0'
      return Response.json({ services: [[[range], ['https://rdap.arin.net/registry/']]] })
    }
    return respond(input, init)
  })
})
after(async () => {
  mock.restoreAll()
  for (const socket of sockets) socket.destroy()
  await new Promise<void>(resolve => server.close(() => resolve()))
})

function post(query: string, dataSource = 'rdap', type = 'auto') {
  return POST(new NextRequest('http://localhost/api/whois', { method: 'POST', body: JSON.stringify({ query, dataSource, type }) }))
}

test('GET and POST return canonical network records, normalize CIDR and cache successes', async () => {
  respond = url => Response.json(url.includes('/autnum/') ? asnFixture() : url.includes('2001:') ? ipFixture('2001:4860::', '2001:4860:ffff:ffff:ffff:ffff:ffff:ffff') : ipFixture())
  for (const query of ['8.8.8.8', '8.8.8.9/24', '2001:4860::8888', 'as0000015169']) {
    const response = await post(query)
    assert.equal(response.status, 200, JSON.stringify(await response.clone().json()))
    const body = await response.json()
    assert.equal(body.data.dataSource, 'rdap-rir')
    assert.equal(body.data.parsed.registry, 'ARIN')
    assert.equal(body.query, query === 'as0000015169' ? 'AS15169' : query === '8.8.8.9/24' ? '8.8.8.0/24' : query)
    const before = calls.length
    assert.equal((await GET(new NextRequest(`http://localhost/api/whois?q=${encodeURIComponent(query)}&dataSource=rdap`))).status, 200)
    assert.equal(calls.length, before)
  }
  assert.ok(calls.some(url => url.endsWith('/ip/8.8.8.0/24')))
  assert.ok(calls.some(url => url.endsWith('/autnum/15169')))
})

test('invalid requests and registrar source never reach upstream', async () => {
  const count = calls.length + whoisCalls.length
  for (const [query, type] of [['1.1.1.1/33', 'ip'], ['::/129', 'ip'], ['AS0', 'asn'], ['4294967296', 'asn'], ['bad\r\ninput', 'ip'], ['1.2.3.999', 'auto']]) assert.equal((await post(query, 'auto', type)).status, 400)
  assert.equal((await post('8.8.8.8', 'registrar')).status, 400)
  assert.equal(calls.length + whoisCalls.length, count)
})

test('authoritative 404 is not cached; HTML 404, 429, malformed and oversized payloads remain 502', async () => {
  respond = () => Response.json({ errorCode: 404 }, { status: 404 })
  assert.equal((await post('8.8.8.10')).status, 404)
  for (const response of [new Response('<html>Not found</html>', { status: 404 }), Response.json({}, { status: 429 }), Response.json({}), new Response(''), new Response('x'.repeat(2 * 1024 * 1024 + 1))]) {
    respond = () => response
    assert.equal((await post('8.8.8.10')).status, 502)
  }
  respond = () => Response.json(ipFixture())
  assert.equal((await post('8.8.8.10')).status, 200)
})

test('strict RDAP never falls back; auto falls back to native TCP and WHOIS/registry honor their source', async () => {
  respond = () => Response.json({ errorCode: 503 }, { status: 503 })
  whoisRespond = (query, host) => host === 'whois.iana.org' ? 'whois: whois.arin.net\n' : 'NetRange: 8.8.8.0 - 8.8.8.255\nNetName: EXAMPLE\n'
  const count = whoisCalls.length
  assert.equal((await post('8.8.8.11', 'rdap')).status, 502)
  assert.equal(whoisCalls.length, count)
  for (const source of ['auto', 'whois', 'registry']) {
    const response = await post('8.8.8.11', source)
    assert.equal(response.status, 200)
    assert.equal((await response.json()).data.dataSource, 'whois-rir')
  }
  respond = () => Response.json({ errorCode: 404 }, { status: 404 })
  const confirmed = await post('8.8.8.12', 'auto')
  assert.equal(confirmed.status, 200)
  assert.equal((await confirmed.json()).data.dataSource, 'whois-rir')
  assert.ok(whoisCalls.some(call => call.query === 'n + 8.8.8.11'))
  assert.equal((await post('8.8.8.128/25', 'whois')).status, 200)
  assert.ok(whoisCalls.some(call => call.query === 'r + 8.8.8.128/25'))
  whoisRespond = (query, host) => host === 'whois.iana.org' ? 'whois: whois.arin.net\n' : 'ASNumber: 13335\nASName: CLOUDFLARE\n'
  assert.equal((await post('AS13335', 'whois')).status, 200)
  assert.ok(whoisCalls.some(call => call.query === 'a + 13335'))
})

test('RDAP cross-RIR redirect is followed and attributed correctly, arbitrary and looping referrals are bounded', async () => {
  respond = url => url.includes('arin.net') ? new Response(null, { status: 301, headers: { location: 'https://rdap.apnic.net/ip/1.1.1.1' } }) : Response.json(ipFixture('1.1.1.0', '1.1.1.255'))
  const response = await post('1.1.1.1')
  assert.equal(response.status, 200)
  assert.equal((await response.json()).data.parsed.registry, 'APNIC')
  respond = url => url.includes('arin.net') ? new Response(null, { status: 307, headers: { location: 'https://rdap.registro.br/autnum/28573' } }) : Response.json(asnFixture(28573))
  const delegated = await post('AS28573')
  assert.equal(delegated.status, 200)
  assert.equal((await delegated.json()).data.parsed.registry, 'Registro.br · LACNIC')
  respond = () => new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } })
  assert.equal((await post('1.1.1.2')).status, 502)
  assert.ok(!calls.some(url => url.includes('127.0.0.1')))
  respond = url => new Response(null, { status: 302, headers: { location: url } })
  const count = calls.length
  assert.equal((await post('1.1.1.3')).status, 502)
  assert.equal(calls.length - count, 4)
})

test('WHOIS follows RIR referrals, rejects mismatches and distinguishes outages from missing allocation', async () => {
  whoisRespond = (query, host) => host === 'whois.iana.org' ? 'whois: whois.arin.net\n' : host === 'whois.arin.net' ? 'ReferralServer: whois://whois.ripe.net:43\n' : 'inetnum: 9.9.9.0 - 9.9.9.255\nnetname: EXAMPLE\n'
  const response = await post('9.9.9.9', 'whois')
  assert.equal(response.status, 200)
  assert.equal((await response.json()).data.parsed.registry, 'RIPE NCC')
  whoisRespond = () => 'Service temporarily unavailable\n'
  assert.equal((await post('9.9.9.10', 'whois')).status, 502)
  whoisRespond = () => 'inetnum: 127.0.0.0 - 127.255.255.255\nstatus: RESERVED\n'
  assert.equal((await post('127.0.0.1', 'whois')).status, 404)
  whoisRespond = (query, host) => host === 'whois.iana.org' ? 'whois: whois.apnic.net\n' : 'inetnum: 1.1.1.0 - 1.1.1.255\n'
  assert.equal((await post('9.9.9.10', 'whois')).status, 502)
})
