function reconcileOfflineWorkbench(snapshot) {
  const thread = snapshot?.threads?.find((item) => item.id === snapshot.activeThreadId)
  if (thread?.engineState === 'running') {
    thread.engineState = 'error'
    thread.engineError = 'Deep code 已重新启动，但这项任务没有活动的 Engine 连接。任务不会在背后继续运行；启动 Engine 后可以安全重试。'
  }
  return snapshot
}

function retryDisposition(agentSnapshot) {
  return Array.isArray(agentSnapshot?.messages) && agentSnapshot.messages.some((message) => message?.role === 'user')
    ? 'reconnect'
    : 'resend'
}

module.exports = { reconcileOfflineWorkbench, retryDisposition }
