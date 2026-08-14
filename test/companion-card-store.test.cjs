const { mkdtempSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')
const { tmpdir } = require('node:os')
const test = require('node:test')
const assert = require('node:assert/strict')
const { BUILTIN_YANXING, CompanionCardStore, validateCard } = require('../src/companion-card-store.cjs')

function card(overrides = {}) {
  return {
    kind: 'agent-character',
    name: '清醒的共同创作者',
    summary: '温暖、主动且允许不同意的协作起点。',
    modelText: '先说清判断与不确定处；不要用顺从换取亲近。',
    humanNotes: '这是本地草稿。',
    tags: ['中文', '协作'],
    ...overrides
  }
}

function storeWithPaths() {
  const root = mkdtempSync(join(tmpdir(), 'deep-code-cards-'))
  return { root, store: new CompanionCardStore(join(root, 'cards.json'), join(root, 'reply-modes.json')) }
}

test('ships Yanxing as an editable user-persona starting point without making it active runtime configuration', () => {
  const { store } = storeWithPaths()
  const snapshot = store.snapshot()
  assert.equal(snapshot.cards.find((item) => item.id === BUILTIN_YANXING.id).kind, 'user-persona')
  assert.equal(snapshot.active.userPersonaId, BUILTIN_YANXING.id)
  assert.throws(() => store.remove(BUILTIN_YANXING.id), /内置起点/)
})

test('saves agent characters and selects them only in the local card stack', () => {
  const { store } = storeWithPaths()
  const saved = store.save(card())
  const active = store.setActive('agent-character', saved.id)
  assert.equal(active.agentCharacterId, saved.id)
  assert.equal(store.snapshot().cards.find((item) => item.id === saved.id).source, 'local')
})

test('rejects permission-bearing cards rather than treating them as character flavor', () => {
  assert.throws(() => validateCard(card({ tools: ['shell'] }), { allowMissingIdentity: true }), /不能包含/)
})

test('migrates saved reply modes into interaction styles on first use', () => {
  const { root, store } = storeWithPaths()
  writeFileSync(join(root, 'reply-modes.json'), JSON.stringify({ modes: [{
    id: 'old-mode', name: '研究', summary: '证据优先', responseStyle: '区分证据与猜想。',
    contextBlocks: [{ label: '背景', text: '保留复杂度。' }], safety: '不会改工具。',
    createdAt: '2026-08-14T00:00:00.000Z', updatedAt: '2026-08-14T00:00:00.000Z'
  }] }), 'utf8')
  const migrated = store.snapshot().cards.find((item) => item.id === 'old-mode')
  assert.equal(migrated.kind, 'interaction-style')
  assert.match(migrated.modelText, /背景/)
})
