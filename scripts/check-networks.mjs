import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const args = process.argv.slice(2)
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback
const base = option('--base', 'http://localhost:3000')
const sources = option('--sources', 'auto,whois').split(',')
const samples = [
  ['8.8.8.8', 'ARIN'], ['1.1.1.1', 'APNIC'], ['193.0.6.139', 'RIPE NCC'],
  ['200.160.2.3', 'LACNIC'], ['196.216.2.1', 'AFRINIC'],
  ['2001:4860:4860::8888', 'ARIN'], ['8.8.8.0/24', 'ARIN'], ['2001:4860::/32', 'ARIN'],
  ['AS15169', 'ARIN'], ['AS4134', 'APNIC'], ['AS3333', 'RIPE NCC'],
  ['AS28573', 'LACNIC'], ['AS3741', 'AFRINIC'],
]
const results = []
for (const source of sources) {
  for (const [query, expectedRegistry] of samples) {
    const started = Date.now()
    let result
    try {
      const response = await fetch(`${base}/api/whois?${new URLSearchParams({ q: query, dataSource: source })}`, { signal: AbortSignal.timeout(60000) })
      const body = await response.json()
      const data = body.data
      const type = query.startsWith('AS') ? 'asn' : 'ip'
      const ok = response.ok && body.success === true && body.type === type && data?.query === query
        && typeof data.raw === 'string' && data.raw.length > 0
        && data.parsed?.registry?.includes(expectedRegistry)
        && data.parsed?.[type === 'ip' ? 'ip_address' : 'asn'] === query
        && Boolean(data.parsed?.[type === 'ip' ? 'ip_range' : 'asn_range'])
        && (source !== 'whois' || data.dataSource === 'whois-rir')
        && (source !== 'rdap' || data.dataSource === 'rdap-rir')
      result = { query, source, ok: Boolean(ok), status: response.status, registry: data?.parsed?.registry, actualSource: data?.dataSource, error: body.error }
    } catch (error) { result = { query, source, ok: false, error: error.message } }
    result.ms = Date.now() - started
    results.push(result)
    console.log(JSON.stringify(result))
  }
}
const output = path.resolve(option('--output', '.local/network-live-results.json'))
await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, JSON.stringify({ timestamp: new Date().toISOString(), base, results }, null, 2))
console.log(`${results.filter(result => result.ok).length}/${results.length} passed; ${output}`)
if (results.some(result => !result.ok)) process.exitCode = 1
