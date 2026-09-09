const test = require('node:test')
const assert = require('node:assert/strict')
const { assertCurrentTaskTarget } = require('../src/task-target-guard.cjs')

test('allows an action only while the visible task and Session still match', () => {
  const state = {
    activeThreadId: 'task-A',
    threads: [{ id: 'task-A', sessionId: 'session-A' }, { id: 'task-B', sessionId: 'session-B' }]
  }
  assert.equal(assertCurrentTaskTarget(state, { taskId: 'task-A', sessionId: 'session-A' }).id, 'task-A')
  assert.throws(
    () => assertCurrentTaskTarget({ ...state, activeThreadId: 'task-B' }, { taskId: 'task-A', sessionId: 'session-A' }),
    /当前可见任务已经变化/
  )
  assert.throws(
    () => assertCurrentTaskTarget({ ...state, threads: [{ id: 'task-A', sessionId: 'session-new' }] }, { taskId: 'task-A', sessionId: 'session-A' }),
    /Engine Session 已经变化/
  )
})
