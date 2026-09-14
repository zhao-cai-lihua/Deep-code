const test = require('node:test')
const assert = require('node:assert/strict')

const { CandidatePromptEvidence } = require('../src/candidate-prompt-evidence.cjs')

function event(seq, type, data) {
  return { type: 'event', event: { seq, time: 1_700_000_000_000 + seq, type, data } }
}

function createEvidence() {
  const evidence = new CandidatePromptEvidence({
    sessionId: 'session-a',
    requestId: 'request-a',
    expectedRoute: { provider: 'deepseek-official', model: 'deepseek-v4-pro', reasoningEffort: 'high' }
  })
  evidence.confirmAdmission({ acceptedAt: '2026-09-14T10:00:00.000Z' })
  return evidence
}

test('binds admission, route, usage, and terminal only inside the exact durable Turn', () => {
  const evidence = createEvidence()
  assert.deepEqual(evidence.snapshot(), {
    version: 1,
    state: 'accepted',
    sessionId: 'session-a',
    requestId: 'request-a',
    admission: { accepted: true, durable: false, acceptedAt: '2026-09-14T10:00:00.000Z' },
    expectedRoute: { provider: 'deepseek-official', model: 'deepseek-v4-pro', reasoningEffort: 'high' },
    routeMatch: 'pending'
  })

  evidence.observe(event(1, 'request/header', { header: { config: { provider: 'anthropic', model: 'old' } } }))
  evidence.observe(event(2, 'turn/end', { turn: 4, reason: { kind: 'completed' } }))
  evidence.observe(event(10, 'turn/start', { turn: 5 }))
  evidence.observe(event(11, 'user/message', {
    role: 'user', id: 'message-secret', content: [{ type: 'text', text: 'private prompt' }],
    source: { kind: 'user', rpcId: 'request-a' }
  }))
  evidence.observe(event(12, 'request/header', {
    header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-pro', reasoningEffort: 'high' } }
  }))
  evidence.observe(event(13, 'assistant/message', {
    turn: 5, step: 1, message: { content: [{ type: 'text', text: 'private answer' }] },
    usage: { inputTokens: 20, outputTokens: 8, cacheReadTokens: 80, cacheWriteTokens: 4, reasoningTokens: 3 }
  }))
  evidence.observe(event(14, 'turn/end', { turn: 5, reason: { kind: 'completed' } }))

  const snapshot = evidence.snapshot()
  assert.deepEqual(snapshot, {
    version: 1,
    state: 'completed',
    sessionId: 'session-a',
    requestId: 'request-a',
    admission: {
      accepted: true, durable: true, acceptedAt: '2026-09-14T10:00:00.000Z', durableSeq: 11
    },
    expectedRoute: { provider: 'deepseek-official', model: 'deepseek-v4-pro', reasoningEffort: 'high' },
    turn: { id: '5', startSeq: 10, endSeq: 14 },
    route: { provider: 'deepseek-official', model: 'deepseek-v4-pro', reasoningEffort: 'high', seq: 12 },
    routeMatch: 'matched',
    usage: {
      uncachedInputTokens: 20, outputTokens: 8, cacheReadTokens: 80, cacheWriteTokens: 4,
      evidenceSeqs: [13]
    },
    terminal: { state: 'completed', reason: 'completed', seq: 14 }
  })
  assert.doesNotMatch(JSON.stringify(snapshot), /private prompt|private answer|message-secret|anthropic|old/)
})

test('ignores foreign rpcIds and mismatched Turns instead of cross-splicing evidence', () => {
  const evidence = createEvidence()
  evidence.observe(event(20, 'turn/start', { turn: 8 }))
  evidence.observe(event(21, 'user/message', { source: { kind: 'user', rpcId: 'another-request' } }))
  evidence.observe(event(22, 'request/header', {
    header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-pro', reasoningEffort: 'high' } }
  }))
  evidence.observe(event(23, 'turn/end', { turn: 8, reason: { kind: 'completed' } }))
  evidence.observe(event(30, 'turn/start', { turn: 9 }))
  evidence.observe(event(31, 'user/message', { source: { kind: 'user', rpcId: 'request-a' } }))
  evidence.observe(event(32, 'assistant/message', {
    turn: 99, step: 1, usage: { inputTokens: 999, outputTokens: 999 }
  }))
  evidence.observe(event(33, 'turn/end', { turn: 99, reason: { kind: 'completed' } }))

  assert.deepEqual(evidence.snapshot(), {
    version: 1,
    state: 'running',
    sessionId: 'session-a',
    requestId: 'request-a',
    admission: {
      accepted: true, durable: true, acceptedAt: '2026-09-14T10:00:00.000Z', durableSeq: 31
    },
    expectedRoute: { provider: 'deepseek-official', model: 'deepseek-v4-pro', reasoningEffort: 'high' },
    turn: { id: '9', startSeq: 30 },
    routeMatch: 'pending'
  })
})

