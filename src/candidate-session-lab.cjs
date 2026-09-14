const { CandidatePromptEvidence } = require('./candidate-prompt-evidence.cjs')

async function closeIterator(iterator) {
  try { await iterator?.return?.() } catch {}
}

function emptySnapshot(connectionGeneration = null) {
  return {
    version: 1,
    state: 'closed',
    connectionGeneration,
    sessionId: null,
    follow: { attached: false, cursor: null },
    decisionGate: { state: 'closed', pendingCount: 0, kinds: [] },
    promptEvidence: null
  }
}

function decisionKind(eventName) {
  if (eventName === 'user-questions/request') return 'user-question'
  if (eventName === 'approval/request') return 'approval'
  return 'remote-event'
}

class CandidateSessionLab {
  constructor({ adapter, connectionGeneration } = {}) {
    if (!adapter || typeof adapter.createSession !== 'function'
      || typeof adapter.followSession !== 'function'
      || typeof adapter.openEventGeneration !== 'function') {
      throw new Error('候选 Session Lab 缺少新版 Harness Adapter。')
    }
    if (!Number.isInteger(connectionGeneration) || connectionGeneration < 0) {
      throw new Error('候选 Session Lab 缺少有效的 connection generation。')
    }
    this.adapter = adapter
    this.connectionGeneration = connectionGeneration
    this.followIterator = null
    this.eventStream = null
    this.eventPump = null
    this.followPump = null
    this.attachmentNonce = 0
    this.attachInFlight = false
    this.pendingEvents = new Map()
    this.promptEvidence = null
    this.current = emptySnapshot(connectionGeneration)
  }

  snapshot() {
    return {
      ...this.current,
      follow: { ...this.current.follow },
      decisionGate: {
        ...this.current.decisionGate,
        kinds: [...this.current.decisionGate.kinds]
      },
      promptEvidence: this.promptEvidence?.snapshot() || null
    }
  }

  async attach({ cwd, sessionId } = {}) {
    if (this.current.state !== 'closed' || this.attachInFlight) {
      throw new Error('候选 Session Lab 已经绑定或正在绑定一个 Session。')
    }
    this.attachInFlight = true
    const nonce = ++this.attachmentNonce
    let followIterator = null
    let eventStream = null
    try {
      const created = await this.adapter.createSession({ cwd, ...(sessionId ? { sessionId } : {}) })
      this.#assertAttachCurrent(nonce)
      const exactSessionId = String(created?.sessionId || '')
      if (!exactSessionId || (sessionId && exactSessionId !== String(sessionId))) {
        throw new Error('候选 Session Lab 收到的 Session 身份与请求不一致。')
      }

      followIterator = this.adapter.followSession({ sessionId: exactSessionId })[Symbol.asyncIterator]()
      this.followIterator = followIterator
      const first = await followIterator.next()
      this.#assertAttachCurrent(nonce)
      if (first.done || first.value?.type !== 'snapshot' || first.value?.header?.id !== exactSessionId) {
        throw new Error('候选 Session Lab 未收到精确匹配的 Session 快照。')
      }
      const eventGeneration = await this.adapter.openEventGeneration({ sessionId: exactSessionId })
      eventStream = eventGeneration?.stream || null
      this.#assertAttachCurrent(nonce)
      if (eventGeneration?.generation !== this.connectionGeneration
        || eventGeneration?.sessionId !== exactSessionId) {
        throw new Error('候选 Session Lab 的 Remote Event generation 与当前连接不一致。')
      }
      this.eventStream = eventStream
      this.pendingEvents.clear()
      this.current = {
        version: 1,
        state: 'observing',
        connectionGeneration: this.connectionGeneration,
        sessionId: exactSessionId,
        follow: {
          attached: true,
          cursor: Number.isInteger(first.value.cursor) ? first.value.cursor : null
        },
        decisionGate: { state: 'observing', pendingCount: 0, kinds: [] },
        promptEvidence: null
      }
      this.followPump = this.#pumpFollow(followIterator, exactSessionId, nonce)
      this.eventPump = this.#pumpDecisionGate(eventStream, exactSessionId, nonce)
      return this.snapshot()
    } catch (error) {
      if (this.followIterator === followIterator) this.followIterator = null
      if (this.eventStream === eventStream) this.eventStream = null
      await Promise.all([closeIterator(followIterator), closeIterator(eventStream)])
      throw error
    } finally {
      this.attachInFlight = false
    }
  }

