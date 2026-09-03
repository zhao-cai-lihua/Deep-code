const test = require('node:test')
const assert = require('node:assert/strict')
const { DshAdapter, humanizeHistory, deriveCredentialRef } = require('../src/dsh-adapter.cjs')

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

test('loads and selects through the official session model directory seam', async () => {
  const requests = []
  const directory = {
    current: { provider: 'openai', model: 'gpt-5.6-terra', reasoningEffort: 'medium' },
    routable: true,
    groups: [{ id: 'openai', name: 'OpenAI', models: [{
      id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna',
      reasoning: { efforts: [{ id: 'max', name: 'Max' }], defaultEffort: 'max' }
    }] }],
    failures: []
  }
  const adapter = new DshAdapter({ fetchImpl: async (url, init) => {
    const method = url.split('/api/')[1]
    const payload = JSON.parse(init.body).payload
    requests.push({ method, payload })
    const value = method === 'session.models'
      ? directory
      : { selected: { provider: 'openai', model: 'gpt-5.6-luna', reasoningEffort: 'max' } }
    return { ok: true, json: async () => ({ result: { ok: true, value } }) }
  } })

  assert.deepEqual(await adapter.modelDirectory({ baseUrl: 'http://127.0.0.1:4321', sessionId: 's-route' }), directory)
  const selected = await adapter.selectModel({
    baseUrl: 'http://127.0.0.1:4321', sessionId: 's-route',
    selection: { provider: 'openai', model: 'gpt-5.6-luna', reasoningEffort: 'max' }
  })
  assert.deepEqual(selected, { provider: 'openai', model: 'gpt-5.6-luna', reasoningEffort: 'max' })
  assert.deepEqual(requests.at(-1), { method: 'session.selectModel', payload: {
    sessionId: 's-route', provider: 'openai', model: 'gpt-5.6-luna', reasoningEffort: 'max'
  } })
})

test('loads the host model catalog for a new-task picker without creating a Session', async () => {
  let request
  const adapter = new DshAdapter({ fetchImpl: async (_url, init) => {
    request = JSON.parse(init.body)
    return { ok: true, json: async () => ({ result: { ok: true, value: deepSeekCatalog['llm.models'] } }) }
  } })
  const catalog = await adapter.globalModelDirectory({ baseUrl: 'http://127.0.0.1:4321' })
  assert.equal(request.method, 'llm.models')
  assert.equal(catalog.groups[0].models.length, 2)
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
      'session.history': { events: [{ event: { type: 'request/header', data: { header: { config: {
        provider: 'deepseek-official', model: 'deepseek-v4-flash', reasoningEffort: 'high'
      } } } } }], hasMore: false },
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
    available: true, provider: 'deepseek-official', id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash', reasoningEffort: ''
  })
  assert.equal(snapshot.model.reasoningEffort, '')
  assert.deepEqual(snapshot.effectiveModel, {
    available: true, provider: 'deepseek-official', id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash',
    reasoningEffort: 'high', evidence: 'request/header'
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
      { provider: 'deepseek-official', displayName: 'DeepSeek', settingsNs: 'llm-deepseek', settingsPath: [], active: true },
      { provider: 'openai', displayName: 'OpenAI', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'openai'], active: false }
    ]
  },
  'llm.models': {
    groups: [{ id: 'deepseek-official', name: 'DeepSeek', models: [
      { id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash' },
      { id: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro' }
    ] }],
    failures: []
  },
  'settings.describe': {
    writable: true,
    namespaces: [{ ns: 'llm-deepseek', value: { apiKeyEnv: 'DEEPSEEK_API_KEY' }, secrets: [], revision: 0, applies: 'live' }]
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
  assert.deepEqual(snapshot.credentialManagement, { supported: true, writable: true, configured: true, providerCount: 1 })
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
  assert.deepEqual(snapshot.credentialManagement, { supported: true, writable: true, configured: false, providerCount: 1 })
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
  assert.deepEqual(snapshot.credentialManagement, { supported: true, writable: false, configured: false, providerCount: 1 })
  assert.match(snapshot.title, /未完全确认/)
})

test('does not claim authentication for a provider whose credential contract is unknown', async () => {
  const adapter = new DshAdapter({ fetchImpl: rpcFetch({
    'llm.providers': { providers: [{ provider: 'local-custom', displayName: 'Custom', active: true }] },
    'llm.models': { groups: [{ id: 'local-custom', models: [{ id: 'model-1', name: 'Model 1' }] }], failures: [] },
    'settings.describe': { writable: true, namespaces: [] }
  }) })

  const snapshot = await adapter.connectionSnapshot({ baseUrl: 'http://127.0.0.1:4321' })
  assert.equal(snapshot.state, 'ready')
  assert.equal(snapshot.activeProviders[0].credential, null)
})

test('derives multiple simple API Key references from Harness provider settings', async () => {
  const adapter = new DshAdapter({ fetchImpl: rpcFetch({
    'llm.providers': { providers: [
      { provider: 'openai', displayName: 'OpenAI', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'openai'], active: true },
      { provider: 'anthropic', displayName: 'Anthropic', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'anthropic'], active: true }
    ] },
    'llm.models': { groups: [
      { id: 'openai', models: [{ id: 'gpt-test' }] },
      { id: 'anthropic', models: [{ id: 'claude-test' }] }
    ], failures: [] },
    'settings.describe': { writable: true, namespaces: [{
      ns: 'llm-pi-ai',
      value: { providers: { openai: { apiKeyEnv: 'OPENAI_API_KEY' }, anthropic: { apiKeyEnv: 'ANTHROPIC_API_KEY' } } },
      secrets: [], revision: 0, applies: 'live'
    }] },
    'credentials.describe': { credentials: {
      OPENAI_API_KEY: { configured: true, source: 'file', writable: true },
      ANTHROPIC_API_KEY: { configured: false, writable: true }
    } }
  }) })

  const snapshot = await adapter.connectionSnapshot({ baseUrl: 'http://127.0.0.1:4321' })
  assert.deepEqual(snapshot.evidence.credentialRefsChecked, ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'])
  assert.equal(snapshot.activeProviders[0].credential.ref, 'OPENAI_API_KEY')
  assert.equal(snapshot.activeProviders[1].credential.ref, 'ANTHROPIC_API_KEY')
  assert.deepEqual(snapshot.credentialManagement, { supported: true, writable: true, configured: false, providerCount: 2 })
})

