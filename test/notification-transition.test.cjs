const test = require('node:test')
const assert = require('node:assert/strict')
const { NotificationTransitionTracker } = require('../src/notification-transition.cjs')

function snapshot(threads) {
  return { threads }
}

function task(id, { state = 'running', turnId = 'turn-1', terminal, interactions = [] } = {}) {
  return {
    id,
    engineState: state,
    agent: {
      taskRunSnapshot: { turn: { id: turnId, state }, ...(terminal ? { terminal } : {}) },
      live: { interactions }
    }
  }
}

test('does not replay historical terminal tasks after startup', () => {
  const tracker = new NotificationTransitionTracker()
  tracker.prime(snapshot([task('old', { state: 'completed', terminal: { state: 'completed', seq: 9 } })]))
  assert.deepEqual(tracker.observe(snapshot([task('old', { state: 'completed', terminal: { state: 'completed', seq: 9 } })])), [])
})

test('emits generic waiting and terminal transitions once per task turn', () => {
  const tracker = new NotificationTransitionTracker()
  tracker.prime(snapshot([]))
  assert.deepEqual(tracker.observe(snapshot([task('new')])), [])
  assert.deepEqual(tracker.observe(snapshot([task('new', { interactions: [{ id: 'q-1' }] })])), [{ taskId: 'new', kind: 'waiting' }])
  assert.deepEqual(tracker.observe(snapshot([task('new', { interactions: [{ id: 'q-1' }] })])), [])
  assert.deepEqual(tracker.observe(snapshot([task('new', { state: 'completed', terminal: { state: 'completed', seq: 12 } })])), [{ taskId: 'new', kind: 'completed' }])
})

test('keeps notification payloads free of prompt text, paths, and model output', () => {
  const tracker = new NotificationTransitionTracker()
  tracker.prime(snapshot([]))
  const sensitive = task('secret', { state: 'failed', terminal: { state: 'failed', seq: 7 } })
  sensitive.prompt = 'private prompt'
  sensitive.workspacePath = 'C:\\private'
  sensitive.agent.messages = [{ text: 'private output' }]
  assert.deepEqual(tracker.observe(snapshot([sensitive])), [{ taskId: 'secret', kind: 'failed' }])
})

test('a later turn can notify independently without replaying the earlier turn', () => {
  const tracker = new NotificationTransitionTracker()
  tracker.prime(snapshot([task('task')]))
  assert.deepEqual(tracker.observe(snapshot([task('task', { state: 'completed', terminal: { state: 'completed', seq: 4 } })])), [{ taskId: 'task', kind: 'completed' }])
  assert.deepEqual(tracker.observe(snapshot([task('task', { state: 'running', turnId: 'turn-2' })])), [])
  assert.deepEqual(tracker.observe(snapshot([task('task', { state: 'interrupted', turnId: 'turn-2', terminal: { state: 'interrupted', seq: 8 } })])), [{ taskId: 'task', kind: 'interrupted' }])
})
