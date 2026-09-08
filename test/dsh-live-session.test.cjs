const test = require('node:test')
const assert = require('node:assert/strict')
const { DshLiveSession, activityFromFrame, localMuxUrl } = require('../src/dsh-live-session.cjs')

function envelope(rpcId, payload) {
  return JSON.stringify({ type: 'server-request', rpcId, method: payload.type, payload })
}

class FakeWebSocket extends EventTarget {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 3

  constructor(url) {
    super()
    this.url = String(url)
    this.readyState = FakeWebSocket.CONNECTING
    queueMicrotask(() => {
      if (this.readyState !== FakeWebSocket.CONNECTING) return
      this.readyState = FakeWebSocket.OPEN
      this.dispatchEvent(new Event('open'))
    })
  }

  frame(rpcId, payload) {
    this.dispatchEvent(new MessageEvent('message', { data: envelope(rpcId, payload) }))
  }

  close() {
    if (this.readyState === FakeWebSocket.CLOSED) return
    this.readyState = FakeWebSocket.CLOSED
    this.dispatchEvent(new Event('close'))
  }
}

function tick() { return new Promise((resolve) => setImmediate(resolve)) }

function makeLive(respond = async () => ({ ok: true, json: async () => ({ accepted: true }) })) {
  let stream
  const requests = []
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url, init })
    return respond(url, init)
  }
  const WebSocketImpl = class extends FakeWebSocket { constructor(url) { super(url); stream = this } }
  const live = new DshLiveSession({
    baseUrl: 'http://127.0.0.1:3080', sessionId: 'session-1', fetchImpl, WebSocketImpl
  }).start()
  return { live, stream, requests }
}

test('uses the official loopback WebSocket mux downlink and rejects remote URLs', async () => {
  assert.equal(localMuxUrl('http://127.0.0.1:3080'), 'ws://127.0.0.1:3080/api/events.mux')
  assert.throws(() => localMuxUrl('http://example.com:3080'), /只连接本机/)
  const { live, stream, requests } = makeLive()
  await tick()
  assert.equal(stream.url, 'ws://127.0.0.1:3080/api/events.mux')
  assert.equal(requests.length, 0)
  assert.equal(live.snapshot().status, 'connected')
  live.close()
})

test('drops session-scoped frames without the exact active session id', () => {
  const { live } = makeLive()
  live.receive(envelope('missing-session', {
    type: 'question/requested', questions: [{ id: 'q1', question: '不应显示' }]
  }))
  live.receive(envelope('foreign-session', {
    type: 'question/requested', sessionId: 'session-other', questions: [{ id: 'q2', question: '也不应显示' }]
  }))
  live.receive(envelope('host-error', {
    type: 'stream/error', error: { message: 'Host channel is separate' }
  }))

  const snapshot = live.snapshot()
  assert.equal(snapshot.interactions.length, 0)
  assert.equal(snapshot.droppedSessionFrameCount, 2)
  assert.equal(snapshot.status, 'error')
  live.close()
})

test('normalizes an approval without exposing its response rpc id', async () => {
  const { live, stream } = makeLive()
  stream.frame('secret-wire-id', {
    type: 'approval/requested', sessionId: 'session-1', approvalId: 'approval-1',
    toolName: 'bash', reason: '将运行 npm test'
  })
  await tick()
  const snapshot = live.snapshot()
  assert.equal(snapshot.status, 'connected')
  assert.deepEqual(snapshot.interactions[0], {
    id: 'approval:secret-wire-id', kind: 'approval', title: '需要你批准一次工具操作',
    summary: 'bash 正在等待决定。', toolName: 'bash', detail: '将运行 npm test',
    consequence: '允许后，Harness 只为这一次请求放行；拒绝后，这次工具调用不会执行。', responding: false
  })
  assert.equal(JSON.stringify(snapshot).includes('approval-1'), false)
  live.close()
})

test('answers approval through POST respond with one-shot or rejection outcomes', async () => {
  const posts = []
  const { live, stream } = makeLive(async (url, init) => {
    posts.push({ url, body: JSON.parse(init.body) })
    return { ok: true, json: async () => ({ accepted: true }) }
  })
  stream.frame('rpc-approve', {
    type: 'approval/requested', sessionId: 'session-1', approvalId: 'approval-9', toolName: 'write'
  })
  await tick()
  await live.respond({ interactionId: 'approval:rpc-approve', action: 'allow' })
  assert.equal(posts[0].url, 'http://127.0.0.1:3080/api/respond')
  assert.deepEqual(posts[0].body, {
    type: 'client-response', rpcId: 'rpc-approve', result: { ok: true, value: {
      sessionId: 'session-1', approvalId: 'approval-9', outcome: 'allowed-once'
    } }
  })
  live.close()
})