test('writes and clears only an explicitly supplied valid Harness credential reference', async () => {
  const requests = []
  const adapter = new DshAdapter({
    fetchImpl: async (url, init) => {
      requests.push({ method: url.split('/api/')[1], payload: JSON.parse(init.body).payload })
      return { ok: true, json: async () => ({ result: { ok: true, value: {} } }) }
    }
  })

  await adapter.saveCredential({ baseUrl: 'http://127.0.0.1:4321', ref: 'DEEPSEEK_API_KEY', value: 'dsk-test-value' })
  await adapter.clearCredential({ baseUrl: 'http://127.0.0.1:4321', ref: 'DEEPSEEK_API_KEY' })
  assert.deepEqual(requests, [
    { method: 'credentials.set', payload: { ref: 'DEEPSEEK_API_KEY', value: 'dsk-test-value' } },
    { method: 'credentials.unset', payload: { ref: 'DEEPSEEK_API_KEY' } }
  ])
})

test('never repeats a submitted credential in validation or upstream errors', async () => {
  const secret = 'dsk-super-private-value'
  const adapter = new DshAdapter({ fetchImpl: rpcFetch({ 'credentials.set': new Error(`credential ${secret} rejected`) }) })

  await assert.rejects(
    () => adapter.saveCredential({ baseUrl: 'http://127.0.0.1:4321', ref: 'DEEPSEEK_API_KEY', value: secret }),
    (error) => !error.message.includes(secret) && /没有保存/.test(error.message)
  )
  await assert.rejects(
    () => adapter.saveCredential({ baseUrl: 'http://127.0.0.1:4321', ref: 'DEEPSEEK_API_KEY', value: '  accidental-space  ' }),
    /首尾.*空格/
  )
})

