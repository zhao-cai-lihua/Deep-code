const test = require('node:test')
const assert = require('node:assert/strict')

const { DshAdapterV2 } = require('../src/dsh-adapter-v2.cjs')

function streamOf(...values) {
  return (async function* () {
    for (const value of values) yield value
  })()
}

test('maps catalog and empty Session creation to exact Typert slash calls', async () => {
  const calls = []
  const connection = {
    snapshot: () => ({ state: 'authenticated', generation: 5 }),
    call: async (endpoint, args) => {
      calls.push({ endpoint, args })
      if (endpoint === 'session/modelCatalog') {
        return { ok: true, value: { default: { provider: 'p', model: 'm' }, routableProviders: ['p'], groups: [], failures: [] } }
      }
      return { ok: true, value: { sessionId: 'session-new' } }
    },
    open: () => { throw new Error('not used') },
    dispose: () => {}
  }
  const adapter = new DshAdapterV2({ connection })

  assert.deepEqual(await adapter.modelCatalog(), {
    default: { provider: 'p', model: 'm' }, routableProviders: ['p'], groups: [], failures: []
  })
  assert.deepEqual(await adapter.createSession({ cwd: 'C:\\work' }), { sessionId: 'session-new' })
  assert.deepEqual(calls, [
    { endpoint: 'session/modelCatalog', args: {} },
    { endpoint: 'session/create', args: { request: { cwd: 'C:\\work' } } }
  ])
})

test('rejects failed Typert results without exposing arbitrary error details', async () => {
  const connection = {
    snapshot: () => ({ state: 'authenticated' }),
    call: async () => ({
      ok: false,
      error: { code: 'session/unavailable', message: 'Session unavailable', details: { secret: 'details-canary' } }
    }),
    open: () => { throw new Error('not used') },
    dispose: () => {}
  }
  const adapter = new DshAdapterV2({ connection })

  await assert.rejects(adapter.createSession({ cwd: 'C:\\work' }), error => {
    assert.match(error.message, /session\/create.*session\/unavailable.*Session unavailable/)
    assert.doesNotMatch(error.message, /details-canary/)
    assert.equal(error.code, 'session/unavailable')
    return true
  })
})

test('binds the event generation to an exact ready opening and preserves the remaining stream', async () => {
  const event = { type: 'emit', event: 'api-session/status', args: ['session-a', true] }
  const connection = {
    snapshot: () => ({ state: 'authenticated', generation: 8 }),
    call: async () => ({ ok: true, value: {} }),
    open: (endpoint, args) => {
      assert.equal(endpoint, '$events')
      assert.deepEqual(args, {})
      return streamOf(
        { type: 'ready', clientId: 'client-8', host: { home: 'C:\\Users\\tester' } },
        event
      )
    },
    dispose: () => {}
  }
  const adapter = new DshAdapterV2({ connection })
  const generation = await adapter.openEventGeneration({ sessionId: 'session-a' })

  assert.deepEqual({ clientId: generation.clientId, host: generation.host }, {
    clientId: 'client-8', host: { home: 'C:\\Users\\tester' }
  })
  assert.deepEqual(await generation.stream.next(), { done: false, value: event })
})

test('fails closed when event ready or Session follow identity does not match', async () => {
  const returns = []
  const connection = {
    snapshot: () => ({ state: 'authenticated' }),
    call: async () => ({ ok: true, value: {} }),
    open: endpoint => {
      const iterator = endpoint === '$events'
        ? streamOf({ type: 'emit', event: 'not-ready', args: [] })[Symbol.asyncIterator]()
        : streamOf({ type: 'snapshot', header: { id: 'session-b' }, cursor: 0, records: [] })[Symbol.asyncIterator]()
      const originalReturn = iterator.return?.bind(iterator)
      iterator.return = async () => {
        returns.push(endpoint)
        return originalReturn ? originalReturn() : { done: true }
      }
      return { [Symbol.asyncIterator]: () => iterator }
    },
    dispose: () => {}
  }
  const adapter = new DshAdapterV2({ connection })

  await assert.rejects(adapter.openEventGeneration(), /缺少 Session 身份/)
  await assert.rejects(adapter.openEventGeneration({ sessionId: 'session-a' }), /ready/)
  const follow = adapter.followSession({ sessionId: 'session-a' })[Symbol.asyncIterator]()
  await assert.rejects(follow.next(), /Session 身份不匹配/)
  assert.deepEqual(returns, ['$events', 'session/follow'])
})

