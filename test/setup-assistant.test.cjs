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
  const setup = new SetupAssistant({
    pathExists: (path) => installed && path.endsWith('package.json'),
    readText: () => JSON.stringify({ name: '@deepseek-ai/dsh-root' }),
    makeDirectory: () => {},
    commandRunner: async (command, args, options) => {
      calls.push({ command, args, cwd: options.cwd })
      if (command === 'git') installed = true
    }
  })
  const target = await setup.provisionRuntime({ documentsPath: 'C:\\Users\\test\\Documents' })
  assert.match(target, /Deep code Runtime[\\/]deepseek-harness$/)
  assert.deepEqual(calls.map(({ command, args }) => [command, ...args]), [
    ['git', 'clone', '--depth', '1', OFFICIAL_REPOSITORY, target],
    ['pnpm', 'install', '--frozen-lockfile'],
    ['pnpm', 'run', 'build']
  ])
})
