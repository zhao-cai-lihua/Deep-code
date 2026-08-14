const test = require('node:test')
const assert = require('node:assert/strict')
const { buildProjectBriefPrompt } = require('../src/project-explainer.cjs')

test('project brief asks for human language, evidence, uncertainty, and owner decisions', () => {
  const prompt = buildProjectBriefPrompt()
  assert.match(prompt, /完全不了解编程/)
  assert.match(prompt, /术语第一次出现/)
  assert.match(prompt, /已确认/)
  assert.match(prompt, /推断/)
  assert.match(prompt, /项目负责人/)
  assert.match(prompt, /关键文件作为证据/)
  assert.match(prompt, /先不要修改任何文件/)
})
