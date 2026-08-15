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

test('initializes a new workspace below the dedicated Documents root with safe starter documents', () => {
  const created = []
  const written = []
  const care = new HostCare({
    pathExists: () => false,
    makeDirectory: (path) => created.push(path),
    writeText: (path, content) => written.push({ path, content })
  })
  const workspace = care.createSafeWorkspace({ documentsPath: 'C:\\Users\\test\\Documents', name: 'first project' })
  assert.match(workspace.path, /Deep code Workspaces[\\/]first project$/)
  assert.equal(created.length, 2)
  assert.deepEqual(workspace.files.sort(), ['.deep-code\\project.json', '.gitignore', 'AGENTS.md', 'README.md'].sort())
  assert.match(written.find((file) => file.path.endsWith('AGENTS.md')).content, /只在当前工作区内/)
})

test('reuses an existing Deep code workspace instead of presenting it as a failed creation', () => {
  const root = 'C:\\Users\\test\\Documents\\Deep code Workspaces\\first project'
  const metadata = `${root}\\.deep-code\\project.json`
  const care = new HostCare({
    pathExists: (path) => path === root || path === metadata,
    readText: (path) => path === metadata ? JSON.stringify({ format: 'deep-code.project/v1', name: 'first project' }) : ''
  })

  const workspace = care.createSafeWorkspace({ documentsPath: 'C:\\Users\\test\\Documents', name: 'first project' })

  assert.equal(workspace.path, root)
  assert.equal(workspace.created, false)
  assert.match(workspace.message, /此前创建/)
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
