const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const root = join(__dirname, '..')
const html = readFileSync(join(root, 'src', 'renderer', 'index.html'), 'utf8')
const shell = readFileSync(join(root, 'src', 'renderer', 'shell.js'), 'utf8')
const preload = readFileSync(join(root, 'src', 'preload.cjs'), 'utf8')

test('Deep code is the only user-facing workbench instead of a link to the Harness UI', () => {
  assert.doesNotMatch(html, /open-harness|打开官方 Harness|在官方 Harness 中继续/)
  assert.doesNotMatch(shell, /openHarness/)
  assert.doesNotMatch(preload, /openHarness|host:open-harness/)
})

test('workspace creation uses an in-app form and never depends on window.prompt', () => {
  assert.match(html, /<dialog id="workspace-dialog"/)
  assert.match(html, /id="workspace-dialog-name"/)
  assert.doesNotMatch(shell, /window\.prompt/)
})

test('workspace protection shows the active path and distinguishes opening the form from creating files', () => {
  assert.match(html, /id="settings-workspace-path"/)
  assert.match(html, /id="open-workspace"/)
  assert.match(html, /下一步才会真正创建/)
  assert.match(preload, /openWorkspace/)
})

test('first-run actions expose visible and accessible progress state', () => {
  assert.match(html, /id="setup-progress"[^>]*aria-live="polite"/)
  assert.match(shell, /runVisibleAction/)
  assert.match(shell, /aria-busy/)
})
