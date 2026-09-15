const DEFAULT_PROMPT_LIMIT = 256
const DEFAULT_TIMEOUT_MS = 120_000

function nonEmptyText(value, label) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) throw new Error(`Gate D 缺少${label}。`)
  return text
}

function normalizeSelection(selection) {
  if (!selection || typeof selection !== 'object' || Array.isArray(selection)) {
    throw new Error('Gate D 缺少明确的模型路由。')
  }
  const provider = nonEmptyText(selection.provider, ' Provider')
  const model = nonEmptyText(selection.model, ' Model')
  const reasoningEffort = typeof selection.reasoningEffort === 'string' && selection.reasoningEffort.trim()
    ? selection.reasoningEffort.trim()
    : undefined
  return { provider, model, ...(reasoningEffort ? { reasoningEffort } : {}) }
}

function sameRoute(left, right) {
  return left.provider === right.provider && left.model === right.model
    && left.reasoningEffort === right.reasoningEffort
}

function reasoningIds(model) {
  if (!Array.isArray(model?.reasoning)) return []
  return model.reasoning.map(value => typeof value === 'string' ? value : value?.id)
    .filter(value => typeof value === 'string' && value.length > 0)
}

function receiptFrom(evidence) {
  const usage = evidence.usage ? {
    uncachedInputTokens: evidence.usage.uncachedInputTokens,
    outputTokens: evidence.usage.outputTokens,
    cacheReadTokens: evidence.usage.cacheReadTokens,
    cacheWriteTokens: evidence.usage.cacheWriteTokens
  } : null
  return {
    version: 1,
    state: evidence.state,
    route: {
      provider: evidence.route.provider,
      model: evidence.route.model,
      ...(evidence.route.reasoningEffort ? { reasoningEffort: evidence.route.reasoningEffort } : {})
    },
    admission: { accepted: evidence.admission.accepted, durable: evidence.admission.durable },
    terminal: { state: evidence.terminal.state, reason: evidence.terminal.reason },
    ...(usage ? { usage } : {}),
    ...(evidence.usageAgreement ? { usageAgreement: evidence.usageAgreement.state } : {}),
    promptRequests: 1,
    requestHeaders: 1,
    retryEvents: (evidence.retryEvidence?.scheduled || 0) + (evidence.retryEvidence?.started || 0)
  }
}

