const { randomUUID: nodeRandomUUID } = require('node:crypto')

const TYPERT_015_CANDIDATE_PROFILE = Object.freeze({
  protocol: 'typert-0.1.5',
  tag: 'dsh-v0.1.5-rc.2',
  version: '0.1.5-rc.2',
  revision: 'fb2c4b9e698e30edb738bca4cf0618587db7d203',
  status: 'candidate'
})

const TOKEN_QUERY = /([?&]token=)[^&\s)]+/gi
const ANNOUNCEMENT = /^dsh web:\s+(https?:\/\/[^\s)]+)/

function redactLaunchTokens(value) {
  return String(value).replace(TOKEN_QUERY, '$1[redacted]')
}

function assertTypertCandidateRuntime(runtime) {
  const exact = runtime?.official === true
    && runtime.tag === TYPERT_015_CANDIDATE_PROFILE.tag
    && runtime.version === TYPERT_015_CANDIDATE_PROFILE.version
    && runtime.revision === TYPERT_015_CANDIDATE_PROFILE.revision
  if (!exact) throw new Error('新版 Engine runtime 不符合 0.1.5 候选的精确审核身份。')
  return TYPERT_015_CANDIDATE_PROFILE
}

class ManagedTypertConnection {
  #activeStreams = new Set()
  #cookie = null
  #fetchImpl
  #isGenerationCurrent
  #launchUrl
  #randomUUID
  #webSocketFactory

  constructor({ baseUrl, launchUrl, generation, fetchImpl, isGenerationCurrent, randomUUID, webSocketFactory }) {
    this.baseUrl = baseUrl
    this.generation = generation
    this.state = 'awaiting-auth'
    this.#launchUrl = launchUrl
    this.#fetchImpl = fetchImpl
    this.#isGenerationCurrent = isGenerationCurrent
    this.#randomUUID = randomUUID
    this.#webSocketFactory = webSocketFactory
  }

  snapshot() {
    return Object.freeze({
      profile: TYPERT_015_CANDIDATE_PROFILE,
      generation: this.generation,
      baseUrl: this.baseUrl,
      state: this.state
    })
  }

  async authenticate() {
    this.#assertCurrent()
    if (this.state === 'authenticated') return this.snapshot()
    if (this.state !== 'awaiting-auth' || !this.#launchUrl) throw new Error('新版 Engine 连接已失效，不能重复认证。')
    let response
    try {
      response = await this.#fetchImpl(this.#launchUrl, { method: 'GET', redirect: 'manual' })
    } catch {
      throw new Error('新版 Engine 的临时认证交换失败。')
    }
    this.#assertCurrent()
    const location = response?.headers?.get?.('location')
    const setCookie = response?.headers?.get?.('set-cookie')
    if (response?.status !== 303 || location !== '/' || typeof setCookie !== 'string') {
      throw new Error('新版 Engine 没有返回预期的浏览器会话。')
    }
    const cookie = setCookie.split(';', 1)[0]?.trim()
    if (!cookie || !/^[^=;\s]+=[^;\r\n]+$/.test(cookie)) {
      throw new Error('新版 Engine 返回的浏览器会话格式无效。')
    }
    this.#cookie = cookie
    this.#launchUrl = null
    this.state = 'authenticated'
    return this.snapshot()
  }

  async call(endpoint, args, { signal } = {}) {
    this.#assertCurrent()
    if (this.state !== 'authenticated' || !this.#cookie) throw new Error('新版 Engine 尚未完成认证。')
    if (!/^(?:\$events|[a-z][A-Za-z0-9_-]*)\/[A-Za-z][A-Za-z0-9_-]*$/.test(String(endpoint))) {
      throw new Error('新版 Engine RPC endpoint 格式无效。')
    }
    const rpcId = this.#randomUUID()
    let response
    try {
      response = await this.#fetchImpl(`${this.baseUrl}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: this.#cookie },
        body: JSON.stringify({ type: 'client-request', rpcId, method: endpoint, payload: { args } }),
        ...(signal === undefined ? {} : { signal })
      })
    } catch {
      throw new Error(`新版 Engine RPC ${endpoint} 连接失败。`)
    }
    this.#assertCurrent()
    if (!response?.ok) throw new Error(`新版 Engine RPC ${endpoint} 返回 HTTP ${response?.status || 'unknown'}。`)
    let body
    try { body = await response.json() } catch { throw new Error(`新版 Engine RPC ${endpoint} 返回了无效 JSON。`) }
    if (body?.rpcId !== rpcId) throw new Error(`新版 Engine RPC ${endpoint} 的请求关联不匹配。`)
    if (!body || !Object.hasOwn(body, 'result')) throw new Error(`新版 Engine RPC ${endpoint} 缺少结果。`)
    return body.result
  }

