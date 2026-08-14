const { mkdtempSync } = require('node:fs')
const { join } = require('node:path')
const { tmpdir } = require('node:os')
const test = require('node:test')
const assert = require('node:assert/strict')
const { ReplyModeStore, validatePackage } = require('../src/reply-mode-store.cjs')

function draft(overrides = {}) {
  return {
    name: '清晰协作',
    summary: '把结论说清楚，并说明不确定处。',
    responseStyle: '先给结论，再给可执行步骤；不确定时明确说明。',
    contextBlocks: [{ label: '协作背景', text: '用户希望掌握操作，而非只得到答案。' }],
    ...overrides
  }
}

test('saves a local-first reply mode without granting runtime powers', () => {
  const store = new ReplyModeStore(join(mkdtempSync(join(tmpdir(), 'deep-code-modes-')), 'modes.json'))
  const mode = store.save(draft())
  assert.equal(store.list().length, 1)
  assert.equal(mode.format, 'deep-code.reply-mode')
  assert.equal(mode.contextBlocks[0].label, '协作背景')
})

test('rejects a permission-bearing card field instead of ignoring it', () => {
  assert.throws(() => validatePackage(draft({ permissions: ['shell'] }), { allowMissingIdentity: true }), /不能包含/)
})

test('rejects likely secrets in reply-mode text', () => {
  assert.throws(() => validatePackage(draft({ responseStyle: `Authorization: ${'Bearer' + ' very-secret-value'}` }), { allowMissingIdentity: true }), /密钥/)
})

test('preserves an imported card as a separate local copy on id collision', () => {
  const store = new ReplyModeStore(join(mkdtempSync(join(tmpdir(), 'deep-code-modes-')), 'modes.json'))
  const first = store.save(draft())
  const imported = store.commitImport({ ...first, updatedAt: first.createdAt })
  assert.notEqual(imported.id, first.id)
  assert.equal(store.list().length, 2)
})