test('marks a terminal Turn unusable when its proven route differs from the requested route', () => {
  const evidence = createEvidence()
  evidence.observe(event(40, 'turn/start', { turn: 10 }))
  evidence.observe(event(41, 'user/message', { source: { kind: 'user', rpcId: 'request-a' } }))
  evidence.observe(event(42, 'request/header', {
    header: { config: { provider: 'zai-coding-cn', model: 'glm-5', reasoningEffort: 'max' } }
  }))
  evidence.observe(event(43, 'turn/end', { turn: 10, reason: { kind: 'completed' } }))

  const snapshot = evidence.snapshot()
  assert.equal(snapshot.state, 'route-mismatch')
  assert.equal(snapshot.routeMatch, 'mismatched')
  assert.deepEqual(snapshot.terminal, { state: 'completed', reason: 'completed', seq: 43 })
})

test('replaces duplicate step usage with the latest structured settlement', () => {
  const evidence = createEvidence()
  evidence.observe(event(50, 'turn/start', { turn: 11 }))
  evidence.observe(event(51, 'user/message', { source: { kind: 'user', rpcId: 'request-a' } }))
  evidence.observe(event(52, 'assistant/message', {
    turn: 11, step: 1, usage: { inputTokens: 10, outputTokens: 2, cacheReadTokens: 3 }
  }))
  evidence.observe(event(53, 'assistant/message', {
    turn: 11, step: 1, usage: { inputTokens: 12, outputTokens: 4, cacheReadTokens: 5, cacheWriteTokens: 1 }
  }))
  evidence.observe(event(54, 'assistant/message', {
    turn: 11, step: 2, usage: { inputTokens: 6, outputTokens: 7 }
  }))

  assert.deepEqual(evidence.snapshot().usage, {
    uncachedInputTokens: 18, outputTokens: 11, cacheReadTokens: 5, cacheWriteTokens: 1,
    evidenceSeqs: [53, 54]
  })
})

test('observes early durable events without claiming acceptance until the RPC receipt arrives', () => {
  const evidence = new CandidatePromptEvidence({
    sessionId: 'session-a', requestId: 'request-a',
    expectedRoute: { provider: 'deepseek-official', model: 'deepseek-v4-pro' }
  })
  evidence.observe(event(60, 'turn/start', { turn: 12 }))
  evidence.observe(event(61, 'user/message', { source: { kind: 'user', rpcId: 'request-a' } }))
  evidence.observe(event(62, 'request/header', {
    header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-pro', reasoningEffort: 'high' } }
  }))
  evidence.observe(event(63, 'turn/end', { turn: 12, reason: { kind: 'completed' } }))

  assert.equal(evidence.snapshot().state, 'awaiting-admission')
  assert.deepEqual(evidence.snapshot().admission, { accepted: false, durable: true, durableSeq: 61 })
  evidence.confirmAdmission({ acceptedAt: '2026-09-14T10:01:00.000Z' })
  assert.equal(evidence.snapshot().state, 'completed')
  assert.equal(evidence.snapshot().admission.accepted, true)
})

