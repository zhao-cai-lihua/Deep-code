const test = require('node:test')
const assert = require('node:assert/strict')
const { stopAndDeleteTask } = require('../src/task-lifecycle.cjs')

test('deletes only after the same task snapshot reports a terminal event', async () => {
  const calls = []
  let readCount = 0
  const result = await stopAndDeleteTask({
    expectedTurnId: 'turn-7',
    cancel: async () => calls.push('cancel'),
    readSnapshot: async () => (++readCount === 1
      ? { taskRunSnapshot: { turn: { id: 'turn-7', state: 'running' } } }
      : { taskRunSnapshot: { turn: { id: 'turn-7', state: 'interrupted' }, terminal: { state: 'interrupted', seq: 8 } } }),
    remove: async () => calls.push('remove'),
    wait: async () => {}, now: (() => { let value = 0; return () => value += 100 })(), timeoutMs: 1000
  })
  assert.equal(result.deleted, true)
  assert.deepEqual(calls, ['cancel', 'remove'])
})

test('does not delete when the terminal event belongs to a different turn', async () => {
  let removed = false
  let time = 0
  const result = await stopAndDeleteTask({
    expectedTurnId: 'turn-7',
    cancel: async () => {},
    readSnapshot: async () => ({
      taskRunSnapshot: { turn: { id: 'turn-8', state: 'completed' }, terminal: { state: 'completed', seq: 12 } }
    }),
    remove: async () => { removed = true },
    wait: async () => { time += 600 }, now: () => time, timeoutMs: 1000, pollMs: 600
  })
  assert.equal(result.deleted, false)
  assert.equal(removed, false)
})

test('keeps the local task when cancellation has no terminal evidence by the deadline', async () => {
  let removed = false
  let time = 0
  const result = await stopAndDeleteTask({
    cancel: async () => {},
    readSnapshot: async () => ({ taskRunSnapshot: { turn: { state: 'running' } } }),
    remove: async () => { removed = true },
    wait: async () => { time += 600 }, now: () => time, timeoutMs: 1000, pollMs: 600
  })
  assert.equal(result.deleted, false)
  assert.equal(result.reason, 'stop-unconfirmed')
  assert.equal(removed, false)
})

test('does not delete when the cancel request itself is rejected', async () => {
  let removed = false
  await assert.rejects(() => stopAndDeleteTask({
    cancel: async () => { throw new Error('cancel rejected') },
    readSnapshot: async () => ({}),
    remove: async () => { removed = true }
  }), /cancel rejected/)
  assert.equal(removed, false)
})
