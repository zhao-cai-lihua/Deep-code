const test = require('node:test')
const assert = require('node:assert/strict')
const { projectTaskRun } = require('../src/run-projection.cjs')

test('projects only current active work and verified model/evidence facts', () => {
  const result = projectTaskRun({
    engineState: 'running',
    agent: {
      model: { available: true, provider: 'deepseek-official', id: 'deepseek-v4-flash-vision-exp', name: 'DeepSeek Vision' },
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
  assert.equal(result.model.id, 'deepseek-v4-flash-vision-exp')
  assert.equal(result.model.scope, 'session-current')
  assert.deepEqual(result.activeItems.map((item) => item.id), ['current'])
  assert.deepEqual(result.evidence, { toolCount: 1, changedFileCount: 1 })
  assert.deepEqual(result.usage, { available: false, label: 'Harness 未提供本轮 token 或费用。' })
})

test('durable idle state never leaves live working items visible', () => {
  const result = projectTaskRun({
    engineState: 'ready',
    agent: { live: { activities: [{ id: 'stale', state: 'working', label: '正在整理' }] }, runDetails: {} }
  })
  assert.equal(result.state, 'completed')
  assert.deepEqual(result.activeItems, [])
})
