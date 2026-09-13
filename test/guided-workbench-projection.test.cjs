const test = require('node:test')
const assert = require('node:assert/strict')
const { projectGuidedWorkbench } = require('../src/guided-workbench-projection.cjs')

test('projects phase, Harness plan, exact session usage, timing, and health without inventing cost', () => {
  const result = projectGuidedWorkbench({
    id: 'task-1', sessionId: 'session-1',
    run: { state: 'running', label: '正在运行' },
    outcome: { visible: false },
    agent: { live: { projections: {
      sessionId: 'session-1', asOfSeq: 14,
      values: {
        todos: [{ content: '读取项目', status: 'completed' }, { content: '实现修复', status: 'in_progress' }],
        plan: { active: true, pending: false },
        tokenUsage: { uncachedInputTokens: 100, outputTokens: 30, cacheReadTokens: 700, cacheWriteTokens: 10 },
        contextPressure: { projectedTokens: 2000, contextWindow: 128000 },
        sessionStats: { turns: 2, steps: 5, llmMs: 5000, toolMs: 900, ttftMs: 400, ttftSteps: 2, decodeMs: 2400, decodeTokens: 30 }
      },
      health: { droppedSessionFrames: 2, invalidProjectionFrames: 1, unknownProjectionKeys: 3 }
    } } }
  })

  assert.deepEqual(result, {
    version: 1,
    taskId: 'task-1', sessionId: 'session-1', phase: { id: 'working', label: '正在执行' },
    collaborationMode: { id: 'plan', label: 'Plan', pending: false },
    plan: {
      source: 'harness',
      items: [{ content: '读取项目', status: 'completed' }, { content: '实现修复', status: 'in_progress' }]
    },
    usage: {
      scope: 'session', available: true,
      tokens: { uncachedInput: 100, output: 30, cacheRead: 700, cacheWrite: 10, total: 840 },
      context: { available: true, approximate: true, used: 2000, capacity: 128000, ratio: 0.015625 },
      timing: { turns: 2, steps: 5, llmMs: 5000, toolMs: 900, averageTtftMs: 200, decodeTokensPerSecond: 12.5 },
      cost: { available: false, label: 'Provider 未提供可核对的金额。' }
    },
    receipt: { visible: false },
    sessionHealth: { state: 'attention', droppedSessionFrames: 2, invalidProjectionFrames: 1, unknownProjectionKeys: 3 }
  })
})

test('keeps missing Harness projections visibly unavailable instead of creating a local plan', () => {
  const result = projectGuidedWorkbench({ id: 'task-2', run: { state: 'draft' } })
  assert.equal(result.collaborationMode.id, 'direct')
  assert.deepEqual(result.plan, { source: 'harness', items: null })
  assert.equal(result.usage.available, false)
  assert.equal(result.sessionHealth.state, 'unknown')
})
