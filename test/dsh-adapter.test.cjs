const test = require('node:test')
const assert = require('node:assert/strict')
const { DshAdapter, humanizeHistory } = require('../src/dsh-adapter.cjs')

test('calls only the loopback DSH RPC bridge and unwraps its result', async () => {
  let request
  const adapter = new DshAdapter({
    fetchImpl: async (url, init) => {
      request = { url, body: JSON.parse(init.body) }
      return { ok: true, json: async () => ({ result: { ok: true, value: { sessionId: 's-1' } } }) }
    }
  })
  assert.deepEqual(await adapter.createSession({ baseUrl: 'http://127.0.0.1:4321', cwd: 'C:\\work' }), { sessionId: 's-1' })
  assert.equal(request.url, 'http://127.0.0.1:4321/api/session.create')
  assert.deepEqual(request.body.payload, { cwd: 'C:\\work' })
  await assert.rejects(() => adapter.createSession({ baseUrl: 'http://example.com:4321', cwd: 'C:\\work' }), /只连接本机/)
})

test('normalizes user and assistant messages while keeping tool events as evidence', () => {
  const result = humanizeHistory({
    events: [
      { event: { seq: 1, type: 'user/message', data: { content: [{ type: 'text', text: '解释项目' }] } } },
      { event: { seq: 2, type: 'tool/call', data: { name: 'read_file' } }, view: { title: '读取 README' } },
      { event: { seq: 3, type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '这个项目是…' }] } } } }
    ],
    hasMore: false
  })
  assert.deepEqual(result.messages.map(({ role, text }) => ({ role, text })), [
    { role: 'user', text: '解释项目' },
    { role: 'assistant', text: '这个项目是…' }
  ])
  assert.deepEqual(result.evidence, [{ type: 'tool/call', seq: 2, detail: { title: '读取 README' } }])
})

test('surfaces DSH RPC failures as a readable Engine error', async () => {
  const adapter = new DshAdapter({
    fetchImpl: async () => ({ ok: true, json: async () => ({ result: { ok: false, error: { code: 'missing-key', message: 'API Key 未配置' } } }) })
  })
  await assert.rejects(() => adapter.prompt({ baseUrl: 'http://127.0.0.1:4321', sessionId: 's-1', text: '开始' }), /API Key 未配置/)
})
