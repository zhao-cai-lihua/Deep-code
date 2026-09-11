function projectTaskRun(thread = {}) {
  const agent = thread.agent || {}
  const taskRunSnapshot = agent.taskRunSnapshot || {}
  const live = agent.live || {}
  const details = agent.runDetails || {}
  const waitingCount = Array.isArray(live.interactions) ? live.interactions.length : 0
  const queuedCount = Number(live.queue?.queued || 0) + Number(live.queue?.steering || 0)
  const evidenceState = taskRunSnapshot.turn?.state || 'unknown'
  const running = ['queued', 'running'].includes(evidenceState)
  const terminalState = taskRunSnapshot.terminal?.state
  const recoveryPending = ['waiting-timeout', 'stop-unconfirmed'].includes(thread.recovery?.kind)
  const state = terminalState || (thread.recovery
    ? recoveryPending
      ? (running ? evidenceState : 'unknown')
      : 'failed'
    : evidenceState === 'failed' || evidenceState === 'interrupted'
      ? evidenceState
      : waitingCount
        ? 'waiting'
        : evidenceState)
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
  const toolCards = Array.isArray(details.toolCards) ? details.toolCards : []
  const changedFiles = Array.isArray(details.changedFiles) ? details.changedFiles : []
  const permissionFacts = Array.isArray(details.permissionFacts) ? details.permissionFacts : []
  const failedCount = toolCards.filter((card) => card?.state === 'error').length
  const workingCount = toolCards.filter((card) => card?.state === 'working').length
  const verificationFailed = Array.isArray(thread.outcome?.verifications)
    && thread.outcome.verifications.some((item) => item?.state === 'failed')
  const needsReview = failedCount > 0
    || Boolean(thread.outcome?.warnings?.length)
    || Boolean(thread.outcome?.risks?.length)
    || Boolean(thread.outcome?.verifications?.some((item) => item?.state !== 'passed'))
  const traceState = verificationFailed
    ? { tone: 'error', title: '验证未通过' }
    : thread.outcome?.state === 'error'
      ? { tone: 'error', title: thread.outcome.title || '这一轮需要处理' }
      : thread.outcome?.state === 'pending'
        ? { tone: 'warning', title: thread.outcome.title || '终态仍待 Harness 确认' }
        : state === 'failed' || state === 'interrupted'
          ? { tone: 'error', title: state === 'interrupted' ? '这一轮已停止' : '这一轮需要处理' }
          : state === 'queued' || state === 'running' || state === 'waiting'
            ? { tone: 'active', title: state === 'queued' ? '这一轮正在排队' : state === 'waiting' ? '这一轮正在等待你的回答' : '这一轮仍在运行' }
            : state === 'completed'
              ? needsReview
                ? { tone: 'warning', title: '这一轮已结束，仍需核查' }
                : { tone: 'success', title: '这一轮已结束' }
              : { tone: 'unknown', title: toolCards.length ? '终态尚未确认' : '等待 Harness 事件' }
  const traceParts = [
    toolCards.length ? `${toolCards.length} 项操作` : '没有工具操作',
    changedFiles.length ? `${changedFiles.length} 个确认文件改动` : '没有确认到文件改动'
  ]
  if (failedCount) traceParts.push(`${failedCount} 项工具失败`)
  else if (workingCount) traceParts.push(`${workingCount} 项仍在进行`)
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
    },
    trace: {
      ...traceState,
      summary: `${traceParts.join(' · ')}。`,
      hasChanges: changedFiles.length > 0,
      supportingSummary: `权限、Git 基线与技术证据 · ${permissionFacts.length ? `${permissionFacts.length} 项权限事实` : '权限未确认'} · ${thread.baseline ? '已记录任务前基线' : '没有任务前基线'}`
    }
  }
}

module.exports = { projectTaskRun }
