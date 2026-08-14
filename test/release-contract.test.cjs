const { existsSync, readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const root = join(__dirname, '..')

test('tagged builds publish both installer and portable executables to GitHub Releases', () => {
  const workflowPath = join(root, '.github', 'workflows', 'release.yml')
  assert.equal(existsSync(workflowPath), true, 'release.yml must exist so users can download binaries instead of cloning source')
  const workflow = readFileSync(workflowPath, 'utf8')
  assert.match(workflow, /tags:\s*\[?['"]?v\*['"]?\]?/)
  assert.match(workflow, /electron-builder --win nsis portable/)
  assert.match(workflow, /gh release create/)
  assert.match(workflow, /dist\/\*\.exe/)
})
