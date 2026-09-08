const test = require('node:test')
const assert = require('node:assert/strict')
const { assertHostMatchesRuntime, describeHarnessHost, inspectCompatibleRuntime, validateHostDescription } = require('../src/engine-trust.cjs')

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
  const runtime = { version: '0.1.1-rc.2', revision: 'b150a551b8d465e31e418e1b2eaf5e79bbb7d28e' }
  const host = { version: '0.1.1-rc.2', cwd: 'C:\\runtime', attachedSessions: 0, home: 'C:\\Users\\test', canOpenPath: true }
  assert.throws(() => assertHostMatchesRuntime({ ...host, version: '0.1.2-rc.1' }, 'C:\\runtime', runtime), /版本/)
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
