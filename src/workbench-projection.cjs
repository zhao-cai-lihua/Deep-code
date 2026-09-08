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

module.exports = { reconcileOfflineWorkbench, retryDisposition }