  open(endpoint, args, { signal } = {}) {
    this.#assertCurrent()
    if (this.state !== 'authenticated' || !this.#cookie) throw new Error('新版 Engine 尚未完成认证。')
    if (!/^(?:\$events|[a-z][A-Za-z0-9_-]*\/[A-Za-z][A-Za-z0-9_-]*)$/.test(String(endpoint))) {
      throw new Error('新版 Engine stream endpoint 格式无效。')
    }
    if (typeof this.#webSocketFactory !== 'function') throw new Error('新版 Engine 连接缺少 WebSocket transport。')
    if (signal !== undefined && !(signal instanceof AbortSignal)) throw new Error('新版 Engine stream signal 无效。')

    const streamId = this.#randomUUID()
    if (typeof streamId !== 'string' || streamId.length === 0) throw new Error('新版 Engine stream 缺少请求 ID。')
    const socketUrl = `${this.baseUrl.replace(/^http:/, 'ws:')}/api/remote.mux`
    let socket
    try {
      socket = this.#webSocketFactory({
        url: socketUrl,
        headers: { cookie: this.#cookie }
      })
    } catch {
      throw new Error(`新版 Engine stream ${endpoint} 连接失败。`)
    }
    if (!socket || typeof socket.addEventListener !== 'function' || typeof socket.removeEventListener !== 'function'
      || typeof socket.send !== 'function' || typeof socket.close !== 'function') {
      throw new Error('新版 Engine WebSocket transport 无效。')
    }

    const queue = []
    let waiter = null
    let terminal = null
    let openSent = false
    let cleaned = false
    const owner = this

    const cleanup = ({ sendCancel = false } = {}) => {
      if (cleaned) return
      cleaned = true
      socket.removeEventListener('open', onOpen)
      socket.removeEventListener('message', onMessage)
      socket.removeEventListener('error', onError)
      socket.removeEventListener('close', onClose)
      signal?.removeEventListener('abort', onAbort)
      owner.#activeStreams.delete(active)
      if (sendCancel && openSent && socket.readyState === 1) {
        try { socket.send(JSON.stringify({ type: 'cancel', streamId })) } catch {}
      }
      try { socket.close() } catch {}
    }
    const settle = () => {
      if (!waiter) return
      if (queue.length > 0) {
        const current = waiter
        waiter = null
        current.resolve({ done: false, value: queue.shift() })
        return
      }
      if (!terminal) return
      const current = waiter
      waiter = null
      if (terminal.error) current.reject(terminal.error)
      else current.resolve({ done: true, value: undefined })
    }
    const finish = () => {
      if (terminal) return
      terminal = { error: null }
      cleanup()
      settle()
    }
    const fail = error => {
      if (terminal) return
      terminal = { error }
      queue.length = 0
      cleanup()
      settle()
    }
    const active = { fail }
    this.#activeStreams.add(active)

    const onOpen = () => {
      try {
        owner.#assertCurrent()
        socket.send(JSON.stringify({ type: 'open', streamId, endpoint, payload: { args } }))
        openSent = true
      } catch (error) {
        fail(error instanceof Error ? error : new Error(`新版 Engine stream ${endpoint} 打开失败。`))
      }
    }
    const onMessage = event => {
      try {
        owner.#assertCurrent()
        const frame = parseRemoteStreamFrame(event?.data)
        if (frame.streamId !== streamId) return
        if (frame.type === 'item') {
          queue.push(frame.value)
          settle()
        } else if (frame.type === 'end') {
          finish()
        } else {
          fail(new Error(`新版 Engine stream ${endpoint} 返回 ${frame.error.code}：${frame.error.message}`))
        }
      } catch (error) {
        fail(error instanceof Error ? error : new Error(`新版 Engine stream ${endpoint} 返回无效数据。`))
      }
    }
    const onError = () => fail(new Error(`新版 Engine stream ${endpoint} 连接失败。`))
    const onClose = () => fail(new Error(`新版 Engine stream ${endpoint} 在终态前关闭。`))
    const onAbort = () => fail(new Error(`新版 Engine stream ${endpoint} 已取消。`))

    socket.addEventListener('open', onOpen)
    socket.addEventListener('message', onMessage)
    socket.addEventListener('error', onError)
    socket.addEventListener('close', onClose)
    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) onAbort()

    return Object.freeze({
      [Symbol.asyncIterator]() { return this },
      next() {
        try { owner.#assertCurrent() } catch (error) { fail(error); return Promise.reject(error) }
        if (queue.length > 0) return Promise.resolve({ done: false, value: queue.shift() })
        if (terminal?.error) return Promise.reject(terminal.error)
        if (terminal) return Promise.resolve({ done: true, value: undefined })
        if (waiter) return Promise.reject(new Error('新版 Engine stream 不允许并发读取。'))
        return new Promise((resolve, reject) => { waiter = { resolve, reject } })
      },
      return() {
        if (!terminal) terminal = { error: null }
        cleanup({ sendCancel: true })
        settle()
        return Promise.resolve({ done: true, value: undefined })
      }
    })
  }

  dispose() {
    this.#invalidate('disposed', new Error('新版 Engine 连接已失效。'))
  }

  #assertCurrent() {
    if (this.state === 'disposed') throw new Error('新版 Engine 连接已失效。')
    if (!this.#isGenerationCurrent(this.generation)) {
      const error = new Error('新版 Engine 连接 generation 已失效。')
      this.#invalidate('stale', error)
      throw error
    }
    if (this.state === 'stale') throw new Error('新版 Engine 连接 generation 已失效。')
  }

