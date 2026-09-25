import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeQueryInput, queryFromPath, queryPath } from '../src/lib/query-path'

test('all query kinds use canonical readable paths and round-trip', () => {
  for (const [input, expected] of [
    [' /Example.COM ', 'example.com'],
    ['as0015169', 'AS15169'],
    ['15169', 'AS15169'],
    ['/8.8.8.8', '8.8.8.8'],
    ['8.8.8.9/24', '8.8.8.0/24'],
    ['2001:4860:0000:0000::8888', '2001:4860::8888'],
    ['2001:4860::8888/32', '2001:4860::/32'],
    ['中国.cn', 'xn--fiqs8s.cn'],
  ]) {
    assert.equal(normalizeQueryInput(input), expected)
    assert.equal(queryPath(input), `/${expected}`)
    assert.equal(queryFromPath(queryPath(input)), expected)
  }
})

test('legacy encoded paths decode once and malformed escapes do not throw', () => {
  assert.equal(queryFromPath('/2001%3A4860%3A%3A%2F32'), '2001:4860::/32')
  assert.equal(queryFromPath('/example.com/'), 'example.com')
  assert.equal(queryFromPath('/'), '')
  assert.equal(queryFromPath('/%252Fexample.com'), '%2Fexample.com')
  assert.equal(queryFromPath('/%E0%A4%A'), '%E0%A4%A')
  assert.equal(normalizeQueryInput('/8.8.8.8/33'), '8.8.8.8/33')
  assert.equal(queryPath('//example.com'), '/%2Fexample.com')
  assert.equal(queryPath('example.com/anything'), '/example.com%2Fanything')
})
