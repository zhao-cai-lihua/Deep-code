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
  await adapter.createSession({ baseUrl: 'http://127.0.0.1:4321', cwd: 'C:\\work', sessionId: 'session-existing' })
  assert.deepEqual(request.body.payload, { cwd: 'C:\\work', sessionId: 'session-existing' })
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

test('translates a text-only model image rejection into a beginner-facing recovery message', async () => {
  const adapter = new DshAdapter({
    fetchImpl: async () => ({ ok: true, json: async () => ({ result: { ok: false, error: { code: 'MODEL_DOES_NOT_SUPPORT_IMAGES', message: 'Model "deepseek-v4-flash" does not support image input.' } } }) })
  })
  await assert.rejects(
    () => adapter.prompt({ baseUrl: 'http://127.0.0.1:4321', sessionId: 's-1', text: '看图', images: [{ type: 'image', mediaType: 'image/png', data: 'AA==' }] }),
    /当前模型.*不支持图片.*图片仍保留/
  )
})

test('sends selected images through the official DSH prompt content seam', async () => {
  let payload
  const adapter = new DshAdapter({
    fetchImpl: async (_url, init) => {
      payload = JSON.parse(init.body).payload
      return { ok: true, json: async () => ({ result: { ok: true, value: { accepted: true } } }) }
    }
  })

  await adapter.prompt({
    baseUrl: 'http://127.0.0.1:4321',
    sessionId: 's-1',
    text: '这个界面为什么报错？',
    images: [{ type: 'image', mediaType: 'image/png', data: 'cG5n', name: 'error.png' }]
  })

  assert.deepEqual(payload, {
    sessionId: 's-1',
    mode: 'queue',
    content: [
      { type: 'text', text: '这个界面为什么报错？' },
      { type: 'image', mediaType: 'image/png', data: 'cG5n', name: 'error.png' }
    ]
  })
})

test('selects the official vision route before an image prompt and never guesses another model', async () => {
  const requests = []
  const adapter = new DshAdapter({
    fetchImpl: async (url, init) => {
      const method = url.split('/api/')[1]
      const payload = JSON.parse(init.body).payload
      requests.push({ method, payload })
      const value = method === 'session.models'
        ? {
            current: { provider: 'deepseek-official', model: 'deepseek-v4-flash' },
            groups: [{ id: 'deepseek-official', models: [
              { id: 'deepseek-v4-flash' }, { id: 'deepseek-v4-flash-vision-exp' }
            ] }]
          }
        : { selected: { provider: 'deepseek-official', model: 'deepseek-v4-flash-vision-exp' } }
      return { ok: true, json: async () => ({ result: { ok: true, value } }) }
    }
  })

  const result = await adapter.selectOfficialVisionModel({ baseUrl: 'http://127.0.0.1:4321', sessionId: 's-vision' })

  assert.equal(result.changed, true)
  assert.deepEqual(requests, [
    { method: 'session.models', payload: { sessionId: 's-vision' } },
    { method: 'session.selectModel', payload: {
      sessionId: 's-vision', provider: 'deepseek-official', model: 'deepseek-v4-flash-vision-exp'
    } }
  ])
})

test('keeps image drafts recoverable when the official vision route is unavailable', async () => {
  const adapter = new DshAdapter({ fetchImpl: async () => ({
    ok: true,
    json: async () => ({ result: { ok: true, value: {
      current: { provider: 'deepseek-official', model: 'deepseek-v4-flash' },
      groups: [{ id: 'deepseek-official', models: [{ id: 'deepseek-v4-flash' }] }]
    } } })
  }) })

  await assert.rejects(
    adapter.selectOfficialVisionModel({ baseUrl: 'http://127.0.0.1:4321', sessionId: 's-text' }),
    /没有发现官方图片模型.*图片仍保留/
  )
})

test('reads the official session-scoped Skills catalog without invoking a skill', async () => {
  let request
  const adapter = new DshAdapter({
    fetchImpl: async (_url, init) => {
      request = JSON.parse(init.body)
      return { ok: true, json: async () => ({ result: { ok: true, value: { skills: [{ name: 'review', description: 'Review code', modelInvocable: true }] } } }) }
    }
  })
  const result = await adapter.listSkills({ baseUrl: 'http://127.0.0.1:4321', sessionId: 's-1' })
  assert.equal(request.method, 'skill.list')
  assert.deepEqual(request.payload, { sessionId: 's-1' })
  assert.equal(result.skills[0].name, 'review')
})

