import { test, expect, type Page } from '@playwright/test'
import { detectQueryType, normalizeASN, normalizeIP } from '../../src/lib/query-utils'
import { normalizeQueryInput, queryPath } from '../../src/lib/query-path'

const ip6 = '2001:4860:4860:1234:5678:90ab:cdef:1234'

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'page must not scroll horizontally').toBe(true)
  const outside = await page.locator('.result-flow h1, .result-flow [data-slot="card"]').evaluateAll(nodes => nodes.filter(node => {
    const rect = node.getBoundingClientRect()
    return rect.left < -1 || rect.right > innerWidth + 1
  }).map(node => node.textContent?.slice(0, 80)))
  expect(outside, 'result headings and cards must stay inside the viewport').toEqual([])
}

async function submit(page: Page, query: string) {
  await page.getByRole('textbox', { name: '域名、IP 或 ASN' }).fill(query)
  await page.getByRole('button', { name: '开始查询', exact: true }).click()
  const title = normalizeQueryInput(query)
  await expect(page.getByRole('heading', { name: title!, exact: true })).toBeVisible()
  await expect(page).toHaveURL(url => url.pathname === queryPath(query))
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/whois', async route => {
    const body = route.request().postDataJSON()
    if (body.query === '8.8.4.4') return route.fulfill({ status: 502, json: { success: false, error: 'RDAP 查询超时，请稍后重试', data: null } })
    const type = detectQueryType(body.query)
    const query = type === 'ip' ? normalizeIP(body.query) : type === 'asn' ? normalizeASN(body.query) : body.query
    const common = {
      creation_date: '2020-01-02T00:00:00Z', updated_date: '2024-01-02T00:00:00Z',
      registrant_name: 'Example, Inc. 网络服务', tech_email: 'network@example.test', abuse_email: 'abuse@example.test',
    }
    const parsed = type === 'domain' ? {
      ...common, domain_name: query, registrar: 'Example Registrar', registry_expiry_date: '2035-01-02T00:00:00Z', name_server: ['ns1.example.test'], domain_status: ['ok'],
    } : {
      ...common, [type === 'ip' ? 'ip_address' : 'asn']: query,
      network_name: 'EXAMPLE-NET', organization: 'Example, Inc. 网络服务', registry: 'ARIN', status: ['active'],
      ...(type === 'ip' ? {
        ip_version: query!.includes(':') ? 'v6' : 'v4',
        ip_range: query!.includes(':') ? '2001:4860:: - 2001:4860:ffff:ffff:ffff:ffff:ffff:ffff' : '8.8.8.0 - 8.8.8.255',
        cidr: query!.includes(':') ? ['2001:4860::/32'] : ['8.8.8.0/24'],
      } : { asn_range: query }),
    }
    await route.fulfill({ json: { success: true, query, type, data: { query, type, parsed, raw: JSON.stringify(parsed, null, 2), dataSource: type === 'domain' ? 'rdap-registry' : 'rdap-rir' } } })
  })
})

test('domain, IPv4, IPv6, CIDR and ASN share card geometry and typography without irrelevant fields', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  let domainStyle: unknown
  for (const query of ['example.com', '8.8.8.8', ip6, '8.8.8.9/24', '15169']) {
    await submit(page, query)
    await noOverflow(page)
    const style = await page.locator('.result-flow h1').evaluate(node => {
      const css = getComputedStyle(node)
      return { size: css.fontSize, weight: css.fontWeight, font: css.fontFamily, color: css.color }
    })
    if (query === 'example.com') domainStyle = style
    else {
      expect(style).toEqual(domainStyle)
      await expect(page.getByText('过期时间', { exact: true })).toHaveCount(0)
      await expect(page.getByText('DNS 服务器', { exact: true })).toHaveCount(0)
      await expect(page.getByText('隐私保护已开启', { exact: true })).toHaveCount(0)
      await expect(page.getByText(query === '15169' ? 'ASN 信息' : 'IP 信息', { exact: true })).toBeVisible()
    }
    await expect(page.getByText('全部查询字段', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '原始查询数据' }).click()
    await expect(page.locator('pre')).toContainText('Example')
    await noOverflow(page)
    if (['example.com', ip6, '15169'].includes(query)) {
      await page.screenshot({ path: testInfo.outputPath(`${query === ip6 ? 'ipv6' : query === '15169' ? 'asn' : 'domain'}.png`), fullPage: true, animations: 'disabled' })
    }
    await page.getByRole('button', { name: '原始查询数据' }).click()
  }
  expect(errors).toEqual([])
})

