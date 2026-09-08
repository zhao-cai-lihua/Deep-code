const test = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { RuntimeSupervisor, resolveHarnessEntrypoint, resolveNodeExecutable } = require('../src/runtime-supervisor.cjs')

function fakeChild() {
  const child = new EventEmitter()
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.kill = () => child.emit('exit', 0, 'SIGINT')
  return child
}

const compatibleRuntime = () => ({
  official: true,
  version: '0.1.1-rc.2',
  revision: 'b150a551b8d465e31e418e1b2eaf5e79bbb7d28e',
  hostDescribeVersion: '0.0.1'
})

const matchingHost = async () => ({
  version: '0.0.1', cwd: 'C:\\runtime', attachedSessions: 0,
  home: 'C:\\Users\\test', canOpenPath: true
})

test('becomes ready only after the owned child URL passes host.describe and runtime checks', async () => {
  const child = fakeChild()
  const supervisor = new RuntimeSupervisor({
    spawnProcess: () => child, pathExists: () => true, probeShared: async () => null,
    describeHost: matchingHost, inspectRuntime: compatibleRuntime, platform: 'linux'
  })
  await supervisor.start('C:\\runtime')
  assert.equal(supervisor.snapshot().state, 'starting')
  child.stdout.emit('data', 'dsh web: http://127.0.0.1:41921\n')
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(supervisor.snapshot().state, 'ready')
  assert.equal(supervisor.snapshot().url, 'http://127.0.0.1:41921')
  assert.equal(supervisor.snapshot().trust, 'managed-process')
  assert.equal(supervisor.snapshot().version, '0.1.1-rc.2')
  assert.equal(supervisor.snapshot().hostDescribeVersion, '0.0.1')
})

test('accepts a parent folder that contains deepseek-harness', async () => {
  const child = fakeChild()
  const supervisor = new RuntimeSupervisor({
    spawnProcess: () => child,
    pathExists: (path) => path === 'C:\\Desktop' || path === 'C:\\Desktop\\deepseek-harness\\package.json',
    probeShared: async () => null,
    describeHost: async (_url) => ({ ...(await matchingHost()), cwd: 'C:\\Desktop\\deepseek-harness' }),
    inspectRuntime: compatibleRuntime,
    platform: 'linux'
  })
  const status = await supervisor.start('C:\\Desktop')
  assert.equal(status.runtimePath, 'C:\\Desktop\\deepseek-harness')
})

test('holds a compatible shared Harness for explicit confirmation instead of adopting it', async () => {
  let spawned = false
  const supervisor = new RuntimeSupervisor({
    spawnProcess: () => { spawned = true },
    pathExists: () => true,
    probeShared: async () => ({
      baseUrl: 'http://127.0.0.1:3080',
      descriptor: { version: '0.0.1', cwd: 'C:\\runtime', attachedSessions: 0, home: 'C:\\Users\\test', canOpenPath: true }
    }),
    describeHost: matchingHost,
    inspectRuntime: compatibleRuntime
  })
  const status = await supervisor.start('C:\\runtime')
  assert.equal(status.state, 'awaiting-user')
  assert.equal(status.owned, false)
  assert.equal(status.trust, null)
  assert.equal(status.version, '0.1.1-rc.2')
  assert.equal(status.hostDescribeVersion, '0.0.1')
  assert.equal(spawned, false)

  const confirmed = await supervisor.confirmShared()
  assert.equal(confirmed.state, 'ready')
  assert.equal(confirmed.trust, 'user-confirmed-shared')
  assert.equal(confirmed.version, '0.1.1-rc.2')
  assert.equal(confirmed.hostDescribeVersion, '0.0.1')
})

