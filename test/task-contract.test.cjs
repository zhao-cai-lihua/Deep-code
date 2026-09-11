const test = require('node:test')
const assert = require('node:assert/strict')
const {
  createTaskContract,
  buildTaskPrompt,
  parseTaskPrompt
} = require('../src/task-contract.cjs')

test('attaches one reviewable collaboration contract while preserving the exact request', () => {
  const request = '请修复登录问题，但不要改动支付模块。'
  const contract = createTaskContract()
  const outbound = buildTaskPrompt({ request, contract })

  assert.equal(outbound.attached, true)
  assert.equal(outbound.request, request)
  assert.equal(outbound.contract.kind, 'evidence-first')
  assert.equal(outbound.addedCharacters, outbound.text.length - request.length)
  assert.match(outbound.text, /^请修复登录问题/)
  assert.match(outbound.text, /缺少关键前提/)
  assert.match(outbound.text, /不会改变 Harness 的模型、工具、权限、工作区或批准策略/)

  const parsed = parseTaskPrompt(outbound.text)
  assert.equal(parsed.attached, true)
  assert.equal(parsed.request, request)
  assert.equal(parsed.contract.kind, 'evidence-first')
  assert.equal(parsed.addedCharacters, outbound.addedCharacters)
})

test('leaves disabled, legacy, image-only, and marker-like user text untouched', () => {
  const markerLike = '请解释 <deep-code-task-contract version="1"> 是什么。'
  assert.deepEqual(buildTaskPrompt({ request: markerLike, contract: null }), {
    text: markerLike, request: markerLike, attached: false, contract: null, addedCharacters: 0
  })
  assert.deepEqual(parseTaskPrompt(markerLike), {
    text: markerLike, request: markerLike, attached: false, contract: null, addedCharacters: 0
  })
  assert.deepEqual(buildTaskPrompt({ request: '', contract: createTaskContract() }), {
    text: '', request: '', attached: false, contract: null, addedCharacters: 0
  })
})

test('does not hide a forged or modified contract-shaped suffix', () => {
  const outbound = buildTaskPrompt({ request: '原始请求', contract: createTaskContract() })
  const modified = outbound.text.replace('保留已有工作', '覆盖已有工作')
  const parsed = parseTaskPrompt(modified)

  assert.equal(parsed.attached, false)
  assert.equal(parsed.request, modified)
})
