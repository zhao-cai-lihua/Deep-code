const { join } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')
const { OFFICIAL_REPOSITORY, SetupAssistant } = require('../src/setup-assistant.cjs')

test('detects an official Harness in bounded Desktop and Documents locations', () => {
  const manifest = join('C:\\Users\\test\\Desktop', 'deepseek-harness', 'package.json')
  const setup = new SetupAssistant({
    pathExists: (path) => path === manifest,
    readText: () => JSON.stringify({ name: '@deepseek-ai/dsh-root' })
  })
  assert.equal(setup.detectRuntime({ desktopPath: 'C:\\Users\\test\\Desktop', documentsPath: 'C:\\Users\\test\\Documents' }), join('C:\\Users\\test\\Desktop', 'deepseek-harness'))
})

test('provisions the official runtime with fixed clone, install, and build commands', async () => {
  const calls = []
  let installed = false
  let verificationCount = 0
  const setup = new SetupAssistant({
    pathExists: (path) => installed && path.endsWith('package.json'),
    readText: () => JSON.stringify({ name: '@deepseek-ai/dsh-root' }),
    makeDirectory: () => {},
    verifyRuntime: () => { verificationCount += 1 },
    commandRunner: async (command, args, options) => {
      if (command === 'pnpm') assert.equal(verificationCount >= 1, true)
      calls.push({ command, args, cwd: options.cwd })
      if (command === 'git') installed = true
    }
  })
  const target = await setup.provisionRuntime({ documentsPath: 'C:\\Users\\test\\Documents' })
  assert.match(target, /Deep code Runtime[\\/]deepseek-harness-b150a551$/)
  assert.deepEqual(calls.map(({ command, args }) => [command, ...args]), [
    ['git', 'clone', '--depth', '1', '--branch', 'dsh-v0.1.1-rc.2', '--single-branch', OFFICIAL_REPOSITORY, target],
    ['pnpm', 'install', '--frozen-lockfile'],
    ['pnpm', 'run', 'build']
  ])
  assert.equal(verificationCount, 2)
})

test('does not execute repository scripts when the pinned checkout cannot be verified', async () => {
  const calls = []
  const setup = new SetupAssistant({
    pathExists: () => false,
    makeDirectory: () => {},
    verifyRuntime: () => { throw new Error('HEAD mismatch') },
    commandRunner: async (command, args) => { calls.push([command, ...args]) }
  })
  await assert.rejects(setup.provisionRuntime({ documentsPath: 'C:\\Users\\test\\Documents' }), /HEAD mismatch/)
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], 'git')
})
