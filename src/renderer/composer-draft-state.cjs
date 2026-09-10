(function exposeComposerDraftState(root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  if (root) root.DeepCodeComposerDraftState = api
})(typeof window === 'undefined' ? globalThis : window, function composerDraftStateFactory() {
  function createComposerDraftState(initialScope = 'new-task') {
    let scope = String(initialScope || 'new-task')
    const drafts = new Map()
    return {
      activeScope() { return scope },
      capture(currentText) {
        drafts.set(scope, String(currentText || ''))
      },
      switchTo(nextScope, currentText) {
        drafts.set(scope, String(currentText || ''))
        scope = String(nextScope || 'new-task')
        return drafts.get(scope) || ''
      },
      clear(targetScope = scope) {
        drafts.delete(String(targetScope || 'new-task'))
      }
    }
  }

  return { createComposerDraftState }
})
