const test = require('node:test')
const assert = require('node:assert/strict')

const { CandidateSessionLab } = require('../src/candidate-session-lab.cjs')
const { CandidateGateDRunner } = require('../src/candidate-gate-d-runner.cjs')

function pushStream() {
  const values = []
  const waiters = []
  let closed = false
  return {
    push(value) {
      const waiter = waiters.shift()
      if (waiter) waiter({ done: false, value })
      else values.push(value)
    },
    [Symbol.asyncIterator]() { return this },
    next() {
      if (values.length) return Promise.resolve({ done: false, value: values.shift() })
      if (closed) return Promise.resolve({ done: true, value: undefined })
      return new Promise(resolve => waiters.push(resolve))
    },
    async return() {
      closed = true
      while (waiters.length) waiters.shift()({ done: true, value: undefined })
      return { done: true, value: undefined }
    }
  }
}

function harnessBoundary({
  promptFailure,
  promptNeverSettles = false,
  terminalKind = 'completed',
  actualModel = 'deepseek-v4-flash'
} = {}) {
  const follow = pushStream()
  const control = pushStream()
  const events = pushStream()
  const calls = []
  follow.push({ type: 'snapshot', header: { id: 'session-gate-d' }, cursor: 20, records: [] })
  const selection = { provider: 'deepseek-official', model: 'deepseek-v4-flash', reasoningEffort: 'low' }
  const adapter = {
    async modelCatalog() {
      calls.push({ operation: 'catalog' })
      return {
        default: { provider: 'deepseek-official', model: 'deepseek-v4-flash' },
        routableProviders: ['deepseek-official'],
        groups: [{
          id: 'deepseek-official', name: 'DeepSeek',
          models: [{ id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash', reasoning: [{ id: 'low' }] }]
        }],
        failures: []
      }
    },
    async createSession() { return { sessionId: 'session-gate-d' } },
    followSession() { return follow },
    async openTokenUsageControl() {
      return {
        baseline: {
          asOfSeq: 20,
          usage: { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
        },
        stream: control
      }
    },
    async openEventGeneration() {
      return { generation: 4, sessionId: 'session-gate-d', stream: events }
    },
    async selectModel(request) {
      calls.push({ operation: 'select', request })
      return { ...selection }
    },
    async prompt(request) {
      calls.push({ operation: 'prompt', request })
      if (promptFailure) throw promptFailure
      if (promptNeverSettles) {
        return new Promise((resolve, reject) => {
          request.signal?.addEventListener('abort', () => reject(request.signal.reason), { once: true })
        })
      }
      queueMicrotask(() => {
        follow.push({ type: 'event', event: { seq: 21, type: 'turn/start', data: { turn: 1 } } })
        follow.push({ type: 'event', event: {
          seq: 22, type: 'user/message',
          data: { message: { source: { kind: 'user', rpcId: request.requestId } } }
        } })
        follow.push({ type: 'event', event: {
          seq: 23, type: 'request/header',
          data: { header: { config: { ...selection, model: actualModel } } }
        } })
        follow.push({ type: 'event', event: {
          seq: 24, type: 'assistant/message',
          data: { turn: 1, step: 0, usage: { inputTokens: 7, outputTokens: 2, cacheReadTokens: 3 } }
        } })
        follow.push({ type: 'event', event: {
          seq: 25, type: 'turn/end', data: { turn: 1, reason: { kind: terminalKind } }
        } })
        control.push({
          asOfSeq: 24,
          usage: { uncachedInputTokens: 7, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 0 }
        })
      })
      return { accepted: true, requestId: request.requestId }
    }
  }
  return { adapter, follow, control, events, calls, selection }
}

async function preparedRunner(options = {}) {
  const boundary = harnessBoundary(options)
  const lab = new CandidateSessionLab({ adapter: boundary.adapter, connectionGeneration: 4 })
  await lab.attach({ cwd: 'C:\\gate-d' })
  const runner = new CandidateGateDRunner({
    adapter: boundary.adapter,
    lab,
    requestIdFactory: () => 'request-gate-d',
    now: () => new Date('2026-09-14T12:00:00.000Z'),
    wait: () => new Promise(resolve => setImmediate(resolve)),
    ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {})
  })
  return { ...boundary, lab, runner }
}

test('preflights an exact routable text model without sending a Prompt', async () => {
  const { runner, calls, selection, lab } = await preparedRunner()

  assert.deepEqual(await runner.preflight({ selection }), {
    state: 'ready',
    route: selection,
    modality: 'text',
    promptLimit: 256,
    retryPolicy: { mode: 'normal', maxRetries: 0 },
    auxiliaryModelCalls: false
  })
  assert.deepEqual(calls, [{ operation: 'catalog' }])
  await lab.close()
})

test('returns a receipt only after admission, route, terminal, and usage agree', async () => {
  const { runner, calls, selection, lab } = await preparedRunner()
  await runner.preflight({ selection })

  const receipt = await runner.executeOnce({ text: '只回复：收到' })

  assert.deepEqual(receipt, {
    version: 1,
    state: 'completed',
    route: selection,
    admission: { accepted: true, durable: true },
    terminal: { state: 'completed', reason: 'completed' },
    usage: {
      uncachedInputTokens: 7,
      outputTokens: 2,
      cacheReadTokens: 3,
      cacheWriteTokens: 0
    },
    usageAgreement: 'matched',
    promptRequests: 1,
    requestHeaders: 1,
    retryEvents: 0
  })
  assert.equal(calls.filter(call => call.operation === 'prompt').length, 1)
  assert.doesNotMatch(JSON.stringify(receipt), /session-gate-d|request-gate-d|只回复|收到/)
  await lab.close()
})

test('bounds a Prompt admission that never settles and never retries it', async () => {
  const { runner, calls, selection, lab } = await preparedRunner({
    promptNeverSettles: true,
    timeoutMs: 20
  })
  await runner.preflight({ selection })

  await assert.rejects(runner.executeOnce({ text: '只回复：收到' }), /等待上限|超时/)
  assert.equal(calls.filter(call => call.operation === 'prompt').length, 1)
  await assert.rejects(runner.executeOnce({ text: 'second attempt' }), /已经执行过/)
  await lab.close()
})

test('does not retry a rejected Prompt and cannot execute twice', async () => {
  const failure = new Error('provider unavailable')
  const { runner, calls, selection, lab } = await preparedRunner({ promptFailure: failure })
  await runner.preflight({ selection })

  await assert.rejects(runner.executeOnce({ text: '只回复：收到' }), /provider unavailable/)
  await assert.rejects(runner.executeOnce({ text: 'second attempt' }), /已经执行过/)
  assert.equal(calls.filter(call => call.operation === 'prompt').length, 1)
  assert.equal(lab.snapshot().promptEvidence.state, 'rejected')
  await lab.close()
})

test('fails closed when the live route differs from the preflight route', async () => {
  const { runner, calls, selection, lab } = await preparedRunner({ actualModel: 'deepseek-v4-pro' })
  await runner.preflight({ selection })

  await assert.rejects(runner.executeOnce({ text: '只回复：收到' }), /实际路由与预检路由不一致/)
  assert.equal(calls.filter(call => call.operation === 'prompt').length, 1)
  await lab.close()
})

test('reports a failed terminal without retrying or claiming a completed receipt', async () => {
  const { runner, calls, selection, lab } = await preparedRunner({ terminalKind: 'error' })
  await runner.preflight({ selection })

  const receipt = await runner.executeOnce({ text: '只回复：收到' })

  assert.equal(receipt.state, 'failed')
  assert.deepEqual(receipt.terminal, { state: 'failed', reason: 'error' })
  assert.equal(receipt.promptRequests, 1)
  assert.equal(calls.filter(call => call.operation === 'prompt').length, 1)
  await lab.close()
})

test('reconciles terminal-but-incomplete evidence read-only without sending a second Prompt', async () => {
  const selection = {
    provider: 'deepseek-official', model: 'deepseek-v4-flash', reasoningEffort: 'low'
  }
  let promptCalls = 0
  let reconciliations = 0
  let evidence = null
  const lab = {
    snapshot() {
      return {
        state: 'observing', sessionId: 'session-reconcile',
        decisionGate: { pendingCount: 0 }, promptEvidence: evidence
      }
    },
    preparePromptEvidence() {
      evidence = { state: 'awaiting-admission' }
    },
    confirmPromptAdmission() {
      evidence = {
        state: 'evidence-incomplete',
        route: selection,
        admission: { accepted: true, durable: true },
        terminal: { state: 'completed', reason: 'completed' },
        usage: {
          uncachedInputTokens: 3, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0
        },
        usageAgreement: { state: 'pending' }
      }
    },
    rejectPromptAdmission() {},
    async reconcilePromptEvidence() {
      reconciliations += 1
      evidence = {
        ...evidence,
        state: 'completed',
        usageAgreement: { state: 'matched' }
      }
      return this.snapshot()
    }
  }
  const adapter = {
    async modelCatalog() {
      return {
        default: selection,
        routableProviders: [selection.provider],
        groups: [{ id: selection.provider, models: [{
          id: selection.model, reasoning: [{ id: selection.reasoningEffort }]
        }] }],
        failures: []
      }
    },
    async selectModel() { return selection },
    async prompt({ requestId }) {
      promptCalls += 1
      return { accepted: true, requestId }
    }
  }
  const runner = new CandidateGateDRunner({
    adapter, lab, requestIdFactory: () => 'request-reconcile'
  })
  await runner.preflight({ selection })

  const receipt = await runner.executeOnce({ text: '只回复：收到' })

  assert.equal(receipt.state, 'completed')
  assert.equal(receipt.usageAgreement, 'matched')
  assert.equal(promptCalls, 1)
  assert.equal(reconciliations, 1)
})
