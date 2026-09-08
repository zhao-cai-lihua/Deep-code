function text(value, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function sameRequestedRoute(requested, effective) {
  if (!requested?.provider || !requested?.model || effective?.available !== true) return false
  if (requested.provider !== effective.provider || requested.model !== effective.id) return false
  return !requested.reasoningEffort || requested.reasoningEffort === effective.reasoningEffort
}

function projectModelVerificationReceipt(thread = {}, recordedAt = new Date().toISOString()) {
  const requested = thread.purpose?.kind === 'model-connection-test'
    ? thread.purpose.requestedRoute
    : null
  const snapshot = thread.agent?.taskRunSnapshot
  const terminal = snapshot?.terminal
  const route = snapshot?.route
  const effective = route ? {
    available: true,
    provider: route.provider,
    id: route.model,
    name: thread.agent?.effectiveModel?.name || route.model,
    reasoningEffort: route.reasoningEffort,
    evidence: 'request/header'
  } : null
  if (!requested || !terminal || !sameRequestedRoute(requested, effective)) return null

  const terminalState = ['completed', 'failed', 'interrupted'].includes(terminal.state) ? terminal.state : ''
  if (!terminalState) return null
  const failure = thread.agent?.runDetails?.terminal?.failure || null
  return {
    version: 1,
    state: terminalState === 'completed' ? 'passed' : terminalState === 'failed' ? 'failed' : 'interrupted',
    provider: text(effective.provider, 120),
    model: text(effective.id, 180),
    modelName: text(effective.name, 180) || text(effective.id, 180),
    reasoningEffort: text(effective.reasoningEffort, 80),
    routeEvidence: 'request/header',
    terminalReason: text(terminal.reason, 120) || terminalState,
    ...(failure ? {
      failure: {
        kind: text(failure.kind, 80),
        title: text(failure.title, 240),
        detail: text(failure.detail, 600),
        nextAction: text(failure.nextAction, 600)
      }
    } : {}),
    recordedAt: text(recordedAt, 80)
  }
}

module.exports = { projectModelVerificationReceipt, sameRequestedRoute }
