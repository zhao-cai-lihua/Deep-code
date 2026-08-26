const test = require('node:test')
const assert = require('node:assert/strict')
const { createReadingRuntime } = require('../src/renderer/reading-runtime.js')

test('follows new output only when the reader is near the bottom', () => {
  const reading = createReadingRuntime({ followThreshold: 100 })
  assert.equal(reading.shouldFollow({ scrollHeight: 1000, scrollTop: 650, clientHeight: 300 }), true)
  assert.equal(reading.shouldFollow({ scrollHeight: 1000, scrollTop: 300, clientHeight: 300 }), false)
  assert.deepEqual(reading.capture({ scrollHeight: 1000, scrollTop: 300, clientHeight: 300 }), { follow: false, scrollTop: 300 })
  assert.equal(reading.capture({ scrollHeight: 1000, scrollTop: 300, clientHeight: 300 }, { force: true }).follow, true)
})

test('restores reading position or advances to the latest output', () => {
  const reading = createReadingRuntime()
  const view = { scrollHeight: 1400, scrollTop: 240 }
  reading.restore(view, { follow: false, scrollTop: 240 })
  assert.equal(view.scrollTop, 240)
  reading.restore(view, { follow: true, scrollTop: 240 })
  assert.equal(view.scrollTop, 1400)
})

test('formats active and completed run time in human language', () => {
  const reading = createReadingRuntime()
  const now = Date.parse('2026-08-20T10:01:05.000Z')
  assert.equal(reading.timingLabel({ state: 'running', startedAt: '2026-08-20T10:00:00.000Z' }, now), '已用时 1 分 5 秒')
  assert.equal(reading.timingLabel({ state: 'ready', durationMs: 12500 }, now), '用时 12.5 秒')
  assert.equal(reading.timingLabel({ state: 'ready' }, now), '')
})
