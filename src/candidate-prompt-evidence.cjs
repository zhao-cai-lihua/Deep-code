function exactText(value, label) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) throw new Error(`候选 Prompt 证据缺少${label}。`)
  return text
}

function normalizeRoute(route, label) {
  if (!route || typeof route !== 'object' || Array.isArray(route)) {
    throw new Error(`候选 Prompt 证据缺少${label}。`)
  }
  const provider = exactText(route.provider, `${label} Provider`)
  const model = exactText(route.model, `${label} Model`)
  const reasoningEffort = typeof route.reasoningEffort === 'string' && route.reasoningEffort.trim()
    ? route.reasoningEffort.trim()
    : undefined
  return { provider, model, ...(reasoningEffort ? { reasoningEffort } : {}) }
}

function turnId(value) {
  return (typeof value === 'string' && value.length > 0) || Number.isFinite(value) ? String(value) : ''
}

function terminalFor(reason) {
  const kind = typeof reason === 'object' && reason !== null ? reason.kind : reason
  if (['complete', 'completed', 'stop'].includes(kind)) return { state: 'completed', reason: String(kind) }
  if (['cancelled', 'canceled', 'interrupted', 'aborted', 'user'].includes(kind)) {
    return { state: 'interrupted', reason: String(kind) }
  }
  return { state: 'failed', reason: typeof kind === 'string' && kind ? kind : 'unknown' }
}

function routeFrom(event) {
  const config = event?.data?.header?.config
  if (!config || typeof config !== 'object') return null
  try { return normalizeRoute(config, '实际路由') } catch { return null }
}

function userRpcId(event) {
  if (event?.type !== 'user/message') return ''
  const message = event.data?.message || event.data
  return message?.source?.kind === 'user' && typeof message.source.rpcId === 'string'
    ? message.source.rpcId
    : ''
}

function usageFrom(event) {
  if (event?.type !== 'assistant/message' || !Number.isInteger(event.data?.step)
    || event.data.step < 0) return null
  const usage = event.data?.usage
  if (!usage || !Number.isInteger(usage.inputTokens) || usage.inputTokens < 0
    || !Number.isInteger(usage.outputTokens) || usage.outputTokens < 0) return null
  for (const key of ['cacheReadTokens', 'cacheWriteTokens']) {
    if (usage[key] !== undefined && (!Number.isInteger(usage[key]) || usage[key] < 0)) return null
  }
  return {
    step: event.data.step,
    seq: event.seq,
    uncachedInputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens || 0,
    cacheWriteTokens: usage.cacheWriteTokens || 0
  }
}

function routesMatch(expected, actual) {
  return expected.provider === actual.provider
    && expected.model === actual.model
    && (expected.reasoningEffort === undefined || expected.reasoningEffort === actual.reasoningEffort)
}

class CandidatePromptEvidence {
  constructor({ sessionId, requestId, expectedRoute } = {}) {
    this.sessionId = exactText(sessionId, ' Session 身份')
    this.requestId = exactText(requestId, ' requestId')
    this.acceptedAt = null
    this.admissionState = 'pending'
    this.expectedRoute = Object.freeze(normalizeRoute(expectedRoute, '预期路由'))
    this.durableSeq = null
    this.pendingTurn = null
    this.boundTurn = null
    this.route = null
    this.routeMatch = 'pending'
    this.terminal = null
    this.usageByStep = new Map()
    this.lastSeq = -1
  }

