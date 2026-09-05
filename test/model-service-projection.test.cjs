const test = require('node:test')
const assert = require('node:assert/strict')
const { projectModelServices } = require('../src/model-service-projection.cjs')

test('separates catalog, credential, verification, and current-task facts', () => {
  const result = projectModelServices({ state: 'ready', activeProviders: [{ id: 'zai-coding-cn', name: 'GLM', modelCount: 2, models: [{ id: 'glm-5', name: 'GLM-5' }], credential: { configured: true } }], failures: [] }, { requested: { provider: 'zai-coding-cn' }, confirmed: false, label: 'GLM-5 · max' })
  const service = result.providers[0]
  assert.equal(service.catalog.state, 'available')
  assert.equal(service.credential.state, 'saved')
  assert.equal(service.verification.state, 'unverified')
  assert.equal(service.current.state, 'requested')
  assert.match(service.credential.detail, /不代表真实调用成功/)
})

test('keeps provider failures visible without marking credentials missing', () => {
  const result = projectModelServices({ activeProviders: [{ id: 'x', name: 'X', modelCount: 0, models: [], credential: null }], failures: [{ provider: 'x', message: 'network failed' }] })
  assert.equal(result.providers[0].credential.state, 'unknown')
  assert.equal(result.providers[0].verification.state, 'failed')
  assert.match(result.providers[0].verification.detail, /network failed/)
})

test('shows the latest persisted real-call receipt as historical evidence', () => {
  const connection = { state: 'ready', activeProviders: [{ id: 'deepseek', name: 'DeepSeek', modelCount: 1, models: [], credential: { configured: true } }], failures: [] }
  const receipts = [
    { provider: 'deepseek', model: 'old', modelName: 'Old', state: 'failed', recordedAt: '2026-09-04T00:00:00.000Z' },
    { provider: 'deepseek', model: 'deepseek-v4-flash', modelName: 'DeepSeek-V4-Flash', reasoningEffort: 'low', state: 'passed', recordedAt: '2026-09-05T00:00:00.000Z' }
  ]
  const service = projectModelServices(connection, null, receipts).providers[0]
  assert.equal(service.verification.state, 'passed')
  assert.equal(service.verification.label, '最近一次真实验证通过')
  assert.match(service.verification.detail, /只证明当时/)
})
