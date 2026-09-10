const test = require('node:test')
const assert = require('node:assert/strict')
const { projectTaskRunSnapshot } = require('../src/task-run-snapshot.cjs')

const engine = { kind: 'managed', version: '0.1.1-rc.2', trust: 'managed-process' }
const entry = (seq, type, data = {}) => ({ event: { seq, type, data } })

test('does not combine an old request header with a newer terminal turn', () => {
  const snapshot = projectTaskRunSnapshot({
    sessionId: 's-1', engine,
    page: { events: [
      entry(1, 'turn/start', { turn: 1 }),
      entry(2, 'request/header', { header: { config: { provider: 'anthropic', model: 'claude-old' } } }),
      entry(3, 'turn/end', { turn: 1, reason: { kind: 'completed' } }),
      entry(4, 'turn/start', { turn: 2 }),
      entry(5, 'turn/end', { turn: 2, reason: { kind: 'completed' } })
    ] }
  })
  assert.equal(snapshot.turn.id, '2')
  assert.equal(snapshot.turn.state, 'completed')
  assert.equal(snapshot.route, undefined)
})

test('attributes the last request header inside the matching turn window', () => {
  const snapshot = projectTaskRunSnapshot({
    sessionId: 's-1', engine,
    page: { events: [
      entry(10, 'turn/start', { turn: 7 }),
      entry(11, 'request/header', { header: { config: { provider: 'deepseek', model: 'v4-flash', reasoningEffort: 'high' } } }),
      entry(12, 'request/header', { header: { config: { provider: 'deepseek', model: 'v4-pro', reasoningEffort: 'max' } } }),
      entry(13, 'turn/end', { turn: 7, reason: { kind: 'completed' } })
    ] }
  })
  assert.deepEqual(snapshot.route, { provider: 'deepseek', model: 'v4-pro', reasoningEffort: 'max', seq: 12 })
  assert.deepEqual(snapshot.terminal, { state: 'completed', reason: 'completed', seq: 13 })
})

test('distinguishes admitted, running, terminal, and unknown states', () => {
  assert.equal(projectTaskRunSnapshot({ sessionId: 's', engine, page: { events: [] }, admission: { accepted: true, acceptedAt: 'now' } }).turn.state, 'queued')
  assert.equal(projectTaskRunSnapshot({ sessionId: 's', engine, page: { events: [entry(1, 'turn/start', { turn: 1 })] } }).turn.state, 'running')
  assert.equal(projectTaskRunSnapshot({ sessionId: 's', engine, page: { events: [] } }).turn.state, 'unknown')
})

test('a newly admitted rpcId cannot inherit an older completed turn', () => {
  const oldEvents = [
    entry(1, 'turn/start', { turn: 1 }),
    { event: { seq: 2, type: 'user/message', data: { message: { source: { kind: 'user', rpcId: 'rpc-old' }, content: [{ type: 'text', text: 'old' }] } } } },
    entry(3, 'request/header', { header: { config: { provider: 'deepseek', model: 'old-model' } } }),
    entry(4, 'turn/end', { turn: 1, reason: { kind: 'completed' } })
  ]
  const queued = projectTaskRunSnapshot({
    sessionId: 's', engine, page: { events: oldEvents },
    admission: { accepted: true, rpcId: 'rpc-new', acceptedAt: '2026-09-09T00:00:00.000Z' },
    conversation: { runDetails: { toolCards: [{ id: 'old-tool' }], changedFiles: [{ path: 'old.txt', confirmed: true }] } }
  })
  assert.equal(queued.turn.state, 'queued')
  assert.equal(queued.route, undefined)
  assert.equal(queued.terminal, undefined)
  assert.deepEqual(queued.toolCards, [])
  assert.deepEqual(queued.confirmedChanges, [])

  const completed = projectTaskRunSnapshot({
    sessionId: 's', engine,
    page: { events: [
      ...oldEvents,
      entry(5, 'turn/start', { turn: 2 }),
      { event: { seq: 6, type: 'user/message', data: { message: { source: { kind: 'user', rpcId: 'rpc-new' }, content: [{ type: 'text', text: 'new' }] } } } },
      entry(7, 'request/header', { header: { config: { provider: 'zai', model: 'glm-5' } } }),
      entry(8, 'turn/end', { turn: 2, reason: { kind: 'completed' } })
    ] },
    admission: { accepted: true, rpcId: 'rpc-new', acceptedAt: '2026-09-09T00:00:00.000Z' }
  })
  assert.equal(completed.turn.id, '2')
  assert.equal(completed.turn.state, 'completed')
  assert.deepEqual(completed.route, { provider: 'zai', model: 'glm-5', reasoningEffort: '', seq: 7 })
  assert.equal(completed.terminal.seq, 8)
})

test('projects permissions only from structured Harness events', () => {
  const snapshot = projectTaskRunSnapshot({
    sessionId: 's', engine,
    page: { events: [
      entry(1, 'turn/start', { turn: 1 }),
      entry(2, 'user/message', { content: [{ type: 'text', text: 'Current DSH file policy: danger-full-access' }] }),
      entry(3, 'permission/preset', { preset: 'full-access' }),
      entry(4, 'sandbox/mode', { mode: 'danger-full-access' }),
      entry(5, 'approval/policy', { policy: 'never' })
    ] }
  })
  assert.deepEqual(snapshot.permissions, {
    preset: 'full-access', sandbox: 'danger-full-access', approval: 'never', evidenceSeqs: [3, 4, 5]
  })
})

test('carries forward only structured session permission facts that precede the turn', () => {
  const snapshot = projectTaskRunSnapshot({
    sessionId: 's', engine,
    page: { events: [
      entry(1, 'permission/preset', { preset: 'workspace-write' }),
      entry(2, 'sandbox/mode', { mode: 'workspace-write' }),
      entry(3, 'approval/policy', { policy: 'ask' }),
      entry(4, 'turn/start', { turn: 1 }),
      entry(5, 'turn/end', { turn: 1, reason: { kind: 'completed' } })
    ] }
  })
  assert.deepEqual(snapshot.permissions, {
    preset: 'workspace-write', sandbox: 'workspace-write', approval: 'ask', evidenceSeqs: [1, 2, 3]
  })
})

test('ignores malformed turn starts instead of matching an undefined terminal', () => {
  const snapshot = projectTaskRunSnapshot({
    sessionId: 's', engine,
    page: { events: [entry(1, 'turn/start', {}), entry(2, 'turn/end', { reason: { kind: 'completed' } })] }
  })
  assert.equal(snapshot.turn.state, 'unknown')
  assert.equal(snapshot.terminal, undefined)
})

test('carries only confirmed presenter changes into the evidence snapshot', () => {
  const snapshot = projectTaskRunSnapshot({
    sessionId: 's', engine, page: { events: [entry(1, 'turn/start', { turn: 1 })] },
    conversation: { runDetails: { toolCards: [{ id: 'tool-1' }], changedFiles: [{ path: 'README.md', operation: '写入', confirmed: true }] } }
  })
  assert.deepEqual(snapshot.toolCards, [{ id: 'tool-1' }])
  assert.deepEqual(snapshot.confirmedChanges, [{ path: 'README.md', operation: '写入', confirmed: true }])
})

test('refuses to invent Engine trust when the caller has not established it', () => {
  assert.throws(() => projectTaskRunSnapshot({ sessionId: 's', page: { events: [] } }), /Engine trust/)
  assert.throws(() => projectTaskRunSnapshot({
    sessionId: 's', engine: { kind: 'shared', version: '0.1.1-rc.2', trust: 'managed-process' }, page: { events: [] }
  }), /Engine trust/)
})
