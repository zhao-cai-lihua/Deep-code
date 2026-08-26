const test = require('node:test')
const assert = require('node:assert/strict')
const { reconcileOfflineWorkbench, retryDisposition } = require('../src/workbench-projection.cjs')

test('an offline app never presents a stale task as still running', () => {
  const snapshot = { activeThreadId: 't1', threads: [{ id: 't1', engineState: 'running', engineError: '' }] }
  const result = reconcileOfflineWorkbench(snapshot)
  assert.equal(result.threads[0].engineState, 'error')
  assert.match(result.threads[0].engineError, /不会在背后继续运行/)
})

test('offline reconciliation leaves completed and draft tasks unchanged', () => {
  for (const state of ['draft', 'ready', 'error']) {
    const snapshot = { activeThreadId: 't1', threads: [{ id: 't1', engineState: state, engineError: '' }] }
    assert.equal(reconcileOfflineWorkbench(snapshot).threads[0].engineState, state)
  }
})

test('reconnects an existing conversation without resending its first prompt', () => {
  assert.equal(retryDisposition({ messages: [{ role: 'user', text: '已经发送过' }] }), 'reconnect')
  assert.equal(retryDisposition({ messages: [] }), 'resend')
})