test('refuses use unless the managed connection reports authenticated state', () => {
  const adapter = new DshAdapterV2({
    connection: {
      snapshot: () => ({ state: 'awaiting-auth' }),
      call: async () => ({ ok: true, value: {} }),
      open: () => streamOf(),
      dispose: () => {}
    }
  })

  assert.throws(() => adapter.followSession({ sessionId: 'session-a' }), /尚未完成认证/)
})

test('switches Plan through a bare command and returns only matched structured evidence', async () => {
  const calls = []
  const commandId = 'command-plan-1'
  const connection = {
    snapshot: () => ({ state: 'authenticated', generation: 9 }),
    call: async (endpoint, args) => {
      calls.push({ endpoint, args })
      if (endpoint === 'commands/list') return { ok: true, value: [{ name: 'plan', description: 'Plan' }] }
      if (endpoint === 'commands/execute') {
        return { ok: true, value: { commandId, result: { kind: 'success', text: 'Plan mode on.' } } }
      }
      throw new Error(`unexpected ${endpoint}`)
    },
    open: () => streamOf(
      { type: 'snapshot', header: { id: 'session-a' }, cursor: 4, records: [] },
      { type: 'event', event: { type: 'command/run', seq: 5, data: { commandId, name: 'plan', args: '', source: { kind: 'user' } } } },
      { type: 'event', event: { type: 'plan/mode', seq: 6, data: { active: true } } },
      { type: 'event', event: { type: 'command/done', seq: 7, data: { commandId, kind: 'success' } } }
    ),
    dispose: () => {}
  }
  const adapter = new DshAdapterV2({ connection })

  const result = await adapter.setPlanMode({ sessionId: 'session-a', active: true })

  assert.deepEqual(calls, [
    { endpoint: 'commands/list', args: { agentId: 'session-a' } },
    { endpoint: 'commands/execute', args: { agentId: 'session-a', line: '/plan', submittedAttachments: [] } }
  ])
  assert.deepEqual(result, {
    active: true,
    commandId,
    commandResult: { kind: 'success', text: 'Plan mode on.' },
    evidenceSeqs: [5, 6, 7]
  })
})

test('does not claim Plan when the command is absent or structured mode evidence is missing', async () => {
  let executeCount = 0
  const absent = new DshAdapterV2({
    connection: {
      snapshot: () => ({ state: 'authenticated' }),
      call: async () => ({ ok: true, value: [{ name: 'compact' }] }),
      open: () => streamOf(),
      dispose: () => {}
    }
  })
  await assert.rejects(absent.setPlanMode({ sessionId: 'session-a', active: true }), /没有公布 Plan/)

  const missingEvidence = new DshAdapterV2({
    connection: {
      snapshot: () => ({ state: 'authenticated' }),
      call: async endpoint => {
        if (endpoint === 'commands/list') return { ok: true, value: [{ name: 'plan' }] }
        executeCount += 1
        return { ok: true, value: { commandId: 'command-2', result: { kind: 'success' } } }
      },
      open: () => streamOf(
        { type: 'snapshot', header: { id: 'session-a' }, cursor: 0, records: [] },
        { type: 'event', event: { type: 'command/run', seq: 1, data: { commandId: 'command-2', name: 'plan' } } },
        { type: 'event', event: { type: 'command/done', seq: 2, data: { commandId: 'command-2', kind: 'success' } } }
      ),
      dispose: () => {}
    }
  })
  await assert.rejects(
    missingEvidence.setPlanMode({ sessionId: 'session-a', active: true, evidenceTimeoutMs: 50 }),
    /没有同时确认.*plan\/mode/
  )
  assert.equal(executeCount, 1)
})

