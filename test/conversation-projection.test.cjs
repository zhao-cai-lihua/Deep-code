const test = require('node:test')
const assert = require('node:assert/strict')
const { projectConversation } = require('../src/conversation-projection.cjs')

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
  assert.equal(result.runDetails.permissionFacts[0].label, '文件权限：完全访问')
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

test('projects successful tool calls into readable activity and changed files', () => {
  const page = { events: [
    { event: { seq: 1, time: 1000, type: 'tool/call', data: { callId: 'c1', name: 'write', arguments: '{"file_path":"C:\\\\work\\\\README.md","content":"hi"}' } } },
    { event: { seq: 2, time: 1300, type: 'tool/result', data: { message: { source: { callId: 'c1' }, content: [] } } }, view: { title: '文件已写入' } },
    { event: { seq: 3, time: 1400, type: 'tool/call', data: { callId: 'c2', name: 'read', arguments: '{"path":"C:\\\\work\\\\package.json"}' } }, view: { title: '读取项目配置' } },
    { event: { seq: 4, time: 1500, type: 'tool/result', data: { message: { source: { callId: 'c2' }, content: [] } } } }
  ] }
  const result = projectConversation(page)
  assert.deepEqual(result.runDetails.changedFiles, [{ path: 'C:\\work\\README.md', operation: '写入', seq: 2 }])
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

test('shows only the latest effective file permission while preserving both raw snapshots', () => {
  const result = projectConversation({ events: [
    { event: { seq: 1, type: 'user/message', data: { content: [{ type: 'text', text: 'Current DSH file policy: read-only.' }], source: { kind: 'plugin', plugin: 'sandbox-policy' } } } },
    { event: { seq: 2, type: 'user/message', data: { content: [{ type: 'text', text: 'Current DSH file policy: workspace-write.' }], source: { kind: 'plugin', plugin: 'sandbox-policy' } } } }
  ] })
  assert.deepEqual(result.runDetails.permissionFacts.map((item) => item.label), ['文件权限：仅工作区可写'])
  assert.equal(result.runDetails.runtimeContext.length, 2)
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