test('lists dormant simple providers and provisions one through profile then write-only credential', async () => {
  const requests = []
  const responses = {
    'llm.providers': { providers: [
      { provider: 'deepseek-official', displayName: 'DeepSeek', settingsNs: 'llm-deepseek', settingsPath: [], active: true },
      { provider: 'openai', displayName: 'openai', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'openai'], active: false },
      { provider: 'amazon-bedrock', displayName: 'amazon-bedrock', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'amazon-bedrock'], active: false }
    ] },
    'llm.models': { groups: [{ id: 'deepseek-official', name: 'DeepSeek', models: [] }], failures: [] },
    'settings.describe': { writable: true, namespaces: [
      { ns: 'llm-deepseek', value: { apiKeyEnv: 'DEEPSEEK_API_KEY' }, revision: 0 },
      { ns: 'llm-pi-ai', value: { providers: {} }, revision: 7 }
    ] },
    'credentials.describe': { credentials: { DEEPSEEK_API_KEY: { configured: true, writable: true } } },
    'settings.mutate': { ns: 'llm-pi-ai', revision: 8 },
    'credentials.set': {}
  }
  const adapter = new DshAdapter({ fetchImpl: async (url, init) => {
    const method = url.split('/api/')[1]
    requests.push({ method, payload: JSON.parse(init.body).payload })
    return { ok: true, json: async () => ({ result: { ok: true, value: responses[method] } }) }
  } })

  const snapshot = await adapter.connectionSnapshot({ baseUrl: 'http://127.0.0.1:4321' })
  assert.deepEqual(snapshot.provisioning.providers.map((provider) => provider.id), ['openai'])
  assert.equal(snapshot.provisioning.supported, true)
  assert.equal(deriveCredentialRef('qwen-token-plan-cn'), 'QWEN_TOKEN_PLAN_CN_API_KEY')

  await adapter.provisionCatalogProvider({ baseUrl: 'http://127.0.0.1:4321', provider: 'openai', value: 'sk-valid-value' })
  assert.deepEqual(requests.slice(-2), [
    { method: 'settings.mutate', payload: {
      ns: 'llm-pi-ai',
      ops: [{ op: 'set', path: ['providers', 'openai'], value: { apiKeyEnv: 'OPENAI_API_KEY' } }],
      expectedRevision: 7
    } },
    { method: 'credentials.set', payload: { ref: 'OPENAI_API_KEY', value: 'sk-valid-value' } }
  ])
})

test('reports profile creation honestly when the provider credential stage fails', async () => {
  const secret = 'sk-private-value'
  const adapter = new DshAdapter({ fetchImpl: async (url) => {
    const method = url.split('/api/')[1]
    const value = method === 'llm.providers'
      ? { providers: [{ provider: 'anthropic', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'anthropic'], active: false }] }
      : method === 'settings.describe'
        ? { writable: true, namespaces: [{ ns: 'llm-pi-ai', revision: 2 }] }
        : {}
    if (method === 'credentials.set') return { ok: true, json: async () => ({ result: { ok: false, error: { message: `rejected ${secret}` } } }) }
    return { ok: true, json: async () => ({ result: { ok: true, value } }) }
  } })

  await assert.rejects(
    adapter.provisionCatalogProvider({ baseUrl: 'http://127.0.0.1:4321', provider: 'anthropic', value: secret }),
    (error) => /已经创建.*密钥阶段失败/.test(error.message) && !error.message.includes(secret)
  )
})

test('removes an explicitly selected catalog provider by clearing its credential then unsetting its exact profile', async () => {
  const requests = []
  const responses = {
    'llm.providers': { providers: [{ provider: 'anthropic', displayName: 'Anthropic', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'anthropic'], active: true }] },
    'settings.describe': { writable: true, namespaces: [{ ns: 'llm-pi-ai', revision: 9, value: { providers: { anthropic: { apiKeyEnv: 'ANTHROPIC_API_KEY' } } } }] },
    'credentials.unset': {},
    'settings.mutate': { ns: 'llm-pi-ai', revision: 10 }
  }
  const adapter = new DshAdapter({ fetchImpl: async (url, init) => {
    const method = url.split('/api/')[1]
    requests.push({ method, payload: JSON.parse(init.body).payload })
    return { ok: true, json: async () => ({ result: { ok: true, value: responses[method] } }) }
  } })

  const removed = await adapter.removeCatalogProvider({ baseUrl: 'http://127.0.0.1:4321', provider: 'anthropic' })
  assert.deepEqual(removed, { removed: true, provider: 'anthropic', name: 'Anthropic / Claude', credentialRef: 'ANTHROPIC_API_KEY' })
  assert.deepEqual(requests.slice(-2), [
    { method: 'credentials.unset', payload: { ref: 'ANTHROPIC_API_KEY' } },
    { method: 'settings.mutate', payload: { ns: 'llm-pi-ai', ops: [{ op: 'unset', path: ['providers', 'anthropic'] }], expectedRevision: 9 } }
  ])
})
