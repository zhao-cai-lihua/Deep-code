const test = require('node:test')
const assert = require('node:assert/strict')
const {
  assertHostMatchesRuntime,
  describeHarnessHost,
  inspectAuditedRuntime,
  inspectCompatibleRuntime,
  validateHostDescription
} = require('../src/engine-trust.cjs')

test('rejects a loopback service whose root is healthy but host.describe is unavailable', async () => {
  await assert.rejects(
    describeHarnessHost('http://127.0.0.1:3080', async () => ({ ok: false, status: 404 })),
    /host\.describe/
  )
})

test('accepts only the complete official host.describe shape', () => {
  assert.throws(() => validateHostDescription({ version: '0.1.1-rc.2', cwd: 'C:\\dsh', attachedSessions: 0 }), /结构/)
  assert.deepEqual(validateHostDescription({
    version: '0.1.1-rc.2', cwd: 'C:\\dsh', attachedSessions: 0,
    home: 'C:\\Users\\test', canOpenPath: true
  }), {
    version: '0.1.1-rc.2', cwd: 'C:\\dsh', attachedSessions: 0,
    home: 'C:\\Users\\test', canOpenPath: true
  })
})

test('does not accept a successful HTTP response with a malformed RPC body', async () => {
  await assert.rejects(describeHarnessHost('http://127.0.0.1:3080', async () => ({
    ok: true,
    json: async () => ({ result: { ok: true, value: { version: 'pretend' } } })
  })), /结构/)
})

test('rejects host version and working-directory mismatches', () => {
  const runtime = {
    version: '0.1.1-rc.2',
    revision: 'b150a551b8d465e31e418e1b2eaf5e79bbb7d28e',
    hostDescribeVersion: '0.0.1'
  }
  const host = { version: '0.0.1', cwd: 'C:\\runtime', attachedSessions: 0, home: 'C:\\Users\\test', canOpenPath: true }
  assert.doesNotThrow(() => assertHostMatchesRuntime(host, 'C:\\runtime', runtime))
  assert.throws(() => assertHostMatchesRuntime({ ...host, version: '0.0.2' }, 'C:\\runtime', runtime), /host\.describe/)
  assert.throws(() => assertHostMatchesRuntime({ ...host, cwd: 'C:\\other' }, 'C:\\runtime', runtime), /工作目录/)
})

test('rejects an unpinned runtime package, version, or Git HEAD before launch', () => {
  const readText = () => JSON.stringify({ name: '@deepseek-ai/dsh-root', version: '0.1.1-rc.2' })
  assert.throws(() => inspectCompatibleRuntime('C:\\runtime', {
    readText,
    runGit: () => 'not-the-pinned-head\n'
  }), /尚未验证/)
  assert.throws(() => inspectCompatibleRuntime('C:\\runtime', {
    readText: () => JSON.stringify({ name: 'pretend-harness', version: '0.1.1-rc.2' }),
    runGit: () => 'b150a551b8d465e31e418e1b2eaf5e79bbb7d28e\n'
  }), /不是官方/)
})

test('keeps the pinned runtime release separate from the upstream host.describe placeholder', () => {
  const runtime = inspectCompatibleRuntime('C:\\runtime', {
    readText: () => JSON.stringify({ name: '@deepseek-ai/dsh-root', version: '0.1.1-rc.2' }),
    runGit: () => 'b150a551b8d465e31e418e1b2eaf5e79bbb7d28e\n'
  })
  assert.equal(runtime.version, '0.1.1-rc.2')
  assert.equal(runtime.hostDescribeVersion, '0.0.1')
})

test('recognizes the exact audited 0.1.5 checkout as a disabled protocol candidate', () => {
  const readText = () => JSON.stringify({ name: '@deepseek-ai/dsh-root', version: '0.1.5-rc.2' })
  const runGit = () => 'fb2c4b9e698e30edb738bca4cf0618587db7d203\n'

  assert.deepEqual(inspectAuditedRuntime('C:\\runtime', { readText, runGit }), {
    official: true,
    tag: 'dsh-v0.1.5-rc.2',
    version: '0.1.5-rc.2',
    revision: 'fb2c4b9e698e30edb738bca4cf0618587db7d203',
    protocol: 'typert-0.1.5',
    status: 'candidate'
  })
  assert.throws(() => inspectCompatibleRuntime('C:\\runtime', { readText, runGit }), /尚未验证/)
})
