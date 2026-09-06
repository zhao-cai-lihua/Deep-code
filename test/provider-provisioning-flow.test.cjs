const test = require('node:test')
const assert = require('node:assert/strict')

const { createProviderProvisioningFlow } = require('../src/renderer/provider-provisioning-flow.cjs')

test('requires a second click for the exact named provider without inspecting a key', () => {
  let time = 100
  const flow = createProviderProvisioningFlow({ now: () => time, timeoutMs: 10000 })

  const first = flow.request({ id: 'zai-coding', name: '智谱 GLM' })
  assert.equal(first.confirmed, false)
  assert.match(first.view.buttonLabel, /再次点击确认保存给 智谱 GLM/)
  assert.match(first.view.description, /不能从密钥内容判断厂商/)

  const second = flow.request({ id: 'zai-coding', name: '智谱 GLM' })
  assert.equal(second.confirmed, true)
  assert.deepEqual(second.provider, { id: 'zai-coding', name: '智谱 GLM' })
  assert.doesNotMatch(JSON.stringify(second), /api.?key|secret|credential/i)
})

test('changing provider invalidates the earlier confirmation', () => {
  const flow = createProviderProvisioningFlow()
  flow.request({ id: 'anthropic', name: 'Anthropic' })

  const changed = flow.request({ id: 'zai-coding', name: '智谱 GLM' })
  assert.equal(changed.confirmed, false)
  assert.equal(changed.provider.id, 'zai-coding')
  assert.match(changed.view.buttonLabel, /智谱 GLM/)
})

test('an expired confirmation cannot provision a provider', () => {
  let time = 0
  const flow = createProviderProvisioningFlow({ now: () => time, timeoutMs: 10000 })
  flow.request({ id: 'deepseek-official', name: 'DeepSeek' })
  time = 10000

  const expired = flow.request({ id: 'deepseek-official', name: 'DeepSeek' })
  assert.equal(expired.confirmed, false)
  assert.equal(expired.reason, 'confirmation-required')
})

test('reset returns the flow to its ordinary provider-specific copy', () => {
  const flow = createProviderProvisioningFlow()
  const provider = { id: 'minimax', name: 'MiniMax' }
  flow.request(provider)
  flow.reset()

  assert.deepEqual(flow.view(provider), {
    buttonLabel: '保存给 MiniMax',
    description: 'MiniMax · 将只为这个 Harness route 保存密钥。请确认厂商选对；Deep code 无法根据密钥内容可靠识别厂商。'
  })
})
