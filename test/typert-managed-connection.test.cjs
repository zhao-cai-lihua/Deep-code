const test = require('node:test')
const assert = require('node:assert/strict')

const {
  TYPERT_015_CANDIDATE_PROFILE,
  assertTypertCandidateRuntime,
  observeManagedTypertLaunch
} = require('../src/typert-managed-connection.cjs')

const exactRuntime = Object.freeze({
  official: true,
  tag: 'dsh-v0.1.5-rc.2',
  version: '0.1.5-rc.2',
  revision: 'fb2c4b9e698e30edb738bca4cf0618587db7d203'
})

class FakeWebSocket {
  constructor() {
    this.readyState = 0
    this.sent = []
    this.closed = false
    this.listeners = new Map()
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener)
  }

  send(value) {
    this.sent.push(JSON.parse(value))
  }

  close() {
    this.closed = true
    this.readyState = 3
  }

  emit(type, event = {}) {
    if (type === 'open') this.readyState = 1
    if (type === 'close') this.readyState = 3
    for (const listener of this.listeners.get(type) || []) listener(event)
  }

  frame(frame) {
    this.emit('message', { data: JSON.stringify(frame) })
  }
}

function authenticatedConnection({
  generation = 20,
  currentGeneration = () => generation,
  webSocketFactory,
  randomUUID = () => 'stream-fixed'
} = {}) {
  const observed = observeManagedTypertLaunch(
    'dsh web: http://127.0.0.1:49152/?token=stream-launch-canary',
    {
      runtime: exactRuntime,
      generation,
      isGenerationCurrent: value => value === currentGeneration(),
      randomUUID,
      webSocketFactory,
      fetchImpl: async () => ({
        status: 303,
        headers: { get: name => ({ location: '/', 'set-cookie': 'dsh_session=stream-cookie-canary; HttpOnly' })[name.toLowerCase()] || null }
      })
    }
  )
  return observed.connection.authenticate().then(() => observed.connection)
}

test('recognizes only the exact audited 0.1.5 candidate identity without enabling it', () => {
  assert.equal(assertTypertCandidateRuntime(exactRuntime), TYPERT_015_CANDIDATE_PROFILE)
  for (const changed of [
    { ...exactRuntime, official: false },
    { ...exactRuntime, tag: 'master' },
    { ...exactRuntime, version: '0.1.5-rc.3' },
    { ...exactRuntime, revision: 'fb2c4b9e' }
  ]) {
    assert.throws(() => assertTypertCandidateRuntime(changed), /精确审核身份/)
  }
  assert.equal(TYPERT_015_CANDIDATE_PROFILE.status, 'candidate')
})

test('turns one owned 0.1.5 launch announcement into a secret-free connection candidate', () => {
  const launchToken = 'launch-canary-value'
  const observation = observeManagedTypertLaunch(
    `dsh web: http://127.0.0.1:49152/?token=${launchToken}`,
    { runtime: exactRuntime, generation: 7, fetchImpl: async () => { throw new Error('not called') } }
  )

  assert.equal(observation.diagnosticLine, 'dsh web: http://127.0.0.1:49152/?token=[redacted]')
  assert.deepEqual(observation.connection.snapshot(), {
    profile: TYPERT_015_CANDIDATE_PROFILE,
    generation: 7,
    baseUrl: 'http://127.0.0.1:49152',
    state: 'awaiting-auth'
  })
  assert.doesNotMatch(JSON.stringify(observation), new RegExp(launchToken))
  assert.doesNotMatch(JSON.stringify(observation.connection.snapshot()), new RegExp(launchToken))
})

test('redacts token-shaped output even when it is not an admissible managed announcement', () => {
  const launchToken = 'rejected-canary-value'
  const observation = observeManagedTypertLaunch(
    `unrelated http://example.test/?token=${launchToken}`,
    { generation: 1, fetchImpl: async () => ({}) }
  )

  assert.equal(observation.connection, null)
  assert.doesNotMatch(observation.diagnosticLine, new RegExp(launchToken))
  assert.match(observation.diagnosticLine, /token=\[redacted\]/)
})

test('rejects a non-loopback launch URL without echoing its token', () => {
  const launchToken = 'remote-canary-value'
  let caught
  try {
    observeManagedTypertLaunch(
      `dsh web: http://192.0.2.10:49152/?token=${launchToken}`,
      { runtime: exactRuntime, generation: 2, fetchImpl: async () => ({}) }
    )
  } catch (error) {
    caught = error
  }

  assert.ok(caught)
  assert.match(caught.message, /回环地址/)
  assert.doesNotMatch(caught.message, new RegExp(launchToken))
})

