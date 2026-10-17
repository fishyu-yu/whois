import { test, expect, type Page, type Route } from '@playwright/test'
import { normalizeQueryInput } from '../../src/lib/query-path'
import { mockWhoisApi, whoisResponse } from './fixtures/whois'

const inputName = '域名、IP 或 ASN'
const longIPv6 = '2001:4860:4860:1234:5678:90ab:cdef:1234'

async function startQuery(page: Page, query: string) {
  await page.getByRole('textbox', { name: inputName }).fill(query)
  await page.getByRole('button', { name: '开始查询', exact: true }).click()
}

async function noOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }))
  expect(dimensions.document, 'document must not overflow horizontally').toBeLessThanOrEqual(dimensions.viewport + 1)
  expect(dimensions.body, 'body must not overflow horizontally').toBeLessThanOrEqual(dimensions.viewport + 1)
  const overflowing = await page.locator('main h1, main [data-slot="card"], main form').evaluateAll(nodes => nodes.filter(node => {
    const { left, right } = node.getBoundingClientRect()
    return left < -1 || right > innerWidth + 1
  }).map(node => node.textContent?.slice(0, 100)))
  expect(overflowing, 'headings, result cards and search form fit in the viewport').toEqual([])
}

test.beforeEach(async ({ page }) => {
  await mockWhoisApi(page)
})

test('responsive visual audit of home, long IPv6 results and expanded data', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  // Stress long values using a test fixture, including fields that are not in the summary.
  await page.route('**/api/whois', async route => {
    const fixture = whoisResponse(route.request().postDataJSON().query)
    fixture.data.parsed.registry_specific_note = `https://example.test/${'long-unbroken-value'.repeat(20)}`
    fixture.data.raw = JSON.stringify(fixture.data.parsed, null, 2)
    await route.fulfill({ json: fixture })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Whois 查询', exact: true })).toBeVisible()
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true, animations: 'disabled' })

  const input = page.getByRole('textbox', { name: inputName })
  await input.fill(longIPv6)
  const submit = page.getByRole('button', { name: '开始查询', exact: true })
  const bounds = await submit.boundingBox()
  expect(bounds?.width, 'primary action has a usable touch target').toBeGreaterThanOrEqual(44)
  expect(bounds?.height, 'primary action has a usable touch target').toBeGreaterThanOrEqual(44)
  await submit.click()
  await expect(page.getByRole('heading', { name: longIPv6, exact: true })).toBeVisible()
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('ipv6-summary.png'), fullPage: true, animations: 'disabled' })
  for (const name of ['全部查询字段', '原始查询数据']) {
    await page.getByRole('button', { name, exact: true }).click()
  }
  await expect(page.locator('pre')).toContainText('long-unbroken-value')
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('ipv6-expanded.png'), fullPage: true, animations: 'disabled' })
  expect(errors, 'the rendered UI does not emit browser errors').toEqual([])
})

test('search shortcuts focus the form and preserve typing in every editable target', async ({ page }) => {
  await page.goto('/')
  const input = page.getByRole('textbox', { name: inputName })
  await page.getByRole('heading', { name: 'Whois 查询', exact: true }).click()
  await page.keyboard.press('/')
  await expect(input).toBeFocused()
  await input.fill('example.com')
  await page.keyboard.press('/')
  await expect(input).toHaveValue('example.com/')

  await page.getByRole('heading', { name: 'Whois 查询', exact: true }).click()
  await page.keyboard.press('ControlOrMeta+k')
  await expect(input).toBeFocused()

  // Editable targets are test DOM fixtures so the global handler is checked
  // beyond the one textbox currently present in the product.
  await page.evaluate(() => {
    const fixture = document.createElement('section')
    fixture.setAttribute('data-testid', 'editable-fixtures')
    fixture.innerHTML = '<textarea aria-label="Fixture textarea"></textarea><div contenteditable="true" role="textbox" aria-label="Fixture editor"></div><select aria-label="Fixture select"><option>Option</option></select>'
    document.body.append(fixture)
  })
  for (const name of ['Fixture textarea', 'Fixture editor', 'Fixture select']) {
    const target = page.getByLabel(name)
    await target.focus()
    await page.keyboard.press('ControlOrMeta+k')
    await expect(target, `${name} keeps focus for modified shortcuts`).toBeFocused()
    await page.keyboard.press('/')
    await expect(target, `${name} keeps focus when typing a slash`).toBeFocused()
  }
})

