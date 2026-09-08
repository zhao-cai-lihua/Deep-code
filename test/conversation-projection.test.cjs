const test = require('node:test')
const assert = require('node:assert/strict')
const { projectConversation, terminalFailure } = require('../src/conversation-projection.cjs')

test('keeps human prompts in chat and moves Harness context into run details', () => {
  const page = { events: [
    { event: { seq: 1, time: 1000, type: 'turn/start', data: { turn: 1 } } },
    { event: { seq: 2, time: 1010, type: 'user/message', data: { content: [{ type: 'text', text: '解释这个项目' }], source: { kind: 'user' } } } },
    { event: { seq: 3, time: 1020, type: 'user/message', data: { content: [{ type: 'text', text: '<system-reminder>Current DSH file policy: danger-full-access.</system-reminder>' }], source: { kind: 'plugin', plugin: 'sandbox-policy' } } } },
    { event: { seq: 4, time: 1030, type: 'user/message', data: { content: [{ type: 'text', text: '<system-reminder><available_skills><skill>a</skill></available_skills></system-reminder>' }], source: { kind: 'plugin', plugin: 'dsh-tool-skill' } } } },
    { event: { seq: 5, time: 2200, type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } } }
  ] }
  const result = projectConversation(page)
  assert.deepEqual(result.messages.map(({ role, text }) => ({ role, text })), [{ role: 'user', text: '解释这个项目' }])
  assert.equal(result.runDetails.runtimeContext.length, 2)
  assert.deepEqual(result.runDetails.permissionFacts, [])
  assert.equal(result.runDetails.runtimeContext[1].label, '技能目录已载入（1 项）')
  assert.equal(result.runDetails.durationMs, 1200)
})

test('keeps durable image attachment facts on the human message without exposing bytes', () => {
  const result = projectConversation({ events: [{
    event: {
      seq: 1,
      type: 'user/message',
      data: {
        source: { kind: 'user' },
        content: [
          { type: 'text', text: '看看这个报错' },
          { type: 'image', attachment: { attachmentId: 'sha256:abc', mediaType: 'image/png', bytes: 2048, width: 640, height: 480, name: 'error.png' } }
        ]
      }
    }
  }] })

  assert.deepEqual(result.messages[0], {
    role: 'user', text: '看看这个报错', seq: 1, time: undefined,
    images: [{ attachmentId: 'sha256:abc', mediaType: 'image/png', bytes: 2048, width: 640, height: 480, name: 'error.png' }]
  })
  assert.doesNotMatch(JSON.stringify(result.messages[0]), /base64|previewUrl|data:/)
})

test('keeps a successful mutation tool unconfirmed when Harness provides no diff presenter', () => {
  const page = { events: [
    { event: { seq: 1, time: 1000, type: 'tool/call', data: { callId: 'c1', name: 'write', arguments: '{"file_path":"C:\\\\work\\\\README.md","content":"hi"}' } } },
    { event: { seq: 2, time: 1300, type: 'tool/result', data: { message: { source: { callId: 'c1' }, content: [] } } }, view: { title: '文件已写入' } },
    { event: { seq: 3, time: 1400, type: 'tool/call', data: { callId: 'c2', name: 'read', arguments: '{"path":"C:\\\\work\\\\package.json"}' } }, view: { title: '读取项目配置' } },
    { event: { seq: 4, time: 1500, type: 'tool/result', data: { message: { source: { callId: 'c2' }, content: [] } } } }
  ] }
  const result = projectConversation(page)
  assert.deepEqual(result.runDetails.changedFiles, [])
  assert.deepEqual(result.runDetails.unconfirmedChanges, [{ path: 'C:\\work\\README.md', operation: '写入', seq: 2, confirmed: false }])
  assert.equal(result.runDetails.activities[0].state, 'done')
  assert.equal(result.runDetails.activities[1].label, '读取项目配置')
  assert.equal(result.evidence.length, 4)
})

test('does not claim a file changed when its tool result failed', () => {
  const page = { events: [
    { event: { seq: 1, type: 'tool/call', data: { callId: 'c1', name: 'edit', arguments: '{"path":"a.js"}' } } },
    { event: { seq: 2, type: 'tool/result', data: { message: { source: { callId: 'c1' }, content: [{ type: 'tool-result', isError: true }] } } } }
  ] }
  const result = projectConversation(page)
  assert.equal(result.runDetails.activities[0].state, 'error')
  assert.deepEqual(result.runDetails.changedFiles, [])
})

