import assert from 'node:assert/strict'
import { after, before, test, mock } from 'node:test'
import { queryDomainRDAP, isRDAPSupported } from '../src/lib/rdap-client'

const calls: string[] = []
let responseFor: (url: string) => Response = () => new Response('{}', { status: 500 })
before(() => {
  mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = String(input)
    calls.push(url)
    if (url.includes('data.iana.org')) return Response.json({ services: [[['com'], ['https://registry.example/rdap/']]] })
    return responseFor(url)
  })
})
after(() => mock.restoreAll())

test('unpublished CNNIC/JPRS endpoints are never invented', async () => {
  await assert.rejects(queryDomainRDAP('example.cn'), /No RDAP server/)
  await assert.rejects(queryDomainRDAP('example.jp'), /No RDAP server/)
  assert.equal(isRDAPSupported('cn'), false)
  assert.equal(calls.some(url => url.includes('rdap.cnnic.cn') || url.includes('rdap.nic.ad.jp')), false)
})

test('authoritative RDAP 404 is distinct from an HTML 404', async () => {
  responseFor = () => Response.json({ errorCode: 404, title: 'Not found' }, { status: 404 })
  await assert.rejects(queryDomainRDAP('missing.com'), /RDAP_NOT_FOUND/)
  responseFor = () => new Response('<h1>Not found</h1>', { status: 404 })
  await assert.rejects(queryDomainRDAP('broken-endpoint.com'), /RDAP query failed/)
})

test('invalid, empty, error, and mismatched RDAP payloads are rejected', async () => {
  for (const data of [{}, null, { errorCode: 429 }, { objectClassName: 'domain', ldhName: 'another.com' }]) {
    responseFor = () => Response.json(data)
    await assert.rejects(queryDomainRDAP('invalid.com'), /RDAP query failed/)
  }
})

test('registrar failure retains registry data; source preference has an independent cache', async () => {
  responseFor = url => url.includes('registrar.example')
    ? Response.json({ errorCode: 404 }, { status: 404 })
    : Response.json({ objectClassName: 'domain', ldhName: 'fallback.com', links: [{ rel: 'related', type: 'application/rdap+json', href: 'https://registrar.example/domain/fallback.com' }] })
  assert.equal((await queryDomainRDAP('fallback.com'))?.rdapSource, 'registry')

  responseFor = url => Response.json({ objectClassName: 'domain', ldhName: 'preference.com',
    ...(url.includes('registrar.example') ? {} : { links: [{ rel: 'related', type: 'application/rdap+json', href: 'https://registrar.example/domain/preference.com' }] }) })
  assert.equal((await queryDomainRDAP('preference.com'))?.rdapSource, 'registrar')
  assert.equal((await queryDomainRDAP('preference.com', { preferSource: 'registry' }))?.rdapSource, 'registry')
})
