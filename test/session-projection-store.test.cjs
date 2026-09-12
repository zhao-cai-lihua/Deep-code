const test = require('node:test')
const assert = require('node:assert/strict')
const { SessionProjectionStore } = require('../src/session-projection-store.cjs')

test('seeds known Harness projections and lets only a higher sequence replace them', () => {
  const store = new SessionProjectionStore('session-1')
  store.seed({
    asOfSeq: 10,
    values: {
      todos: [{ content: '核对需求', status: 'in_progress' }],
      plan: { active: true, pending: false },
      tokenUsage: {
        uncachedInputTokens: 120,
        outputTokens: 30,
        cacheReadTokens: 400,
        cacheWriteTokens: 20
      },
      contextPressure: { projectedTokens: 720, contextWindow: 128000 },
      sessionStats: {
        turns: 2, steps: 4, llmMs: 1500, toolMs: 600,
        ttftMs: 300, ttftSteps: 2, decodeMs: 800, decodeTokens: 30
      }
    }
  })

  assert.equal(store.apply({
    type: 'session/projection', sessionId: 'session-1', key: 'todos',
    value: [{ content: '过期内容', status: 'completed' }], seq: 9
  }), false)
  assert.equal(store.apply({
    type: 'session/projection', sessionId: 'session-1', key: 'todos',
    value: [{ content: '核对需求', status: 'completed' }], seq: 11
  }), true)

  assert.deepEqual(store.snapshot(), {
    sessionId: 'session-1',
    asOfSeq: 11,
    values: {
      todos: [{ content: '核对需求', status: 'completed' }],
      plan: { active: true, pending: false },
      tokenUsage: {
        uncachedInputTokens: 120, outputTokens: 30,
        cacheReadTokens: 400, cacheWriteTokens: 20
      },
      contextPressure: { projectedTokens: 720, contextWindow: 128000 },
      sessionStats: {
        turns: 2, steps: 4, llmMs: 1500, toolMs: 600,
        ttftMs: 300, ttftSteps: 2, decodeMs: 800, decodeTokens: 30
      }
    },
    health: { invalidProjectionFrames: 0, unknownProjectionKeys: 0 }
  })
})

test('drops invalid and unknown projection values without retaining their bodies', () => {
  const store = new SessionProjectionStore('session-1')
  store.seed({
    asOfSeq: 4,
    values: {
      plan: { active: 'yes', pending: false },
      'third-party/private': { rawPrompt: 'must not cross the product boundary' }
    }
  })
  store.apply({
    type: 'session/projection', sessionId: 'session-1', key: 'tokenUsage', seq: 5,
    value: { uncachedInputTokens: -1, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 4 }
  })

  const snapshot = store.snapshot()
  assert.deepEqual(snapshot.values, {})
  assert.deepEqual(snapshot.health, { invalidProjectionFrames: 2, unknownProjectionKeys: 1 })
  assert.equal(JSON.stringify(snapshot).includes('must not cross'), false)
})
