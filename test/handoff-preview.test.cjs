const test = require('node:test')
const assert = require('node:assert/strict')
const { buildHandoffPreview } = require('../src/handoff-preview.cjs')
const { createTaskContract } = require('../src/task-contract.cjs')

test('previews the exact task without adding role text or permissions', () => {
  const preview = buildHandoffPreview({
    thread: { prompt: '完成一个可验证的新手安装流程。' }
  })
  assert.match(preview.text, /完成一个可验证/)
  assert.doesNotMatch(preview.text, /角色|Persona|Character/)
  assert.match(preview.text, /不会授予或改变工具/)
})

test('shows the exact one-time collaboration contract without presenting it as permission', () => {
  const preview = buildHandoffPreview({
    thread: { prompt: '修复问题并验证。', taskContract: createTaskContract() }
  })

  assert.equal(preview.contract.kind, 'evidence-first')
  assert.match(preview.text, /协作约定（仅首条消息）/)
  assert.match(preview.text, /不会额外调用模型/)
  assert.match(preview.text, /关键歧义才暂停询问/)
  assert.match(preview.text, /不会授予或改变工具/)
})
