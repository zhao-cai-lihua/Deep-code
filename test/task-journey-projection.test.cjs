const test = require('node:test')
const assert = require('node:assert/strict')
const { projectTaskJourney } = require('../src/task-journey-projection.cjs')

const contract = { version: 2, kind: 'evidence-first', attachedTo: 'initial-prompt' }

test('stays absent for raw tasks instead of inventing a workflow', () => {
  assert.deepEqual(projectTaskJourney({ run: { state: 'running' } }), { visible: false })
  assert.deepEqual(projectTaskJourney({ taskContract: { version: 1, kind: 'evidence-first', attachedTo: 'initial-prompt' }, run: { state: 'running' } }), { visible: false })
})

test('keeps alignment provisional until the admitted contract appears in session history', () => {
  const journey = projectTaskJourney({
    taskContract: contract,
    admission: { accepted: true },
    run: { state: 'running' },
    outcome: { visible: false }
  })

  assert.equal(journey.visible, true)
  assert.equal(journey.tone, 'active')
  assert.deepEqual(journey.stages.map((stage) => [stage.id, stage.state]), [
    ['align', 'current'], ['act', 'current'], ['verify', 'pending'], ['deliver', 'pending']
  ])
  assert.match(journey.stages[0].detail, /等待事件历史确认/)
  assert.match(journey.evidenceBoundary, /Harness 结构化事实/)
})

test('makes waiting and unknown evidence visible without calling them progress', () => {
  const journey = projectTaskJourney({
    taskContract: contract,
    run: { state: 'waiting' },
    outcome: { visible: false }
  })

  assert.equal(journey.tone, 'attention')
  assert.equal(journey.stages[0].state, 'pending')
  assert.equal(journey.stages[1].state, 'attention')
  assert.match(journey.stages[1].detail, /等待你的决定/)
  assert.equal(journey.stages[2].state, 'pending')
  assert.equal(journey.stages[3].state, 'pending')
})

test('finishes cleanly only when terminal and verification evidence support it', () => {
  const journey = projectTaskJourney({
    taskContract: contract,
    agent: { messages: [{ role: 'user', taskContract: contract }] },
    run: { state: 'completed' },
    outcome: {
      visible: true,
      state: 'success',
      terminalConfirmed: true,
      changes: [{ path: 'src/app.js' }],
      verifications: [{ state: 'passed', label: 'npm test' }],
      warnings: [],
      risks: []
    }
  })

  assert.equal(journey.tone, 'complete')
  assert.deepEqual(journey.stages.map((stage) => stage.state), ['complete', 'complete', 'complete', 'complete'])
  assert.match(journey.stages[2].detail, /1 项明确验证通过/)
  assert.match(journey.stages[3].detail, /工作回执已经生成/)
})

test('keeps completed work yellow when its receipt still contains uncertainty', () => {
  const journey = projectTaskJourney({
    taskContract: contract,
    admission: { accepted: true },
    run: { state: 'completed' },
    outcome: {
      visible: true,
      state: 'success',
      changes: [{ path: 'README.md' }],
      verifications: [],
      warnings: ['没有验证命令。'],
      risks: []
    }
  })

  assert.equal(journey.tone, 'attention')
  assert.equal(journey.stages[1].state, 'complete')
  assert.equal(journey.stages[2].state, 'attention')
  assert.equal(journey.stages[3].state, 'attention')
  assert.match(journey.summary, /仍有未确认项/)
})
