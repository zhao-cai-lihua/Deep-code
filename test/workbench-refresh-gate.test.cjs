const test = require('node:test')
const assert = require('node:assert/strict')
const { createWorkbenchRefreshGate } = require('../src/renderer/workbench-refresh-gate.cjs')

test('rejects A snapshot when the visible task changes to B before it returns', () => {
  const gate = createWorkbenchRefreshGate()
  const requestA = gate.begin({ taskId: 'A', sessionId: 'session-A' })
  gate.invalidate()
  gate.begin({ taskId: 'B', sessionId: 'session-B' })
  assert.equal(gate.accept(requestA, { taskId: 'B', sessionId: 'session-B' }), false)
})

test('only the latest refresh for the same task may write the workbench', () => {
  const gate = createWorkbenchRefreshGate()
  const old = gate.begin({ taskId: 'A', sessionId: 'session-A' })
  const latest = gate.begin({ taskId: 'A', sessionId: 'session-A' })
  assert.equal(gate.accept(old, { taskId: 'A', sessionId: 'session-A' }), false)
  assert.equal(gate.accept(latest, { taskId: 'A', sessionId: 'session-A' }), true)
})

test('rejects a response when the task id matches but its Session changed', () => {
  const gate = createWorkbenchRefreshGate()
  const ticket = gate.begin({ taskId: 'A', sessionId: 'session-old' })
  assert.equal(gate.accept(ticket, { taskId: 'A', sessionId: 'session-new' }), false)
})
