function finite(value) {
  return Number.isFinite(value) ? value : 0
}

function phaseFor(state) {
  return ({
    draft: { id: 'draft', label: '准备任务' },
    queued: { id: 'queued', label: '已接收，等待开始' },
    running: { id: 'working', label: '正在执行' },
    waiting: { id: 'waiting', label: '等待你的决定' },
    completed: { id: 'completed', label: '已完成' },
    failed: { id: 'failed', label: '需要处理' },
    interrupted: { id: 'interrupted', label: '已停止' },
    unknown: { id: 'unknown', label: '状态待确认' }
  })[state] || { id: 'unknown', label: '状态待确认' }
}

function projectUsage(values) {
  const usage = values.tokenUsage
  const pressure = values.contextPressure
  const stats = values.sessionStats
  if (!usage && !pressure && !stats) {
    return {
      scope: 'session', available: false,
      label: 'Harness 尚未提供此 Session 的用量投影。',
      cost: { available: false, label: 'Provider 未提供可核对的金额。' }
    }
  }
  const tokens = usage ? {
    uncachedInput: finite(usage.uncachedInputTokens),
    output: finite(usage.outputTokens),
    cacheRead: finite(usage.cacheReadTokens),
    cacheWrite: finite(usage.cacheWriteTokens)
  } : null
  if (tokens) tokens.total = tokens.uncachedInput + tokens.output + tokens.cacheRead + tokens.cacheWrite
  const contextUsed = Number.isFinite(pressure?.projectedTokens)
    ? pressure.projectedTokens
    : Number.isFinite(pressure?.pressureTokens) ? pressure.pressureTokens : null
  const contextCapacity = Number.isFinite(pressure?.contextWindow) ? pressure.contextWindow : null
  const context = contextUsed !== null && contextCapacity
    ? { available: true, approximate: true, used: contextUsed, capacity: contextCapacity, ratio: contextUsed / contextCapacity }
    : { available: false, approximate: true }
  const timing = stats ? {
    turns: finite(stats.turns),
    steps: finite(stats.steps),
    llmMs: finite(stats.llmMs),
    toolMs: finite(stats.toolMs),
    averageTtftMs: stats.ttftSteps ? finite(stats.ttftMs) / stats.ttftSteps : null,
    decodeTokensPerSecond: stats.decodeMs ? finite(stats.decodeTokens) / (stats.decodeMs / 1000) : null
  } : null
  return {
    scope: 'session', available: true,
    ...(tokens ? { tokens } : {}),
    context,
    ...(timing ? { timing } : {}),
    cost: { available: false, label: 'Provider 未提供可核对的金额。' }
  }
}

function projectGuidedWorkbench(thread = {}) {
  const projections = thread.agent?.live?.projections || {}
  const values = projections.values || {}
  const health = projections.health || {}
  const dropped = finite(health.droppedSessionFrames)
  const invalid = finite(health.invalidProjectionFrames)
  const unknown = finite(health.unknownProjectionKeys)
  const healthKnown = Boolean(projections.sessionId)
  const plan = values.plan
  const mode = plan?.active ? 'plan' : 'direct'
  const outcome = thread.outcome || {}
  return {
    version: 1,
    taskId: String(thread.id || ''),
    sessionId: String(thread.sessionId || ''),
    phase: phaseFor(String(thread.run?.state || 'draft')),
    collaborationMode: { id: mode, label: mode === 'plan' ? 'Plan' : 'Direct', pending: Boolean(plan?.pending) },
    plan: { source: 'harness', items: Array.isArray(values.todos) ? values.todos : null },
    usage: projectUsage(values),
    receipt: outcome.visible ? outcome : { visible: false },
    sessionHealth: {
      state: !healthKnown ? 'unknown' : dropped || invalid || unknown ? 'attention' : 'healthy',
      droppedSessionFrames: dropped,
      invalidProjectionFrames: invalid,
      unknownProjectionKeys: unknown
    }
  }
}

module.exports = { projectGuidedWorkbench, projectUsage, phaseFor }
