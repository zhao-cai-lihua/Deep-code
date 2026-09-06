const test = require('node:test')
const assert = require('node:assert/strict')
const { projectTaskGuidance } = require('../src/task-guidance-projection.cjs')

test('keeps guidance hidden until Harness-backed outcome is terminal', () => {
  assert.deepEqual(projectTaskGuidance({ outcome: { visible: false } }), { visible: false, actions: [] })
})

test('routes authentication failures to model services without automatic retry', () => {
  const guidance = projectTaskGuidance({
    outcome: { visible: true, state: 'error', nextAction: '替换凭据。' },
    agent: { runDetails: { terminal: { failure: { kind: 'authentication' } } } }
  })
  assert.deepEqual(guidance.actions.map((item) => item.id), ['open-model-services', 'open-trace'])
  assert.doesNotMatch(JSON.stringify(guidance), /API Key 内容|secret/i)
})

test('offers explicit retry for network failures and wait timeouts', () => {
  const network = projectTaskGuidance({
    outcome: { visible: true, state: 'error' },
    agent: { runDetails: { terminal: { failure: { kind: 'network' } } } }
  })
  assert.equal(network.actions[0].id, 'retry-task')
  const waiting = projectTaskGuidance({
    outcome: { visible: true, state: 'error', recovery: { kind: 'waiting-timeout' } }
  })
  assert.equal(waiting.actions[0].id, 'retry-task')
})

test('sends completed risky work to its receipt before starting over', () => {
  const guidance = projectTaskGuidance({
    outcome: { visible: true, state: 'success', warnings: ['尚未测试'], risks: [{ id: 'dependencies' }], nextAction: '先确认风险。' }
  })
  assert.deepEqual(guidance.actions.map((item) => item.id), ['open-receipt', 'open-trace', 'new-task'])
})

test('a clean completed task can start over or inspect its receipt', () => {
  const guidance = projectTaskGuidance({
    outcome: { visible: true, state: 'success', warnings: [], risks: [] }
  })
  assert.deepEqual(guidance.actions.map((item) => item.id), ['new-task', 'open-receipt'])
})

test('a passed model test can continue without overstating permanent availability', () => {
  const guidance = projectTaskGuidance({
    outcome: { visible: true, state: 'success', warnings: [], modelVerification: { state: 'passed' } }
  })
  assert.equal(guidance.title, '模型已经完成真实验证')
  assert.deepEqual(guidance.actions.map((item) => item.id), ['new-task', 'open-model-services', 'open-receipt'])
})