class CandidateGateDRunner {
  constructor({ adapter, lab, requestIdFactory, now = () => new Date(), wait, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    if (!adapter || typeof adapter.modelCatalog !== 'function' || typeof adapter.selectModel !== 'function'
      || typeof adapter.prompt !== 'function') {
      throw new Error('Gate D 缺少新版 Harness Adapter。')
    }
    if (!lab || typeof lab.snapshot !== 'function' || typeof lab.preparePromptEvidence !== 'function'
      || typeof lab.confirmPromptAdmission !== 'function' || typeof lab.rejectPromptAdmission !== 'function') {
      throw new Error('Gate D 缺少候选 Session Lab。')
    }
    if (typeof lab.reconcilePromptEvidence !== 'function') {
      throw new Error('Gate D 缺少候选 Session 的只读证据对账。')
    }
    if (typeof requestIdFactory !== 'function') throw new Error('Gate D 缺少 requestId 生成器。')
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300_000) {
      throw new Error('Gate D 的证据等待上限无效。')
    }
    this.adapter = adapter
    this.lab = lab
    this.requestIdFactory = requestIdFactory
    this.now = now
    this.wait = wait || (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)))
    this.timeoutMs = timeoutMs
    this.preflightResult = null
    this.executed = false
  }

  async preflight({ selection } = {}) {
    if (this.executed) throw new Error('Gate D 已经执行过，不能重新预检或重发。')
    const route = normalizeSelection(selection)
    const session = this.lab.snapshot()
    if (session.state !== 'observing' || !session.sessionId || session.decisionGate?.pendingCount !== 0) {
      throw new Error('Gate D 的候选 Session 尚未进入可发送且无需用户决定的状态。')
    }
    const catalog = await this.adapter.modelCatalog()
    if (!catalog.routableProviders.includes(route.provider)) {
      throw new Error(`Gate D 的 Provider ${route.provider} 当前不可路由。`)
    }
    const group = catalog.groups.find(candidate => candidate?.id === route.provider)
    const model = group?.models?.find(candidate => candidate?.id === route.model)
    if (!model) throw new Error(`Gate D 的模型 ${route.model} 不在当前结构化目录中。`)
    if (Array.isArray(model.inputModalities) && !model.inputModalities.includes('text')) {
      throw new Error(`Gate D 的模型 ${route.model} 没有公布文本输入能力。`)
    }
    const supportedReasoning = reasoningIds(model)
    if (route.reasoningEffort && supportedReasoning.length > 0 && !supportedReasoning.includes(route.reasoningEffort)) {
      throw new Error(`Gate D 的模型 ${route.model} 没有公布 ${route.reasoningEffort} 推理强度。`)
    }
    this.preflightResult = Object.freeze({
      state: 'ready',
      route: Object.freeze({ ...route }),
      modality: 'text',
      promptLimit: DEFAULT_PROMPT_LIMIT,
      retryPolicy: Object.freeze({ mode: 'normal', maxRetries: 0 }),
      auxiliaryModelCalls: false
    })
    return {
      ...this.preflightResult,
      route: { ...this.preflightResult.route },
      retryPolicy: { ...this.preflightResult.retryPolicy }
    }
  }

  async executeOnce({ text, clientTimeZone = 'Asia/Shanghai' } = {}) {
    if (this.executed) throw new Error('Gate D 已经执行过；本入口不会自动重试或发送第二次 Prompt。')
    if (!this.preflightResult) throw new Error('Gate D 必须先完成模型与成本边界预检。')
    const promptText = nonEmptyText(text, '测试文本')
    if ([...promptText].length > this.preflightResult.promptLimit) {
      throw new Error(`Gate D 测试文本超过 ${this.preflightResult.promptLimit} 字符上限。`)
    }
    this.executed = true
    const deadline = Date.now() + this.timeoutMs
    const requestAbort = new AbortController()
    const requestTimer = setTimeout(() => {
      requestAbort.abort(new Error('Gate D 只发送的一次 Prompt 超过了等待上限；不会自动重试。'))
    }, this.timeoutMs)
    const sessionId = nonEmptyText(this.lab.snapshot().sessionId, ' Session 身份')
    const requestId = nonEmptyText(this.requestIdFactory(), ' requestId')
    try {
      const selected = await this.adapter.selectModel({
        sessionId,
        selection: this.preflightResult.route,
        signal: requestAbort.signal
      })
      if (!sameRoute(normalizeSelection(selected), this.preflightResult.route)) {
        throw new Error('Gate D 的 Session 没有保持预检模型路由。')
      }
      this.lab.preparePromptEvidence({ requestId, expectedRoute: this.preflightResult.route })
      try {
        const admission = await this.adapter.prompt({
          sessionId, requestId, text: promptText, mode: 'queue', clientTimeZone,
          signal: requestAbort.signal
        })
        if (admission?.accepted !== true || admission.requestId !== requestId) {
          throw new Error('Gate D 没有收到精确 requestId 的 Prompt 接纳回执。')
        }
        this.lab.confirmPromptAdmission({ requestId, acceptedAt: this.now().toISOString() })
      } catch (error) {
        this.lab.rejectPromptAdmission({ requestId })
        throw error
      }

      let reconciled = false
      while (true) {
        const labSnapshot = this.lab.snapshot()
        if (labSnapshot.state !== 'observing') throw new Error('Gate D 的 Session 证据流在终态前失效。')
        const evidence = labSnapshot.promptEvidence
        if (evidence?.retryEvidence) {
          throw new Error('Gate D 观察到模型请求重试事件；本次验收拒绝把它算作单次调用。')
        }
        if (evidence?.additionalRequestHeaders) {
          throw new Error('Gate D 观察到同一 Turn 中的额外模型请求；本次验收拒绝把它算作单次调用。')
        }
        if (evidence?.state === 'route-mismatch') {
          throw new Error('Gate D 的实际路由与预检路由不一致。')
        }
        if (evidence?.state === 'usage-mismatch') {
          throw new Error('Gate D 的 Turn 用量与 Session control 投影不一致。')
        }
        if (['completed', 'failed', 'interrupted'].includes(evidence?.state)) {
          return receiptFrom(evidence)
        }
        const deadlineReached = Date.now() >= deadline
        if (!reconciled && (deadlineReached || evidence?.terminal)) {
          reconciled = true
          await this.lab.reconcilePromptEvidence({ timeoutMs: Math.min(10_000, this.timeoutMs) })
          continue
        }
        if (deadlineReached) {
          throw new Error('Gate D 只发送的一次 Prompt 未在证据等待上限内形成可信终态；不会自动重试。')
        }
        await this.wait(25)
      }
    } finally {
      clearTimeout(requestTimer)
    }
  }
}

module.exports = { CandidateGateDRunner }
