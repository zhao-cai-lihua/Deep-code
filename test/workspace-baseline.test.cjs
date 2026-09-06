const { mkdtempSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')
const { WorkspaceBaseline, parsePorcelain } = require('../src/workspace-baseline.cjs')

function workspace() {
  return mkdtempSync(join(tmpdir(), 'deep-code-baseline-'))
}

test('captures a clean repository through one Git interface', async () => {
  const cwd = workspace()
  const calls = []
  const baseline = new WorkspaceBaseline({
    now: () => '2026-09-02T00:00:00.000Z',
    runGit: async (_cwd, args) => {
      calls.push(args)
      if (args[0] === 'rev-parse' && args.includes('--show-toplevel')) return cwd
      if (args[0] === 'rev-parse') return 'abc123'
      return ''
    }
  })

  const result = await baseline.capture(cwd)

  assert.equal(result.state, 'clean')
  assert.equal(result.head, 'abc123')
  assert.deepEqual(result.dirtyPaths, [])
  assert.deepEqual(calls.at(-1), ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
})

test('records path summaries without reading file contents', async () => {
  const cwd = workspace()
  const baseline = new WorkspaceBaseline({
    runGit: async (_cwd, args) => {
      if (args.includes('--show-toplevel')) return cwd
      if (args.includes('--verify')) return 'abc123'
      return ' M src/file with spaces.cjs\0R  docs/new.md\0docs/old.md\0'
    }
  })

  const result = await baseline.capture(cwd)

  assert.equal(result.state, 'dirty')
  assert.deepEqual(result.dirtyPaths, ['docs/new.md', 'docs/old.md', 'src/file with spaces.cjs'])
  assert.equal(JSON.stringify(result).includes('file contents'), false)
})

test('distinguishes a non-Git workspace from an unavailable Git command', async () => {
  const cwd = workspace()
  const notGit = new WorkspaceBaseline({ runGit: async () => { throw Object.assign(new Error('failed'), { stderr: 'fatal: not a git repository' }) } })
  const unavailable = new WorkspaceBaseline({ runGit: async () => { throw new Error('spawn git ENOENT') } })

  assert.equal((await notGit.capture(cwd)).state, 'not-git')
  assert.equal((await unavailable.capture(cwd)).state, 'unavailable')
})

test('parses rename and copy records in porcelain v1 z format', () => {
  assert.deepEqual(parsePorcelain('R  new name.md\0old name.md\0C  copy.md\0source.md\0'), [
    'copy.md', 'new name.md', 'old name.md', 'source.md'
  ])
})
