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

test('labels an audited candidate separately and never presents its disabled capabilities as ready', () => {
  const view = projectEngineCapabilityView({
    verified: true,
    runtime: { version: '0.1.5-rc.2', revision: 'fb2c4b9e698e30edb738bca4cf0618587db7d203', status: 'candidate' },
    capabilities: [
      { id: 'task-prompt', label: '发送与继续任务', state: 'candidate-disabled', stateLabel: '候选协议（尚未开放）', reason: '产品任务入口仍保持关闭。' }
    ]
  })

  assert.equal(view.state, 'candidate')
  assert.equal(view.availableCount, 0)
  assert.equal(view.unavailableCount, 1)
  assert.match(view.title, /候选协议.*0\.1\.5-rc\.2/)
  assert.match(view.summary, /任务入口.*关闭/)
})
