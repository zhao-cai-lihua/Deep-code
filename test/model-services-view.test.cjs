const test = require('node:test')
const assert = require('node:assert/strict')
const { createModelServicesView } = require('../src/renderer/model-services-view.cjs')
const { FakeDocument, FakeElement, findAll } = require('../test-utils/fake-dom.cjs')

function createFixture() {
  const document = new FakeDocument()
  const elements = {
    title: new FakeElement('h2'),
    message: new FakeElement('p'),
    status: new FakeElement('p'),
    list: new FakeElement('div'),
    verifyAllButton: new FakeElement('button')
  }
  const calls = []
  const view = createModelServicesView({
    document,
    elements,
    onVerifyProvider(providerId, button) { calls.push({ providerId, button }) }
  })
  return { view, elements, calls }
}

function provider(overrides = {}) {
  return {
    id: 'zai-coding',
    name: '智谱 GLM',
    profile: { state: 'ready', label: '已启用', detail: 'Harness Profile 已启用。' },
    catalog: { state: 'ready', label: '2 个模型', detail: '目录来自 Harness。' },
    credential: { state: 'configured', label: '凭据已保存', detail: '密钥内容不可见。' },
    verification: { state: 'passed', label: '最近一次通过', detail: '只证明那一次真实请求。' },
    current: { state: 'inactive', label: '当前任务未采用', detail: '没有 request/header 证据。' },
    models: [{ id: 'glm-5', name: 'GLM-5' }, { id: 'glm-4.5-air', name: 'GLM-4.5-Air' }],
    ...overrides
  }
}

test('renders one provider card from projected Harness facts and preserves all five stages', async () => {
  const { view, elements, calls } = createFixture()
  view.render({ title: '模型服务可用', message: '事实彼此独立。', state: 'ready', dormantProviderCount: 3, providers: [provider()] })

  assert.equal(elements.title.textContent, '模型服务可用')
  assert.equal(elements.message.textContent, '事实彼此独立。')
  assert.match(elements.status.textContent, /1 个已启用服务.*3 个未启用 Provider.*不会调用模型/)
  assert.equal(elements.verifyAllButton.disabled, false)

  const stages = findAll(elements.list, (node) => node.tagName === 'SECTION')
  assert.deepEqual(stages.map((stage) => stage.dataset.state), ['ready', 'ready', 'configured', 'passed', 'inactive'])
  assert.match(elements.list.textContent, /智谱 GLM/)
  assert.match(elements.list.textContent, /凭据已保存/)
  assert.match(elements.list.textContent, /最近一次通过/)
  assert.match(elements.list.textContent, /GLM-5、GLM-4\.5-Air/)

  const verify = findAll(elements.list, (node) => node.tagName === 'BUTTON')[0]
  assert.equal(verify.disabled, false)
  await verify.dispatchEvent('click')
  assert.deepEqual(calls, [{ providerId: 'zai-coding', button: verify }])
})

test('does not make a provider verifiable from catalog presence when its credential is missing', () => {
  const { view, elements } = createFixture()
  view.render({ state: 'partial', dormantProviderCount: 0, providers: [provider({
    credential: { state: 'missing', label: '尚未保存凭据', detail: '请先配置。' },
    verification: { state: 'unknown', label: '尚未验证', detail: '没有真实请求证据。' }
  })] })

  const verify = findAll(elements.list, (node) => node.tagName === 'BUTTON')[0]
  assert.equal(verify.disabled, true)
  assert.match(elements.list.textContent, /尚未保存凭据/)
  assert.match(elements.list.textContent, /尚未验证/)
})

test('renders an honest empty and offline state without creating provider actions', () => {
  const { view, elements, calls } = createFixture()
  view.render({ state: 'engine-offline', dormantProviderCount: 0, providers: [] })

  assert.equal(elements.verifyAllButton.disabled, true)
  assert.match(elements.list.textContent, /尚未发现已启用的 Provider/)
  assert.equal(findAll(elements.list, (node) => node.tagName === 'BUTTON').length, 0)
  assert.deepEqual(calls, [])
})