test('exchanges the launch token once and makes a correlated Typert RPC with the ephemeral cookie', async () => {
  const launchToken = 'launch-token-canary'
  const cookie = '__HostLike=browser-cookie-canary'
  const requests = []
  const fetchImpl = async (input, init) => {
    requests.push({ input: String(input), init })
    if (requests.length === 1) {
      return {
        status: 303,
        headers: { get: (name) => ({ location: '/', 'set-cookie': `${cookie}; Path=/; HttpOnly; SameSite=Strict` })[name.toLowerCase()] || null }
      }
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ rpcId: 'rpc-fixed', result: { ok: true, value: { groups: [] } } })
    }
  }
  const { connection } = observeManagedTypertLaunch(
    `dsh web: http://127.0.0.1:49152/?token=${launchToken}`,
    { runtime: exactRuntime, generation: 9, fetchImpl, randomUUID: () => 'rpc-fixed' }
  )

  await connection.authenticate()
  assert.equal(connection.snapshot().state, 'authenticated')
  const result = await connection.call('session/modelCatalog', {})

  assert.deepEqual(result, { ok: true, value: { groups: [] } })
  assert.equal(requests.length, 2)
  assert.equal(requests[0].input, `http://127.0.0.1:49152/?token=${launchToken}`)
  assert.deepEqual(requests[0].init, { method: 'GET', redirect: 'manual' })
  assert.equal(requests[1].input, 'http://127.0.0.1:49152/api/session/modelCatalog')
  assert.equal(requests[1].init.method, 'POST')
  assert.equal(requests[1].init.headers.cookie, cookie)
  assert.equal(requests[1].init.headers.authorization, undefined)
  assert.deepEqual(JSON.parse(requests[1].init.body), {
    type: 'client-request',
    rpcId: 'rpc-fixed',
    method: 'session/modelCatalog',
    payload: { args: {} }
  })
  assert.doesNotMatch(requests[1].input + requests[1].init.body, new RegExp(launchToken))
  assert.doesNotMatch(JSON.stringify(connection.snapshot()), /canary/)
})

test('invalidates authentication and RPC use when its connection generation is no longer current', async () => {
  let currentGeneration = 12
  let fetchCount = 0
  const { connection } = observeManagedTypertLaunch(
    'dsh web: http://127.0.0.1:49152/?token=generation-secret-canary',
    {
      generation: 12,
      runtime: exactRuntime,
      isGenerationCurrent: (generation) => generation === currentGeneration,
      randomUUID: () => 'unused-rpc',
      fetchImpl: async () => {
        fetchCount += 1
        return {
          status: 303,
          headers: { get: (name) => ({ location: '/', 'set-cookie': 'dsh_session=cookie-secret-canary; HttpOnly' })[name.toLowerCase()] || null }
        }
      }
    }
  )

  await connection.authenticate()
  currentGeneration = 13
  await assert.rejects(connection.call('session/modelCatalog', {}), /generation/)
  assert.equal(fetchCount, 1)
  assert.equal(connection.snapshot().state, 'stale')
  assert.doesNotMatch(JSON.stringify(connection.snapshot()), /secret-canary/)
})

test('disposal irreversibly closes a candidate without exposing authentication material', async () => {
  const { connection } = observeManagedTypertLaunch(
    'dsh web: http://127.0.0.1:49152/?token=dispose-launch-canary',
    {
      generation: 3,
      runtime: exactRuntime,
      fetchImpl: async () => ({
        status: 303,
        headers: { get: (name) => ({ location: '/', 'set-cookie': 'dsh_session=dispose-cookie-canary; HttpOnly' })[name.toLowerCase()] || null }
      })
    }
  )

  await connection.authenticate()
  connection.dispose()
  assert.equal(connection.snapshot().state, 'disposed')
  await assert.rejects(connection.call('session/modelCatalog', {}), /失效/)
  assert.doesNotMatch(JSON.stringify(connection), /canary/)
})

test('does not create a connection candidate without the exact audited runtime identity', () => {
  assert.throws(() => observeManagedTypertLaunch(
    'dsh web: http://127.0.0.1:49152/?token=identity-canary',
    { generation: 1, fetchImpl: async () => ({}) }
  ), /精确审核身份/)
})

