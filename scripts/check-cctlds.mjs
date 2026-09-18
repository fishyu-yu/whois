import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { domainToASCII } from 'node:url'

// One known registered domain for each ccTLD in cctld-database.ts.
const samples = ['baidu.cn', 'hkirc.hk', 'twnic.tw', 'jprs.jp', 'kisa.or.kr',
  'sgnic.sg', 'mynic.my', 'thnic.co.th', 'registry.in', 'github.io', 'domain.kg',
  'nominet.uk', 'denic.de', 'afnic.fr', 'nic.it', 'nic.es', 'sidn.nl', 'nic.ru',
  'nic.us', 'cira.ca', 'nic.mx', 'auda.org.au', 'internetnz.nz', 'registro.br',
  'nic.ar', 'google.co.za', 'aeda.ae', 'nic.net.sa']
const args = process.argv.slice(2)
const option = (name, fallback) => {
  const index = args.indexOf(name)
  return index < 0 ? fallback : args[index + 1]
}
const base = option('--base', 'http://localhost:3000')
const output = option('--output', '.local/cctld-results.json')
const domains = option('--domains', samples.join(',')).split(',')
const source = option('--source', 'auto')
const results = []
const queue = [...domains]

async function check(domain) {
  const start = Date.now()
  try {
    const response = await fetch(`${base}/api/whois`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: domain, type: 'domain', dataSource: source }),
      signal: AbortSignal.timeout(60000),
    })
    const body = await response.json()
    const parsed = body.data?.parsed
    const returned = parsed?.domain_name || parsed?.domain
    const name = Array.isArray(returned) ? returned[0] : returned
    const pass = response.ok && body.success === true && typeof name === 'string'
      && domainToASCII(name).toLowerCase() === domainToASCII(domain).toLowerCase()
      && Boolean(body.data?.raw?.trim())
    return { domain, pass, status: response.status, source: body.data?.dataSource || null,
      elapsedMs: Date.now() - start, fieldCount: Object.keys(parsed || {}).length,
      error: pass ? null : body.error || 'Missing or mismatched domain record' }
  } catch (error) {
    return { domain, pass: false, status: null, source: null, elapsedMs: Date.now() - start, error: error.message }
  }
}

await Promise.all(Array.from({ length: 3 }, async () => {
  while (queue.length) {
    const result = await check(queue.shift())
    results.push(result)
    console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.domain} ${result.source || ''} ${result.elapsedMs}ms ${result.error || ''}`)
  }
}))
results.sort((a, b) => domains.indexOf(a.domain) - domains.indexOf(b.domain))
await mkdir(dirname(output), { recursive: true })
await writeFile(output, JSON.stringify({ checkedAt: new Date().toISOString(), base, requestedSource: source, results }, null, 2) + '\n')
console.log(`${results.filter(result => result.pass).length}/${results.length} passed; report: ${output}`)
if (results.some(result => !result.pass)) process.exitCode = 1
