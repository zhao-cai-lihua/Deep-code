const test = require('node:test')
const assert = require('node:assert/strict')
const { reconcileOfflineWorkbench, retryDisposition, projectOnlineEngineState } = require('../src/workbench-projection.cjs')

test('an offline app never presents a stale admitted or running task as stopped', () => {
  for (const state of ['queued', 'running']) {
    const snapshot = { activeThreadId: 't1', threads: [{ id: 't1', engineState: state, engineError: '' }] }
    const result = reconcileOfflineWorkbench(snapshot)
    assert.equal(result.threads[0].engineState, 'unknown')
    assert.match(result.threads[0].engineError, /无法确认 Harness 是否仍在执行/)
  }
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

test('structured terminal evidence supersedes a temporary waiting-timeout recovery', () => {
  assert.deepEqual(projectOnlineEngineState({
    projectedState: 'interrupted',
    terminal: { state: 'interrupted', reason: 'aborted' },
    recovery: { kind: 'waiting-timeout' },
    existingError: '尚未确认停止。'
  }), { state: 'error', error: 'Harness 报告这一轮已停止（aborted）。' })

  assert.deepEqual(projectOnlineEngineState({
    projectedState: 'completed',
    terminal: { state: 'completed', reason: 'completed' },
    recovery: { kind: 'waiting-timeout' },
    existingError: '尚未确认停止。'
  }), { state: 'ready', error: '' })
})

test('a timeout without terminal evidence remains unknown instead of stopped', () => {
  assert.deepEqual(projectOnlineEngineState({
    projectedState: 'running',
    recovery: { kind: 'waiting-timeout' },
    existingError: '停止请求已发送，但尚未确认停止。'
  }), { state: 'unknown', error: '停止请求已发送，但尚未确认停止。' })
})
