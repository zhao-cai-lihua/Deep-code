function delay(ms, setTimeoutImpl) {
  return new Promise((resolve) => setTimeoutImpl(resolve, ms))
}

function projectedPlan(live) {
  return live?.snapshot()?.projections?.values?.plan || null
}

async function selectCollaborationMode({
  adapter,
  live,
  baseUrl,
  sessionId,
  mode,
  timeoutMs = 3000,
  pollMs = 50,
  now = () => Date.now(),
  setTimeoutImpl = setTimeout
}) {
  if (!['direct', 'plan'].includes(mode)) throw new Error('协作模式只能选择 Direct 或 Plan。')
  const wanted = mode === 'plan'
  const current = projectedPlan(live)
  if (current?.active === wanted && current.pending === false) {
    return { mode, changed: false, confirmed: true }
  }

  const command = wanted ? '/plan' : '/plan off'
  const admission = await adapter.prompt({ baseUrl, sessionId, text: command })
  if (admission?.accepted !== true && !admission?.messageId && !admission?.rpcId) {
    throw new Error(`Harness 没有接收 ${wanted ? 'Plan' : 'Direct'} 模式命令；正式任务尚未发送。`)
  }

  const deadline = now() + timeoutMs
  while (now() < deadline) {
    const projection = projectedPlan(live)
    if (projection?.active === wanted && projection.pending === false) {
      return { mode, changed: true, confirmed: true }
    }
    await delay(pollMs, setTimeoutImpl)
  }
  throw new Error(`Harness 没有在限时内确认 ${wanted ? 'Plan' : 'Direct'} 模式；正式任务尚未发送。请重新连接后再试。`)
}

module.exports = { selectCollaborationMode }