test('answers only a same-Session waterfall observed on the exact live event generation and rejects replay', async () => {
  const calls = []
  const connection = {
    snapshot: () => ({ state: 'authenticated', generation: 11 }),
    call: async (endpoint, args) => {
      calls.push({ endpoint, args })
      return { ok: true }
    },
    open: () => streamOf(
      { type: 'ready', clientId: 'client-11', host: { home: 'C:\\Users\\tester' } },
      {
        type: 'waterfall',
        event: 'user-questions/request',
        eventId: 'event-foreign',
        agentId: 'session-b',
        request: { questions: [{ id: 'foreign' }] }
      },
      {
        type: 'waterfall',
        event: 'user-questions/request',
        eventId: 'event-11',
        agentId: 'session-a',
        request: { questions: [{ id: 'choice' }] }
      }
    ),
    dispose: () => {}
  }
  const adapter = new DshAdapterV2({ connection })
  const generation = await adapter.openEventGeneration({ sessionId: 'session-a' })
  assert.equal((await generation.stream.next()).value.eventId, 'event-foreign')
  await assert.rejects(adapter.answerRemoteEvent({
    eventGeneration: generation,
    eventId: 'event-foreign',
    outcome: { kind: 'next' }
  }), /不再可用/)
  assert.equal((await generation.stream.next()).value.eventId, 'event-11')

  assert.deepEqual(await adapter.answerRemoteEvent({
    eventGeneration: generation,
    eventId: 'event-11',
    outcome: { kind: 'result', value: { answers: { choice: 'yes' } } }
  }), { answered: true })
  assert.deepEqual(calls, [{
    endpoint: '$events/result',
    args: {
      clientId: 'client-11',
      eventId: 'event-11',
      outcome: { kind: 'result', value: { answers: { choice: 'yes' } } }
    }
  }])
  await assert.rejects(adapter.answerRemoteEvent({
    eventGeneration: generation,
    eventId: 'event-11',
    outcome: { kind: 'next' }
  }), /不再可用/)
  assert.equal(calls.length, 1)
})

test('refuses invented, unobserved, cancelled, and stale Remote Event correlations', async () => {
  let generationId = 12
  let callCount = 0
  const connection = {
    snapshot: () => ({ state: 'authenticated', generation: generationId }),
    call: async () => { callCount += 1; return { ok: true } },
    open: () => streamOf(
      { type: 'ready', clientId: 'client-12', host: { home: 'C:\\Users\\tester' } },
      { type: 'waterfall', event: 'approval/request', eventId: 'event-cancelled', agentId: 'session-a', request: {} },
      { type: 'cancel', eventId: 'event-cancelled' }
    ),
    dispose: () => {}
  }
  const adapter = new DshAdapterV2({ connection })
  const current = await adapter.openEventGeneration({ sessionId: 'session-a' })

  await assert.rejects(adapter.answerRemoteEvent({
    eventGeneration: {}, eventId: 'invented', outcome: { kind: 'next' }
  }), /不属于当前 Adapter/)
  await assert.rejects(adapter.answerRemoteEvent({
    eventGeneration: current, eventId: 'not-observed', outcome: { kind: 'next' }
  }), /不再可用/)
  await current.stream.next()
  await current.stream.next()
  await assert.rejects(adapter.answerRemoteEvent({
    eventGeneration: current, eventId: 'event-cancelled', outcome: { kind: 'next' }
  }), /不再可用/)
  generationId = 13
  await assert.rejects(adapter.answerRemoteEvent({
    eventGeneration: current, eventId: 'event-cancelled', outcome: { kind: 'next' }
  }), /generation/)
  assert.equal(callCount, 0)
})
