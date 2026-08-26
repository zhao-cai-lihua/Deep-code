const test = require('node:test')
const assert = require('node:assert/strict')

const { createTaskViewState } = require('../src/renderer/task-view-state.cjs')

test('disclosure state belongs to one task and does not leak into another task', () => {
  const views = createTaskViewState()

  views.save('task-a', {
    runDetailsOpen: true,
    technicalDetailsOpen: true,
    openToolCards: ['tool:1']
  })

  assert.deepEqual(views.load('task-b'), {
    runDetailsOpen: false,
    technicalDetailsOpen: false,
    openToolCards: []
  })
  assert.deepEqual(views.load('task-a'), {
    runDetailsOpen: true,
    technicalDetailsOpen: true,
    openToolCards: ['tool:1']
  })
})

test('loaded task view snapshots cannot mutate the stored state', () => {
  const views = createTaskViewState()
  views.save('task-a', { runDetailsOpen: true, openToolCards: ['tool:1'] })

  const snapshot = views.load('task-a')
  snapshot.openToolCards.push('tool:2')

  assert.deepEqual(views.load('task-a').openToolCards, ['tool:1'])
})
