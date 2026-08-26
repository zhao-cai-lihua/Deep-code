function projectTaskRun(thread = {}) {
  const agent = thread.agent || {}
  const live = agent.live || {}
  const details = agent.runDetails || {}
  const waitingCount = Array.isArray(live.interactions) ? live.interactions.length : 0
  const queuedCount = Number(live.queue?.queued || 0) + Number(live.queue?.steering || 0)
  const running = thread.engineState === 'running'
  const terminalState = agent.runDetails?.terminal?.state
  const state = thread.engineState === 'error' || terminalState === 'failed'
    ? 'failed'
    : terminalState === 'interrupted'
      ? 'interrupted'
    : waitingCount
      ? 'waiting'
      : running
        ? 'running'
        : thread.engineState === 'ready'
          ? 'completed'
          : 'draft'
  const labels = {
    draft: '尚未发送',
    running: queuedCount ? `正在运行，另有 ${queuedCount} 条消息排队` : '正在运行',
    waiting: `等待你处理 ${waitingCount} 项决定`,
    completed: '本轮已结束',
    interrupted: '本轮已停止',
    failed: '本轮需要处理'
  }
  const model = agent.model?.available
    ? {
        available: true,
        provider: String(agent.model.provider || ''),
        id: String(agent.model.id || ''),
        name: String(agent.model.name || agent.model.id || '未命名模型'),
        scope: 'session-current'
      }
    : { available: false, label: 'Harness 未提供当前 Session 的模型。' }
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
      changedFileCount: Array.isArray(details.changedFiles) ? details.changedFiles.length : 0
    }
  }
}

module.exports = { projectTaskRun }
