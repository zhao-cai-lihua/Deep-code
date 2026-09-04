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
