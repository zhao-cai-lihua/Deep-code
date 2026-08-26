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

test('becomes ready only when the official loopback URL appears', async () => {
  const child = fakeChild()
  const supervisor = new RuntimeSupervisor({ spawnProcess: () => child, pathExists: () => true, probeReady: async () => false })
  await supervisor.start('C:\\runtime')
  assert.equal(supervisor.snapshot().state, 'starting')
  child.stdout.emit('data', 'dsh web: http://127.0.0.1:3080\n')
  assert.equal(supervisor.snapshot().state, 'ready')
  assert.equal(supervisor.snapshot().url, 'http://127.0.0.1:3080')
})

test('accepts a parent folder that contains deepseek-harness', async () => {
  const child = fakeChild()
  const supervisor = new RuntimeSupervisor({
    spawnProcess: () => child,
    pathExists: (path) => path === 'C:\\Desktop' || path === 'C:\\Desktop\\deepseek-harness\\package.json',
    probeReady: async () => false,
    platform: 'linux'
  })
  const status = await supervisor.start('C:\\Desktop')
  assert.equal(status.runtimePath, 'C:\\Desktop\\deepseek-harness')
})

test('adopts a ready loopback Harness instead of starting a second process', async () => {
  let spawned = false
  const supervisor = new RuntimeSupervisor({
    spawnProcess: () => { spawned = true },
    pathExists: () => true,
    probeReady: async () => true
  })
  const status = await supervisor.start('C:\\runtime')
  assert.equal(status.state, 'ready')
  assert.equal(status.owned, false)
  assert.equal(spawned, false)
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
    probeReady: async () => false,
    platform: 'win32',
    environment: { PATH: 'C:\\Windows\\System32;C:\\Program Files\\nodejs', ProgramFiles: 'C:\\Program Files' }
  })

  await supervisor.start('C:\\runtime')

  assert.equal(invocation.command, 'C:\\Program Files\\nodejs\\node.exe')
  assert.deepEqual(invocation.args, ['--import', 'tsx/esm', 'apps/cli/src/bin.ts', 'web', '--no-open'])
  assert.equal(invocation.options.shell, false)
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
  const supervisor = new RuntimeSupervisor({ spawnProcess: () => child, pathExists: () => true, probeReady: async () => false })
  await supervisor.start('C:\\runtime')
  const ready = supervisor.waitUntilReady({ timeoutMs: 100 })
  child.stdout.emit('data', 'dsh web: http://127.0.0.1:3080\n')
  assert.equal((await ready).url, 'http://127.0.0.1:3080')
})

test('reports a stopped Harness while a task is waiting instead of calling the Adapter without a URL', async () => {
  const child = fakeChild()
  const supervisor = new RuntimeSupervisor({ spawnProcess: () => child, pathExists: () => true, probeReady: async () => false })
  await supervisor.start('C:\\runtime')
  const ready = supervisor.waitUntilReady({ timeoutMs: 100 })
  child.emit('exit', 1, null)
  await assert.rejects(ready, /退出代码 1/)
})

test('prefers the built Harness CLI when the checkout has been compiled', () => {
  assert.deepEqual(
    resolveHarnessEntrypoint('C:\\runtime', (path) => path === 'C:\\runtime\\apps\\cli\\lib\\bin.js'),
    ['apps/cli/lib/bin.js', 'web', '--no-open']
  )
})

test('falls back to the TypeScript entrypoint in an unbuilt checkout', () => {
  assert.deepEqual(resolveHarnessEntrypoint('C:\\runtime', () => false), ['--import', 'tsx/esm', 'apps/cli/src/bin.ts', 'web', '--no-open'])
})
