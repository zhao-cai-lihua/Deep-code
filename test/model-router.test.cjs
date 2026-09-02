const test = require('node:test')
const assert = require('node:assert/strict')
const { chooseModelRoute } = require('../src/model-router.cjs')

const directory = {
  current: { provider: 'openai', model: 'gpt-5.6-terra', reasoningEffort: 'medium' },
  routable: true,
  groups: [{
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', reasoning: { efforts: [{ id: 'low', name: 'Low' }, { id: 'max', name: 'Max' }] } },
      { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra', reasoning: { efforts: [{ id: 'low', name: 'Low' }, { id: 'medium', name: 'Medium' }] } }
    ]
  }]
}

test('preserves the Harness model and effort when the user makes no selection', () => {
  const route = chooseModelRoute({ directory, prompt: '先规划架构并使用最强模型', policy: 'plan' })
  assert.equal(route.source, 'harness-default')
  assert.equal(route.selection, null)
  assert.deepEqual(route.current, { provider: 'openai', model: 'gpt-5.6-terra', reasoningEffort: 'medium' })
  assert.match(route.explanation, /沿用 Harness/)
})

test('accepts only a model and effort explicitly advertised by Harness', () => {
  const route = chooseModelRoute({
    directory,
    manualSelection: { provider: 'openai', model: 'gpt-5.6-sol', reasoningEffort: 'low' }
  })
  assert.equal(route.source, 'user')
  assert.deepEqual(route.selection, { provider: 'openai', model: 'gpt-5.6-sol', reasoningEffort: 'low' })
  assert.match(route.explanation, /明确选择/)
  assert.throws(() => chooseModelRoute({
    directory,
    manualSelection: { provider: 'openai', model: 'gpt-5.6-sol', reasoningEffort: 'ultra' }
  }), /没有公布推理强度/)
})

test('never invents a model when the current route is absent from the catalog', () => {
  const route = chooseModelRoute({
    directory: { current: { provider: 'custom', model: 'still-routable', reasoningEffort: 'high' }, routable: true, groups: [] }
  })
  assert.equal(route.selection, null)
  assert.deepEqual(route.current, { provider: 'custom', model: 'still-routable', reasoningEffort: 'high' })
})

test('rejects an unroutable session or missing current Harness model', () => {
  assert.throws(() => chooseModelRoute({ directory: { ...directory, routable: false } }), /没有可用的模型选择/)
  assert.throws(() => chooseModelRoute({ directory: { routable: true, current: null, groups: [] } }), /没有报告当前模型/)
})
