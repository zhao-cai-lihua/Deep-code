const test = require('node:test')
const assert = require('node:assert/strict')
const { buildHandoffPreview } = require('../src/handoff-preview.cjs')

test('previews exact task and model-visible card text without local notes or permissions', () => {
  const preview = buildHandoffPreview({
    thread: { prompt: '完成一个可验证的新手安装流程。' },
    cards: [{ id: 'yanxing', kind: 'user-persona', name: '砚星', modelText: '先寻找隐藏主轴。', humanNotes: '私人本地说明' }],
    active: { userPersonaId: 'yanxing' }
  })
  assert.match(preview.text, /完成一个可验证/)
  assert.match(preview.text, /先寻找隐藏主轴/)
  assert.doesNotMatch(preview.text, /私人本地说明/)
  assert.match(preview.text, /不会授予或改变工具/)
})