test('validates and encodes a complete batch of user answers', async () => {
  let body
  const { live, stream } = makeLive(async (_url, init) => {
    body = JSON.parse(init.body)
    return { ok: true, json: async () => ({ accepted: true }) }
  })
  stream.frame('rpc-question', { type: 'question/requested', sessionId: 'session-1', questions: [
    { id: 'choice', question: '选择方式', options: [{ label: '稳妥' }, { label: '快速' }] },
    { id: 'note', question: '还要注意什么？' }
  ] })
  await tick()
  await assert.rejects(
    live.respond({ interactionId: 'question:rpc-question', answers: [{ id: 'choice', selected: ['不存在'] }] }),
    /没有提供的选项/
  )
  await live.respond({ interactionId: 'question:rpc-question', answers: [
    { id: 'choice', selected: ['稳妥'] }, { id: 'note', selected: [], custom: '先备份' }
  ] })
  assert.deepEqual(body.result.value.answer.answers, [
    { id: 'choice', selected: ['稳妥'] }, { id: 'note', selected: [], custom: '先备份' }
  ])
  live.close()
})

test('preserves protocol question ids and option labels exactly', async () => {
  let body
  const { live, stream } = makeLive(async (_url, init) => {
    body = JSON.parse(init.body)
    return { ok: true, json: async () => ({ accepted: true }) }
  })
  stream.frame('rpc-exact', { type: 'question/requested', sessionId: 'session-1', questions: [
    { id: ' exact id ', question: '选择', options: [{ label: ' exact label ' }] }
  ] })
  await tick()
  await live.respond({ interactionId: 'question:rpc-exact', answers: [
    { id: ' exact id ', selected: [' exact label '] }
  ] })
  assert.deepEqual(body.result.value.answer.answers, [
    { id: ' exact id ', selected: [' exact label '] }
  ])
  live.close()
})

test('stops waiting after five minutes without inventing an answer', () => {
  const scheduled = []
  const timedOut = []
  const live = new DshLiveSession({
    baseUrl: 'http://127.0.0.1:3080',
    sessionId: 'session-wait-timeout',
    fetchImpl: async () => ({ ok: true, json: async () => ({ accepted: true }) }),
    WebSocketImpl: FakeWebSocket,
    interactionTimeoutMs: 5 * 60 * 1000,
    setTimeoutImpl: (callback, delay) => { scheduled.push({ callback, delay }); return scheduled.length },
    clearTimeoutImpl: () => {},
    onInteractionTimeout: (snapshot) => timedOut.push(snapshot)
  })

  live.receive(JSON.stringify({ type: 'server-request', rpcId: 'rpc-wait', payload: {
    type: 'question/requested', sessionId: 'session-wait-timeout', questions: [{ id: 'choice', question: '请选择', options: [{ label: 'A' }] }]
  } }))

  assert.equal(scheduled[0].delay, 5 * 60 * 1000)
  scheduled[0].callback()
  assert.equal(timedOut.length, 1)
  assert.equal(timedOut[0].reason, 'waiting-for-user')
  assert.equal(timedOut[0].interactionCount, 1)
  assert.equal(live.snapshot().interactions.length, 0)
})

test('submitting a Decision Gate pauses the idle timeout before the Engine receipt arrives', async () => {
  const timers = []
  const timedOut = []
  let resolveReceipt
  const live = new DshLiveSession({
    baseUrl: 'http://127.0.0.1:3080',
    sessionId: 'session-submit-race',
    fetchImpl: async () => ({
      ok: true,
      json: () => new Promise((resolve) => { resolveReceipt = resolve })
    }),
    WebSocketImpl: FakeWebSocket,
    setTimeoutImpl: (callback, delay) => {
      const timer = { callback, delay, cancelled: false }
      timers.push(timer)
      return timer
    },
    clearTimeoutImpl: (timer) => { timer.cancelled = true },
    onInteractionTimeout: (snapshot) => timedOut.push(snapshot)
  })
  live.receive(envelope('rpc-race', {
    type: 'question/requested', sessionId: 'session-submit-race',
    questions: [{ id: 'choice', question: '请选择', options: [{ label: 'A' }] }]
  }))
  const pendingResponse = live.respond({
    interactionId: 'question:rpc-race',
    answers: [{ id: 'choice', selected: ['A'] }]
  })
  assert.equal(timers[0].cancelled, true)
  await tick()
  if (!timers[0].cancelled) timers[0].callback()
  resolveReceipt(timedOut.length ? { accepted: false, reason: 'not-pending' } : { accepted: true })
  await pendingResponse
  assert.equal(timedOut.length, 0)
  live.close()
})

test('user activity restarts the five-minute idle window for the same Decision Gate', () => {
  const timers = []
  const live = new DshLiveSession({
    baseUrl: 'http://127.0.0.1:3080', sessionId: 'session-active-user',
    fetchImpl: async () => ({ ok: true, json: async () => ({ accepted: true }) }),
    WebSocketImpl: FakeWebSocket,
    setTimeoutImpl: (callback, delay) => {
      const timer = { callback, delay, cancelled: false }
      timers.push(timer)
      return timer
    },
    clearTimeoutImpl: (timer) => { timer.cancelled = true }
  })
  live.receive(envelope('rpc-active', {
    type: 'question/requested', sessionId: 'session-active-user',
    questions: [{ id: 'note', question: '请说明' }]
  }))
  assert.equal(live.touchInteraction('question:rpc-active'), true)
  assert.equal(timers[0].cancelled, true)
  assert.equal(timers.length, 2)
  assert.equal(timers[1].delay, 5 * 60 * 1000)
  live.close()
})