test('IME composition does not submit or trigger a global shortcut', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => {
    if (request.url().endsWith('/api/whois')) requests.push(request.postDataJSON().query)
  })
  await page.goto('/')
  const input = page.getByRole('textbox', { name: inputName })
  await page.getByRole('heading', { name: 'Whois 查询', exact: true }).click()
  await page.locator('body').dispatchEvent('keydown', { key: '/', code: 'Slash', isComposing: true, keyCode: 229, bubbles: true })
  await expect(input).not.toBeFocused()
  await input.focus()
  await input.dispatchEvent('compositionstart', { data: '' })
  await input.fill('中国.cn')
  await input.dispatchEvent('compositionupdate', { data: '中国' })
  await page.keyboard.press('Enter')
  expect(requests, 'confirming composition must not send a Whois request').toEqual([])
  await expect(page).toHaveURL('/')
  await input.dispatchEvent('compositionend', { data: '中国' })
  await page.keyboard.press('Enter')
  const canonical = normalizeQueryInput('中国.cn')
  await expect(page.getByRole('heading', { name: canonical, exact: true })).toBeVisible()
  expect(requests).toEqual([canonical])
})

test('history drawer traps focus, closes with Escape and restores its trigger', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('whois_history', JSON.stringify([
      { query: 'example.com', type: 'domain', timestamp: '2026-01-01T00:00:00Z' },
      { query: 'AS15169', type: 'asn', timestamp: '2026-01-02T00:00:00Z' },
    ]))
  })
  await page.goto('/')
  const trigger = page.getByRole('button', { name: '查询历史', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: '查询历史', exact: true })
  await expect(dialog).toBeVisible()
  const close = dialog.getByRole('button', { name: '关闭历史记录', exact: true })
  await expect(close).toBeFocused()
  const last = dialog.getByRole('button').last()
  await last.focus()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await page.getByRole('textbox', { name: inputName }).focus()
  await expect(close, 'the modal prevents background controls from receiving focus').toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(last).toBeFocused()
  await page.keyboard.press('ControlOrMeta+k')
  await expect(last).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await page.keyboard.press('/')
  await expect(page.getByRole('textbox', { name: inputName })).toBeFocused()
  await trigger.click()
  await dialog.getByRole('button', { name: /AS15169.*asn/i }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { name: 'AS15169', exact: true })).toBeVisible()
  await expect(trigger).toBeFocused()
})

test('a rapid second query aborts the pending request and remains usable while loading', async ({ page }) => {
  let pending: Route | undefined
  await page.route('**/api/whois', async route => {
    if (route.request().postDataJSON().query === 'example.com') {
      pending = route
      return
    }
    await route.fallback()
  })
  await page.goto('/')
  await startQuery(page, 'example.com')
  await expect.poll(() => Boolean(pending)).toBe(true)
  await expect(page.getByRole('status').filter({ hasText: '正在查询' })).toBeVisible()
  const aborted = page.waitForEvent('requestfailed', request => request.url().endsWith('/api/whois') && request.postDataJSON().query === 'example.com')
  await page.getByRole('textbox', { name: inputName }).fill('AS15169')
  await expect(page.getByRole('button', { name: '开始查询', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '开始查询', exact: true }).click()
  expect((await aborted).failure()?.errorText).toMatch(/abort/i)
  await expect(page.getByRole('heading', { name: 'AS15169', exact: true })).toBeVisible()
  await expect(page).toHaveURL('/AS15169')
  await expect(page.getByText('网络请求失败', { exact: true })).toHaveCount(0)
  const history: { query: string }[] = await page.evaluate(() => JSON.parse(localStorage.getItem('whois_history') || '[]'))
  expect(history.map(item => item.query)).toEqual(['AS15169'])
})

test('a late response cannot replace a query restored by browser navigation', async ({ page }) => {
  // Simulate a transport that cannot be cancelled. The requestId guard still
  // has to protect state and route history after an older response completes.
  await page.addInitScript(() => {
    const fetchRequest = window.fetch.bind(window)
    window.fetch = (input, init) => {
      if (String(input).endsWith('/api/whois')) return fetchRequest(input, { ...init, signal: undefined })
      return fetchRequest(input, init)
    }
  })
  let pending: Route | undefined
  await page.route('**/api/whois', async route => {
    if (route.request().postDataJSON().query === 'example.com') {
      pending = route
      return
    }
    await route.fallback()
  })
  await page.goto('/')
  await startQuery(page, 'AS15169')
  await expect(page.getByRole('heading', { name: 'AS15169', exact: true })).toBeVisible()
  await startQuery(page, 'example.com')
  await expect.poll(() => Boolean(pending)).toBe(true)
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'AS15169', exact: true })).toBeVisible()
  const lateResponse = page.waitForResponse(response => response.url().endsWith('/api/whois') && response.request().postDataJSON().query === 'example.com')
  await pending!.fulfill({ json: whoisResponse('example.com') })
  await (await lateResponse).finished()
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(page).toHaveURL('/AS15169')
  await expect(page.getByRole('heading', { name: 'AS15169', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'example.com', exact: true })).toHaveCount(0)
  const history: { query: string }[] = await page.evaluate(() => JSON.parse(localStorage.getItem('whois_history') || '[]'))
  expect(history.map(item => item.query)).toEqual(['AS15169'])
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Whois 查询', exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: inputName })).toHaveValue('')
})
