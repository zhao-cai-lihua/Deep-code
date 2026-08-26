const test = require('node:test')
const assert = require('node:assert/strict')

const { EcosystemCatalog } = require('../src/ecosystem-catalog.cjs')

test('disabled ecosystem discovery makes no network request', async () => {
  let calls = 0
  const catalog = new EcosystemCatalog({ fetchImpl: async () => { calls += 1 } })
  const snapshot = await catalog.refresh({ enabled: false })
  assert.equal(calls, 0)
  assert.deepEqual(snapshot, { enabled: false, source: null, entries: [], error: '' })
})

test('normalizes GitHub topic results as untrusted popularity signals', async () => {
  const catalog = new EcosystemCatalog({
    now: () => new Date('2026-08-25T10:00:00Z'),
    fetchImpl: async (url, init) => {
      assert.match(url, /api\.github\.com\/search\/repositories/)
      assert.match(url, /topic%3Adsh-plugin/)
      assert.equal(init.headers.authorization, undefined)
      return {
        ok: true,
        json: async () => ({ items: [{
          id: 7,
          full_name: 'owner/plugin',
          name: 'plugin',
          description: 'A DSH plugin',
          html_url: 'https://github.com/owner/plugin',
          stargazers_count: 42,
          forks_count: 3,
          updated_at: '2026-08-24T00:00:00Z',
          default_branch: 'main',
          license: { spdx_id: 'MIT' },
          archived: false
        }] })
      }
    }
  })

  const snapshot = await catalog.refresh({ enabled: true })
  assert.equal(snapshot.enabled, true)
  assert.equal(snapshot.source.checkedAt, '2026-08-25T10:00:00.000Z')
  assert.equal(snapshot.entries[0].stars, 42)
  assert.equal(snapshot.entries[0].license, 'MIT')
  assert.equal(snapshot.entries[0].plainDescription, '一个 DeepSeek Harness 插件。')
  assert.equal(snapshot.entries[0].plainDescriptionBasis, '根据上游简介关键词生成，未调用翻译模型。')
  assert.equal(snapshot.entries[0].checkedCommit, null)
  assert.match(snapshot.entries[0].warnings.join(' '), /未做安全审计/)
})

test('rejects non-GitHub repository URLs from catalog responses', async () => {
  const catalog = new EcosystemCatalog({ fetchImpl: async () => ({
    ok: true,
    json: async () => ({ items: [{ id: 1, full_name: 'bad/repo', html_url: 'https://evil.example/repo' }] })
  }) })
  const snapshot = await catalog.refresh({ enabled: true })
  assert.deepEqual(snapshot.entries, [])
})

test('does not present the Harness engine repository as a community plugin', async () => {
  const catalog = new EcosystemCatalog({ fetchImpl: async () => ({
    ok: true,
    json: async () => ({ items: [{ id: 1, full_name: 'deepseek-ai/deepseek-harness', html_url: 'https://github.com/deepseek-ai/deepseek-harness' }] })
  }) })
  assert.deepEqual((await catalog.refresh({ enabled: true })).entries, [])
})
