const test = require('node:test')
const assert = require('node:assert/strict')

const { createTaskViewState } = require('../src/renderer/task-view-state.cjs')

test('disclosure state belongs to one task and does not leak into another task', () => {
  const views = createTaskViewState()

  views.save('task-a', {
    activeView: 'trace',
    technicalDetailsOpen: true,
    supportingFactsOpen: true,
    openToolCards: ['tool:1']
  })

  assert.deepEqual(views.load('task-b'), {
    activeView: 'conversation',
    technicalDetailsOpen: false,
    supportingFactsOpen: false,
    openToolCards: []
  })
  assert.deepEqual(views.load('task-a'), {
    activeView: 'trace',
    technicalDetailsOpen: true,
    supportingFactsOpen: true,
    openToolCards: ['tool:1']
  })
})

test('loaded task view snapshots cannot mutate the stored state', () => {
  const views = createTaskViewState()
  views.save('task-a', { activeView: 'trace', openToolCards: ['tool:1'] })

  const snapshot = views.load('task-a')
  snapshot.openToolCards.push('tool:2')

  assert.deepEqual(views.load('task-a').openToolCards, ['tool:1'])
})

test('keeps the visual work receipt view isolated per task', () => {
  const views = createTaskViewState()
  views.save('task-a', { activeView: 'receipt' })
  assert.equal(views.load('task-a').activeView, 'receipt')
  assert.equal(views.load('task-b').activeView, 'conversation')
})
