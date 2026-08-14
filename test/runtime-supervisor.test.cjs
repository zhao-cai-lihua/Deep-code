const test = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { RuntimeSupervisor } = require('../src/runtime-supervisor.cjs')

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
    probeReady: async () => false
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
