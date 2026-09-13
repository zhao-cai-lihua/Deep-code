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
