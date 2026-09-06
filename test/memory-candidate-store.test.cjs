const test = require('node:test')
const assert = require('node:assert/strict')
const { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } = require('node:fs')
const { join } = require('node:path')
const { tmpdir } = require('node:os')
const { MemoryCandidateStore } = require('../src/memory-candidate-store.cjs')

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'deep-code-memory-'))
  const store = new MemoryCandidateStore(root, {
    now: () => new Date('2026-09-03T12:00:00.000Z'),
    id: () => 'candidate-1'
  })
  return { root, store }
}

test('writes a reviewable Markdown candidate with provenance and no hidden activation', () => {
  const { root, store } = fixture()
  try {
    const record = store.createCandidate({
      kind: 'learning',
      scope: 'deep-code',
      sensitivity: 'ordinary',
      sourceRefs: ['commit:55f50a4'],
      title: 'Nested modal focus can stall interaction',
      content: 'Use one in-app confirmation layer for Provider removal.',
      reason: 'The workaround and regression contract affect future UI work.',
      limits: 'This does not prove every Windows focus stall has the same cause.'
    })
    const markdown = readFileSync(record.path, 'utf8')
    assert.match(markdown, /status: "candidate"/)
    assert.match(markdown, /source_refs: \["commit:55f50a4"\]/)
    assert.equal(store.list('confirmed').length, 0)
    assert.equal(store.list('candidate')[0].content, 'Use one in-app confirmation layer for Provider removal.')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('confirmation moves a candidate to the confirmed collection without rewriting its source', () => {
  const { root, store } = fixture()
  try {
    const candidate = store.createCandidate({
      kind: 'decision', scope: 'deep-code', sourceRefs: ['human:test'], title: 'Keep task workspace binding',
      content: 'A running task keeps its launch workspace.', reason: 'Prevents cross-project writes.', limits: 'The new-task default may still change.'
    })
    const confirmed = store.review(candidate.id, 'confirmed')
    assert.equal(confirmed.status, 'confirmed')
    assert.deepEqual(confirmed.sourceRefs, ['human:test'])
    assert.equal(store.list('candidate').length, 0)
    assert.equal(store.list('confirmed')[0].id, candidate.id)
    assert.equal(existsSync(candidate.path), false)
    assert.deepEqual(readdirSync(join(root, '00_Inbox')), [])
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('rejects invalid kinds and does not accept an unreviewed candidate as an active status', () => {
  const { root, store } = fixture()
  try {
    assert.throws(() => store.createCandidate({ kind: 'secret', scope: 'deep-code', title: 'x', content: 'x', reason: 'x', limits: 'x' }), /类型无效/)
    assert.throws(() => store.createCandidate({ kind: 'learning', scope: 'deep-code', title: 'x', content: 'x', reason: 'x', limits: 'x' }), /必须注明来源/)
    assert.throws(() => store.review('missing', 'superseded'), /只能确认或拒绝/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('deletes exactly one reviewed record without touching another memory', () => {
  const { root, store } = fixture()
  try {
    const first = store.createCandidate({
      kind: 'preference', scope: 'global', sourceRefs: ['user:manual'], title: 'Explain terms',
      content: 'Explain unfamiliar terms in ordinary language.', reason: 'Reduces onboarding cost.', limits: 'Keep exact technical names when needed.'
    })
    const confirmed = store.review(first.id, 'confirmed')
    const otherStore = new MemoryCandidateStore(root, { now: () => new Date('2026-09-03T12:01:00.000Z'), id: () => 'candidate-2' })
    const second = otherStore.createCandidate({
      kind: 'learning', scope: 'global', sourceRefs: ['user:manual'], title: 'Keep evidence',
      content: 'Keep runtime evidence separate.', reason: 'Prevents invented success.', limits: 'Not a replacement for Harness truth.'
    })
    assert.deepEqual(store.remove(confirmed.id), { id: confirmed.id, status: 'confirmed', removed: true })
    assert.equal(existsSync(confirmed.path), false)
    assert.equal(store.list('candidate')[0].id, second.id)
    assert.throws(() => store.remove(confirmed.id), /找不到/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
