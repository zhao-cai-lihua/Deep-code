(function exposeTaskViewState(root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  if (root) root.DeepCodeTaskViewState = api
})(typeof window === 'undefined' ? globalThis : window, function taskViewStateFactory() {
  const EMPTY = Object.freeze({
    activeView: 'conversation',
    technicalDetailsOpen: false,
    supportingFactsOpen: false,
    openToolCards: Object.freeze([])
  })

  function normalize(snapshot = EMPTY) {
    return {
      activeView: ['trace', 'receipt'].includes(snapshot.activeView) ? snapshot.activeView : 'conversation',
      technicalDetailsOpen: snapshot.technicalDetailsOpen === true,
      supportingFactsOpen: snapshot.supportingFactsOpen === true,
      openToolCards: [...new Set((snapshot.openToolCards || []).map(String))]
    }
  }

  function createTaskViewState() {
    const snapshots = new Map()
    return {
      save(taskId, snapshot) {
        if (!taskId) return
        snapshots.set(String(taskId), normalize(snapshot))
      },
      load(taskId) {
        return normalize(taskId ? snapshots.get(String(taskId)) : EMPTY)
      },
      has(taskId) {
        return Boolean(taskId) && snapshots.has(String(taskId))
      },
      clear(taskId) {
        if (taskId) snapshots.delete(String(taskId))
      }
    }
  }

  return { createTaskViewState }
})
