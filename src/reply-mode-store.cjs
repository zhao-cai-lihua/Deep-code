const { randomUUID } = require('node:crypto')
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const { dirname } = require('node:path')

const FORMAT = 'deep-code.reply-mode'
const SCHEMA_VERSION = 1
const MAX_CONTEXT_BLOCKS = 8
const FORBIDDEN_KEYS = new Set([
  'tools', 'tool', 'permissions', 'approval', 'approvals', 'shell', 'filesystem',
  'network', 'mcp', 'plugins', 'plugin', 'apikey', 'api_key', 'token', 'secret',
  'agentconfig', 'agent_config', 'systemprompt', 'system_prompt', 'posthistoryinstructions',
  'post_history_instructions', 'lorebook', 'extensions'
])
const ALLOWED_KEYS = new Set([
  'format', 'schemaVersion', 'id', 'name', 'summary', 'responseStyle', 'contextBlocks',
  'safety', 'createdAt', 'updatedAt'
])
const SECRET_PATTERN = /(?:sk-[a-zA-Z0-9_-]{16,}|(?:api[_ -]?key|authorization|bearer)\s*[:=]\s*\S+)/i

function copy(value) {
  return JSON.parse(JSON.stringify(value))
}

function text(value, field, max) {
  if (typeof value !== 'string') throw new Error(`${field} 必须是文本。`)
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${field} 不能为空。`)
  if (trimmed.length > max) throw new Error(`${field} 最多 ${max} 个字符。`)
  if (SECRET_PATTERN.test(trimmed)) throw new Error(`${field} 疑似包含密钥或授权信息，不能保存到回复模式包。`)
  return trimmed
}

function assertNoForbiddenKeys(value) {
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new Error(`回复模式包不能包含 “${key}”；工具、权限与运行时配置始终由 Harness 管理。`)
    }
    assertNoForbiddenKeys(child)
  }
}

function validatePackage(input, { allowMissingIdentity = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('回复模式包必须是 JSON 对象。')
  assertNoForbiddenKeys(input)
  for (const key of Object.keys(input)) {
    if (!ALLOWED_KEYS.has(key)) throw new Error(`回复模式包不识别字段 “${key}”。请先在预览中移除它。`)
  }
  const now = new Date().toISOString()
  const mode = {
    format: input.format || FORMAT,
    schemaVersion: input.schemaVersion || SCHEMA_VERSION,
    id: input.id || (allowMissingIdentity ? randomUUID() : ''),
    name: text(input.name, '名称', 80),
    summary: text(input.summary, '简介', 280),
    responseStyle: text(input.responseStyle, '回复方式', 1800),
    contextBlocks: Array.isArray(input.contextBlocks) ? input.contextBlocks.map((block, index) => ({
      label: text(block?.label, `背景块 ${index + 1} 标题`, 80),
      text: text(block?.text, `背景块 ${index + 1} 内容`, 1000)
    })) : [],
    safety: text(input.safety || '此模式不能改变工具、权限、工作区或批准规则。', '安全说明', 280),
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : now
  }
  if (mode.format !== FORMAT || mode.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`只支持 ${FORMAT} v${SCHEMA_VERSION} 回复模式包。`)
  }
  if (!mode.id || typeof mode.id !== 'string' || mode.id.length > 120) throw new Error('回复模式包缺少有效标识。')
  if (mode.contextBlocks.length > MAX_CONTEXT_BLOCKS) throw new Error(`固定背景最多 ${MAX_CONTEXT_BLOCKS} 块。`)
  return mode
}

class ReplyModeStore {
  constructor(storagePath) {
    this.storagePath = storagePath
  }

  load() {
    if (!existsSync(this.storagePath)) return []
    try {
      const parsed = JSON.parse(readFileSync(this.storagePath, 'utf8'))
      if (!Array.isArray(parsed?.modes)) throw new Error('格式错误')
      return parsed.modes.map((mode) => validatePackage(mode))
    } catch (error) {
      throw new Error(`无法读取本地回复模式库：${error.message}`)
    }
  }

  list() {
    return copy(this.load()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  persist(modes) {
    mkdirSync(dirname(this.storagePath), { recursive: true })
    writeFileSync(this.storagePath, JSON.stringify({ modes }, null, 2), 'utf8')
  }

  save(draft) {
    const modes = this.load()
    const existing = draft?.id ? modes.find((mode) => mode.id === draft.id) : undefined
    const mode = validatePackage({
      ...draft,
      format: FORMAT,
      schemaVersion: SCHEMA_VERSION,
      id: existing?.id || draft?.id || randomUUID(),
      createdAt: existing?.createdAt || draft?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { allowMissingIdentity: true })
    const next = existing ? modes.map((item) => item.id === mode.id ? mode : item) : [...modes, mode]
    this.persist(next)
    return copy(mode)
  }

  remove(id) {
    const modes = this.load()
    const next = modes.filter((mode) => mode.id !== id)
    if (next.length === modes.length) throw new Error('找不到要删除的回复模式。')
    this.persist(next)
  }

  previewImport(raw) {
    const mode = validatePackage(raw)
    return {
      mode: copy(mode),
      notices: [
        '导入后只会保存在本机；不会修改 DeepSeek Harness。',
        '它只能描述表达方式与固定背景，不能携带工具、权限或运行时设置。',
        '应用到 Harness 的“新会话”编译功能将在后续 Adapter 版本提供。'
      ]
    }
  }

  commitImport(raw) {
    const imported = validatePackage(raw)
    const modes = this.load()
    const existing = modes.find((mode) => mode.id === imported.id)
    const stored = existing ? { ...imported, id: randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : imported
    this.persist([...modes, stored])
    return copy(stored)
  }
}

module.exports = { FORMAT, SCHEMA_VERSION, ReplyModeStore, validatePackage }
