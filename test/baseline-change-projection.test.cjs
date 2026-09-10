const test = require('node:test')
const assert = require('node:assert/strict')
const { projectConfirmedBaselineChanges } = require('../src/baseline-change-projection.cjs')

test('confirms paths newly visible in the same Git worktree after a task', () => {
  assert.deepEqual(projectConfirmedBaselineChanges(
    { state: 'clean', repoRoot: 'C:\\repo', dirtyPaths: [] },
    { state: 'dirty', repoRoot: 'C:\\repo', dirtyPaths: ['src/app.js'] }
  ), [{ path: 'src/app.js', operation: 'Git 基线检测到变化', confirmed: true, source: 'workspace-baseline' }])
})

test('does not attribute paths that were already dirty before the task', () => {
  assert.deepEqual(projectConfirmedBaselineChanges(
    { state: 'dirty', repoRoot: 'C:\\repo', dirtyPaths: ['src/app.js'] },
    { state: 'dirty', repoRoot: 'C:\\repo', dirtyPaths: ['src/app.js', 'src/new.js'] }
  ).map((item) => item.path), ['src/new.js'])
})

test('refuses to compare non-Git or different worktrees', () => {
  assert.deepEqual(projectConfirmedBaselineChanges({ state: 'not-git' }, { state: 'not-git' }), [])
  assert.deepEqual(projectConfirmedBaselineChanges(
    { state: 'clean', repoRoot: 'C:\\one', dirtyPaths: [] },
    { state: 'dirty', repoRoot: 'C:\\two', dirtyPaths: ['x'] }
  ), [])
})
