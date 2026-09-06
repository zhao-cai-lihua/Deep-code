const test = require('node:test')
const assert = require('node:assert/strict')
const { buildHandoffPreview } = require('../src/handoff-preview.cjs')

test('previews the exact task without adding role text or permissions', () => {
  const preview = buildHandoffPreview({
    thread: { prompt: '完成一个可验证的新手安装流程。' }
  })
  assert.match(preview.text, /完成一个可验证/)
  assert.doesNotMatch(preview.text, /角色|Persona|Character/)
  assert.match(preview.text, /不会授予或改变工具/)
})
