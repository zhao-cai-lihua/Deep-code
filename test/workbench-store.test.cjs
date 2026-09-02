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

test('creates an image-only task without inventing user-authored text', () => {
  const store = makeStore()
  const task = store.create({ prompt: '', hasAttachments: true })
  assert.equal(task.prompt, '')
  assert.equal(task.title, '图片任务')
})

test('keeps an explicit new-task workspace empty even when old tasks exist', () => {
  const store = makeStore()
  store.create({ title: '旧任务一', prompt: 'A' })
  store.create({ title: '旧任务二', prompt: 'B' })

  const snapshot = store.select('')

  assert.equal(snapshot.activeThreadId, '')
  assert.equal(snapshot.threads.length, 2)
})

test('binds one Deep code task to one hidden Engine session', () => {
  const store = makeStore()
  const task = store.create({ prompt: '用人话解释这个项目。' })
  store.setEngineState(task.id, { sessionId: 'session-1', state: 'running' })
  const bound = store.snapshot().threads[0]
  assert.equal(bound.sessionId, 'session-1')
  assert.equal(bound.engineState, 'running')
})

test('persists a human-readable model-switch notice independently from errors', () => {
  const store = makeStore()
  const task = store.create({ prompt: '分析截图' })
  store.setEngineState(task.id, { state: 'running', notice: '已切换到官方图片模型。' })
  store.setEngineState(task.id, { state: 'ready' })
  const saved = store.snapshot().threads[0]
  assert.equal(saved.engineNotice, '已切换到官方图片模型。')
  assert.equal(saved.engineError, '')
})

test('persists a structured recovery reason and clears it only when work resumes', () => {
  const store = makeStore()
  const task = store.create({ prompt: '等待我回答' })
  store.setRecovery(task.id, {
    kind: 'waiting-timeout',
    cause: '等待用户回答超过 5 分钟。',
    safety: '没有替用户选择任何答案。',
    nextAction: '重新发送任务后再回答。'
  })
  assert.equal(store.snapshot().threads[0].recovery.kind, 'waiting-timeout')
  store.clearRecovery(task.id)
  assert.equal(store.snapshot().threads[0].recovery, null)
})
