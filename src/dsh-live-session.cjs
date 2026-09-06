const { randomUUID } = require('node:crypto')

const MAX_ACTIVITY = 16
const MAX_TEXT = 8000
const MAX_DRAFT_TEXT = 48000

function copy(value) {
  return JSON.parse(JSON.stringify(value))
}

function localMuxUrl(baseUrl) {
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(String(baseUrl || ''))) {
    throw new Error('Deep code 只连接本机 127.0.0.1 Engine。')
  }
  return `${baseUrl.replace(/^http:/, 'ws:')}/api/events.mux`
}

function safeText(value, fallback = '', max = MAX_TEXT) {
  const text = typeof value === 'string' ? value.trim() : ''
  return (text || fallback).slice(0, max)
}

function publicQuestion(question) {
  return {
    id: typeof question?.id === 'string' ? question.id : 'question',
    question: safeText(question?.question, 'Engine 需要你补充信息。'),
    ...(safeText(question?.header) ? { header: safeText(question.header, '', 200) } : {}),
    ...(safeText(question?.detail) ? { detail: safeText(question.detail) } : {}),
    options: Array.isArray(question?.options)
      ? question.options.slice(0, 30).map((option) => ({
        label: typeof option?.label === 'string' ? option.label : '未命名选项',
        ...(safeText(option?.description) ? { description: safeText(option.description, '', 1200) } : {})
      }))
      : [],
    multiSelect: question?.multiSelect === true,
    ...(question?.intent?.kind === 'plan-review' && typeof question.intent.approve === 'string'
      ? { intent: { kind: 'plan-review', approve: safeText(question.intent.approve, '', 500) } }
      : {})
  }
}

function activityFromFrame(frame) {
  if (frame?.type !== 'session/event') return null
  const event = frame.event || {}
  const data = event.data || {}
  const seq = Number.isFinite(event.seq) ? event.seq : null
  const base = { id: seq === null ? `live-${randomUUID()}` : `event-${seq}`, seq }
  if (event.type === 'turn/start') return { ...base, state: 'working', label: '开始处理这一轮任务' }
  if (event.type === 'assistant/message') return { ...base, state: 'working', label: '正在整理回复' }
  if (event.type === 'tool/call') {
    const name = safeText(data.name, '工具', 300)
    return { ...base, state: 'working', label: `正在使用 ${name}`, detail: '具体参数保留在技术证据中。' }
  }
  if (event.type === 'tool/result') return { ...base, state: 'done', label: '工具操作已返回结果' }
  if (event.type === 'tool/error') return { ...base, state: 'error', label: '工具操作没有完成' }
  if (event.type === 'turn/end') {
    const reason = safeText(typeof data.reason === 'object' ? data.reason?.kind : data.reason, '', 300)
    const failed = reason && !['complete', 'completed', 'stop'].includes(reason)
    return {
      ...base,
      state: failed ? 'error' : 'done',
      label: failed ? '这一轮已停止' : '这一轮已完成',
      ...(reason ? { detail: `Engine 原因：${reason}` } : {})
    }
  }
  return null
}

function queueSummary(items) {
  const counts = { queued: 0, steering: 0, context: 0 }
  for (const item of Array.isArray(items) ? items : []) {
    if (Object.hasOwn(counts, item?.placement)) counts[item.placement] += 1
  }
  return { ...counts, total: counts.queued + counts.steering + counts.context }
}