test('share links, reload, navigation history and saved history preserve the query', async ({ page }) => {
  await page.goto('/' + encodeURIComponent('2001:4860::/32'))
  await expect(page.getByRole('heading', { name: '2001:4860::/32', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: '2001:4860::/32', exact: true })).toBeVisible()
  await submit(page, 'AS15169')
  await expect(page).toHaveURL(/\/AS15169$/)
  await page.goBack()
  await expect(page.getByRole('heading', { name: '2001:4860::/32', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '查询历史', exact: true }).click()
  await page.getByRole('button', { name: /AS15169.*asn/i }).click()
  await expect(page.getByRole('heading', { name: 'AS15169', exact: true })).toBeVisible()
  const history = await page.evaluate(() => JSON.parse(localStorage.getItem('whois_history') || '[]'))
  expect(history.filter((item: { query: string }) => item.query === 'AS15169')).toHaveLength(1)
  await noOverflow(page)
})

test('bad input stays local and service errors recover through the same form', async ({ page }) => {
  await page.goto('/')
  for (const query of ['1.2.3.999', 'AS4294967296', '::/129', '8.8.8.8/33']) {
    await page.getByRole('textbox').fill(query)
    await expect(page.getByRole('button', { name: '开始查询', exact: true })).toBeDisabled()
    await expect(page.locator('#query-error')).toBeVisible()
    await noOverflow(page)
    const error = await page.locator('#query-error').boundingBox()
    const example = await page.getByRole('button', { name: 'AS15169', exact: true }).boundingBox()
    expect(error!.y + error!.height).toBeLessThanOrEqual(example!.y)
  }
  await page.getByRole('textbox').fill('8.8.4.4')
  await page.getByRole('button', { name: '开始查询', exact: true }).click()
  await expect(page.getByText('查询失败', { exact: true })).toBeVisible()
  await expect(page.getByText('RDAP 查询超时，请稍后重试', { exact: true })).toBeVisible()
  await noOverflow(page)
  await submit(page, '8.8.8.8')
})

test('JSON/CSV exports retain network fields and copying returns the raw data', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await submit(page, 'AS15169')
  for (const format of ['JSON', 'CSV']) {
    const downloadEvent = page.waitForEvent('download')
    await page.getByRole('button', { name: format, exact: true }).click()
    const download = await downloadEvent
    expect(download.suggestedFilename()).toBe(`whois-AS15169.${format.toLowerCase()}`)
    const stream = await download.createReadStream()
    const buffers: Buffer[] = []
    for await (const chunk of stream!) buffers.push(Buffer.from(chunk))
    const content = Buffer.concat(buffers).toString('utf8')
    expect(content).toContain('AS15169')
    expect(content).toContain('Example, Inc.')
    expect(content).not.toContain('registry_expiry_date')
    if (format === 'JSON') expect(JSON.parse(content).result.parsed.asn).toBe('AS15169')
  }
  await page.getByRole('button', { name: '复制', exact: true }).click()
  await expect(page.getByRole('button', { name: '已复制', exact: true })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('AS15169')
})

test('home navigation restores results and theme switching preserves the query', async ({ page }) => {
  await page.goto('/')
  await submit(page, '8.8.8.8')
  await submit(page, 'AS15169')
  await page.goBack()
  await expect(page.getByRole('heading', { name: '8.8.8.8', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Whois 查询', exact: true })).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveValue('')
  await page.goForward()
  await expect(page.getByRole('heading', { name: '8.8.8.8', exact: true })).toBeVisible()
  for (const [label, theme] of [['深色', 'dark'], ['浅色', 'light']]) {
    await page.getByRole('button', { name: '切换主题' }).click()
    await page.getByRole('menuitem', { name: label, exact: true }).click()
    await expect(page.locator('html')).toHaveClass(new RegExp(theme))
    await expect(page.getByRole('heading', { name: '8.8.8.8', exact: true })).toBeVisible()
    await noOverflow(page)
  }
})

test('direct paths and legacy links normalize once, refresh and preserve forward history', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => {
    if (request.url().endsWith('/api/whois')) requests.push(request.postDataJSON().query)
  })
  for (const path of ['/Example.COM', '/15169', '/8.8.8.8', '/2001:4860::8888', '/8.8.8.9/24', '/2001%3A4860%3A%3A%2F32', '/中国.cn']) {
    const query = normalizeQueryInput(decodeURIComponent(path.slice(1)))
    const count = requests.length
    await page.goto(path)
    await expect(page.getByRole('heading', { name: query, exact: true })).toBeVisible()
    await expect(page).toHaveURL(url => url.pathname === queryPath(query))
    await page.reload()
    await expect(page.getByRole('heading', { name: query, exact: true })).toBeVisible()
    expect(requests.slice(count)).toEqual([query, query])
  }
  await page.goto('/')
  await submit(page, '/Example.COM')
  await submit(page, '0015169')
  await submit(page, '/8.8.8.9/24')
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'AS15169', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'example.com', exact: true })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'AS15169', exact: true })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { name: '8.8.8.0/24', exact: true })).toBeVisible()
})

