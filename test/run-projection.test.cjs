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
