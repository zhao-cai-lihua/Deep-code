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
    usageControl: { attached: false, asOfSeq: null },
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
      || typeof adapter.openTokenUsageControl !== 'function'
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
    this.usageControlStream = null
    this.attachmentController = null
    this.eventPump = null
    this.usageControlPump = null
    this.followPump = null
    this.attachmentNonce = 0
    this.attachInFlight = false
    this.pendingEvents = new Map()
    this.promptEvidence = null
    this.promptEvidenceDefinition = null
    this.currentUsageControl = null
    this.current = emptySnapshot(connectionGeneration)
  }

  snapshot() {
    return {
      ...this.current,
      follow: { ...this.current.follow },
      usageControl: { ...this.current.usageControl },
      decisionGate: {
        ...this.current.decisionGate,
        kinds: [...this.current.decisionGate.kinds]
      },
      promptEvidence: this.promptEvidence?.snapshot() || null
    }
  }

  async attach({ cwd, sessionId, agentPreset } = {}) {
    if (this.current.state !== 'closed' || this.attachInFlight) {
      throw new Error('候选 Session Lab 已经绑定或正在绑定一个 Session。')
    }
    this.attachInFlight = true
    const nonce = ++this.attachmentNonce
    let followIterator = null
    let eventStream = null
    let usageControlStream = null
    const attachmentController = new AbortController()
    this.attachmentController = attachmentController
    try {
      const created = await this.adapter.createSession({
        cwd,
        ...(sessionId ? { sessionId } : {}),
        ...(agentPreset ? { agentPreset } : {}),
        signal: attachmentController.signal
      })
      this.#assertAttachCurrent(nonce)
      const exactSessionId = String(created?.sessionId || '')
      if (!exactSessionId || (sessionId && exactSessionId !== String(sessionId))) {
        throw new Error('候选 Session Lab 收到的 Session 身份与请求不一致。')
      }

      followIterator = this.adapter.followSession({
        sessionId: exactSessionId,
        signal: attachmentController.signal
      })[Symbol.asyncIterator]()
      this.followIterator = followIterator
      const first = await followIterator.next()
      this.#assertAttachCurrent(nonce)
      if (first.done || first.value?.type !== 'snapshot' || first.value?.header?.id !== exactSessionId) {
        throw new Error('候选 Session Lab 未收到精确匹配的 Session 快照。')
      }
      const usageControl = await this.adapter.openTokenUsageControl({
        sessionId: exactSessionId,
        signal: attachmentController.signal
      })
      usageControlStream = usageControl?.stream || null
      this.#assertAttachCurrent(nonce)
      if (!usageControl?.baseline || !usageControlStream) {
        throw new Error('候选 Session Lab 未收到精确 Session 的用量控制流。')
      }
      const eventGeneration = await this.adapter.openEventGeneration({
        sessionId: exactSessionId,
        signal: attachmentController.signal
      })
      eventStream = eventGeneration?.stream || null
      this.#assertAttachCurrent(nonce)
      if (eventGeneration?.generation !== this.connectionGeneration
        || eventGeneration?.sessionId !== exactSessionId) {
        throw new Error('候选 Session Lab 的 Remote Event generation 与当前连接不一致。')
      }
      this.eventStream = eventStream
      this.usageControlStream = usageControlStream
      this.currentUsageControl = usageControl.baseline
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
        usageControl: { attached: true, asOfSeq: usageControl.baseline.asOfSeq },
        decisionGate: { state: 'observing', pendingCount: 0, kinds: [] },
        promptEvidence: null
      }
      this.followPump = this.#pumpFollow(followIterator, exactSessionId, nonce)
      this.usageControlPump = this.#pumpUsageControl(usageControlStream, exactSessionId, nonce)
      this.eventPump = this.#pumpDecisionGate(eventStream, exactSessionId, nonce)
      return this.snapshot()
    } catch (error) {
      attachmentController.abort(new Error('候选 Session 绑定未完成。'))
      if (this.attachmentController === attachmentController) this.attachmentController = null
      if (this.followIterator === followIterator) this.followIterator = null
      if (this.eventStream === eventStream) this.eventStream = null
      if (this.usageControlStream === usageControlStream) this.usageControlStream = null
      this.currentUsageControl = null
      await Promise.all([closeIterator(followIterator), closeIterator(usageControlStream), closeIterator(eventStream)])
      throw error
    } finally {
      this.attachInFlight = false
    }
  }

  async close() {
    this.attachmentNonce += 1
    const attachmentController = this.attachmentController
    const followIterator = this.followIterator
    const eventStream = this.eventStream
    const usageControlStream = this.usageControlStream
    this.followIterator = null
    this.eventStream = null
    this.usageControlStream = null
    this.attachmentController = null
    this.eventPump = null
    this.usageControlPump = null
    this.followPump = null
    this.pendingEvents.clear()
    this.promptEvidence = null
    this.promptEvidenceDefinition = null
    this.currentUsageControl = null
    this.current = emptySnapshot(this.connectionGeneration)
    attachmentController?.abort(new Error('候选 Session Lab 已关闭。'))
    await Promise.all([closeIterator(followIterator), closeIterator(usageControlStream), closeIterator(eventStream)])
    return this.snapshot()
  }

  preparePromptEvidence({ requestId, expectedRoute } = {}) {
    if (this.current.state !== 'observing' || !this.current.sessionId || !this.followIterator
      || !this.current.usageControl.attached || !this.currentUsageControl) {
      throw new Error('候选 Session Lab 尚未进入可观察状态。')
    }
    if (this.promptEvidence && !['completed', 'failed', 'interrupted', 'route-mismatch', 'evidence-incomplete', 'rejected']
      .includes(this.promptEvidence.snapshot().state)) {
      throw new Error('候选 Session Lab 已经在观察一条尚未结算的 Prompt。')
    }
    this.promptEvidenceDefinition = {
      sessionId: this.current.sessionId,
      requestId,
      expectedRoute,
      usageBaseline: this.currentUsageControl
    }
    this.promptEvidence = new CandidatePromptEvidence(this.promptEvidenceDefinition)
    return this.promptEvidence.snapshot()
  }

  async reconcilePromptEvidence({ timeoutMs = 10_000 } = {}) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
      throw new Error('候选 Prompt 对账等待上限无效。')
    }
    if (this.current.state !== 'observing' || !this.current.sessionId || !this.promptEvidence
      || !this.promptEvidenceDefinition) {
      throw new Error('候选 Session Lab 没有可对账的 Prompt 证据。')
    }
    const admission = this.promptEvidence.snapshot().admission
    if (!admission.accepted || typeof admission.acceptedAt !== 'string') {
      throw new Error('候选 Prompt 尚未确认接纳，不能从持久化记录重建。')
    }
    const sessionId = this.current.sessionId
    const nonce = this.attachmentNonce
    const controller = new AbortController()
    const timer = setTimeout(() => {
      controller.abort(new Error('候选 Prompt 的只读证据对账超时。'))
    }, timeoutMs)
    let follow = null
    let usageStream = null
    try {
      follow = this.adapter.followSession({ sessionId, signal: controller.signal })[Symbol.asyncIterator]()
      const first = await follow.next()
      this.#assertAttachCurrent(nonce)
      if (first.done || first.value?.type !== 'snapshot' || first.value?.header?.id !== sessionId
        || !Array.isArray(first.value.records) || first.value.hasMore === true) {
        throw new Error('候选 Prompt 无法取得完整且精确匹配的只读 Session 快照。')
      }
      const usageControl = await this.adapter.openTokenUsageControl({
        sessionId,
        signal: controller.signal
      })
      usageStream = usageControl?.stream || null
      this.#assertAttachCurrent(nonce)
      if (!usageControl?.baseline || !usageStream) {
        throw new Error('候选 Prompt 对账没有取得精确 Session 的累计用量。')
      }
      const rebuilt = new CandidatePromptEvidence(this.promptEvidenceDefinition)
      rebuilt.confirmAdmission({ acceptedAt: admission.acceptedAt })
      for (const record of first.value.records) rebuilt.observe(record)
      rebuilt.observeControlUsage(usageControl.baseline)
      this.promptEvidence = rebuilt
      this.currentUsageControl = usageControl.baseline
      this.current = {
        ...this.current,
        follow: {
          attached: true,
          cursor: Number.isInteger(first.value.cursor) ? first.value.cursor : this.current.follow.cursor
        },
        usageControl: { attached: true, asOfSeq: usageControl.baseline.asOfSeq }
      }
      return this.snapshot()
    } catch (error) {
      if (controller.signal.aborted) throw controller.signal.reason
      throw error
    } finally {
      clearTimeout(timer)
      await Promise.all([closeIterator(follow), closeIterator(usageStream)])
    }
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

  async #pumpUsageControl(stream, sessionId, nonce) {
    try {
      for await (const sample of stream) {
        if (nonce !== this.attachmentNonce || this.current.sessionId !== sessionId) return
        if (sample.asOfSeq <= (this.current.usageControl.asOfSeq ?? -1)) continue
        this.currentUsageControl = sample
        this.current = {
          ...this.current,
          usageControl: { attached: true, asOfSeq: sample.asOfSeq }
        }
        this.promptEvidence?.observeControlUsage(sample)
      }
      if (nonce === this.attachmentNonce && this.current.sessionId === sessionId) {
        this.current = { ...this.current, usageControl: { ...this.current.usageControl, attached: false } }
      }
    } catch {
      if (nonce === this.attachmentNonce && this.current.sessionId === sessionId) {
        this.current = {
          ...this.current,
          state: 'error',
          usageControl: { ...this.current.usageControl, attached: false }
        }
      }
    }
  }
}

module.exports = { CandidateSessionLab }