test('does not promote permission-like runtime text into a permission fact', () => {
  const result = projectConversation({ events: [
    { event: { seq: 1, type: 'user/message', data: { content: [{ type: 'text', text: 'Current DSH file policy: read-only.' }], source: { kind: 'plugin', plugin: 'sandbox-policy' } } } },
    { event: { seq: 2, type: 'user/message', data: { content: [{ type: 'text', text: 'Current DSH file policy: workspace-write.' }], source: { kind: 'plugin', plugin: 'sandbox-policy' } } } }
  ] })
  assert.deepEqual(result.runDetails.permissionFacts, [])
  assert.equal(result.runDetails.runtimeContext.length, 2)
  assert.equal(result.runDetails.runtimeContext.every((item) => item.kind === 'context'), true)
})

test('projects only structured Harness permission events', () => {
  const result = projectConversation({ events: [
    { event: { seq: 1, type: 'turn/start', data: { turn: 1 } } },
    { event: { seq: 2, type: 'permission/preset', data: { preset: 'full-access' } } },
    { event: { seq: 3, type: 'sandbox/mode', data: { mode: 'danger-full-access' } } },
    { event: { seq: 4, type: 'approval/policy', data: { policy: 'never' } } }
  ] })
  assert.deepEqual(result.runDetails.permissionFacts, [
    { key: 'permission-preset', label: '权限预设：full-access', detail: '来自 Harness 结构化事件。', seq: 2 },
    { key: 'sandbox-mode', label: '文件沙箱：danger-full-access', detail: '来自 Harness 结构化事件。', seq: 3 },
    { key: 'approval-policy', label: '操作审批：never', detail: '来自 Harness 结构化事件。', seq: 4 }
  ])
})

test('uses the official wrapped presenter view for human labels', () => {
  const result = projectConversation({ events: [
    {
      event: { seq: 1, type: 'tool/call', data: { callId: 'c1', name: 'custom-tool', arguments: '{}' } },
      view: { for: 'call', view: { card: 'generic', title: '检查依赖关系' } }
    }
  ] })
  assert.equal(result.runDetails.activities[0].label, '检查依赖关系')
  assert.deepEqual(result.runDetails.activities[0].presenter, { card: 'generic', title: '检查依赖关系' })
})

test('trusts a successful official diff presenter when listing changed files', () => {
  const result = projectConversation({ events: [
    {
      event: { seq: 1, type: 'tool/call', data: { callId: 'c1', name: 'future-mutation-tool', arguments: '{}' } },
      view: { for: 'call', view: { card: 'diff', title: '更新两份文档', diffs: [{ path: 'a.md' }, { path: 'b.md' }] } }
    },
    {
      event: { seq: 2, type: 'tool/result', data: { message: { source: { callId: 'c1' } } } },
      view: { for: 'result', view: { card: 'diff', diffs: [{ path: 'a.md' }, { path: 'b.md' }] } }
    }
  ] })
  assert.equal(result.runDetails.activities[0].kind, 'file-change')
  assert.deepEqual(result.runDetails.changedFiles.map((item) => item.path), ['a.md', 'b.md'])
  assert.equal(result.runDetails.changedFiles.every((item) => item.confirmed === true), true)
})

test('translates terminal presenter status without exposing raw command output in the summary', () => {
  const result = projectConversation({ events: [
    {
      event: { seq: 1, type: 'tool/call', data: { callId: 'c1', name: 'bash', arguments: '{"command":"npm test"}' } },
      view: { for: 'call', view: { card: 'terminal', title: 'npm test', cwd: 'C:\\work' } }
    },
    {
      event: { seq: 2, type: 'tool/result', data: { message: { source: { callId: 'c1' } } } },
      view: { for: 'result', view: { card: 'terminal', output: 'secretly very long output', exitCode: 0 } }
    }
  ] })
  assert.equal(result.runDetails.activities[0].detail, '退出代码 0')
  assert.doesNotMatch(result.runDetails.activities[0].detail, /secretly/)
  assert.deepEqual(result.runDetails.toolCards[0], {
    id: 'c1', type: 'terminal', state: 'done', title: 'npm test', detail: '退出代码 0', durationMs: null,
    locations: [], command: 'npm test', description: '', cwd: 'C:\\work', output: 'secretly very long output', exitCode: 0, signal: ''
  })
})