test('rechecks the pinned runtime when a shared Harness is explicitly confirmed', async () => {
  let inspections = 0
  const supervisor = new RuntimeSupervisor({
    pathExists: () => true,
    probeShared: async () => ({
      baseUrl: 'http://127.0.0.1:3080',
      descriptor: await matchingHost()
    }),
    describeHost: matchingHost,
    inspectRuntime: () => {
      inspections += 1
      if (inspections > 1) throw new Error('HEAD mismatch after prompt')
      return compatibleRuntime()
    }
  })
  await supervisor.start('C:\\runtime')
  await assert.rejects(supervisor.confirmShared(), /HEAD mismatch after prompt/)
  assert.equal(inspections, 2)
  assert.notEqual(supervisor.snapshot().state, 'ready')
})

test('starts Harness through Node directly instead of relying on pnpm in the desktop PATH', async () => {
  const child = fakeChild()
  let invocation
  const supervisor = new RuntimeSupervisor({
    spawnProcess: (command, args, options) => {
      invocation = { command, args, options }
      return child
    },
    pathExists: (path) => path === 'C:\\runtime' || path === 'C:\\runtime\\package.json' || path === 'C:\\Program Files\\nodejs\\node.exe',
    probeShared: async () => null,
    describeHost: matchingHost,
    inspectRuntime: compatibleRuntime,
    platform: 'win32',
    environment: { PATH: 'C:\\Windows\\System32;C:\\Program Files\\nodejs', ProgramFiles: 'C:\\Program Files' }
  })

  await supervisor.start('C:\\runtime')

  assert.equal(invocation.command, 'C:\\Program Files\\nodejs\\node.exe')
  assert.deepEqual(invocation.args, ['--import', 'tsx/esm', 'apps/cli/src/bin.ts', 'web', '--no-open', '--port', '0'])
  assert.equal(invocation.options.shell, false)
  assert.equal(invocation.options.env.UNRELATED_TOKEN, undefined)
  assert.equal(invocation.options.env.NODE_OPTIONS, undefined)
})

test('finds node.exe from the desktop process PATH without consulting pnpm', () => {
  const executable = resolveNodeExecutable({
    platform: 'win32',
    environment: { PATH: 'C:\\Windows\\System32;C:\\Program Files\\nodejs' },
    pathExists: (path) => path === 'C:\\Program Files\\nodejs\\node.exe'
  })
  assert.equal(executable, 'C:\\Program Files\\nodejs\\node.exe')
})

test('waits for the spawned Harness to publish its loopback URL before a task continues', async () => {
  const child = fakeChild()
  const supervisor = new RuntimeSupervisor({ spawnProcess: () => child, pathExists: () => true, probeShared: async () => null, describeHost: matchingHost, inspectRuntime: compatibleRuntime, platform: 'linux' })
  await supervisor.start('C:\\runtime')
  const ready = supervisor.waitUntilReady({ timeoutMs: 100 })
  child.stdout.emit('data', 'dsh web: http://127.0.0.1:41921\n')
  assert.equal((await ready).url, 'http://127.0.0.1:41921')
})

test('reports a stopped Harness while a task is waiting instead of calling the Adapter without a URL', async () => {
  const child = fakeChild()
  const supervisor = new RuntimeSupervisor({ spawnProcess: () => child, pathExists: () => true, probeShared: async () => null, describeHost: matchingHost, inspectRuntime: compatibleRuntime, platform: 'linux' })
  await supervisor.start('C:\\runtime')
  const ready = supervisor.waitUntilReady({ timeoutMs: 100 })
  child.emit('exit', 1, null)
  await assert.rejects(ready, /退出代码 1/)
})

test('prefers the built Harness CLI when the checkout has been compiled', () => {
  assert.deepEqual(
    resolveHarnessEntrypoint('C:\\runtime', (path) => path === 'C:\\runtime\\apps\\cli\\lib\\bin.js'),
    ['apps/cli/lib/bin.js', 'web', '--no-open', '--port', '0']
  )
})

test('falls back to the TypeScript entrypoint in an unbuilt checkout', () => {
  assert.deepEqual(resolveHarnessEntrypoint('C:\\runtime', () => false), ['--import', 'tsx/esm', 'apps/cli/src/bin.ts', 'web', '--no-open', '--port', '0'])
})
