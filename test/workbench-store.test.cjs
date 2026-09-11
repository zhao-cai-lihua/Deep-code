const { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')
const { tmpdir } = require('node:os')
const test = require('node:test')
const assert = require('node:assert/strict')
const { WorkbenchStore } = require('../src/workbench-store.cjs')
const { createTaskContract } = require('../src/task-contract.cjs')

function makeStore() {
  return new WorkbenchStore(join(mkdtempSync(join(tmpdir(), 'deep-code-workbench-')), 'tasks.json'))
}

test('creates a private local task and derives a readable title', () => {
  const store = makeStore()
  const task = store.create({ prompt: '把 Deep code 的侧栏重构成可长期使用的任务空间。' })
  assert.match(task.title, /Deep code/)
  assert.equal(store.snapshot().activeThreadId, task.id)
})

test('persists only the supported first-prompt task contract', () => {
  const store = makeStore()
  const task = store.create({ prompt: '完成并验证', taskContract: createTaskContract() })
  assert.deepEqual(task.taskContract, { version: 1, kind: 'evidence-first', attachedTo: 'initial-prompt' })
  assert.deepEqual(store.snapshot().threads[0].taskContract, task.taskContract)

  const legacy = store.create({ prompt: '保持原样', taskContract: { version: 99, kind: 'unknown' } })
  assert.equal(legacy.taskContract, null)
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

test('persists only a bounded prompt admission receipt and can clear it', () => {
  const store = makeStore()
  const task = store.create({ prompt: '排队执行' })
  store.setAdmission(task.id, { accepted: true, messageId: 'message-7', rpcId: 'deep-code-rpc-7', acceptedAt: '2026-09-07T12:00:00.000Z' })
  assert.deepEqual(store.snapshot().threads[0].admission, {
    accepted: true, messageId: 'message-7', rpcId: 'deep-code-rpc-7', acceptedAt: '2026-09-07T12:00:00.000Z'
  })
  store.clearAdmission(task.id)
  assert.equal(store.snapshot().threads[0].admission, null)
})

test('persists a bounded model verification purpose and receipt', () => {
  const store = makeStore()
  const task = store.create({
    prompt: '验证模型',
    purpose: { kind: 'model-connection-test', requestedRoute: { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'low' } }
  })
  store.setVerificationReceipt(task.id, {
    version: 1, state: 'passed', provider: 'deepseek', model: 'deepseek-v4-flash', modelName: 'DeepSeek V4 Flash', reasoningEffort: 'low',
    routeEvidence: 'request/header', terminalReason: 'completed', recordedAt: '2026-09-05T00:00:00.000Z'
  })
  const saved = store.snapshot().threads[0]
  assert.equal(saved.purpose.kind, 'model-connection-test')
  assert.equal(saved.verificationReceipt.state, 'passed')
  store.clearVerificationReceipt(task.id)
  assert.equal(store.snapshot().threads[0].verificationReceipt, null)
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

test('binds a task to its workspace and persists a bounded Git baseline', () => {
  const store = makeStore()
  const task = store.create({ prompt: '修改项目' })
  store.setWorkspaceBaseline(task.id, {
    workspacePath: 'C:\\projects\\one',
    baseline: {
      version: 1,
      state: 'dirty',
      workspacePath: 'C:\\projects\\one',
      repoRoot: 'C:\\projects\\one',
      head: 'abc123',
      dirtyPaths: ['src/existing.cjs'],
      capturedAt: '2026-09-02T00:00:00.000Z',
      message: '任务开始前已有 1 个未提交路径。'
    }
  })

  const saved = store.snapshot().threads[0]
  assert.equal(saved.workspacePath, 'C:\\projects\\one')
  assert.equal(saved.baseline.state, 'dirty')
  assert.deepEqual(saved.baseline.dirtyPaths, ['src/existing.cjs'])
})

test('freezes a completion baseline and clears it when a later turn captures a new start baseline', () => {
  const store = makeStore()
  const task = store.create({ prompt: '修改项目' })
  const baseline = (dirtyPaths, capturedAt) => ({
    version: 1, state: dirtyPaths.length ? 'dirty' : 'clean', workspacePath: 'C:\\repo', repoRoot: 'C:\\repo',
    head: 'abc', dirtyPaths, capturedAt, message: ''
  })
  store.setWorkspaceBaseline(task.id, { workspacePath: 'C:\\repo', baseline: baseline([], 'start') })
  store.setCompletionBaseline(task.id, baseline(['src/app.js'], 'end'))
  assert.deepEqual(store.snapshot().threads[0].completionBaseline.dirtyPaths, ['src/app.js'])
  store.setWorkspaceBaseline(task.id, { workspacePath: 'C:\\repo', baseline: baseline([], 'next') })
  assert.equal(store.snapshot().threads[0].completionBaseline, null)
})

test('persists generations and falls back when the newest generation is corrupted', () => {
  const directory = mkdtempSync(join(tmpdir(), 'deep-code-workbench-'))
  const legacy = join(directory, 'local-tasks.json')
  const store = new WorkbenchStore(legacy)
  const first = store.create({ title: '可恢复任务', prompt: 'A' })
  store.create({ title: '较新任务', prompt: 'B' })
  const generations = readdirSync(directory).filter((name) => /^local-tasks\.\d+\.json$/.test(name)).sort()
  assert.ok(generations.length >= 2)
  writeFileSync(join(directory, generations.at(-1)), '{broken', 'utf8')

  const recovered = new WorkbenchStore(legacy).snapshot()

  assert.equal(recovered.threads.some((thread) => thread.id === first.id), true)
  assert.equal(recovered.storageRecovery?.kind, 'generation-fallback')
  assert.doesNotMatch(recovered.storageRecovery?.message || '', /SyntaxError|JSON/)
})

test('migrates a legacy task file without deleting it before a valid generation exists', () => {
  const directory = mkdtempSync(join(tmpdir(), 'deep-code-workbench-'))
  const legacy = join(directory, 'local-tasks.json')
  writeFileSync(legacy, JSON.stringify({ version: 4, threads: [], activeThreadId: '' }), 'utf8')

  const snapshot = new WorkbenchStore(legacy).snapshot()

  assert.equal(snapshot.threads.length, 0)
  assert.equal(existsSync(legacy), true)
  assert.equal(readdirSync(directory).some((name) => /^local-tasks\.\d+\.json$/.test(name)), true)
})

test('keeps at least the three newest valid generations after repeated writes', () => {
  const directory = mkdtempSync(join(tmpdir(), 'deep-code-workbench-'))
  const store = new WorkbenchStore(join(directory, 'local-tasks.json'))
  for (let index = 0; index < 7; index += 1) store.create({ title: `任务 ${index}`, prompt: `P${index}` })
  const generations = readdirSync(directory).filter((name) => /^local-tasks\.\d+\.json$/.test(name))
  assert.equal(generations.length, 3)
  assert.equal(JSON.parse(readFileSync(join(directory, generations.sort().at(-1)), 'utf8')).threads.length, 7)
})

test('a stale temp file from a crash cannot permanently block later task writes', () => {
  const directory = mkdtempSync(join(tmpdir(), 'deep-code-workbench-'))
  const storagePath = join(directory, 'local-tasks.json')
  writeFileSync(join(directory, 'local-tasks.00000001.json.tmp'), '{"partial":', 'utf8')
  const store = new WorkbenchStore(storagePath)
  const task = store.create({ prompt: '继续保存' })
  assert.equal(store.snapshot().threads[0].id, task.id)
  assert.equal(existsSync(join(directory, 'local-tasks.00000002.json')), true)
  assert.equal(existsSync(join(directory, 'local-tasks.00000001.json.tmp')), true)
})
