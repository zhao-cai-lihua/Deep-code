const test = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')

const { PluginInstaller, validateInstallPlan } = require('../src/plugin-installer.cjs')

test('accepts only a commit-pinned GitHub bundle plan', () => {
  const plan = validateInstallPlan({
    fullName: 'owner/plugin',
    commit: 'a'.repeat(40),
    packageName: 'dsh-example',
    patch: 'cordis.patch.yml'
  })
  assert.equal(plan.spec, `github:owner/plugin#${'a'.repeat(40)}`)
  assert.throws(() => validateInstallPlan({ fullName: 'owner/plugin', commit: 'main', packageName: 'x', patch: 'x.yml' }), /固定 commit/)
})

test('installs the pinned bundle into the official web profile used by Deep Code', async () => {
  const calls = []
  const spawnProcess = (command, args, options) => {
    calls.push({ command, args, options })
    const child = new EventEmitter()
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    queueMicrotask(() => child.emit('exit', 0, null))
    return child
  }
  const installer = new PluginInstaller({
    spawnProcess,
    pathExists: (value) => value.endsWith('apps\\cli\\lib\\bin.js'),
    nodeExecutable: () => 'node.exe'
  })
  const result = await installer.install({ runtimePath: 'C:\\Harness', plan: {
    fullName: 'owner/plugin', commit: 'b'.repeat(40), packageName: 'dsh-example', patch: 'cordis.patch.yml'
  } })
  assert.equal(result.installed, true)
  assert.deepEqual(calls[0].args, ['apps/cli/lib/bin.js', 'plugin', '--profile', 'web', 'add', `github:owner/plugin#${'b'.repeat(40)}`])
  assert.equal(calls[0].options.shell, false)
})