test('projects the effective Session model without guessing token or cost data', async () => {
  const adapter = new DshAdapter({ fetchImpl: async (url) => {
    const method = url.split('/api/')[1]
    const value = ({
      'session.history': { events: [], hasMore: false },
      'session.list': { items: [{ sessionId: 's-model', running: false }] },
      'session.models': {
        current: { provider: 'deepseek-official', model: 'deepseek-v4-flash' },
        groups: [{ id: 'deepseek-official', models: [{ id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash' }] }]
      }
    })[method]
    return { ok: true, json: async () => ({ result: { ok: true, value } }) }
  } })

  const snapshot = await adapter.snapshot({ baseUrl: 'http://127.0.0.1:4321', sessionId: 's-model' })

  assert.deepEqual(snapshot.model, {
    available: true, provider: 'deepseek-official', id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash'
  })
})

function rpcFetch(responses) {
  return async (url) => {
    const method = url.split('/api/')[1]
    const value = responses[method]
    if (value instanceof Error) {
      return { ok: true, json: async () => ({ result: { ok: false, error: { message: value.message } } }) }
    }
    return { ok: true, json: async () => ({ result: { ok: true, value } }) }
  }
}

const deepSeekCatalog = {
  'llm.providers': {
    providers: [
      { provider: 'deepseek-official', displayName: 'DeepSeek', settingsNs: 'llm-deepseek', active: true },
      { provider: 'openai', displayName: 'OpenAI', settingsNs: 'llm-openai', active: false }
    ]
  },
  'llm.models': {
    groups: [{ id: 'deepseek-official', name: 'DeepSeek', models: [
      { id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash' },
      { id: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro' }
    ] }],
    failures: []
  }
}

test('reports a ready model connection without exposing credential values', async () => {
  const adapter = new DshAdapter({ fetchImpl: rpcFetch({
    ...deepSeekCatalog,
    'credentials.describe': { credentials: { DEEPSEEK_API_KEY: { configured: true, source: 'file', writable: true } } }
  }) })

  const snapshot = await adapter.connectionSnapshot({ baseUrl: 'http://127.0.0.1:4321' })
  assert.equal(snapshot.state, 'ready')
  assert.equal(snapshot.activeProviders[0].name, 'DeepSeek')
  assert.equal(snapshot.activeProviders[0].modelCount, 2)
  assert.deepEqual(snapshot.activeProviders[0].credential, { ref: 'DEEPSEEK_API_KEY', configured: true, source: 'file', writable: true })
  assert.deepEqual(snapshot.credentialManagement, { supported: true, writable: true, configured: true, source: 'file' })
  assert.doesNotMatch(JSON.stringify(snapshot), /sk-|secret|credentialValue/)
})

test('distinguishes a model catalog from a configured credential', async () => {
  const adapter = new DshAdapter({ fetchImpl: rpcFetch({
    ...deepSeekCatalog,
    'credentials.describe': { credentials: { DEEPSEEK_API_KEY: { configured: false, writable: true } } }
  }) })

  const snapshot = await adapter.connectionSnapshot({ baseUrl: 'http://127.0.0.1:4321' })
  assert.equal(snapshot.state, 'needs-credential')
  assert.match(snapshot.message, /API Key/)
  assert.equal(snapshot.modelCount, 2)
  assert.deepEqual(snapshot.credentialManagement, { supported: true, writable: true, configured: false })
})

test('keeps provider failures visible as a partial connection', async () => {
  const adapter = new DshAdapter({ fetchImpl: rpcFetch({
    ...deepSeekCatalog,
    'llm.models': { ...deepSeekCatalog['llm.models'], failures: [{ provider: 'extra-provider', message: '插件载入失败' }] },
    'credentials.describe': new Error('凭据状态暂时不可读')
  }) })

  const snapshot = await adapter.connectionSnapshot({ baseUrl: 'http://127.0.0.1:4321' })
  assert.equal(snapshot.state, 'partial')
  assert.equal(snapshot.failures.length, 2)
  assert.deepEqual(snapshot.credentialManagement, { supported: false, writable: false, configured: false })
  assert.match(snapshot.title, /未完全确认/)
})

test('does not claim authentication for a provider whose credential contract is unknown', async () => {
  const adapter = new DshAdapter({ fetchImpl: rpcFetch({
    'llm.providers': { providers: [{ provider: 'local-custom', displayName: 'Custom', active: true }] },
    'llm.models': { groups: [{ id: 'local-custom', models: [{ id: 'model-1', name: 'Model 1' }] }], failures: [] }
  }) })

  const snapshot = await adapter.connectionSnapshot({ baseUrl: 'http://127.0.0.1:4321' })
  assert.equal(snapshot.state, 'partial')
  assert.equal(snapshot.activeProviders[0].credential, null)
})

test('writes and clears only the fixed DeepSeek credential reference', async () => {
  const requests = []
  const adapter = new DshAdapter({
    fetchImpl: async (url, init) => {
      requests.push({ method: url.split('/api/')[1], payload: JSON.parse(init.body).payload })
      return { ok: true, json: async () => ({ result: { ok: true, value: {} } }) }
    }
  })

  await adapter.saveDeepSeekCredential({ baseUrl: 'http://127.0.0.1:4321', value: 'dsk-test-value' })
  await adapter.clearDeepSeekCredential({ baseUrl: 'http://127.0.0.1:4321' })
  assert.deepEqual(requests, [
    { method: 'credentials.set', payload: { ref: 'DEEPSEEK_API_KEY', value: 'dsk-test-value' } },
    { method: 'credentials.unset', payload: { ref: 'DEEPSEEK_API_KEY' } }
  ])
})

test('never repeats a submitted credential in validation or upstream errors', async () => {
  const secret = 'dsk-super-private-value'
  const adapter = new DshAdapter({ fetchImpl: rpcFetch({ 'credentials.set': new Error(`credential ${secret} rejected`) }) })

  await assert.rejects(
    () => adapter.saveDeepSeekCredential({ baseUrl: 'http://127.0.0.1:4321', value: secret }),
    (error) => !error.message.includes(secret) && /没有保存/.test(error.message)
  )
  await assert.rejects(
    () => adapter.saveDeepSeekCredential({ baseUrl: 'http://127.0.0.1:4321', value: '  accidental-space  ' }),
    /首尾.*空格/
  )
})
