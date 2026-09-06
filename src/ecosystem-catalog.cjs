const { randomUUID } = require('node:crypto')

const GITHUB_TOPIC_URL = 'https://github.com/topics/dsh-plugin'
const GITHUB_SEARCH_URL = 'https://api.github.com/search/repositories?q=topic%3Adsh-plugin&sort=stars&order=desc&per_page=20'
const GITHUB_API = 'https://api.github.com'
const GITHUB_FULL_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/
const PACKAGE_NAME = /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i

function empty(enabled = false) {
  return { enabled, source: null, entries: [], error: '' }
}

function githubUrl(value) {
  try {
    const url = new URL(String(value || ''))
    return url.protocol === 'https:' && url.hostname === 'github.com' ? url.href : ''
  } catch { return '' }
}

function plainDescription(value) {
  const source = String(value || '').trim()
  const normalized = source.toLowerCase()
  if (!source) return '上游没有写简介；需要打开源码确认它做什么。'
  if (/\b(router|routing|route)\b/.test(normalized)) return '帮助 Harness 按任务选择模型、模式或执行路线。'
  if (/\b(memory|rag|retrieval)\b/.test(normalized)) return '为 Agent 增加记忆、检索或资料召回能力。'
  if (/\b(mcp|tool|tools)\b/.test(normalized)) return '为 Harness 接入额外工具或外部服务。'
  if (/\b(sub-?agent|multi-?agent)\b/.test(normalized)) return '帮助一个主 Agent 协调多个 Agent 完成任务。'
  if (/\b(ui|desktop|web|interface)\b/.test(normalized)) return '为 Harness 提供或改进可视化使用界面。'
  if (/\b(skill|skills)\b/.test(normalized)) return '为 Harness 增加可复用的任务技能。'
  if (/\b(dsh|deepseek harness|deepseek-harness)\b.*\b(plugin|extension)\b|\b(plugin|extension)\b.*\b(dsh|deepseek harness|deepseek-harness)\b/.test(normalized)) return '一个 DeepSeek Harness 插件。'
  return '一个 Harness 生态社区项目；请结合上游原文和源码确认具体用途。'
}

function normalizeEntry(item) {
  const repository = githubUrl(item?.html_url)
  if (!repository || typeof item?.full_name !== 'string' || !GITHUB_FULL_NAME.test(item.full_name) || item.full_name.toLowerCase() === 'deepseek-ai/deepseek-harness') return null
  return {
    id: String(item.id || item.full_name),
    name: String(item.name || item.full_name),
    fullName: item.full_name,
    description: typeof item.description === 'string' && item.description.trim() ? item.description.trim() : '上游没有提供简介。',
    plainDescription: plainDescription(item.description),
    plainDescriptionBasis: '根据上游简介关键词生成，未调用翻译模型。',
    repository,
    stars: Number.isInteger(item.stargazers_count) ? item.stargazers_count : 0,
    forks: Number.isInteger(item.forks_count) ? item.forks_count : 0,
    updatedAt: typeof item.updated_at === 'string' ? item.updated_at : '',
    defaultBranch: typeof item.default_branch === 'string' ? item.default_branch : '',
    license: typeof item.license?.spdx_id === 'string' && item.license.spdx_id !== 'NOASSERTION' ? item.license.spdx_id : '未知',
    archived: item.archived === true,
    checkedCommit: null,
    bundleEvidence: '未检查',
    warnings: ['来自公开 topic，未做安全审计、兼容性测试或安装验证。', '星标和 Fork 只表示社区热度，不是信任评分。']
  }
}

class EcosystemCatalog {
  constructor({ fetchImpl = globalThis.fetch, now = () => new Date(), createToken = randomUUID } = {}) {
    if (typeof fetchImpl !== 'function') throw new Error('当前环境不支持生态目录连接。')
    this.fetchImpl = fetchImpl
    this.now = now
    this.createToken = createToken
    this.snapshot = empty(false)
    this.installPlans = new Map()
  }

  status(enabled) {
    if (!enabled) return empty(false)
    return { ...this.snapshot, enabled: true }
  }

  clear() {
    this.installPlans.clear()
    this.snapshot = empty(false)
    return this.snapshot
  }

  async githubJson(path) {
    const response = await this.fetchImpl(`${GITHUB_API}${path}`, {
      headers: {
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'Deep-code-ecosystem-discovery'
      }
    })
    if (!response?.ok) throw new Error(`GitHub 返回 HTTP ${response?.status || '未知状态'}`)
    return response.json()
  }

