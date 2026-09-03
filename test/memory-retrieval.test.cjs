const test = require('node:test')
const assert = require('node:assert/strict')
const { previewMemoryRetrieval } = require('../src/memory-retrieval.cjs')

const records = [
  { id: 'global', status: 'confirmed', scope: 'global', kind: 'preference', title: '先用人话解释', content: '解释技术术语后再展示证据。', reason: '帮助新手理解', limits: '用户要求原始数据时不适用。' },
  { id: 'current', status: 'confirmed', scope: 'project:C:\\work\\deep-code', kind: 'decision', title: '模型服务状态', content: '区分目录存在、凭据保存和真实调用。', reason: '避免伪装成可用', limits: '不替代 Harness 真值。' },
  { id: 'other', status: 'confirmed', scope: 'project:C:\\work\\catbox', kind: 'decision', title: '猫箱关系状态', content: '拒绝与记忆由本地 Godot 决定。', reason: '保持本地权威', limits: '只适用于猫箱。' },
  { id: 'candidate', status: 'candidate', scope: 'global', kind: 'learning', title: '模型服务', content: '未经确认。', reason: '无', limits: '无' }
]

test('previews only confirmed memories eligible for the current project without a model call', () => {
  const result = previewMemoryRetrieval({ records, query: '请解释模型服务为什么不能只看凭据', projectPath: 'C:\\work\\deep-code' })
  assert.deepEqual(result.matches.map((item) => item.id), ['current', 'global'])
  assert.equal(result.matches.some((item) => item.id === 'other'), false)
  assert.equal(result.consideredCount, 3)
  assert.equal(result.eligibleCount, 2)
  assert.equal(result.modelCalled, false)
  assert.equal(result.promptChanged, false)
  assert.match(result.matches[0].reasons.join(' '), /当前项目/)
})

test('matches Chinese phrases and global memories with explainable terms', () => {
  const result = previewMemoryRetrieval({ records, query: '请先用人话解释这个技术术语', projectPath: 'C:\\work\\deep-code' })
  assert.equal(result.matches[0].id, 'global')
  assert.ok(result.matches[0].matchedTerms.includes('人话'))
  assert.ok(result.estimatedCharacters > 0)
})

test('rejects empty or oversized queries and bounds result count', () => {
  assert.throws(() => previewMemoryRetrieval({ records, query: '' }), /请先描述/)
  assert.throws(() => previewMemoryRetrieval({ records, query: 'x'.repeat(2001) }), /2000/)
  const repeated = Array.from({ length: 20 }, (_, index) => ({ ...records[0], id: String(index) }))
  assert.equal(previewMemoryRetrieval({ records: repeated, query: '人话解释', limit: 99 }).matches.length, 8)
})
