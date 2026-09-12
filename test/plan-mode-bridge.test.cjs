const test = require('node:test')
const assert = require('node:assert/strict')
const { selectCollaborationMode } = require('../src/plan-mode-bridge.cjs')

test('uses the exact Harness slash command and waits for structured plan confirmation', async () => {
  const prompts = []
  let active = false
  const adapter = { prompt: async (request) => {
    prompts.push(request.text)
    active = true
    return { accepted: true }
  } }
  const live = { snapshot: () => ({ projections: { values: { plan: { active, pending: false } } } }) }

  const result = await selectCollaborationMode({
    adapter, live, baseUrl: 'http://127.0.0.1:3080', sessionId: 'session-1', mode: 'plan',
    timeoutMs: 20, pollMs: 1
  })
  assert.deepEqual(prompts, ['/plan'])
  assert.deepEqual(result, { mode: 'plan', changed: true, confirmed: true })
})

test('fails closed when Harness does not project the requested collaboration mode', async () => {
  const adapter = { prompt: async () => ({ accepted: true }) }
  const live = { snapshot: () => ({ projections: { values: { plan: { active: false, pending: true } } } }) }
  await assert.rejects(
    selectCollaborationMode({
      adapter, live, baseUrl: 'http://127.0.0.1:3080', sessionId: 'session-1', mode: 'plan',
      timeoutMs: 5, pollMs: 1
    }),
    /没有在限时内确认 Plan 模式.*正式任务尚未发送/
  )
})

test('leaves an already-confirmed mode unchanged without sending another command', async () => {
  let promptCount = 0
  const adapter = { prompt: async () => { promptCount += 1 } }
  const live = { snapshot: () => ({ projections: { values: { plan: { active: false, pending: false } } } }) }
  const result = await selectCollaborationMode({ adapter, live, baseUrl: 'x', sessionId: 's', mode: 'direct' })
  assert.equal(promptCount, 0)
  assert.deepEqual(result, { mode: 'direct', changed: false, confirmed: true })
})
