const test = require('node:test')
const assert = require('node:assert/strict')
const { projectTaskRun } = require('../src/run-projection.cjs')

test('projects only current active work and verified model/evidence facts', () => {
  const result = projectTaskRun({
    engineState: 'running',
    agent: {
      taskRunSnapshot: {
        turn: { state: 'running' },
        route: { provider: 'deepseek-official', model: 'deepseek-v4-pro', reasoningEffort: 'max', seq: 7 },
        confirmedChanges: [{ path: 'README.md', operation: '修改', confirmed: true }]
      },
      model: { available: true, provider: 'deepseek-official', id: 'deepseek-v4-flash-vision-exp', name: 'DeepSeek Vision', reasoningEffort: 'high' },
      effectiveModel: { available: true, provider: 'deepseek-official', id: 'deepseek-v4-pro', name: 'DeepSeek Pro', reasoningEffort: 'max' },
      live: {
        status: 'connected',
        activities: [
          { id: 'old', state: 'done', label: '旧操作完成' },
          { id: 'current', state: 'working', label: '正在读取文件' }
        ],
        interactions: [{ id: 'approval:1' }],
        queue: { queued: 2, steering: 0 }
      },
      runDetails: { toolCards: [{ id: 'tool-1' }], changedFiles: [{ path: 'README.md' }] }
    }
  })

  assert.equal(result.state, 'waiting')
  assert.equal(result.model.id, 'deepseek-v4-pro')
  assert.equal(result.model.scope, 'request-effective')
  assert.equal(result.model.reasoningEffort, 'max')
  assert.equal(result.model.confirmed, true)
  assert.deepEqual(result.activeItems.map((item) => item.id), ['current'])
  assert.deepEqual(result.evidence, { toolCount: 1, changedFileCount: 1 })
  assert.deepEqual(result.usage, { available: false, label: 'Harness 未提供本轮 token 或费用。' })
})

test('durable idle state never leaves live working items visible', () => {
  const result = projectTaskRun({
    engineState: 'ready',
    agent: {
      taskRunSnapshot: { turn: { state: 'completed' }, terminal: { state: 'completed' }, confirmedChanges: [] },
      live: { activities: [{ id: 'stale', state: 'working', label: '正在整理' }] }, runDetails: {}
    }
  })
  assert.equal(result.state, 'completed')
  assert.deepEqual(result.activeItems, [])
})

test('does not turn an idle Session into a completed task without a matching turn end', () => {
  const result = projectTaskRun({
    engineState: 'ready',
    agent: { taskRunSnapshot: { turn: { state: 'unknown' }, confirmedChanges: [] }, runDetails: {} }
  })
  assert.equal(result.state, 'unknown')
  assert.equal(result.model.available, false)
})

test('projects one non-contradictory Trace summary when a completed task contains a failed tool', () => {
  const result = projectTaskRun({
    engineState: 'ready',
    outcome: {
      visible: true,
      state: 'success',
      title: '任务已完成',
      warnings: ['有 1 项工具操作失败；可在运行详情中查看原始证据。'],
      risks: [],
      verifications: []
    },
    baseline: { state: 'clean' },
    agent: {
      taskRunSnapshot: { turn: { state: 'completed' }, terminal: { state: 'completed' }, confirmedChanges: [] },
      runDetails: {
        permissionFacts: [],
        changedFiles: [],
        toolCards: [{ id: 'tool-1', state: 'error' }]
      }
    }
  })

  assert.deepEqual(result.trace, {
    tone: 'warning',
    title: '这一轮已结束，仍需核查',
    summary: '1 项操作 · 没有确认到文件改动 · 1 项工具失败。',
    hasChanges: false,
    supportingSummary: '权限、Git 基线与技术证据 · 权限未确认 · 已记录任务前基线'
  })
})

test('keeps an unconfirmed stop request unknown instead of calling the Turn failed', () => {
  const result = projectTaskRun({
    recovery: { kind: 'waiting-timeout' },
    outcome: { visible: true, state: 'pending', title: '停止仍待 Harness 确认' },
    agent: { taskRunSnapshot: { turn: { state: 'unknown' }, confirmedChanges: [] }, runDetails: {} }
  })

  assert.equal(result.state, 'unknown')
  assert.equal(result.label, '当前状态尚未确认')
  assert.equal(result.trace.tone, 'warning')
  assert.equal(result.trace.title, '停止仍待 Harness 确认')
})

test('lets matching terminal evidence supersede a stale recovery marker', () => {
  const result = projectTaskRun({
    recovery: { kind: 'waiting-timeout' },
    outcome: { visible: true, state: 'success', warnings: [], risks: [], verifications: [] },
    agent: {
      taskRunSnapshot: {
        turn: { state: 'completed' },
        terminal: { state: 'completed', reason: 'completed', seq: 8 },
        confirmedChanges: []
      },
      runDetails: {}
    }
  })

  assert.equal(result.state, 'completed')
  assert.equal(result.label, '本轮已结束')
  assert.equal(result.trace.tone, 'success')
})