test('admits the official internal Remote Event result endpoint but rejects legacy dot endpoints', async () => {
  const requests = []
  const { connection } = observeManagedTypertLaunch(
    'dsh web: http://127.0.0.1:49152/?token=event-launch-canary',
    {
      runtime: exactRuntime,
      generation: 4,
      randomUUID: () => 'event-rpc',
      fetchImpl: async (input, init) => {
        requests.push({ input: String(input), init })
        if (requests.length === 1) {
          return {
            status: 303,
            headers: { get: (name) => ({ location: '/', 'set-cookie': 'dsh_session=event-cookie-canary; HttpOnly' })[name.toLowerCase()] || null }
          }
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ rpcId: 'event-rpc', result: { ok: true } })
        }
      }
    }
  )

  await connection.authenticate()
  assert.deepEqual(await connection.call('$events/result', { eventId: 'event-1' }), { ok: true })
  await assert.rejects(connection.call('session.prompt', {}), /endpoint/)
  assert.equal(requests.length, 2)
  assert.equal(requests[1].input, 'http://127.0.0.1:49152/api/$events/result')
})

test('opens one authenticated Remote mux stream and yields only correlated items', async () => {
  const socket = new FakeWebSocket()
  const factories = []
  const connection = await authenticatedConnection({
    webSocketFactory: options => {
      factories.push(options)
      return socket
    }
  })
  const abort = new AbortController()
  const iterator = connection.open('$events', {}, { signal: abort.signal })[Symbol.asyncIterator]()
  const first = iterator.next()

  assert.deepEqual(factories, [{
    url: 'ws://127.0.0.1:49152/api/remote.mux',
    headers: { cookie: 'dsh_session=stream-cookie-canary' }
  }])
  socket.emit('open')
  assert.deepEqual(socket.sent, [{
    type: 'open', streamId: 'stream-fixed', endpoint: '$events', payload: { args: {} }
  }])
  socket.frame({ type: 'item', streamId: 'another-stream', value: { type: 'wrong' } })
  socket.frame({ type: 'item', streamId: 'stream-fixed', value: { type: 'ready', clientId: 'client-1', host: { home: 'C:\\Users\\tester' } } })

  assert.deepEqual(await first, {
    done: false,
    value: { type: 'ready', clientId: 'client-1', host: { home: 'C:\\Users\\tester' } }
  })
  await iterator.return()
  assert.deepEqual(socket.sent[1], { type: 'cancel', streamId: 'stream-fixed' })
  assert.equal(socket.closed, true)
  assert.doesNotMatch(JSON.stringify(connection.snapshot()), /canary/)
})

test('turns a correlated Remote stream error into a bounded secret-free failure', async () => {
  const socket = new FakeWebSocket()
  const connection = await authenticatedConnection({ webSocketFactory: () => socket })
  const iterator = connection.open('session/follow', {
    request: { address: { kind: 'session', sessionId: 'session-safe' }, assistantStream: true }
  })[Symbol.asyncIterator]()
  const first = iterator.next()
  socket.emit('open')
  socket.frame({
    type: 'error',
    streamId: 'stream-fixed',
    error: { code: 'session/not-found', message: 'not found', details: { internal: 'hidden-canary' } }
  })

  await assert.rejects(first, error => {
    assert.match(error.message, /session\/follow.*session\/not-found.*not found/)
    assert.doesNotMatch(error.message, /hidden-canary/)
    return true
  })
  assert.equal(socket.closed, true)
})

test('disposal cancels active streams and stale generations cannot consume later frames', async () => {
  let generation = 30
  const socket = new FakeWebSocket()
  const connection = await authenticatedConnection({
    generation,
    currentGeneration: () => generation,
    webSocketFactory: () => socket
  })
  const iterator = connection.open('$events', {})[Symbol.asyncIterator]()
  const first = iterator.next()
  socket.emit('open')
  generation = 31
  socket.frame({ type: 'item', streamId: 'stream-fixed', value: { type: 'ready', clientId: 'late-client' } })

  await assert.rejects(first, /generation/)
  assert.equal(socket.closed, true)
  assert.equal(connection.snapshot().state, 'stale')

  const secondSocket = new FakeWebSocket()
  const second = await authenticatedConnection({ generation: 40, webSocketFactory: () => secondSocket })
  const waiting = second.open('$events', {})[Symbol.asyncIterator]().next()
  secondSocket.emit('open')
  second.dispose()
  await assert.rejects(waiting, /失效/)
  assert.equal(secondSocket.closed, true)
})