function normalizeInteraction(rpcId, frame) {
  if (frame.type === 'approval/requested') {
    const toolName = safeText(frame.toolName, '未命名工具', 300)
    return {
      internal: { rpcId, approvalId: String(frame.approvalId || '') },
      public: {
        id: `approval:${rpcId}`,
        kind: 'approval',
        title: '需要你批准一次工具操作',
        summary: `${toolName} 正在等待决定。`,
        toolName,
        ...(safeText(frame.reason) ? { detail: safeText(frame.reason) } : {}),
        consequence: '允许后，Harness 只为这一次请求放行；拒绝后，这次工具调用不会执行。',
        responding: false
      }
    }
  }
  if (frame.type === 'question/requested') {
    const questions = Array.isArray(frame.questions) ? frame.questions.map(publicQuestion) : []
    const planReview = questions.length === 1 && questions[0]?.intent?.kind === 'plan-review'
    return {
      internal: { rpcId },
      public: {
        id: `question:${rpcId}`,
        kind: planReview ? 'plan-review' : 'question',
        title: planReview ? '计划正在等待你审阅' : 'Deep code 需要你的回答',
        summary: questions.length > 1 ? `Engine 提出了 ${questions.length} 个问题。` : (questions[0]?.question || 'Engine 正在等待补充信息。'),
        questions,
        consequence: planReview
          ? '你的选择会原样返回给 Harness；Deep code 不会自行批准计划。'
          : '回答会原样返回给当前任务，Agent 收到后才会继续。',
        responding: false
      }
    }
  }
  return null
}

function validateQuestionAnswers(interaction, answers) {
  if (!Array.isArray(answers)) throw new Error('请先回答 Engine 的问题。')
  const submitted = new Map(answers.map((answer) => [String(answer?.id || ''), answer]))
  return interaction.public.questions.map((question) => {
    const answer = submitted.get(question.id)
    if (!answer) throw new Error(`请回答“${question.header || question.question}”。`)
    const allowed = new Set(question.options.map((option) => option.label))
    const selected = Array.isArray(answer.selected)
      ? [...new Set(answer.selected.map((value) => String(value ?? '')).filter((value) => value.length > 0))]
      : []
    if (selected.some((label) => !allowed.has(label))) throw new Error('回答包含 Engine 没有提供的选项。')
    if (!question.multiSelect && selected.length > 1) throw new Error('这个问题只能选择一个选项。')
    const custom = safeText(answer.custom, '', 4000)
    if (!selected.length && !custom) throw new Error(`请回答“${question.header || question.question}”。`)
    return { id: question.id, selected, ...(custom ? { custom } : {}) }
  })
}

class DshLiveSession {
  constructor({
    baseUrl,
    sessionId,
    fetchImpl = globalThis.fetch,
    WebSocketImpl = globalThis.WebSocket,
    retryMs = 1200,
    interactionTimeoutMs = 5 * 60 * 1000,
    setTimeoutImpl = setTimeout,
    clearTimeoutImpl = clearTimeout,
    onInteractionTimeout = () => {}
  } = {}) {
    if (!sessionId) throw new Error('实时会话缺少 Engine Session 标识。')
    if (typeof fetchImpl !== 'function') throw new Error('当前环境不支持本地 Engine 响应。')
    if (typeof WebSocketImpl !== 'function') throw new Error('当前环境不支持 Engine WebSocket 实时连接。')
    this.baseUrl = String(baseUrl || '')
    this.sessionId = String(sessionId)
    this.fetchImpl = fetchImpl
    this.WebSocketImpl = WebSocketImpl
    this.retryMs = retryMs
    this.interactionTimeoutMs = interactionTimeoutMs
    this.setTimeoutImpl = setTimeoutImpl
    this.clearTimeoutImpl = clearTimeoutImpl
    this.onInteractionTimeout = onInteractionTimeout
    this.socket = null
    this.connectionId = 0
    this.closed = false
    this.retryTimer = null
    this.interactionTimer = null
    this.status = 'connecting'
    this.error = ''
    this.pending = new Map()
    this.activities = []
    this.draft = null
    this.queue = queueSummary([])
  }

  clearInteractionTimer() {
    if (this.interactionTimer) this.clearTimeoutImpl(this.interactionTimer)
    this.interactionTimer = null
  }

  syncInteractionTimer() {
    if (!this.pending.size) {
      this.clearInteractionTimer()
      return
    }
    if (this.interactionTimer) return
    this.interactionTimer = this.setTimeoutImpl(() => {
      this.interactionTimer = null
      if (this.closed || !this.pending.size) return
      const interactionCount = this.pending.size
      this.pending.clear()
      Promise.resolve(this.onInteractionTimeout({
        reason: 'waiting-for-user',
        interactionCount,
        sessionId: this.sessionId
      })).catch(() => {})
    }, this.interactionTimeoutMs)
  }

