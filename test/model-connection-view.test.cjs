const test = require('node:test')
const assert = require('node:assert/strict')
const { modelConnectionLines } = require('../src/renderer/model-connection-view.cjs')

test('shows credential presence and historical verification as separate user-visible facts', () => {
  const lines = modelConnectionLines({
    activeProviders: [{
      id: 'deepseek-official',
      name: 'DeepSeek',
      modelCount: 1,
      models: [{ id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash' }],
      credential: { configured: true },
      verification: {
        state: 'passed',
        label: '最近一次真实验证通过',
        detail: 'DeepSeek-V4-Flash · low；记录于 2026-09-08T11:30:36.924Z。只证明当时这次 Harness 请求的结果。'
      }
    }]
  })

  assert.deepEqual(lines, [
    'DeepSeek · 1 个模型',
    '凭据：已保存（密钥内容不可见）',
    '真实验证：最近一次真实验证通过',
    '  DeepSeek-V4-Flash · low；记录于 2026-09-08T11:30:36.924Z。只证明当时这次 Harness 请求的结果。',
    '  • DeepSeek-V4-Flash'
  ])
  assert.doesNotMatch(lines.join('\n'), /凭据：已保存，尚未验证/)
})
