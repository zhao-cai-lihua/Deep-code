const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizeExternalUrl } = require('../src/external-links.cjs')

test('opens only explicit http and https links', () => {
  assert.equal(normalizeExternalUrl('https://example.com/docs'), 'https://example.com/docs')
  assert.equal(normalizeExternalUrl('http://127.0.0.1:3000/'), 'http://127.0.0.1:3000/')
  for (const value of ['javascript:alert(1)', 'file:///C:/secret.txt', 'data:text/html,x', '/relative']) {
    assert.throws(() => normalizeExternalUrl(value), /网页链接|安全打开/)
  }
})