  /** Restart the inactivity window without changing the Engine-owned question. */
  touchInteraction(interactionId) {
    const interaction = this.pending.get(String(interactionId || ''))
    if (!interaction || interaction.public.responding) return false
    this.clearInteractionTimer()
    this.syncInteractionTimer()
    return true
  }

  start() {
    if (this.socket || this.closed) return this
    this.connect()
    return this
  }

  connect() {
    this.status = this.error ? 'reconnecting' : 'connecting'
    const connectionId = ++this.connectionId
    try {
      const socket = new this.WebSocketImpl(localMuxUrl(this.baseUrl))
      this.socket = socket
      socket.addEventListener('open', () => {
        if (connectionId !== this.connectionId || this.closed) return
        this.status = 'connected'
        this.error = ''
      })
      socket.addEventListener('message', (event) => {
        if (connectionId !== this.connectionId || this.closed) return
        if (typeof event?.data !== 'string') return
        this.receive(event.data)
      })
      socket.addEventListener('error', (event) => {
        if (connectionId !== this.connectionId || this.closed) return
        this.error = safeText(event?.message, 'Engine WebSocket 实时连接失败。', 1200)
      })
      socket.addEventListener('close', () => {
        if (connectionId !== this.connectionId || this.closed) return
        this.disconnect(this.error ? new Error(this.error) : undefined)
      }, { once: true })
    } catch (error) {
      if (connectionId !== this.connectionId || this.closed) return
      this.disconnect(error)
    }
  }

  disconnect(error) {
    this.socket = null
    this.status = 'reconnecting'
    this.error = safeText(error?.message, 'Engine 实时状态暂时断开；任务记录仍会继续刷新，待决定事项会在重连后由 Harness 重新发送。', 1200)
    this.pending.clear()
    this.clearInteractionTimer()
    this.draft = null
    this.queue = queueSummary([])
    if (this.retryTimer) return
    this.retryTimer = this.setTimeoutImpl(() => {
      this.retryTimer = null
      if (!this.closed) this.connect()
    }, this.retryMs)
  }

  receive(raw) {
    let envelope
    try { envelope = JSON.parse(typeof raw === 'string' ? raw : String(raw)) } catch { return }
    if (envelope?.type !== 'server-request' || typeof envelope.rpcId !== 'string') return
    const frame = envelope.payload || {}
    if (frame.sessionId && frame.sessionId !== this.sessionId) return
    if (frame.type === 'approval/requested' || frame.type === 'question/requested') {
      const interaction = normalizeInteraction(envelope.rpcId, frame)
      if (interaction) {
        this.pending.set(interaction.public.id, interaction)
        this.syncInteractionTimer()
      }
      return
    }
    if (frame.type === 'approval/resolved') {
      for (const [id, interaction] of this.pending) {
        if (interaction.internal.approvalId === frame.approvalId) this.pending.delete(id)
      }
      this.syncInteractionTimer()
      return
    }
    if (frame.type === 'question/resolved') {
      this.pending.delete(`question:${frame.questionRpcId}`)
      this.syncInteractionTimer()
      return
    }
    if (frame.type === 'stream/error') {
      this.status = 'error'
      this.error = safeText(frame.error?.message, 'Engine 实时状态返回了未知错误。', 1200)
      return
    }
    if (frame.type === 'session/subscribed') {
      this.status = 'connected'
      this.error = ''
      return
    }
    if (frame.type === 'session/queue') {
      this.queue = queueSummary(frame.items)
      return
    }
    if (frame.type === 'session/event' && frame.event?.type === 'assistant/chunk') {
      const data = frame.event.data || {}
      const chunk = data.chunk || {}
      if (chunk.type === 'text-delta' && typeof chunk.text === 'string' && chunk.text) {
        const sameStep = this.draft?.turn === data.turn && this.draft?.step === data.step
        const previous = sameStep ? this.draft.text : ''
        this.draft = {
          turn: Number.isFinite(data.turn) ? data.turn : null,
          step: Number.isFinite(data.step) ? data.step : null,
          text: `${previous}${chunk.text}`.slice(0, MAX_DRAFT_TEXT),
          truncated: previous.length + chunk.text.length > MAX_DRAFT_TEXT
        }
      }
    }
    if (frame.type === 'session/event' && ['assistant/message', 'turn/end'].includes(frame.event?.type)) {
      this.draft = null
    }
    const activity = activityFromFrame(frame)
    if (activity) {
      if (frame.event?.type === 'turn/start' || frame.event?.type === 'turn/end') {
        this.activities = [activity]
      } else {
        this.activities = [...this.activities.filter((item) => item.id !== activity.id), activity].slice(-MAX_ACTIVITY)
      }
    }
  }