  async prepareInstall(id) {
    if (!this.snapshot.enabled) throw new Error('请先开启生态发现。')
    const entry = this.snapshot.entries.find((item) => item.id === String(id))
    if (!entry) throw new Error('这个生态项目已不在当前目录中，请先更新目录。')
    const branch = encodeURIComponent(entry.defaultBranch || 'HEAD')
    const revision = await this.githubJson(`/repos/${entry.fullName}/commits/${branch}`)
    const commit = String(revision?.sha || '')
    if (!/^[a-f0-9]{40}$/i.test(commit)) throw new Error('GitHub 没有返回可固定的 commit。')
    const manifestResponse = await this.githubJson(`/repos/${entry.fullName}/contents/package.json?ref=${commit}`)
    if (manifestResponse?.encoding !== 'base64' || typeof manifestResponse.content !== 'string') throw new Error('仓库根目录没有可读取的 package.json。')
    let manifest
    try { manifest = JSON.parse(Buffer.from(manifestResponse.content, 'base64').toString('utf8')) } catch { throw new Error('仓库 package.json 不是有效 JSON。') }
    const patch = String(manifest?.dsh?.bundle?.patch || '').trim().replace(/^\.\//, '')
    const packageName = String(manifest?.name || '').trim()
    if (!PACKAGE_NAME.test(packageName)) throw new Error('仓库 package.json 没有可安装的规范 package name。')
    if (!patch) throw new Error('这个项目没有在根 package.json 声明 dsh.bundle.patch，不能作为 Harness 插件启用。')
    if (patch.startsWith('/') || patch.split(/[\\/]/).includes('..')) throw new Error('仓库声明了不安全的 Bundle patch 路径。')
    const patchPath = patch.split('/').map(encodeURIComponent).join('/')
    const patchResponse = await this.githubJson(`/repos/${entry.fullName}/contents/${patchPath}?ref=${commit}`)
    if (patchResponse?.type !== 'file') throw new Error('仓库声明的 Bundle patch 不是同一 commit 中的文件。')
    const plan = { fullName: entry.fullName, commit, packageName, patch }
    const token = this.createToken()
    this.installPlans.set(token, plan)
    entry.checkedCommit = commit
    entry.bundleEvidence = `${packageName} → ${patch}`
    return {
      token,
      packageName,
      fullName: entry.fullName,
      commit,
      patch,
      warning: 'GitHub 安装可能运行该仓库的 prepare 脚本；它发生在 Agent 沙箱之外。只应安装你信任且愿意审查的源码。',
      activation: '安装写入官方 web profile；停止已有 Harness，并从 Deep Code 重新启动 Engine 后生效。'
    }
  }

  consumeInstallPlan(token) {
    const key = String(token || '')
    const plan = this.installPlans.get(key)
    if (!plan) throw new Error('安装确认已过期，请重新检查这个项目。')
    this.installPlans.delete(key)
    return plan
  }

  async refresh({ enabled }) {
    if (!enabled) return this.clear()
    try {
      const response = await this.fetchImpl(GITHUB_SEARCH_URL, {
        headers: {
          accept: 'application/vnd.github+json',
          'x-github-api-version': '2022-11-28',
          'user-agent': 'Deep-code-ecosystem-discovery'
        }
      })
      if (!response?.ok) throw new Error(`GitHub 返回 HTTP ${response?.status || '未知状态'}`)
      const body = await response.json()
      const entries = (Array.isArray(body?.items) ? body.items : []).map(normalizeEntry).filter(Boolean)
      this.snapshot = {
        enabled: true,
        source: {
          id: 'github-topic',
          label: 'GitHub dsh-plugin topic',
          url: GITHUB_TOPIC_URL,
          checkedAt: this.now().toISOString(),
          contract: '公开候选项目元数据，不是 DeepSeek 官方商店或安全审核。'
        },
        entries,
        error: ''
      }
      return this.snapshot
    } catch (error) {
      this.snapshot = { ...empty(true), error: `暂时无法更新生态目录：${error.message}` }
      return this.snapshot
    }
  }
}

module.exports = { EcosystemCatalog, normalizeEntry, plainDescription, GITHUB_TOPIC_URL, GITHUB_SEARCH_URL }
