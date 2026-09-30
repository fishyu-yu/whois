import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getRootDomain, isSubdomain, validateDomain } from '../src/lib/domain-utils'

test('registry suffix rules determine which hostname labels to retain', () => {
  for (const [input, expected, subdomain] of [
    ['www.qq.com', 'qq.com', true],
    ['a.b.qq.com', 'qq.com', true],
    ['qq.com', 'qq.com', false],
    ['www.com', 'www.com', false],
    ['xx.edu.kg', 'xx.edu.kg', false],
    ['www.xx.edu.kg', 'xx.edu.kg', true],
    ['example.co.uk', 'example.co.uk', false],
    ['mail.example.com.cn', 'example.com.cn', true],
    ['a.b.example.k12.ak.us', 'example.k12.ak.us', true],
    // PSL wildcard and exception rules, including a registrable "www" label.
    ['a.b.ck', 'a.b.ck', false],
    ['mail.a.b.ck', 'a.b.ck', true],
    ['www.ck', 'www.ck', false],
    ['mail.www.ck', 'www.ck', true],
    ['www.city.kawasaki.jp', 'city.kawasaki.jp', true],
    // Hosting tenant names are not WHOIS registrations at the TLD registry.
    ['www.tenant.github.io', 'github.io', true],
    ['a.b.unknownsuffix', 'a.b.unknownsuffix', false],
  ] as const) {
    assert.equal(getRootDomain(input), expected, input)
    assert.equal(isSubdomain(input), subdomain, input)
    assert.equal(validateDomain(input).type, subdomain ? 'subdomain' : 'domain', input)
  }
  assert.equal(validateDomain('xx.edu.kg').publicSuffix, 'edu.kg')
})

test('IDN hostnames are converted before matching suffix rules', () => {
  for (const input of ['www.中国.cn', 'WWW.xn--fiqs8s.CN']) {
    assert.equal(getRootDomain(input), 'xn--fiqs8s.cn')
    assert.equal(isSubdomain(input), true)
  }
  assert.equal(getRootDomain('www.食狮.公司.cn'), 'xn--85x722f.xn--55qx5d.cn')
})

test('public suffixes and invalid labels cannot become successful root queries', () => {
  for (const input of [
    'edu.kg', 'co.uk', 'com.cn', 'b.ck', '.www.qq.com', 'www..qq.com',
    '-bad.qq.com', 'bad-.qq.com', 'www.qq.com/path', 'www.qq.com\r\nother.com',
    `${'a'.repeat(64)}.qq.com`, `${'中'.repeat(60)}.qq.com`,
  ]) {
    assert.equal(validateDomain(input).isValid, false, input)
    assert.equal(getRootDomain(input), '', input)
    assert.equal(isSubdomain(input), false, input)
  }
})
