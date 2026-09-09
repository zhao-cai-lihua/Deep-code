function reconcileOfflineWorkbench(snapshot) {
  const thread = snapshot?.threads?.find((item) => item.id === snapshot.activeThreadId)
  if (thread && ['queued', 'running'].includes(thread.engineState)) {
    thread.engineState = 'unknown'
    thread.engineError = 'Deep code 当前无法确认 Harness 是否仍在执行。为避免丢失控制信息，暂不删除这条任务记录。重新连接 Engine 后再核对状态。'
  }
  return snapshot
}

function retryDisposition(agentSnapshot) {
  return Array.isArray(agentSnapshot?.messages) && agentSnapshot.messages.some((message) => message?.role === 'user')
    ? 'reconnect'
    : 'resend'
}

function projectOnlineEngineState({ projectedState = 'unknown', terminal = null, recovery = null, existingError = '' } = {}) {
  if (terminal?.state) {
    if (terminal.state === 'completed') return { state: 'ready', error: '' }
    if (terminal.state === 'interrupted') {
      return { state: 'error', error: `Harness 报告这一轮已停止（${terminal.reason || '原因未知'}）。` }
    }
    if (terminal.state === 'failed') {
      return { state: 'error', error: `Harness 报告这一轮失败（${terminal.reason || '原因未知'}）。` }
    }
  }
  if (recovery?.kind === 'waiting-timeout' || recovery?.kind === 'stop-unconfirmed') {
    return { state: 'unknown', error: String(existingError || '') }
  }
  if (recovery?.kind === 'launch-failed') return { state: 'error', error: String(existingError || '') }
  if (projectedState === 'queued') return { state: 'queued', error: '' }
  if (projectedState === 'running') return { state: 'running', error: '' }
  if (projectedState === 'completed') return { state: 'ready', error: '' }
  if (projectedState === 'failed' || projectedState === 'interrupted') return { state: 'error', error: String(existingError || '') }
  return { state: 'unknown', error: '' }
}

module.exports = { reconcileOfflineWorkbench, retryDisposition, projectOnlineEngineState }