  async close() {
    this.attachmentNonce += 1
    const followIterator = this.followIterator
    const eventStream = this.eventStream
    this.followIterator = null
    this.eventStream = null
    this.eventPump = null
    this.followPump = null
    this.pendingEvents.clear()
    this.promptEvidence = null
    this.current = emptySnapshot(this.connectionGeneration)
    await Promise.all([closeIterator(followIterator), closeIterator(eventStream)])
    return this.snapshot()
  }

  preparePromptEvidence({ requestId, expectedRoute } = {}) {
    if (this.current.state !== 'observing' || !this.current.sessionId || !this.followIterator) {
      throw new Error('候选 Session Lab 尚未进入可观察状态。')
    }
    if (this.promptEvidence && !['completed', 'failed', 'interrupted', 'route-mismatch', 'evidence-incomplete', 'rejected']
      .includes(this.promptEvidence.snapshot().state)) {
      throw new Error('候选 Session Lab 已经在观察一条尚未结算的 Prompt。')
    }
    this.promptEvidence = new CandidatePromptEvidence({
      sessionId: this.current.sessionId,
      requestId,
      expectedRoute
    })
    return this.promptEvidence.snapshot()
  }

  confirmPromptAdmission({ requestId, acceptedAt } = {}) {
    this.#assertPromptRequest(requestId)
    return this.promptEvidence.confirmAdmission({ acceptedAt })
  }

  rejectPromptAdmission({ requestId } = {}) {
    this.#assertPromptRequest(requestId)
    return this.promptEvidence.rejectAdmission()
  }

  #assertPromptRequest(requestId) {
    if (!this.promptEvidence) throw new Error('候选 Session Lab 没有待核对的 Prompt。')
    if (String(requestId || '') !== this.promptEvidence.requestId) {
      throw new Error('候选 Prompt 的 requestId 不一致。')
    }
  }

  #refreshDecisionProjection() {
    const kinds = [...new Set(this.pendingEvents.values())].sort()
    this.current = {
      ...this.current,
      decisionGate: {
        state: this.pendingEvents.size > 0 ? 'waiting' : 'observing',
        pendingCount: this.pendingEvents.size,
        kinds
      }
    }
  }

  #assertAttachCurrent(nonce) {
    if (nonce !== this.attachmentNonce) {
      throw new Error('候选 Session Lab 的异步绑定已失效。')
    }
  }

  async #pumpDecisionGate(stream, sessionId, nonce) {
    try {
      for await (const frame of stream) {
        if (nonce !== this.attachmentNonce || this.current.sessionId !== sessionId) return
        if (frame?.type === 'waterfall' && frame.agentId === sessionId
          && typeof frame.eventId === 'string' && frame.eventId.length > 0) {
          this.pendingEvents.set(frame.eventId, decisionKind(frame.event))
          this.#refreshDecisionProjection()
        } else if (frame?.type === 'cancel' && typeof frame.eventId === 'string'
          && this.pendingEvents.delete(frame.eventId)) {
          this.#refreshDecisionProjection()
        }
      }
      if (nonce === this.attachmentNonce && this.current.sessionId === sessionId) {
        this.pendingEvents.clear()
        this.current = {
          ...this.current,
          state: 'closed',
          decisionGate: { state: 'closed', pendingCount: 0, kinds: [] }
        }
      }
    } catch {
      if (nonce === this.attachmentNonce && this.current.sessionId === sessionId) {
        this.pendingEvents.clear()
        this.current = {
          ...this.current,
          state: 'error',
          decisionGate: { state: 'closed', pendingCount: 0, kinds: [] }
        }
      }
    }
  }

  async #pumpFollow(stream, sessionId, nonce) {
    try {
      for await (const frame of { [Symbol.asyncIterator]: () => stream }) {
        if (nonce !== this.attachmentNonce || this.current.sessionId !== sessionId) return
        this.promptEvidence?.observe(frame)
        if (frame?.type === 'event' && Number.isInteger(frame.event?.seq)) {
          this.current = {
            ...this.current,
            follow: { attached: true, cursor: Math.max(this.current.follow.cursor ?? -1, frame.event.seq + 1) }
          }
        }
      }
      if (nonce === this.attachmentNonce && this.current.sessionId === sessionId) {
        this.current = { ...this.current, state: 'closed', follow: { ...this.current.follow, attached: false } }
      }
    } catch {
      if (nonce === this.attachmentNonce && this.current.sessionId === sessionId) {
        this.current = { ...this.current, state: 'error', follow: { ...this.current.follow, attached: false } }
      }
    }
  }
}

module.exports = { CandidateSessionLab }
