const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const { CandidateSessionLab } = require('../src/candidate-session-lab.cjs')

function pendingStream() {
  const pending = Promise.withResolvers()
  return {
    [Symbol.asyncIterator]() { return this },
    next: () => pending.promise,
    async return() {
      pending.resolve({ done: true, value: undefined })
      return { done: true, value: undefined }
    }
  }
}

function pushStream() {
  const queued = []
  const waiters = []
  let closed = false
  return {
    [Symbol.asyncIterator]() { return this },
    next() {
      if (queued.length) return Promise.resolve({ done: false, value: queued.shift() })
      if (closed) return Promise.resolve({ done: true, value: undefined })
      return new Promise(resolve => waiters.push(resolve))
    },
    push(value) {
      const waiter = waiters.shift()
      if (waiter) waiter({ done: false, value })
      else queued.push(value)
    },
    async return() {
      closed = true
      while (waiters.length) waiters.shift()({ done: true, value: undefined })
      return { done: true, value: undefined }
    }
  }
}

async function waitFor(assertion, timeoutMs = 500) {
  const deadline = Date.now() + timeoutMs
  while (true) {
    try { return assertion() } catch (error) {
      if (Date.now() >= deadline) throw error
      await new Promise(resolve => setTimeout(resolve, 5))
    }
  }
}

test('attaches one empty exact Session and exposes only a sanitized read-only projection', async () => {
  const follow = pendingStream()
  const events = pendingStream()
  const calls = []
  const adapter = {
    connectionSnapshot: () => ({ state: 'authenticated', generation: 7, baseUrl: 'http://127.0.0.1:41234', cookie: 'dsh.sid=secret' }),
    async createSession(request) {
      calls.push({ operation: 'create', request })
      return { sessionId: 'session-exact', privateState: 'do-not-project' }
    },
    followSession(request) {
      calls.push({ operation: 'follow', request })
      return {
        [Symbol.asyncIterator]() {
          return {
            async next() {
              return {
                done: false,
                value: {
                  type: 'snapshot',
                  header: { id: 'session-exact' },
                  cursor: 12,
                  records: [],
                  privateState: 'do-not-project'
                }
              }
            },
            return: follow.return
          }
        }
      }
    },
    async openEventGeneration(request) {
      calls.push({ operation: 'events', request })
      return {
        generation: 7,
        sessionId: 'session-exact',
        clientId: 'client-secret',
        host: { home: 'C:\\Users\\private' },
        stream: events
      }
    }
  }
  const lab = new CandidateSessionLab({ adapter, connectionGeneration: 7 })

  const snapshot = await lab.attach({ cwd: 'C:\\workspace' })

  assert.deepEqual(calls, [
    { operation: 'create', request: { cwd: 'C:\\workspace' } },
    { operation: 'follow', request: { sessionId: 'session-exact' } },
    { operation: 'events', request: { sessionId: 'session-exact' } }
  ])
  assert.deepEqual(snapshot, {
    version: 1,
    state: 'observing',
    connectionGeneration: 7,
    sessionId: 'session-exact',
    follow: { attached: true, cursor: 12 },
    decisionGate: { state: 'observing', pendingCount: 0, kinds: [] }
  })
  const serialized = JSON.stringify(snapshot)
  assert.doesNotMatch(serialized, /client-secret|dsh\.sid|privateState|Users\\\\private|41234/)

  await lab.close()
})

test('projects only same-Session pending Decision Gate kinds and removes cancelled events', async () => {
  const events = pushStream()
  const adapter = {
    connectionSnapshot: () => ({ state: 'authenticated', generation: 9 }),
    createSession: async () => ({ sessionId: 'session-a' }),
    followSession: () => (async function* () {
      yield { type: 'snapshot', header: { id: 'session-a' }, cursor: 3, records: [] }
      await new Promise(() => {})
    })(),
    openEventGeneration: async () => ({
      generation: 9,
      sessionId: 'session-a',
      clientId: 'client-private',
      host: { home: 'C:\\Users\\private' },
      stream: events
    })
  }
  const lab = new CandidateSessionLab({ adapter, connectionGeneration: 9 })
  await lab.attach({ cwd: 'C:\\workspace', sessionId: 'session-a' })

  events.push({
    type: 'waterfall',
    agentId: 'session-b',
    eventId: 'foreign-secret',
    event: 'approval/request',
    request: { command: 'private command' }
  })
  events.push({
    type: 'waterfall',
    agentId: 'session-a',
    eventId: 'question-secret',
    event: 'user-questions/request',
    request: { question: 'private question' }
  })
  events.push({
    type: 'waterfall',
    agentId: 'session-a',
    eventId: 'approval-secret',
    event: 'approval/request',
    request: { command: 'private command' }
  })

  await waitFor(() => assert.deepEqual(lab.snapshot().decisionGate, {
    state: 'waiting',
    pendingCount: 2,
    kinds: ['approval', 'user-question']
  }))
  assert.doesNotMatch(JSON.stringify(lab.snapshot()), /secret|private question|private command/)

  events.push({ type: 'cancel', eventId: 'question-secret' })
  await waitFor(() => assert.deepEqual(lab.snapshot().decisionGate, {
    state: 'waiting',
    pendingCount: 1,
    kinds: ['approval']
  }))

  events.push({ type: 'cancel', eventId: 'approval-secret' })
  await waitFor(() => assert.deepEqual(lab.snapshot().decisionGate, {
    state: 'observing',
    pendingCount: 0,
    kinds: []
  }))
  await lab.close()
})

test('keeps the candidate Session Lab unreachable from ordinary product IPC and Renderer code', () => {
  const sourceRoot = join(__dirname, '..', 'src')
  for (const relativePath of ['main.cjs', 'preload.cjs', join('renderer', 'shell.js')]) {
    const source = readFileSync(join(sourceRoot, relativePath), 'utf8')
    assert.doesNotMatch(source, /attachCandidateSessionForLab|candidateSessionLabSnapshot|candidate-session-lab/)
  }
})

test('a close during asynchronous Session creation invalidates the late attach result', async () => {
  const creation = Promise.withResolvers()
  let followOpened = false
  let eventsOpened = false
  const lab = new CandidateSessionLab({
    connectionGeneration: 14,
    adapter: {
      createSession: () => creation.promise,
      followSession: () => {
        followOpened = true
        return pendingStream()
      },
      openEventGeneration: async () => {
        eventsOpened = true
        return { generation: 14, sessionId: 'late-session', stream: pendingStream() }
      }
    }
  })

  const attaching = lab.attach({ cwd: 'C:\\workspace' })
  await new Promise(resolve => setImmediate(resolve))
  await lab.close()
  creation.resolve({ sessionId: 'late-session' })

  await assert.rejects(attaching, /已失效/)
  assert.equal(followOpened, false)
  assert.equal(eventsOpened, false)
  assert.deepEqual(lab.snapshot(), {
    version: 1,
    state: 'closed',
    connectionGeneration: 14,
    sessionId: null,
    follow: { attached: false, cursor: null },
    decisionGate: { state: 'closed', pendingCount: 0, kinds: [] }
  })
})