test('clears stale waits and drafts when the WebSocket stream disconnects', async () => {
  const { live, stream } = makeLive()
  stream.frame('rpc-a', { type: 'approval/requested', sessionId: 'session-1', approvalId: 'a-1', toolName: 'bash' })
  stream.frame('rpc-b', { type: 'question/requested', sessionId: 'session-1', questions: [{ id: 'q', question: '继续吗？' }] })
  stream.frame('chunk', { type: 'session/event', sessionId: 'session-1', event: {
    type: 'assistant/chunk', seq: 4, data: { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: '未完成' } }
  } })
  await tick()
  assert.equal(live.snapshot().interactions.length, 2)
  assert.equal(live.snapshot().draft.text, '未完成')
  stream.close()
  await tick()
  assert.equal(live.snapshot().interactions.length, 0)
  assert.equal(live.snapshot().draft, null)
  assert.equal(live.snapshot().status, 'reconnecting')
  live.close()
})

test('shows only text deltas as an ephemeral draft and never exposes reasoning', () => {
  const { live } = makeLive()
  live.receive(envelope('text-1', { type: 'session/event', sessionId: 'session-1', event: {
    type: 'assistant/chunk', seq: 1, data: { turn: 2, step: 1, chunk: { type: 'text-delta', index: 0, text: '你好，' } }
  } }))
  live.receive(envelope('reasoning', { type: 'session/event', sessionId: 'session-1', event: {
    type: 'assistant/chunk', seq: 2, data: { turn: 2, step: 1, chunk: { type: 'reasoning-delta', index: 1, text: 'private chain' } }
  } }))
  live.receive(envelope('text-2', { type: 'session/event', sessionId: 'session-1', event: {
    type: 'assistant/chunk', seq: 3, data: { turn: 2, step: 1, chunk: { type: 'text-delta', index: 0, text: '正在处理。' } }
  } }))
  assert.deepEqual(live.snapshot().draft, { turn: 2, step: 1, text: '你好，正在处理。', truncated: false })
  assert.equal(JSON.stringify(live.snapshot()).includes('private chain'), false)
  live.receive(envelope('committed', { type: 'session/event', sessionId: 'session-1', event: {
    type: 'assistant/message', seq: 4, data: { turn: 2, step: 1, message: { role: 'assistant', content: [] } }
  } }))
  assert.equal(live.snapshot().draft, null)
  live.close()
})

test('summarizes queue placement without copying queued message content', () => {
  const { live } = makeLive()
  live.receive(envelope('queue', { type: 'session/queue', sessionId: 'session-1', items: [
    { id: 'a', placement: 'queued', message: { content: 'private queued prompt' } },
    { id: 'b', placement: 'context', message: { content: 'private context' } }
  ] }))
  assert.deepEqual(live.snapshot().queue, { queued: 1, steering: 0, context: 1, total: 2 })
  assert.equal(JSON.stringify(live.snapshot()).includes('private queued prompt'), false)
  live.close()
})

test('turn and tool events become human activity without exposing analysis text', () => {
  assert.deepEqual(activityFromFrame({
    type: 'session/event', event: { type: 'tool/call', seq: 7, data: { name: 'read', arguments: '{private}' } }
  }), { id: 'event-7', seq: 7, state: 'working', label: '正在使用 read', detail: '具体参数保留在技术证据中。' })
  assert.equal(activityFromFrame({
    type: 'session/event', event: { type: 'assistant/analysis', seq: 8, data: { text: 'private chain' } }
  }), null)
  assert.equal(activityFromFrame({
    type: 'session/event', event: { type: 'turn/end', seq: 9, data: { reason: { kind: 'completed' } } }
  }).state, 'done')
})

test('a terminal turn replaces stale working activity instead of leaving it in the live panel', () => {
  const { live } = makeLive()
  live.receive(envelope('start', { type: 'session/event', sessionId: 'session-1', event: {
    type: 'turn/start', seq: 20, data: { turn: 3 }
  } }))
  live.receive(envelope('message', { type: 'session/event', sessionId: 'session-1', event: {
    type: 'assistant/message', seq: 21, data: { turn: 3 }
  } }))
  live.receive(envelope('end', { type: 'session/event', sessionId: 'session-1', event: {
    type: 'turn/end', seq: 22, data: { turn: 3, reason: { kind: 'completed' } }
  } }))

  assert.deepEqual(live.snapshot().activities, [
    { id: 'event-22', seq: 22, state: 'done', label: '这一轮已完成', detail: 'Engine 原因：completed' }
  ])
  live.close()
})

test('a durable idle snapshot clears working activity when the live terminal event was missed', () => {
  const { live } = makeLive()
  live.receive(envelope('start-without-end', { type: 'session/event', sessionId: 'session-1', event: {
    type: 'turn/start', seq: 30, data: { turn: 4 }
  } }))
  assert.equal(live.snapshot().activities[0].state, 'working')

  live.reconcileRunning(false)

  assert.deepEqual(live.snapshot().activities, [])
  live.close()
})
