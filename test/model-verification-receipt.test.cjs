const test = require('node:test')
const assert = require('node:assert/strict')
const { projectModelVerificationReceipt } = require('../src/model-verification-receipt.cjs')

function dedicatedThread(overrides = {}) {
  return {
    purpose: { kind: 'model-connection-test', requestedRoute: { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'low' } },
    agent: {
      effectiveModel: { available: true, provider: 'deepseek', id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash', reasoningEffort: 'low', evidence: 'request/header' },
      taskRunSnapshot: {
        route: { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'low', seq: 2 },
        terminal: { state: 'completed', reason: 'completed', seq: 3 }
      },
      runDetails: { terminal: { state: 'completed', reason: 'completed' } }
    },
    ...overrides
  }
}

test('persists a passed receipt only for an attributable dedicated model test', () => {
  const receipt = projectModelVerificationReceipt(dedicatedThread(), '2026-09-05T00:00:00.000Z')
  assert.deepEqual(receipt, {
    version: 1,
    state: 'passed',
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    modelName: 'DeepSeek-V4-Flash',
    reasoningEffort: 'low',
    routeEvidence: 'request/header',
    terminalReason: 'completed',
    recordedAt: '2026-09-05T00:00:00.000Z'
  })
})

test('never creates a receipt from ordinary chat, a missing request header, or a mismatched route', () => {
  assert.equal(projectModelVerificationReceipt({ ...dedicatedThread(), purpose: null }), null)
  assert.equal(projectModelVerificationReceipt(dedicatedThread({ agent: { effectiveModel: { available: false }, taskRunSnapshot: { terminal: { state: 'completed' } }, runDetails: { terminal: { state: 'completed' } } } })), null)
  assert.equal(projectModelVerificationReceipt(dedicatedThread({ agent: { effectiveModel: { available: true }, taskRunSnapshot: { route: { provider: 'zai-coding-cn', model: 'glm-4.5-air', reasoningEffort: 'low' }, terminal: { state: 'completed' } }, runDetails: { terminal: { state: 'completed' } } } })), null)
})

test('records a safe failed attempt without claiming the connection passed', () => {
  const thread = dedicatedThread()
  thread.agent.runDetails.terminal = {
    state: 'failed', reason: 'error',
    failure: { kind: 'authentication', title: '模型服务拒绝了 API Key', detail: '凭据未被接受。', nextAction: '替换后重试。' }
  }
  thread.agent.taskRunSnapshot.terminal = { state: 'failed', reason: 'error', seq: 3 }
  const receipt = projectModelVerificationReceipt(thread, '2026-09-05T00:00:00.000Z')
  assert.equal(receipt.state, 'failed')
  assert.equal(receipt.failure.kind, 'authentication')
  assert.doesNotMatch(JSON.stringify(receipt), /secret|sk-/i)
})
