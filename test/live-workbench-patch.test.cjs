const test = require('node:test')
const assert = require('node:assert/strict')
const { createLivePatchCoalescer } = require('../src/live-workbench-patch.cjs')

test('coalesces ordinary live changes and sends decisions or terminals immediately', () => {
  const emitted = []
  const timers = []
  const coalescer = createLivePatchCoalescer({
    emit: (value) => emitted.push(value),
    waitMs: 120,
    setTimeoutImpl: (fn, ms) => { timers.push({ fn, ms }); return timers.length },
    clearTimeoutImpl: () => {}
  })
  coalescer.push({ revision: 1 }, 'normal')
  coalescer.push({ revision: 2 }, 'normal')
  assert.equal(emitted.length, 0)
  assert.equal(timers.length, 1)
  timers[0].fn()
  assert.deepEqual(emitted, [{ revision: 2 }])

  coalescer.push({ revision: 3 }, 'decision')
  coalescer.push({ revision: 4 }, 'terminal')
  assert.deepEqual(emitted.slice(1), [{ revision: 3 }, { revision: 4 }])
})

test('a live patch carries and validates the task Session and generation fence', () => {
  const { createLiveWorkbenchPatch, acceptsLiveWorkbenchPatch } = require('../src/live-workbench-patch.cjs')
  const patch = createLiveWorkbenchPatch({ taskId: 'task-a', sessionId: 'session-a', generation: 7, live: { draft: null } })
  assert.equal(acceptsLiveWorkbenchPatch(patch, { taskId: 'task-a', sessionId: 'session-a', generation: 7 }), true)
  assert.equal(acceptsLiveWorkbenchPatch(patch, { taskId: 'task-b', sessionId: 'session-a', generation: 7 }), false)
  assert.equal(acceptsLiveWorkbenchPatch(patch, { taskId: 'task-a', sessionId: 'session-a', generation: 8 }), false)
})
