const test = require('node:test')
const assert = require('node:assert/strict')
const { selectCollaborationMode } = require('../src/plan-mode-bridge.cjs')

test('Direct mode never sends a hidden slash command through the user prompt channel', async () => {
  let promptCount = 0
  const adapter = { prompt: async () => { promptCount += 1 } }
  const live = { snapshot: () => ({ projections: { values: {} } }) }
  const result = await selectCollaborationMode({ adapter, live, baseUrl: 'x', sessionId: 's', mode: 'direct' })
  assert.equal(promptCount, 0)
  assert.deepEqual(result, { mode: 'direct', changed: false, confirmed: true })
})

test('Plan fails before any Session prompt when there is no verified control-plane interface', async () => {
  let promptCount = 0
  const adapter = { prompt: async () => { promptCount += 1; return { accepted: true } } }
  const live = { snapshot: () => ({ projections: { values: { plan: { active: false, pending: false } } } }) }

  await assert.rejects(
    selectCollaborationMode({ adapter, live, baseUrl: 'x', sessionId: 's', mode: 'plan' }),
    /当前 Engine 尚未开放可验证的 Plan 模式.*正式任务没有发送/
  )
  assert.equal(promptCount, 0)
})

test('an already-active structured Harness Plan projection may be represented without a control message', async () => {
  let promptCount = 0
  const adapter = { prompt: async () => { promptCount += 1 } }
  const live = { snapshot: () => ({ projections: { values: { plan: { active: true, pending: false } } } }) }

  const result = await selectCollaborationMode({ adapter, live, baseUrl: 'x', sessionId: 's', mode: 'plan' })
  assert.equal(promptCount, 0)
  assert.deepEqual(result, { mode: 'plan', changed: false, confirmed: true })
})

test('Direct fails safely if Harness is already in Plan and no verified control interface can turn it off', async () => {
  let promptCount = 0
  const adapter = { prompt: async () => { promptCount += 1 } }
  const live = { snapshot: () => ({ projections: { values: { plan: { active: true, pending: false } } } }) }

  await assert.rejects(
    selectCollaborationMode({ adapter, live, baseUrl: 'x', sessionId: 's', mode: 'direct' }),
    /当前 Session 已由 Harness 置于 Plan 模式.*无法安全切回 Direct/
  )
  assert.equal(promptCount, 0)
})
