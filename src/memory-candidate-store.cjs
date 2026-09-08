const { mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } = require('node:fs')
const { basename, dirname, join, resolve, sep } = require('node:path')
const { randomUUID } = require('node:crypto')

const KINDS = new Set(['preference', 'decision', 'handoff', 'learning'])
const SENSITIVITIES = new Set(['ordinary', 'private'])
const FOLDERS = Object.freeze({ candidate: '00_Inbox', confirmed: '20_Confirmed', rejected: '80_Archive' })
const QUARANTINE = '90_Quarantine'
const MEMORY_ID = /^mem_[A-Za-z0-9_-]+$/
const SECRET_PATTERNS = [
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i,
  /(?:^|\n)\s*[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)\s*[:=]\s*["']?[^\s"']+/i,
  /\bsk-[A-Za-z0-9_-]{8,}\b/i
]

function bounded(value, label, max = 4000) {
  const text = String(value || '').trim()
  if (!text) throw new Error(`${label}不能为空。`)
  if (text.length > max) throw new Error(`${label}过长。`)
  return text
}

function scalar(value) { return JSON.stringify(value) }

function parseScalar(source, key, fallback = '') {
  const match = source.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
  if (!match) return fallback
  try { return JSON.parse(match[1]) } catch { return fallback }
}

function render(record) {
  return `---\nid: ${scalar(record.id)}\nkind: ${scalar(record.kind)}\nscope: ${scalar(record.scope)}\nstatus: ${scalar(record.status)}\nsensitivity: ${scalar(record.sensitivity)}\nsource_refs: ${scalar(record.sourceRefs)}\ncreated_at: ${scalar(record.createdAt)}\nreview_after: ${scalar(record.reviewAfter)}\nsupersedes: ${scalar(record.supersedes)}\n---\n\n# ${record.title}\n\n## 记住什么\n\n${record.content}\n\n## 为什么值得记住\n\n${record.reason}\n\n## 不适用范围\n\n${record.limits}\n`
}

function parse(source, path, canonicalStatus) {
  const heading = source.match(/^#\s+(.+)$/m)
  const section = (name) => source.match(new RegExp(`^## ${name}\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`, 'm'))?.[1]?.trim() || ''
  return {
    id: parseScalar(source, 'id'), kind: parseScalar(source, 'kind'), scope: parseScalar(source, 'scope'),
    status: canonicalStatus || parseScalar(source, 'status'), sensitivity: parseScalar(source, 'sensitivity'),
    sourceRefs: parseScalar(source, 'source_refs', []), createdAt: parseScalar(source, 'created_at'),
    reviewAfter: parseScalar(source, 'review_after'), supersedes: parseScalar(source, 'supersedes', []),
    title: heading?.[1]?.trim() || '', content: section('记住什么'), reason: section('为什么值得记住'), limits: section('不适用范围'), path
  }
}

function containsSecret(input) {
  const text = [input?.title, input?.content, input?.reason, input?.limits, ...(Array.isArray(input?.sourceRefs) ? input.sourceRefs : [])].map(String).join('\n')
  return SECRET_PATTERNS.some((pattern) => pattern.test(text))
}

class MemoryCandidateStore {
  constructor(root, { now = () => new Date(), id = () => randomUUID(), moveFile = renameSync } = {}) {
    this.root = String(root || '')
    if (!this.root) throw new Error('记忆 Vault 路径不能为空。')
    this.now = now
    this.id = id
    this.moveFile = moveFile
  }

  initialize() {
    for (const folder of [...Object.values(FOLDERS), QUARANTINE]) mkdirSync(join(this.root, folder), { recursive: true })
    return { root: this.root, folders: [...Object.values(FOLDERS), QUARANTINE] }
  }

  safePath(...parts) {
    const root = resolve(this.root)
    const target = resolve(root, ...parts)
    if (target !== root && !target.startsWith(`${root}${sep}`)) throw new Error('记忆路径越出了本地 Vault。')
    return target
  }

  quarantine(path, reason) {
    const original = `${basename(dirname(path))}-${basename(path)}`.replace(/[^A-Za-z0-9_.-]/g, '_')
    const suffix = `${Date.now()}-${String(this.id()).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24)}`
    const target = this.safePath(QUARANTINE, `${original}.${suffix}`)
    this.moveFile(path, target)
    writeFileSync(`${target}.reason.json`, `${JSON.stringify({ reason: String(reason).slice(0, 400), quarantinedAt: this.now().toISOString() }, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
  }

  scan() {
    this.initialize()
    const result = { candidate: [], confirmed: [], rejected: [] }
    const discovered = []
    for (const [status, folderName] of Object.entries(FOLDERS)) {
      const folder = this.safePath(folderName)
      for (const entry of readdirSync(folder, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue
        const path = this.safePath(folderName, entry.name)
        const stem = basename(entry.name, '.md')
        let source
        let record
        try {
          source = readFileSync(path, 'utf8')
          record = parse(source, path, status)
        } catch { this.quarantine(path, '文件无法作为 UTF-8 Markdown 读取。'); continue }
        if (!MEMORY_ID.test(stem) || record.id !== stem) { this.quarantine(path, '文件名与受保护的 Memory ID 不一致。'); continue }
        if (parseScalar(source, 'status') !== status) { this.quarantine(path, 'Frontmatter 状态与所在目录不一致。'); continue }
        if (containsSecret(record)) { this.quarantine(path, '记录包含疑似敏感凭据。'); continue }
        discovered.push({ status, record })
      }
    }
    const counts = discovered.reduce((map, item) => map.set(item.record.id, (map.get(item.record.id) || 0) + 1), new Map())
    for (const item of discovered) {
      if (counts.get(item.record.id) > 1) {
        this.quarantine(item.record.path, '发现重复的 Memory ID；没有自动选择任何一份作为真相。')
        continue
      }
      result[item.status].push(item.record)
    }
    for (const records of Object.values(result)) records.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    return result
  }

  createCandidate(input) {
    this.initialize()
    if (containsSecret(input)) throw new Error('候选记忆包含疑似敏感凭据；请先删除或遮盖凭据值。')
    const kind = String(input?.kind || '')
    const sensitivity = String(input?.sensitivity || 'private')
    if (!KINDS.has(kind)) throw new Error('记忆类型无效。')
    if (!SENSITIVITIES.has(sensitivity)) throw new Error('敏感度无效。')
    const createdAt = this.now().toISOString()
    const sourceRefs = Array.isArray(input?.sourceRefs) ? input.sourceRefs.map((item) => bounded(item, '来源', 500)).slice(0, 12) : []
    if (sourceRefs.length === 0) throw new Error('候选记忆必须注明来源。')
    const record = {
      id: `mem_${this.id().replace(/[^a-zA-Z0-9_-]/g, '')}`, kind, scope: bounded(input?.scope, '作用域', 160),
      status: 'candidate', sensitivity, sourceRefs, createdAt, reviewAfter: String(input?.reviewAfter || ''), supersedes: [],
      title: bounded(input?.title, '标题', 160), content: bounded(input?.content, '记忆内容'),
      reason: bounded(input?.reason, '保留原因'), limits: bounded(input?.limits, '不适用范围')
    }
    if (!MEMORY_ID.test(record.id)) throw new Error('无法生成安全的记忆编号。')
    const path = this.safePath(FOLDERS.candidate, `${record.id}.md`)
    writeFileSync(path, render(record), { encoding: 'utf8', flag: 'wx' })
    return { ...record, path }
  }

  list(status = 'candidate') {
    if (!Object.hasOwn(FOLDERS, status)) throw new Error('记忆状态无效。')
    return this.scan()[status]
  }

  review(id, status) {
    if (!['confirmed', 'rejected'].includes(status)) throw new Error('候选记忆只能确认或拒绝。')
    const requested = String(id || '')
    if (!MEMORY_ID.test(requested)) throw new Error('记忆编号无效。')
    const candidate = this.scan().candidate.find((record) => record.id === requested)
    if (!candidate) throw new Error('找不到待审阅记忆。')
    const target = this.safePath(FOLDERS[status], `${candidate.id}.md`)
    this.moveFile(candidate.path, target)
    const movedSource = readFileSync(target, 'utf8')
    writeFileSync(target, movedSource.replace(/^status:\s*.+$/m, `status: ${scalar(status)}`), 'utf8')
    return { ...parse(readFileSync(target, 'utf8'), target, status), status }
  }

  remove(id) {
    const requested = String(id || '')
    if (!MEMORY_ID.test(requested)) throw new Error('记忆编号无效。')
    const records = this.scan()
    for (const status of Object.keys(FOLDERS)) {
      const record = records[status].find((item) => item.id === requested)
      if (!record) continue
      unlinkSync(record.path)
      return { id: record.id, status, removed: true }
    }
    throw new Error('找不到要删除的记忆。')
  }
}

module.exports = { MemoryCandidateStore, containsMemorySecret: containsSecret, parseMemoryRecord: parse, renderMemoryRecord: render }
