(function exposeTaskViewState(root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  if (root) root.DeepCodeTaskViewState = api
})(typeof window === 'undefined' ? globalThis : window, function taskViewStateFactory() {
  const EMPTY = Object.freeze({
    runDetailsOpen: false,
    technicalDetailsOpen: false,
    openToolCards: Object.freeze([])
  })

  function normalize(snapshot = EMPTY) {
    return {
      runDetailsOpen: snapshot.runDetailsOpen === true,
      technicalDetailsOpen: snapshot.technicalDetailsOpen === true,
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
