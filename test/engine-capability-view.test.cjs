const test = require('node:test')
const assert = require('node:assert/strict')
const { projectEngineCapabilityView } = require('../src/renderer/engine-capability-view.cjs')

test('explains that Engine capability checks do not call a model', () => {
  const view = projectEngineCapabilityView(null)
  assert.equal(view.state, 'offline')
  assert.match(view.summary, /不会调用模型/)
  assert.deepEqual(view.rows, [])
})

test('groups usable and unavailable capabilities without hiding the reason', () => {
  const view = projectEngineCapabilityView({
    verified: true,
    runtime: { version: '0.1.1-rc.2', revision: 'b150a551b8d465e31e418e1b2eaf5e79bbb7d28e' },
    capabilities: [
      { id: 'task-prompt', label: '发送与继续任务', state: 'supported', stateLabel: '已支持', reason: '创建任务后生效。' },
      { id: 'image-transport', label: '图片随任务发送', state: 'supported', stateLabel: '已支持', reason: '不证明模型能看图。', claimsModelVision: false },
      { id: 'plan-control', label: '在 Deep Code 中切换 Plan', state: 'runtime-unsupported', stateLabel: '当前 Runtime 未开放', reason: '没有远程接口。' }
    ]
  })

  assert.equal(view.state, 'verified')
  assert.equal(view.availableCount, 2)
  assert.equal(view.unavailableCount, 1)
  assert.match(view.title, /0\.1\.1-rc\.2/)
  assert.match(view.rows.find((item) => item.id === 'plan-control').detail, /没有远程接口/)
  assert.match(view.rows.find((item) => item.id === 'image-transport').detail, /不等于当前模型已经通过识图验证/)
})