  #invalidate(state, error) {
    this.#cookie = null
    this.#launchUrl = null
    this.state = state
    for (const stream of [...this.#activeStreams]) stream.fail(error)
    this.#activeStreams.clear()
  }
}

function parseRemoteStreamFrame(data) {
  let text
  if (typeof data === 'string') text = data
  else if (Buffer.isBuffer(data)) text = data.toString('utf8')
  else if (data instanceof ArrayBuffer) text = Buffer.from(data).toString('utf8')
  else if (ArrayBuffer.isView(data)) text = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8')
  else throw new Error('新版 Engine stream 返回了非文本数据。')

  let frame
  try { frame = JSON.parse(text) } catch { throw new Error('新版 Engine stream 返回了无效 JSON。') }
  if (!frame || typeof frame !== 'object' || Array.isArray(frame)
    || typeof frame.streamId !== 'string' || frame.streamId.length === 0) {
    throw new Error('新版 Engine stream 返回了无效帧。')
  }
  const keys = Object.keys(frame)
  if (frame.type === 'item' && (keys.length === 2 || (keys.length === 3 && Object.hasOwn(frame, 'value')))
    && keys.every(key => ['type', 'streamId', 'value'].includes(key))) return frame
  if (frame.type === 'end' && keys.length === 2 && keys.every(key => ['type', 'streamId'].includes(key))) return frame
  if (frame.type === 'error' && keys.length === 3 && keys.every(key => ['type', 'streamId', 'error'].includes(key))
    && frame.error && typeof frame.error === 'object' && !Array.isArray(frame.error)
    && typeof frame.error.code === 'string' && typeof frame.error.message === 'string') return frame
  throw new Error('新版 Engine stream 返回了无效帧。')
}

function observeManagedTypertLaunch(line, {
  runtime,
  generation,
  fetchImpl,
  isGenerationCurrent = (value) => value === generation,
  randomUUID = nodeRandomUUID,
  webSocketFactory
} = {}) {
  const diagnosticLine = redactLaunchTokens(line)
  const match = String(line).match(ANNOUNCEMENT)
  if (!match) return Object.freeze({ diagnosticLine, connection: null })
  assertTypertCandidateRuntime(runtime)

  let launchUrl
  try {
    launchUrl = new URL(match[1])
  } catch {
    throw new Error('Engine 发布了无效的启动地址。')
  }
  if (launchUrl.protocol !== 'http:' || launchUrl.hostname !== '127.0.0.1' || !launchUrl.port) {
    throw new Error('新版 Engine 启动地址必须是带随机端口的 HTTP 回环地址。')
  }
  const token = launchUrl.searchParams.get('token')
  if (!token || [...launchUrl.searchParams.keys()].some((key) => key !== 'token')) {
    throw new Error('新版 Engine 启动地址缺少唯一的临时认证信息。')
  }
  if (launchUrl.pathname !== '/') throw new Error('新版 Engine 启动地址必须指向认证根路径。')
  if (!Number.isSafeInteger(generation) || generation < 0) throw new Error('新版 Engine 连接缺少有效 generation。')
  if (typeof fetchImpl !== 'function') throw new Error('新版 Engine 连接缺少 HTTP transport。')
  if (typeof isGenerationCurrent !== 'function') throw new Error('新版 Engine 连接缺少 generation 校验器。')
  if (typeof randomUUID !== 'function') throw new Error('新版 Engine 连接缺少请求 ID 生成器。')

  const baseUrl = `${launchUrl.protocol}//${launchUrl.host}`
  const connection = new ManagedTypertConnection({
    baseUrl,
    launchUrl: launchUrl.toString(),
    generation,
    fetchImpl,
    isGenerationCurrent,
    randomUUID,
    webSocketFactory
  })
  return Object.freeze({ diagnosticLine, connection })
}

module.exports = {
  TYPERT_015_CANDIDATE_PROFILE,
  assertTypertCandidateRuntime,
  observeManagedTypertLaunch,
  redactLaunchTokens
}
