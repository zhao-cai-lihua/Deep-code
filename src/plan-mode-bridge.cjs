const { capabilityById } = require('./harness-capability-gate.cjs')

function projectedPlan(live) {
  return live?.snapshot()?.projections?.values?.plan || null
}

async function selectCollaborationMode({ live, mode, capabilities = null }) {
  if (!['direct', 'plan'].includes(mode)) throw new Error('协作模式只能选择 Direct 或 Plan。')
  const current = projectedPlan(live)

  // The pinned API Proxy does not expose the Harness command plane. Sending
  // `/plan` through session.prompt creates a real user message, so this bridge
  // must never manufacture a slash command on the user's behalf.
  if (mode === 'plan') {
    if (current?.active === true && current.pending === false) {
      return { mode: 'plan', changed: false, confirmed: true }
    }
    const control = capabilityById(capabilities, 'plan-control')
    const reason = control?.reason || '当前 Engine 尚未开放可验证的 Plan 模式控制接口。'
    throw new Error(`${reason} 正式任务没有发送。请先使用 Direct。`)
  }

  if (current?.active === true || current?.pending === true) {
    throw new Error('当前 Session 已由 Harness 置于 Plan 模式，但这个 Engine 没有向 Deep Code 开放可验证的退出接口，因此无法安全切回 Direct；正式任务没有发送。')
  }
  return { mode: 'direct', changed: false, confirmed: true }
}

module.exports = { selectCollaborationMode }
