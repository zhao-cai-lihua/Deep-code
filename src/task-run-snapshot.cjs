function eventOf(entry) { return entry?.event || entry || {} }

function validTurnId(value) {
  return (typeof value === 'string' && value.length > 0) || Number.isFinite(value)
}

function terminalState(reason) {
  const kind = typeof reason === 'object' ? reason?.kind : reason
  if (['complete', 'completed', 'stop'].includes(kind)) return 'completed'
  if (['cancelled', 'canceled', 'interrupted', 'aborted'].includes(kind)) return 'interrupted'
  return 'failed'
}

function normalizedEngine(engine = {}) {
  const validManaged = engine.kind === 'managed' && engine.trust === 'managed-process'
  const validShared = engine.kind === 'shared' && engine.trust === 'user-confirmed-shared'
  if ((!validManaged && !validShared) || typeof engine.version !== 'string' || !engine.version) {
    throw new Error('Engine trust 尚未建立，不能生成任务证据快照。')
  }
  return {
    kind: engine.kind,
    version: engine.version,
    trust: engine.trust
  }
}

function projectTaskRunSnapshot({ sessionId, engine, page = {}, admission = null, conversation = null } = {}) {
  const events = Array.isArray(page?.events) ? page.events : []
  let startIndex = -1
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const candidate = eventOf(events[index])
    if (candidate.type === 'turn/start' && validTurnId(candidate.data?.turn)) { startIndex = index; break }
  }
  const start = startIndex >= 0 ? eventOf(events[startIndex]) : null
  const turnId = start?.data?.turn
  let endIndex = -1
  if (start) {
    for (let index = startIndex + 1; index < events.length; index += 1) {
      const candidate = eventOf(events[index])
      if (candidate.type === 'turn/end' && candidate.data?.turn === turnId) { endIndex = index; break }
    }
  }
  const window = startIndex >= 0 ? events.slice(startIndex, endIndex >= 0 ? endIndex + 1 : undefined) : []
  const end = endIndex >= 0 ? eventOf(events[endIndex]) : null
  const turn = start
    ? {
        id: String(turnId), startSeq: Number.isFinite(start.seq) ? start.seq : null,
        ...(end && Number.isFinite(end.seq) ? { endSeq: end.seq } : {}),
        state: end ? terminalState(end.data?.reason) : 'running'
      }
    : admission?.accepted === true || admission?.messageId
      ? { id: admission?.messageId ? `admission:${String(admission.messageId)}` : 'admission:accepted', startSeq: null, state: 'queued' }
      : { id: 'unknown', startSeq: null, state: 'unknown' }

  let route
  const permissions = { evidenceSeqs: [] }
  const permissionEvidence = {}
  const permissionEvents = endIndex >= 0 ? events.slice(0, endIndex + 1) : events
  for (const entry of permissionEvents) {
    const event = eventOf(entry)
    if (event.type === 'permission/preset' && typeof event.data?.preset === 'string') {
      permissions.preset = event.data.preset
      permissionEvidence.preset = Number.isFinite(event.seq) ? event.seq : null
    }
    if (event.type === 'sandbox/mode' && typeof event.data?.mode === 'string') {
      permissions.sandbox = event.data.mode
      permissionEvidence.sandbox = Number.isFinite(event.seq) ? event.seq : null
    }
    if (event.type === 'approval/policy' && typeof event.data?.policy === 'string') {
      permissions.approval = event.data.policy
      permissionEvidence.approval = Number.isFinite(event.seq) ? event.seq : null
    }
  }
  for (const entry of window) {
    const event = eventOf(entry)
    if (event.type === 'request/header') {
      const config = event.data?.header?.config
      if (config?.provider && config?.model) {
        route = {
          provider: String(config.provider), model: String(config.model),
          reasoningEffort: String(config.reasoningEffort || ''), seq: Number.isFinite(event.seq) ? event.seq : null
        }
      }
    }
  }
  permissions.evidenceSeqs = ['preset', 'sandbox', 'approval']
    .map((key) => permissionEvidence[key])
    .filter(Number.isFinite)
    .sort((left, right) => left - right)
  const reason = end?.data?.reason
  const reasonLabel = typeof reason === 'object' ? String(reason?.kind || 'unknown') : String(reason || 'unknown')
  const terminal = end ? { state: terminalState(reason), reason: reasonLabel, seq: Number.isFinite(end.seq) ? end.seq : null } : undefined
  const details = conversation?.runDetails || {}
  const confirmedChanges = (details.changedFiles || []).filter((change) => change?.confirmed === true)

  return {
    version: 1,
    engine: normalizedEngine(engine),
    sessionId: String(sessionId || ''),
    ...(admission?.accepted === true || admission?.messageId ? {
      admission: {
        accepted: true,
        ...(admission?.messageId ? { messageId: String(admission.messageId) } : {}),
        acceptedAt: String(admission.acceptedAt || '')
      }
    } : {}),
    turn,
    ...(route ? { route } : {}),
    ...(terminal ? { terminal } : {}),
    ...(permissions.evidenceSeqs.length ? { permissions } : {}),
    toolCards: Array.isArray(details.toolCards) ? details.toolCards : [],
    confirmedChanges
  }
}

module.exports = { projectTaskRunSnapshot, terminalState }
