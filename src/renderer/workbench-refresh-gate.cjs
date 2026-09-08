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

  return { createWorkbenchRefreshGate }
})
