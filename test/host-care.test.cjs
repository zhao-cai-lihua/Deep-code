const test = require('node:test')
const assert = require('node:assert/strict')
const { HostCare, redact } = require('../src/host-care.cjs')

test('recognizes the official Harness package and reports missing setup separately', () => {
  const files = new Map([
    ['C:\\dsh\\package.json', JSON.stringify({ name: '@deepseek-ai/dsh-root', version: '0.1.0-rc.5' })]
  ])
  const care = new HostCare({ pathExists: (path) => files.has(path), readText: (path) => files.get(path) })
  const report = care.inspectRuntime('C:\\dsh')
  assert.equal(report.identity, 'official')
  assert.equal(report.checks[1].state, 'warn')
})

test('creates a new workspace only below the dedicated Documents root', () => {
  const created = []
  const care = new HostCare({
    pathExists: () => false,
    makeDirectory: (path) => created.push(path)
  })
  const workspace = care.createSafeWorkspace({ documentsPath: 'C:\\Users\\test\\Documents', name: 'first project' })
  assert.match(workspace.path, /DSH Workspaces[\\/]first project$/)
  assert.equal(created.length, 1)
})

test('removes secrets from diagnostics before writing', () => {
  let written = ''
  const care = new HostCare({ writeText: (_path, content) => { written = content } })
  care.exportDiagnostics({
    destinationPath: 'C:\\report.json',
    hostVersion: '0.1.0',
    runtimeReport: { checks: [] },
    runtimeStatus: { state: 'error', owned: false, message: `${'DEEPSEEK_' + 'API_KEY'}=${'sk-' + 'very-secret-token'}`, logs: [] }
  })
  assert.doesNotMatch(written, /very-secret-token/)
  assert.match(redact('Bearer token-value'), /\[REDACTED\]/)
})