test('a rejected Prompt receipt cannot be revived by early follow events', () => {
  const evidence = new CandidatePromptEvidence({
    sessionId: 'session-a', requestId: 'request-a',
    expectedRoute: { provider: 'deepseek-official', model: 'deepseek-v4-pro' }
  })
  evidence.observe(event(70, 'turn/start', { turn: 13 }))
  evidence.observe(event(71, 'user/message', { source: { kind: 'user', rpcId: 'request-a' } }))
  evidence.rejectAdmission()
  evidence.observe(event(72, 'turn/end', { turn: 13, reason: { kind: 'completed' } }))

  assert.deepEqual(evidence.snapshot(), {
    version: 1,
    state: 'rejected',
    sessionId: 'session-a',
    requestId: 'request-a',
    admission: { accepted: false, durable: true, durableSeq: 71 },
    expectedRoute: { provider: 'deepseek-official', model: 'deepseek-v4-pro' },
    turn: { id: '13', startSeq: 70 },
    routeMatch: 'pending'
  })
  assert.throws(
    () => evidence.confirmAdmission({ acceptedAt: '2026-09-14T10:02:00.000Z' }),
    /已经拒绝/
  )
})

test('calls one Turn usage proven only when its Session-control delta agrees', () => {
  const evidence = new CandidatePromptEvidence({
    sessionId: 'session-a', requestId: 'request-a',
    expectedRoute: { provider: 'deepseek-official', model: 'deepseek-v4-pro' },
    usageBaseline: {
      asOfSeq: 80,
      usage: { uncachedInputTokens: 100, outputTokens: 20, cacheReadTokens: 300, cacheWriteTokens: 5 }
    }
  })
  evidence.confirmAdmission({ acceptedAt: '2026-09-14T10:03:00.000Z' })
  evidence.observe(event(81, 'turn/start', { turn: 14 }))
  evidence.observe(event(82, 'user/message', { source: { kind: 'user', rpcId: 'request-a' } }))
  evidence.observe(event(83, 'request/header', {
    header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-pro' } }
  }))
  evidence.observe(event(84, 'assistant/message', {
    turn: 14, step: 1,
    usage: { inputTokens: 20, outputTokens: 8, cacheReadTokens: 80, cacheWriteTokens: 4 }
  }))
  evidence.observe(event(85, 'turn/end', { turn: 14, reason: { kind: 'completed' } }))
  assert.equal(evidence.snapshot().state, 'evidence-incomplete')
  evidence.observeControlUsage({
    asOfSeq: 84,
    usage: { uncachedInputTokens: 120, outputTokens: 28, cacheReadTokens: 380, cacheWriteTokens: 9 }
  })

  const snapshot = evidence.snapshot()
  assert.equal(snapshot.state, 'completed')
  assert.deepEqual(snapshot.usageAgreement, {
    state: 'matched', baselineSeq: 80, latestSeq: 84,
    controlDelta: { uncachedInputTokens: 20, outputTokens: 8, cacheReadTokens: 80, cacheWriteTokens: 4 }
  })
})

test('fails closed when same-Turn samples disagree with the authoritative Session delta', () => {
  const evidence = new CandidatePromptEvidence({
    sessionId: 'session-a', requestId: 'request-a',
    expectedRoute: { provider: 'deepseek-official', model: 'deepseek-v4-pro' },
    usageBaseline: {
      asOfSeq: 90,
      usage: { uncachedInputTokens: 10, outputTokens: 1, cacheReadTokens: 20, cacheWriteTokens: 0 }
    }
  })
  evidence.confirmAdmission({ acceptedAt: '2026-09-14T10:04:00.000Z' })
  evidence.observe(event(91, 'turn/start', { turn: 15 }))
  evidence.observe(event(92, 'user/message', { source: { kind: 'user', rpcId: 'request-a' } }))
  evidence.observe(event(93, 'request/header', {
    header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-pro' } }
  }))
  evidence.observe(event(94, 'assistant/message', {
    turn: 15, step: 1, usage: { inputTokens: 5, outputTokens: 2, cacheReadTokens: 10 }
  }))
  evidence.observeControlUsage({
    asOfSeq: 94,
    usage: { uncachedInputTokens: 20, outputTokens: 5, cacheReadTokens: 40, cacheWriteTokens: 0 }
  })
  evidence.observe(event(95, 'turn/end', { turn: 15, reason: { kind: 'completed' } }))

  assert.equal(evidence.snapshot().state, 'usage-mismatch')
  assert.equal(evidence.snapshot().usageAgreement.state, 'mismatched')
})
