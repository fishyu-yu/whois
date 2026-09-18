import assert from 'node:assert/strict'
import net from 'node:net'
import { after, before, test, mock } from 'node:test'
import { NextRequest } from 'next/server'
import { POST, GET } from '../src/app/api/whois/route'
import { tcpWhoisQuery } from '../src/lib/whois-client'

const requests: { server: string; query: string }[] = []
const hosts: string[] = []
const sockets = new Set<net.Socket>()
let respond: (socket: net.Socket, query: string, server: string) => void
let port: number
const fixture = net.createServer(socket => {
  sockets.add(socket)
  socket.on('close', () => sockets.delete(socket))
  const server = hosts.shift() || 'localhost'
  socket.once('data', buffer => {
    const query = buffer.toString().trim()
    requests.push({ server, query })
    respond(socket, query, server)
  })
})

before(async () => {
  await new Promise<void>(resolve => fixture.listen(0, '127.0.0.1', resolve))
  port = (fixture.address() as net.AddressInfo).port
  const original = net.Socket.prototype.connect
  mock.method(net.Socket.prototype, 'connect', function (this: net.Socket, ...args: any[]) {
    if (args[0] === 43) {
      hosts.push(args[1])
      return Reflect.apply(original, this, [{ port, host: '127.0.0.1' }, args[2]])
    }
    return Reflect.apply(original, this, args)
  })
  mock.method(globalThis, 'fetch', async () => Response.json({ services: [] }))
})
after(async () => {
  mock.restoreAll()
  for (const socket of sockets) socket.destroy()
  await new Promise<void>(resolve => fixture.close(() => resolve()))
})

function post(query: string, dataSource?: string, type = 'domain') {
  return POST(new NextRequest('http://localhost/api/whois', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, type, dataSource }),
  }))
}

test('CN works in automatic/default/WHOIS/registry/registrar modes without a system binary', async () => {
  respond = (socket, query) => socket.end(`Domain Name: ${query}\r\nRegistrant: 示例公司\r\nName Server: ns1.example.cn\r\n`)
  for (const source of [undefined, 'auto', 'whois', 'registry', 'registrar']) {
    const response = await post(' Example.CN ', source)
    const body = await response.json()
    assert.equal(response.status, 200, JSON.stringify(body))
    assert.equal(body.data.parsed.domain_name, 'example.cn')
    assert.equal(body.data.parsed.registrant_name, '示例公司')
    assert.equal(body.data.dataSource, 'registry')
  }
  assert.ok(requests.every(request => request.server === 'whois.cnnic.cn'))
})

test('GET defaults to a domain query and honors source, IDNs are sent in ASCII', async () => {
  respond = (socket, query) => socket.end(`Domain Name: ${query}\n`)
  const get = await GET(new NextRequest('http://localhost/api/whois?q=get.cn&dataSource=whois'))
  assert.equal(get.status, 200)
  assert.equal((await get.json()).data.parsed.domain_name, 'get.cn')
  const idn = await post('中文.cn', 'whois')
  assert.equal(idn.status, 200)
  assert.equal((await idn.json()).data.parsed.domain_name, 'xn--fiq228c.cn')
})

test('CNNIC not-found remains 404 and outages remain 502; neither is cached', async () => {
  respond = socket => socket.end('No matching record.\n')
  assert.equal((await post('missing.cn', 'whois')).status, 404)
  respond = socket => socket.end('Service unavailable\n')
  assert.equal((await post('missing.cn', 'whois')).status, 502)
  respond = (socket, query) => socket.end(`Domain Name: ${query}\n`)
  assert.equal((await post('missing.cn', 'whois')).status, 200)
})

test('WHOIS-only ccTLDs, corrected TW server, and IANA discovery', async () => {
  respond = (socket, query, server) => {
    if (server === 'whois.iana.org') socket.end('whois: whois.example.test\n')
    else socket.end(`Domain Name: ${query.replace(/\/e$/, '').replace(/^-T dn,ace /, '')}\n`)
  }
  for (const domain of ['example.jp', 'example.tw', 'example.de', 'example.zz']) {
    assert.equal((await post(domain, 'whois')).status, 200, domain)
  }
  assert.ok(requests.some(request => request.server === 'whois.twnic.net.tw'))
  assert.ok(requests.some(request => request.server === 'whois.jprs.jp' && request.query === 'example.jp/e'))
  assert.ok(requests.some(request => request.server === 'whois.example.test'))
})

test('registrar failure cannot overwrite a registered domain or mislabel its source', async () => {
  respond = (socket, query, server) => socket.end(server === 'whois.verisign-grs.com'
    ? `Domain Name: ${query}\nRegistrar WHOIS Server: whois.registrar.test\n`
    : 'No match for "referral.com".\n')
  const response = await post('referral.com', 'registrar')
  assert.equal(response.status, 200)
  assert.equal((await response.json()).data.dataSource, 'registry')
  const count = requests.length
  await post('referral.com', 'registry')
  assert.equal(requests.length, count + 1)
})

test('forced RDAP remains strict and invalid GET/POST input never reaches a server', async () => {
  const count = requests.length
  assert.equal((await post('strict.cn', 'rdap')).status, 502)
  for (const query of ['example.cn;echo test', 'example.cn\r\nother.cn', '-h', 'example..cn']) {
    assert.equal((await post(query, 'whois')).status, 400)
    assert.equal((await GET(new NextRequest(`http://localhost/api/whois?q=${encodeURIComponent(query)}`))).status, 400)
  }
  assert.equal((await post('example.cn', 'unknown')).status, 400)
  assert.equal((await post('1.1.1.1/99', 'whois', 'ip')).status, 400)
  assert.equal(requests.length, count)
})

test('TCP rejects empty and oversized responses and times out stalled peers', async () => {
  respond = socket => socket.end()
  await assert.rejects(tcpWhoisQuery('127.0.0.1', 'empty.cn', port), /空响应/)
  respond = socket => socket.end(Buffer.alloc(1024 * 1024 + 1, 'x'))
  await assert.rejects(tcpWhoisQuery('127.0.0.1', 'large.cn', port), /1 MiB/)
  respond = () => {}
  await assert.rejects(tcpWhoisQuery('127.0.0.1', 'timeout.cn', port, 50), /超时/)
})
