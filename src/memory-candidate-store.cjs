const { mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')
const { randomUUID } = require('node:crypto')

const KINDS = new Set(['preference', 'decision', 'handoff', 'learning'])
const SENSITIVITIES = new Set(['ordinary', 'private'])
const STATUSES = new Set(['candidate', 'confirmed', 'rejected', 'superseded', 'expired'])
const FOLDERS = {
  candidate: '00_Inbox',
  confirmed: '20_Confirmed',
  rejected: '80_Archive',
  superseded: '80_Archive',
  expired: '80_Archive'
}

function bounded(value, label, max = 4000) {
  const text = String(value || '').trim()
  if (!text) throw new Error(`${label}不能为空。`)
  if (text.length > max) throw new Error(`${label}过长。`)
  return text
}

function scalar(value) {
  return JSON.stringify(value)
}

function parseScalar(source, key, fallback = '') {
  const match = source.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
  if (!match) return fallback
  try { return JSON.parse(match[1]) } catch { return fallback }
}

function render(record) {
  return `---\nid: ${scalar(record.id)}\nkind: ${scalar(record.kind)}\nscope: ${scalar(record.scope)}\nstatus: ${scalar(record.status)}\nsensitivity: ${scalar(record.sensitivity)}\nsource_refs: ${scalar(record.sourceRefs)}\ncreated_at: ${scalar(record.createdAt)}\nreview_after: ${scalar(record.reviewAfter)}\nsupersedes: ${scalar(record.supersedes)}\n---\n\n# ${record.title}\n\n## 记住什么\n\n${record.content}\n\n## 为什么值得记住\n\n${record.reason}\n\n## 不适用范围\n\n${record.limits}\n`
}

function parse(source, path) {
  const heading = source.match(/^#\s+(.+)$/m)
  const section = (name) => source.match(new RegExp(`^## ${name}\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`, 'm'))?.[1]?.trim() || ''
  return {
    id: parseScalar(source, 'id'),
    kind: parseScalar(source, 'kind'),
    scope: parseScalar(source, 'scope'),
    status: parseScalar(source, 'status'),
    sensitivity: parseScalar(source, 'sensitivity'),
    sourceRefs: parseScalar(source, 'source_refs', []),
    createdAt: parseScalar(source, 'created_at'),
    reviewAfter: parseScalar(source, 'review_after'),
    supersedes: parseScalar(source, 'supersedes', []),
    title: heading?.[1]?.trim() || '',
    content: section('记住什么'),
    reason: section('为什么值得记住'),
    limits: section('不适用范围'),
    path
  }
}

class MemoryCandidateStore {
  constructor(root, { now = () => new Date(), id = () => randomUUID() } = {}) {
    this.root = String(root || '')
    if (!this.root) throw new Error('记忆 Vault 路径不能为空。')
    this.now = now
    this.id = id
  }

  initialize() {
    for (const folder of new Set(Object.values(FOLDERS))) mkdirSync(join(this.root, folder), { recursive: true })
    return { root: this.root, folders: [...new Set(Object.values(FOLDERS))] }
  }

  createCandidate(input) {
    this.initialize()
    const kind = String(input?.kind || '')
    const sensitivity = String(input?.sensitivity || 'private')
    if (!KINDS.has(kind)) throw new Error('记忆类型无效。')
    if (!SENSITIVITIES.has(sensitivity)) throw new Error('敏感度无效。')
    const createdAt = this.now().toISOString()
    const sourceRefs = Array.isArray(input?.sourceRefs)
      ? input.sourceRefs.map((item) => bounded(item, '来源', 500)).slice(0, 12)
      : []
    if (sourceRefs.length === 0) throw new Error('候选记忆必须注明来源。')
    const record = {
      id: `mem_${this.id().replace(/[^a-zA-Z0-9_-]/g, '')}`,
      kind,
      scope: bounded(input?.scope, '作用域', 160),
      status: 'candidate',
      sensitivity,
      sourceRefs,
      createdAt,
      reviewAfter: String(input?.reviewAfter || ''),
      supersedes: [],
      title: bounded(input?.title, '标题', 160),
      content: bounded(input?.content, '记忆内容'),
      reason: bounded(input?.reason, '保留原因'),
      limits: bounded(input?.limits, '不适用范围')
    }
    const path = join(this.root, FOLDERS.candidate, `${record.id}.md`)
    writeFileSync(path, render(record), { encoding: 'utf8', flag: 'wx' })
    return { ...record, path }
  }

  list(status = 'candidate') {
    if (!STATUSES.has(status)) throw new Error('记忆状态无效。')
    this.initialize()
    const folder = join(this.root, FOLDERS[status])
    return readdirSync(folder, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => parse(readFileSync(join(folder, entry.name), 'utf8'), join(folder, entry.name)))
      .filter((record) => record.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  review(id, status) {
    if (!['confirmed', 'rejected'].includes(status)) throw new Error('候选记忆只能确认或拒绝。')
    const candidate = this.list('candidate').find((record) => record.id === String(id || ''))
    if (!candidate) throw new Error('找不到待审阅记忆。')
    const next = { ...candidate, status }
    delete next.path
    const target = join(this.root, FOLDERS[status], `${next.id}.md`)
    const temporaryTarget = `${target}.${this.id().replace(/[^a-zA-Z0-9_-]/g, '')}.tmp`
    writeFileSync(temporaryTarget, render(next), { encoding: 'utf8', flag: 'wx' })
    renameSync(temporaryTarget, target)
    unlinkSync(candidate.path)
    return { ...next, path: target }
  }
}

module.exports = { MemoryCandidateStore, parseMemoryRecord: parse, renderMemoryRecord: render }