test('normalizes official read, search, and web presenters behind one tool card interface', () => {
  const result = projectConversation({ events: [
    { event: { seq: 1, time: 100, type: 'tool/call', data: { callId: 'read-1', name: 'read', arguments: '{}' } }, view: { for: 'call', view: { card: 'generic', title: 'Read a.ts', kind: 'read', locations: [{ path: 'a.ts', line: 2 }] } } },
    { event: { seq: 2, time: 160, type: 'tool/result', data: { message: { source: { callId: 'read-1' } } } }, view: { for: 'result', view: { card: 'read', path: 'a.ts', offset: 2, totalLines: 9, lang: 'ts', lines: [{ number: 2, text: 'const a = 1' }] } } },
    { event: { seq: 3, type: 'tool/call', data: { callId: 'search-1', name: 'grep', arguments: '{}' } }, view: { for: 'call', view: { card: 'generic', title: 'Search TODO', kind: 'search' } } },
    { event: { seq: 4, type: 'tool/result', data: { message: { source: { callId: 'search-1' } } } }, view: { for: 'result', view: { card: 'search', shape: 'matches', files: [{ path: 'a.ts', matches: [{ lineNumber: 3, line: '// TODO' }] }], truncated: true, total: 4 } } },
    { event: { seq: 5, type: 'tool/call', data: { callId: 'web-1', name: 'web_search', arguments: '{}' } }, view: { for: 'call', view: { card: 'generic', title: 'Search the web', kind: 'search' } } },
    { event: { seq: 6, type: 'tool/result', data: { message: { source: { callId: 'web-1' } } } }, view: { for: 'result', view: { card: 'web', kind: 'search', sources: [{ url: 'https://example.test', title: 'Example' }], truncated: false } } }
  ] })
  const [read, search, web] = result.runDetails.toolCards
  assert.deepEqual(read.lines, [{ number: 2, text: 'const a = 1' }])
  assert.equal(read.durationMs, 60)
  assert.equal(search.files[0].matches[0].lineNumber, 3)
  assert.equal(search.truncated, true)
  assert.equal(web.sources[0].url, 'https://example.test')
})

test('run details and terminal outcome belong only to the latest Turn', () => {
  const result = projectConversation({ events: [
    { event: { type: 'turn/start', seq: 1, data: { turn: 1 } } },
    { event: { type: 'tool/call', seq: 2, data: { turn: 1, callId: 'old', name: 'read_file', arguments: { path: 'old.txt' } } } },
    { event: { type: 'tool/result', seq: 3, data: { turn: 1, callId: 'old' } } },
    { event: { type: 'turn/end', seq: 4, data: { turn: 1, reason: { kind: 'completed' } } } },
    { event: { type: 'turn/start', seq: 5, data: { turn: 2 } } },
    { event: { type: 'tool/call', seq: 6, data: { turn: 2, callId: 'new', name: 'read_file', arguments: { path: 'new.txt' } } } },
    { event: { type: 'tool/result', seq: 7, data: { turn: 2, callId: 'new' } } },
    { event: { type: 'turn/end', seq: 8, data: { turn: 2, reason: { kind: 'failed' } } } }
  ] })

  assert.deepEqual(result.runDetails.activities.map((item) => item.callId), ['new'])
  assert.deepEqual(result.runDetails.terminal, { state: 'failed', reason: 'failed', turn: 2 })
})

test('turn failures preserve a safe human recovery without exposing credential fragments', () => {
  const result = projectConversation({ events: [
    { event: { type: 'turn/start', seq: 1, data: { turn: 1 } } },
    { event: { type: 'turn/end', seq: 2, data: { turn: 1, reason: {
      kind: 'error',
      error: { message: 'Authentication Fails, Your api key: ****mRsP is invalid', code: 'AUTH', status: 401 }
    } } } }
  ] })

  assert.deepEqual(result.runDetails.terminal.failure, {
    kind: 'authentication',
    title: '模型服务拒绝了 API Key',
    detail: '这一轮请求被模型服务拒绝了；当时使用的 API Key 可能无效、已过期或不属于这个服务。这只说明这次请求，不代表当前保存的凭据仍然失败。',
    nextAction: '打开“模型服务”查看这个 Provider 最近一次真实验证；若没有更晚的通过记录，再替换 API Key 后重新验证。',
    code: 'AUTH',
    status: 401
  })
  assert.doesNotMatch(result.runDetails.terminal.failure.detail, /当前模型服务认为/)
  assert.doesNotMatch(JSON.stringify(result), /mRsP|api key: \*\*\*\*/i)
})

test('common provider failures have distinct beginner-facing recovery paths', () => {
  assert.equal(terminalFailure({ kind: 'error', error: { code: 'RATE_LIMIT', status: 429 } }).kind, 'rate-limit')
  assert.equal(terminalFailure({ kind: 'error', error: { code: 'INSUFFICIENT_QUOTA' } }).kind, 'quota')
  assert.equal(terminalFailure({ kind: 'error', error: { code: 'MODEL_UNAVAILABLE' } }).kind, 'model-unavailable')
  assert.equal(terminalFailure({ kind: 'error', error: { code: 'NETWORK_ERROR' } }).kind, 'network')
  assert.equal(terminalFailure({ kind: 'error', error: { code: 'UNCLASSIFIED' } }).kind, 'unknown')
})
