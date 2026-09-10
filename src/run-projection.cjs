function projectTaskRun(thread = {}) {
  const agent = thread.agent || {}
  const taskRunSnapshot = agent.taskRunSnapshot || {}
  const live = agent.live || {}
  const details = agent.runDetails || {}
  const waitingCount = Array.isArray(live.interactions) ? live.interactions.length : 0
  const queuedCount = Number(live.queue?.queued || 0) + Number(live.queue?.steering || 0)
  const evidenceState = taskRunSnapshot.turn?.state || 'unknown'
  const running = ['queued', 'running'].includes(evidenceState)
  const state = thread.recovery || evidenceState === 'failed'
    ? 'failed'
    : evidenceState === 'interrupted'
      ? 'interrupted'
    : waitingCount
      ? 'waiting'
      : evidenceState
  const labels = {
    draft: '尚未发送',
    queued: '已接收，等待 Harness 开始',
    running: queuedCount ? `正在运行，另有 ${queuedCount} 条消息排队` : '正在运行',
    waiting: `等待你处理 ${waitingCount} 项决定`,
    completed: '本轮已结束',
    interrupted: '本轮已停止',
    failed: '本轮需要处理',
    unknown: '当前状态尚未确认'
  }
  const route = taskRunSnapshot.route
  const model = route?.provider && route?.model
    ? {
        available: true,
        provider: String(route.provider),
        id: String(route.model),
        name: String(agent.effectiveModel?.name || route.model),
        reasoningEffort: String(route.reasoningEffort || ''),
        scope: 'request-effective',
        confirmed: true
      }
    : { available: false, label: 'Harness 尚未提供本轮 request/header，不能确认实际模型。' }
  return {
    state,
    label: labels[state],
    activeItems: running ? (live.activities || []).filter((item) => item?.state === 'working') : [],
    waitingCount,
    queuedCount,
    model,
    usage: { available: false, label: 'Harness 未提供本轮 token 或费用。' },
    evidence: {
      toolCount: Array.isArray(details.toolCards) ? details.toolCards.length : 0,
      changedFileCount: Array.isArray(taskRunSnapshot.confirmedChanges) ? taskRunSnapshot.confirmedChanges.length : 0
    }
  }
}

module.exports = { projectTaskRun }
