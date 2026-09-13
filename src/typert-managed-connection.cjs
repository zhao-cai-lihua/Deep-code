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
  #cookie = null
  #fetchImpl
  #isGenerationCurrent
  #launchUrl
  #randomUUID

  constructor({ baseUrl, launchUrl, generation, fetchImpl, isGenerationCurrent, randomUUID }) {
    this.baseUrl = baseUrl
    this.generation = generation
    this.state = 'awaiting-auth'
    this.#launchUrl = launchUrl
    this.#fetchImpl = fetchImpl
    this.#isGenerationCurrent = isGenerationCurrent
    this.#randomUUID = randomUUID
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

  dispose() {
    this.#cookie = null
    this.#launchUrl = null
    this.state = 'disposed'
  }

  #assertCurrent() {
    if (this.state === 'disposed') throw new Error('新版 Engine 连接已失效。')
    if (!this.#isGenerationCurrent(this.generation)) {
      this.#cookie = null
      this.#launchUrl = null
      this.state = 'stale'
      throw new Error('新版 Engine 连接 generation 已失效。')
    }
    if (this.state === 'stale') throw new Error('新版 Engine 连接 generation 已失效。')
  }
}

function observeManagedTypertLaunch(line, {
  runtime,
  generation,
  fetchImpl,
  isGenerationCurrent = (value) => value === generation,
  randomUUID = nodeRandomUUID
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
    randomUUID
  })
  return Object.freeze({ diagnosticLine, connection })
}

module.exports = {
  TYPERT_015_CANDIDATE_PROFILE,
  assertTypertCandidateRuntime,
  observeManagedTypertLaunch,
  redactLaunchTokens
}
