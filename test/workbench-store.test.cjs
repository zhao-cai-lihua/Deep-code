const { mkdtempSync } = require('node:fs')
const { join } = require('node:path')
const { tmpdir } = require('node:os')
const test = require('node:test')
const assert = require('node:assert/strict')
const { WorkbenchStore } = require('../src/workbench-store.cjs')

function makeStore() {
  return new WorkbenchStore(join(mkdtempSync(join(tmpdir(), 'deep-code-workbench-')), 'tasks.json'))
}

test('creates a private local task and derives a readable title', () => {
  const store = makeStore()
  const task = store.create({ prompt: '把 Deep code 的侧栏重构成可长期使用的任务空间。' })
  assert.match(task.title, /Deep code/)
  assert.equal(store.snapshot().activeThreadId, task.id)
})

test('selects and deletes task metadata through one store seam', () => {
  const store = makeStore()
  const first = store.create({ title: '第一个', prompt: 'A' })
  const second = store.create({ title: '第二个', prompt: 'B' })
  store.select(first.id)
  assert.equal(store.snapshot().activeThreadId, first.id)
  const afterDelete = store.remove(first.id)
  assert.equal(afterDelete.activeThreadId, second.id)
  assert.equal(afterDelete.threads.length, 1)
})
