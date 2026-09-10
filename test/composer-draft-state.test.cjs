const test = require('node:test')
const assert = require('node:assert/strict')

const { createComposerDraftState } = require('../src/renderer/composer-draft-state.cjs')

test('unsent composer text belongs to one task and returns only with that task', () => {
  const drafts = createComposerDraftState('task-a')

  assert.equal(drafts.switchTo('task-b', 'A 尚未发送'), '')
  assert.equal(drafts.switchTo('task-a', 'B 的草稿'), 'A 尚未发送')
  assert.equal(drafts.switchTo('task-b', 'A 又输入了一行'), 'B 的草稿')
})

test('new-task text is isolated and a successful send clears only its source scope', () => {
  const drafts = createComposerDraftState('new-task')

  assert.equal(drafts.switchTo('task-a', '尚未创建的任务'), '')
  drafts.clear('new-task')
  assert.equal(drafts.switchTo('new-task', 'A 的追问'), '')
  assert.equal(drafts.switchTo('task-a', ''), 'A 的追问')
})

test('a rejected or stale selection can capture edits without changing the active scope', () => {
  const drafts = createComposerDraftState('task-a')

  drafts.capture('点击 B 以后继续输入')
  assert.equal(drafts.activeScope(), 'task-a')
  assert.equal(drafts.switchTo('task-b', '点击 B 以后继续输入'), '')
  assert.equal(drafts.switchTo('task-a', ''), '点击 B 以后继续输入')
})
