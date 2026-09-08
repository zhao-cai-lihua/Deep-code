const test = require('node:test')
const assert = require('node:assert/strict')
const { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } = require('node:fs')
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

test('confirmation atomically moves a candidate and aligns its declared status', () => {
  const { root, store } = fixture()
  try {
    const candidate = store.createCandidate({
      kind: 'decision', scope: 'deep-code', sourceRefs: ['human:test'], title: 'Keep task workspace binding',
      content: 'A running task keeps its launch workspace.', reason: 'Prevents cross-project writes.', limits: 'The new-task default may still change.'
    })
    const confirmed = store.review(candidate.id, 'confirmed')
    assert.equal(confirmed.status, 'confirmed')
    assert.deepEqual(confirmed.sourceRefs, ['human:test'])
    assert.match(readFileSync(confirmed.path, 'utf8'), /status: "confirmed"/)
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

test('quarantines frontmatter status that conflicts with its containing folder', () => {
  const { root, store } = fixture()
  try {
    const candidate = store.createCandidate({
      kind: 'learning', scope: 'deep-code', sourceRefs: ['human:test'], title: 'Folder owns status',
      content: 'Directory placement is canonical.', reason: 'Prevents double truth.', limits: 'None.'
    })
    const tampered = readFileSync(candidate.path, 'utf8').replace('status: "candidate"', 'status: "confirmed"')
    writeFileSync(candidate.path, tampered, 'utf8')
    assert.equal(store.list('candidate').length, 0)
    assert.equal(store.list('confirmed').length, 0)
    assert.equal(readdirSync(join(root, '90_Quarantine')).some((name) => name.includes(candidate.id)), true)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('quarantines a record whose editable id disagrees with its safe filename', () => {
  const { root, store } = fixture()
  try {
    store.initialize()
    const path = join(root, '00_Inbox', 'mem_safe.md')
    writeFileSync(path, '---\nid: "../../escaped"\nkind: "learning"\nstatus: "candidate"\n---\n\n# bad\n', 'utf8')
    assert.deepEqual(store.list('candidate'), [])
    assert.equal(existsSync(path), false)
    assert.equal(readdirSync(join(root, '90_Quarantine')).some((name) => name.includes('mem_safe')), true)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('rejects high-confidence secrets without echoing their value', () => {
  const { root, store } = fixture()
  const secret = 'sk-this-value-must-never-appear'
  try {
    assert.throws(() => store.createCandidate({
      kind: 'learning', scope: 'deep-code', sourceRefs: ['human:test'], title: 'credential',
      content: `SERVICE_TOKEN=${secret}`, reason: 'test', limits: 'test'
    }), (error) => /敏感凭据/.test(error.message) && !error.message.includes(secret))
    assert.doesNotThrow(() => store.createCandidate({
      kind: 'learning', scope: 'deep-code', sourceRefs: ['human:test'], title: 'API Key policy',
      content: 'Never paste an API Key into a public issue.', reason: 'Safe policy text.', limits: 'No secret value is present.'
    }))
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('quarantines a secret introduced into an existing record', () => {
  const { root, store } = fixture()
  try {
    const candidate = store.createCandidate({
      kind: 'learning', scope: 'deep-code', sourceRefs: ['human:test'], title: 'Safe title',
      content: 'Safe content.', reason: 'Test migration checks.', limits: 'None.'
    })
    writeFileSync(candidate.path, readFileSync(candidate.path, 'utf8').replace('Safe content.', 'SERVICE_TOKEN=super-secret-value'), 'utf8')
    assert.deepEqual(store.list('candidate'), [])
    assert.equal(readdirSync(join(root, '90_Quarantine')).some((name) => name.includes(candidate.id)), true)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('moves a reviewed memory atomically without creating a second record first', () => {
  const root = mkdtempSync(join(tmpdir(), 'deep-code-memory-'))
  const renames = []
  const store = new MemoryCandidateStore(root, {
    now: () => new Date('2026-09-03T12:00:00.000Z'), id: () => 'atomic-1',
    moveFile: (from, to) => { renames.push({ from, to }); require('node:fs').renameSync(from, to) }
  })
  try {
    const candidate = store.createCandidate({
      kind: 'decision', scope: 'deep-code', sourceRefs: ['human:test'], title: 'Atomic move',
      content: 'Move once.', reason: 'One truth.', limits: 'Same volume only.'
    })
    const confirmed = store.review(candidate.id, 'confirmed')
    assert.equal(renames.length, 1)
    assert.equal(confirmed.status, 'confirmed')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('keeps the candidate as the only truth when the atomic review move fails', () => {
  const root = mkdtempSync(join(tmpdir(), 'deep-code-memory-'))
  const store = new MemoryCandidateStore(root, {
    now: () => new Date('2026-09-03T12:00:00.000Z'), id: () => 'move-failure',
    moveFile: () => { throw new Error('simulated move failure') }
  })
  try {
    const candidate = store.createCandidate({
      kind: 'decision', scope: 'deep-code', sourceRefs: ['human:test'], title: 'Atomic failure',
      content: 'Keep the source.', reason: 'Avoid two truths.', limits: 'Test only.'
    })
    assert.throws(() => store.review(candidate.id, 'confirmed'), /simulated move failure/)
    assert.equal(existsSync(candidate.path), true)
    assert.equal(store.list('candidate')[0].id, candidate.id)
    assert.equal(store.list('confirmed').length, 0)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('quarantines a duplicate id instead of exposing two active records', () => {
  const { root, store } = fixture()
  try {
    const candidate = store.createCandidate({
      kind: 'learning', scope: 'deep-code', sourceRefs: ['human:test'], title: 'Duplicate',
      content: 'One record only.', reason: 'Avoid two truths.', limits: 'Test only.'
    })
    store.initialize()
    writeFileSync(
      join(root, '20_Confirmed', `${candidate.id}.md`),
      readFileSync(candidate.path, 'utf8').replace('status: "candidate"', 'status: "confirmed"'),
      'utf8'
    )
    const scan = store.scan()
    assert.equal(scan.candidate.length + scan.confirmed.length, 0)
    assert.equal(readdirSync(join(root, '90_Quarantine')).filter((name) => name.includes(candidate.id) && !name.endsWith('.reason.json')).length, 2)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
