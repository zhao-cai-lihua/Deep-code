function assertCurrentTaskTarget(state, { taskId, sessionId } = {}) {
  const targetId = String(taskId || '')
  if (!targetId || String(state?.activeThreadId || '') !== targetId) {
    throw new Error('当前可见任务已经变化；消息没有发送，请在当前任务中重试。')
  }
  const thread = Array.isArray(state?.threads)
    ? state.threads.find((item) => String(item?.id || '') === targetId)
    : null
  if (!thread) throw new Error('当前任务已经不存在；消息没有发送。')
  if (sessionId !== undefined && String(thread.sessionId || '') !== String(sessionId || '')) {
    throw new Error('当前任务绑定的 Engine Session 已经变化；消息没有发送，请刷新后重试。')
  }
  return thread
}

module.exports = { assertCurrentTaskTarget }