  snapshot() {
    const usageEntries = [...this.usageByStep.values()].sort((left, right) => left.step - right.step)
    const usage = usageEntries.length ? {
      uncachedInputTokens: usageEntries.reduce((total, item) => total + item.uncachedInputTokens, 0),
      outputTokens: usageEntries.reduce((total, item) => total + item.outputTokens, 0),
      cacheReadTokens: usageEntries.reduce((total, item) => total + item.cacheReadTokens, 0),
      cacheWriteTokens: usageEntries.reduce((total, item) => total + item.cacheWriteTokens, 0),
      evidenceSeqs: usageEntries.map(item => item.seq).sort((left, right) => left - right)
    } : null
    let state = this.admissionState === 'rejected'
      ? 'rejected'
      : this.admissionState === 'pending'
        ? 'awaiting-admission'
        : this.boundTurn ? 'running' : this.durableSeq === null ? 'accepted' : 'durable-unbound'
    if (this.admissionState === 'accepted' && this.terminal) {
      if (this.routeMatch === 'mismatched') state = 'route-mismatch'
      else if (this.routeMatch !== 'matched') state = 'evidence-incomplete'
      else state = this.terminal.state
    }
    return {
      version: 1,
      state,
      sessionId: this.sessionId,
      requestId: this.requestId,
      admission: {
        accepted: this.admissionState === 'accepted',
        durable: this.durableSeq !== null,
        ...(this.admissionState === 'accepted' ? { acceptedAt: this.acceptedAt } : {}),
        ...(this.durableSeq !== null ? { durableSeq: this.durableSeq } : {})
      },
      expectedRoute: { ...this.expectedRoute },
      ...(this.boundTurn ? {
        turn: {
          id: this.boundTurn.id,
          startSeq: this.boundTurn.startSeq,
          ...(this.terminal ? { endSeq: this.terminal.seq } : {})
        }
      } : {}),
      ...(this.route ? { route: { ...this.route } } : {}),
      routeMatch: this.routeMatch,
      ...(usage ? { usage } : {}),
      ...(this.terminal ? { terminal: { ...this.terminal } } : {})
    }
  }

  observe(frame) {
    const event = frame?.type === 'event' ? frame.event : null
    if (!event || !Number.isInteger(event.seq) || event.seq < 0 || event.seq <= this.lastSeq) return this.snapshot()
    this.lastSeq = event.seq
    if (this.terminal || this.admissionState === 'rejected') return this.snapshot()

    if (!this.boundTurn) {
      if (event.type === 'turn/start') {
        const id = turnId(event.data?.turn)
        if (id) this.pendingTurn = { id, startSeq: event.seq }
        return this.snapshot()
      }
      if (event.type === 'turn/end' && this.pendingTurn
        && turnId(event.data?.turn) === this.pendingTurn.id) {
        this.pendingTurn = null
        return this.snapshot()
      }
      if (userRpcId(event) === this.requestId) {
        this.durableSeq = event.seq
        if (this.pendingTurn) this.boundTurn = { ...this.pendingTurn }
      }
      return this.snapshot()
    }

    if (event.type === 'request/header') {
      const route = routeFrom(event)
      if (route) {
        this.route = { ...route, seq: event.seq }
        this.routeMatch = routesMatch(this.expectedRoute, route) ? 'matched' : 'mismatched'
      }
    } else if (event.type === 'assistant/message'
      && turnId(event.data?.turn) === this.boundTurn.id) {
      const usage = usageFrom(event)
      if (usage) this.usageByStep.set(usage.step, usage)
    } else if (event.type === 'turn/end'
      && turnId(event.data?.turn) === this.boundTurn.id) {
      const terminal = terminalFor(event.data?.reason)
      this.terminal = { ...terminal, seq: event.seq }
    }
    return this.snapshot()
  }

  confirmAdmission({ acceptedAt } = {}) {
    if (this.admissionState === 'rejected') throw new Error('这条候选 Prompt 已经拒绝，不能再确认接纳。')
    const exactAcceptedAt = exactText(acceptedAt, '接纳时间')
    if (this.admissionState === 'accepted' && this.acceptedAt !== exactAcceptedAt) {
      throw new Error('这条候选 Prompt 已经用另一接纳时间确认。')
    }
    this.admissionState = 'accepted'
    this.acceptedAt = exactAcceptedAt
    return this.snapshot()
  }

  rejectAdmission() {
    if (this.admissionState === 'accepted') throw new Error('这条候选 Prompt 已确认接纳，不能改写为拒绝。')
    this.admissionState = 'rejected'
    return this.snapshot()
  }
}

module.exports = { CandidatePromptEvidence, terminalFor }