  snapshot() {
    const interactions = [...this.pending.values()].map((item) => item.public)
      .sort((a, b) => Number(b.kind === 'question' || b.kind === 'plan-review') - Number(a.kind === 'question' || a.kind === 'plan-review'))
    return copy({ status: this.status, error: this.error, activities: this.activities, interactions, draft: this.draft, queue: this.queue })
  }

  reconcileRunning(running) {
    if (running) return
    this.draft = null
    this.queue = queueSummary([])
    this.activities = this.activities.filter((item) => item.state !== 'working')
    this.pending.clear()
    this.clearInteractionTimer()
  }

  async respond({ interactionId, action, answers }) {
    const interaction = this.pending.get(String(interactionId || ''))
    if (!interaction) throw new Error('这个决定已经失效或被其他窗口处理。请刷新任务状态。')
    if (interaction.public.responding) throw new Error('这个决定正在提交，请稍候。')
    let value
    if (interaction.public.kind === 'approval') {
      if (!['allow', 'reject'].includes(action)) throw new Error('请选择允许一次或拒绝。')
      value = {
        sessionId: this.sessionId,
        approvalId: interaction.internal.approvalId,
        outcome: action === 'allow' ? 'allowed-once' : 'rejected'
      }
    } else {
      value = {
        sessionId: this.sessionId,
        answer: { answers: validateQuestionAnswers(interaction, answers) }
      }
    }
    interaction.public.responding = true
    // A submission is user activity and must win the race against the idle
    // timeout. Re-arm only when the Engine rejects a still-pending response.
    this.clearInteractionTimer()
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/api/respond`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'client-response', rpcId: interaction.internal.rpcId, result: { ok: true, value } })
      })
      if (!response.ok) throw new Error(`Engine 拒绝了响应（HTTP ${response.status}）。`)
      const receipt = await response.json()
      if (receipt?.accepted !== true) {
        if (receipt?.reason === 'not-pending') {
          this.pending.delete(interaction.public.id)
          const error = new Error('这个问题已不再处于等待状态；你的回答没有被发送。Deep code 会刷新任务并提供恢复指引。')
          error.code = 'INTERACTION_NOT_PENDING'
          throw error
        }
        const reason = receipt?.reason === 'bad-response' ? 'Harness 判定回答格式与当前问题不匹配' : 'Harness 没有返回可识别的确认'
        throw new Error(`Engine 没有确认收到这个决定：${reason}。`)
      }
      return { accepted: true }
    } catch (error) {
      if (this.pending.has(interaction.public.id)) {
        interaction.public.responding = false
        this.syncInteractionTimer()
      }
      throw error
    }
  }

  close() {
    this.closed = true
    this.connectionId += 1
    this.status = 'closed'
    this.pending.clear()
    this.clearInteractionTimer()
    this.draft = null
    this.queue = queueSummary([])
    if (this.retryTimer) this.clearTimeoutImpl(this.retryTimer)
    this.retryTimer = null
    const socket = this.socket
    this.socket = null
    if (socket && (socket.readyState === 0 || socket.readyState === 1)) socket.close()
  }
}

module.exports = {
  DshLiveSession,
  activityFromFrame,
  localMuxUrl,
  normalizeInteraction,
  queueSummary,
  validateQuestionAnswers
}
