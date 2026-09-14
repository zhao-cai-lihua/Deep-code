function typertFailure(endpoint, result) {
  const code = typeof result?.error?.code === 'string' ? result.error.code : 'gateway/unknown'
  const message = typeof result?.error?.message === 'string' ? result.error.message : 'Engine 没有返回可用原因。'
  const error = new Error(`新版 Engine ${endpoint} 失败：${code}：${message}`)
  error.code = code
  return error
}

function requireValue(endpoint, result) {
  if (!result || result.ok !== true || !Object.hasOwn(result, 'value')) throw typertFailure(endpoint, result)
  return result.value
}

function asIterator(iterable, endpoint) {
  const iterator = iterable?.[Symbol.asyncIterator]?.()
  if (!iterator || typeof iterator.next !== 'function') throw new Error(`新版 Engine ${endpoint} 没有返回异步事件流。`)
  return iterator
}

async function closeIterator(iterator) {
  try { await iterator.return?.() } catch {}
}

async function nextWithin(iterator, timeoutMs, label) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} 在等待结构化证据时超时。`)), timeoutMs)
    timer.unref?.()
  })
  try { return await Promise.race([iterator.next(), timeout]) } finally { clearTimeout(timer) }
}

function sessionEvent(frame) {
  if (frame?.type !== 'event' || !frame.event || typeof frame.event !== 'object') return null
  return frame.event
}

function isJsonValue(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value) && !Object.is(value, -0)
  if (typeof value !== 'object' || ancestors.has(value)) return false
  ancestors.add(value)
  try {
    if (Array.isArray(value)) return value.every(item => isJsonValue(item, ancestors))
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return false
    return Object.keys(value).every(key => isJsonValue(value[key], ancestors))
  } finally {
    ancestors.delete(value)
  }
}

function validRemoteOutcome(outcome) {
  if (!outcome || typeof outcome !== 'object' || Array.isArray(outcome)) return false
  const keys = Object.keys(outcome)
  if (outcome.kind === 'next') return keys.length === 1
  if (outcome.kind === 'result') {
    return (keys.length === 1 || (keys.length === 2 && Object.hasOwn(outcome, 'value')))
      && (!Object.hasOwn(outcome, 'value') || isJsonValue(outcome.value))
  }
  if (outcome.kind !== 'rejected' || keys.length !== 2 || !outcome.error
    || typeof outcome.error !== 'object' || Array.isArray(outcome.error)) return false
  const error = outcome.error
  return typeof error.name === 'string' && error.name.length > 0
    && typeof error.message === 'string'
    && (error.code === undefined || typeof error.code === 'string')
    && (error.details === undefined || isJsonValue(error.details))
}

class DshAdapterV2 {
  #eventGenerations = new WeakMap()

  constructor({ connection } = {}) {
    if (!connection || typeof connection.snapshot !== 'function' || typeof connection.call !== 'function'
      || typeof connection.open !== 'function' || typeof connection.dispose !== 'function') {
      throw new Error('新版 Engine Adapter 缺少托管连接。')
    }
    this.connection = connection
  }

  connectionSnapshot() {
    return this.connection.snapshot()
  }

  async modelCatalog({ signal } = {}) {
    this.#assertReady()
    const catalog = requireValue('session/modelCatalog', await this.connection.call('session/modelCatalog', {}, { signal }))
    if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)
      || !catalog.default || typeof catalog.default.provider !== 'string' || typeof catalog.default.model !== 'string'
      || !Array.isArray(catalog.routableProviders) || !Array.isArray(catalog.groups) || !Array.isArray(catalog.failures)) {
      throw new Error('新版 Engine session/modelCatalog 返回结构不完整。')
    }
    return catalog
  }

  async createSession({ cwd, sessionId, workspaceId, agentPreset, signal } = {}) {
    this.#assertReady()
    if (typeof cwd !== 'string' || cwd.trim().length === 0) throw new Error('请先选择或创建一个工作区。')
    if (workspaceId !== undefined) throw new Error('新版 Engine 候选阶段只允许用明确的工作区路径创建 Session。')
    const request = {
      cwd,
      ...(sessionId ? { sessionId: String(sessionId) } : {}),
      ...(agentPreset ? { agentPreset: String(agentPreset) } : {})
    }
    const created = requireValue('session/create', await this.connection.call('session/create', { request }, { signal }))
    if (!created || typeof created.sessionId !== 'string' || created.sessionId.length === 0) {
      throw new Error('新版 Engine session/create 没有返回 Session 身份。')
    }
    return created
  }

  async listCommands({ sessionId, signal } = {}) {
    this.#assertReady()
    const agentId = String(sessionId || '')
    if (!agentId) throw new Error('新版 Engine 命令目录缺少 Session 身份。')
    const commands = requireValue('commands/list', await this.connection.call('commands/list', { agentId }, { signal }))
    if (!Array.isArray(commands) || commands.some(command => !command || typeof command.name !== 'string')) {
      throw new Error('新版 Engine commands/list 返回结构不完整。')
    }
    return commands
  }

  async setPlanMode({ sessionId, active, signal, evidenceTimeoutMs = 10_000 } = {}) {
    this.#assertReady()
    const agentId = String(sessionId || '')
    if (!agentId) throw new Error('Plan 模式缺少 Session 身份。')
    if (typeof active !== 'boolean') throw new Error('Plan 模式缺少明确的开关目标。')
    if (!Number.isInteger(evidenceTimeoutMs) || evidenceTimeoutMs < 1 || evidenceTimeoutMs > 30_000) {
      throw new Error('Plan 模式证据等待上限无效。')
    }

    const commands = await this.listCommands({ sessionId: agentId, signal })
    if (!commands.some(command => command.name === 'plan')) {
      throw new Error('当前 Session 没有公布 Plan 命令；Deep Code 不会模拟或改写它。')
    }

    const follow = this.followSession({ sessionId: agentId, signal })[Symbol.asyncIterator]()
    const deadline = Date.now() + evidenceTimeoutMs
    const remaining = () => {
      const value = deadline - Date.now()
      if (value <= 0) throw new Error('Plan 命令在等待结构化证据时超时。')
      return value
    }
    try {
      await nextWithin(follow, remaining(), 'Plan Session 快照')
      const line = active ? '/plan' : '/plan off'
      const execution = requireValue('commands/execute', await this.connection.call('commands/execute', {
        agentId,
        line,
        submittedAttachments: []
      }, { signal }))
      if (!execution || typeof execution.commandId !== 'string' || execution.commandId.length === 0
        || !execution.result || execution.result.kind !== 'success') {
        throw new Error('官方 Plan 命令没有成功结算；Deep Code 不会宣称模式已切换。')
      }

      let runSeq = null
      let modeSeq = null
      let doneSeq = null
      while (runSeq === null || modeSeq === null || doneSeq === null) {
        const next = await nextWithin(follow, remaining(), 'Plan 命令')
        if (next.done) break
        const event = sessionEvent(next.value)
        if (!event || !Number.isInteger(event.seq)) continue
        if (event.type === 'command/run' && event.data?.commandId === execution.commandId
          && event.data?.name === 'plan') runSeq = event.seq
        if (runSeq !== null && event.seq > runSeq && event.type === 'plan/mode'
          && event.data?.active === active) modeSeq = event.seq
        if (runSeq !== null && event.seq > runSeq && event.type === 'command/done'
          && event.data?.commandId === execution.commandId && event.data?.kind === 'success') doneSeq = event.seq
      }
      if (runSeq === null || modeSeq === null || doneSeq === null) {
        throw new Error('官方命令已返回，但 Deep Code 没有同时确认 command/run、command/done 与 plan/mode 证据。')
      }
      return {
        active,
        commandId: execution.commandId,
        commandResult: execution.result,
        evidenceSeqs: [runSeq, modeSeq, doneSeq].sort((left, right) => left - right)
      }
    } finally {
      await closeIterator(follow)
    }
  }

  async openEventGeneration({ sessionId, signal } = {}) {
    this.#assertReady()
    const expectedSessionId = String(sessionId || '')
    if (!expectedSessionId) throw new Error('新版 Engine Remote Event generation 缺少 Session 身份。')
    const iterator = asIterator(this.connection.open('$events', {}, { signal }), '$events')
    let first
    try { first = await iterator.next() } catch (error) { await closeIterator(iterator); throw error }
    const ready = first?.value
    if (first?.done || !ready || ready.type !== 'ready' || typeof ready.clientId !== 'string'
      || ready.clientId.length === 0 || !ready.host || typeof ready.host.home !== 'string') {
      await closeIterator(iterator)
      throw new Error('新版 Engine $events 没有返回完整的 ready 首项。')
    }
    const state = { iterator, sessionId: expectedSessionId, pending: new Set(), closed: false }
    const stream = Object.freeze({
      [Symbol.asyncIterator]() { return this },
      async next() {
        const next = await iterator.next()
        if (next.done) {
          state.closed = true
          state.pending.clear()
          return next
        }
        const frame = next.value
        if (frame?.type === 'waterfall' && frame.agentId === expectedSessionId
          && typeof frame.eventId === 'string' && frame.eventId.length > 0) {
          state.pending.add(frame.eventId)
        } else if (frame?.type === 'cancel' && typeof frame.eventId === 'string') {
          state.pending.delete(frame.eventId)
        }
        return next
      },
      async return() {
        state.closed = true
        state.pending.clear()
        await closeIterator(iterator)
        return { done: true, value: undefined }
      }
    })
    const generation = Object.freeze({
      generation: this.connection.snapshot().generation,
      sessionId: expectedSessionId,
      clientId: ready.clientId,
      host: Object.freeze({ home: ready.host.home }),
      stream
    })
    this.#eventGenerations.set(generation, state)
    return generation
  }

  async answerRemoteEvent({ eventGeneration, eventId, outcome, signal } = {}) {
    this.#assertReady()
    const state = this.#eventGenerations.get(eventGeneration)
    if (!state) throw new Error('这条 Remote Event 不属于当前 Adapter 连接。')
    if (eventGeneration.generation !== this.connection.snapshot().generation) {
      throw new Error('这条 Remote Event 的 connection generation 已失效。')
    }
    const exactEventId = String(eventId || '')
    if (!exactEventId || state.closed || !state.pending.has(exactEventId)) {
      throw new Error('这条 Remote Event 已取消、已回答或不再可用。')
    }
    if (!validRemoteOutcome(outcome)) throw new Error('Remote Event 回答格式无效。')
    const result = await this.connection.call('$events/result', {
      clientId: eventGeneration.clientId,
      eventId: exactEventId,
      outcome
    }, { signal })
    if (!result || result.ok !== true) throw typertFailure('$events/result', result)
    state.pending.delete(exactEventId)
    return { answered: true }
  }

  followSession({ sessionId, signal } = {}) {
    this.#assertReady()
    const expectedSessionId = String(sessionId || '')
    if (!expectedSessionId) throw new Error('新版 Engine Session follow 缺少 Session 身份。')
    const iterator = asIterator(this.connection.open('session/follow', {
      request: {
        address: { kind: 'session', sessionId: expectedSessionId },
        assistantStream: true
      }
    }, { signal }), 'session/follow')

    return (async function* () {
      try {
        const first = await iterator.next()
        if (first.done || first.value?.type !== 'snapshot' || first.value?.header?.id !== expectedSessionId) {
          throw new Error('新版 Engine session/follow 的 Session 身份不匹配。')
        }
        yield first.value
        while (true) {
          const next = await iterator.next()
          if (next.done) return
          yield next.value
        }
      } finally {
        await closeIterator(iterator)
      }
    })()
  }

  dispose() {
    this.connection.dispose()
  }

  #assertReady() {
    if (this.connection.snapshot()?.state !== 'authenticated') {
      throw new Error('新版 Engine 尚未完成认证。')
    }
  }
}

module.exports = { DshAdapterV2, requireValue, typertFailure }
