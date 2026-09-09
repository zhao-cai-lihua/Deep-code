(function exposeWorkbenchRefreshGate(root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  if (root) root.DeepCodeWorkbenchRefreshGate = api
})(typeof window === 'undefined' ? globalThis : window, function workbenchRefreshGateFactory() {
  function identity(value = {}) {
    return { taskId: String(value.taskId || ''), sessionId: String(value.sessionId || '') }
  }

  function createWorkbenchRefreshGate() {
    let generation = 0
    return {
      begin(current) {
        return { generation: ++generation, requested: identity(current) }
      },
      invalidate() { generation += 1 },
      accept(ticket, current) {
        const now = identity(current)
        return Boolean(ticket)
          && ticket.generation === generation
          && ticket.requested.taskId === now.taskId
          && ticket.requested.sessionId === now.sessionId
      }
    }
  }

  function selectedIdentity(workbench = {}) {
    const taskId = String(workbench.activeThreadId || '')
    const thread = Array.isArray(workbench.threads)
      ? workbench.threads.find((item) => String(item?.id || '') === taskId)
      : null
    return { taskId, sessionId: String(thread?.sessionId || '') }
  }

  async function runLatestWorkbenchRequest({ gate, expected, request }) {
    if (!gate || typeof gate.begin !== 'function' || typeof gate.accept !== 'function') {
      throw new Error('工作台结果门禁不可用。')
    }
    if (typeof request !== 'function') throw new Error('工作台请求不可用。')
    const ticket = gate.begin(expected)
    const next = await request()
    return gate.accept(ticket, selectedIdentity(next)) ? next : null
  }

  return { createWorkbenchRefreshGate, runLatestWorkbenchRequest, selectedIdentity }
})