test('image generation failure displays an error and allows retry', async ({ page }) => {
  await page.goto('/AS15169')
  await expect(page.getByRole('heading', { name: 'AS15169', exact: true })).toBeVisible()
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (callback) {
      HTMLCanvasElement.prototype.toBlob = original
      callback(null)
    }
  })
  await page.getByRole('button', { name: '导出图片', exact: true }).click()
  await expect(page.locator('.result-flow').getByRole('alert')).toHaveText('图片生成失败，请重试。')
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出图片', exact: true }).click()
  expect((await downloadEvent).suggestedFilename()).toBe('whois-AS15169.png')
  await expect(page.locator('.result-flow').getByRole('alert')).toHaveCount(0)
})

test('PNG exports render complete domain, IP and ASN results in the current theme', async ({ page }, testInfo) => {
  await page.goto('/')
  for (const query of ['example.com', '2001:4860::/32', 'AS15169']) {
    await submit(page, query)
    await page.getByRole('button', { name: '原始查询数据' }).click()
    const downloadEvent = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出图片', exact: true }).click()
    const download = await downloadEvent
    expect(download.suggestedFilename()).toBe(`whois-${query.replace(/[:/]/g, '_')}.png`)
    await download.saveAs(testInfo.outputPath(download.suggestedFilename()))
    const stream = await download.createReadStream()
    const buffers: Buffer[] = []
    for await (const chunk of stream!) buffers.push(Buffer.from(chunk))
    const png = Buffer.concat(buffers)
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    const pixels = await page.evaluate(async base64 => {
      const img = new Image()
      img.src = `data:image/png;base64,${base64}`
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const rgba = ctx.getImageData(0, 0, img.width, img.height).data
      const colors = new Set<string>()
      for (let i = 0; i < rgba.length; i += 400) colors.add(`${rgba[i]},${rgba[i + 1]},${rgba[i + 2]}`)
      return { width: img.width, height: img.height, colors: colors.size, corner: Array.from(rgba.slice(0, 4)) }
    }, png.toString('base64'))
    expect(pixels.width).toBeGreaterThan(500)
    expect(pixels.height).toBeGreaterThan(1000)
    expect(pixels.colors).toBeGreaterThan(20)
    expect(pixels.corner[3]).toBe(255)
    expect(pixels.corner[0] > 128).toBe(testInfo.project.use.colorScheme === 'light')
    await expect(page.getByRole('button', { name: '导出图片', exact: true })).toBeEnabled()
    await expect(page.locator('pre')).toBeVisible()
    await noOverflow(page)
  }
})
