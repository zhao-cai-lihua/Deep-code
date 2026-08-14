const { randomUUID } = require('node:crypto')
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const { dirname } = require('node:path')

const FORMAT = 'deep-code.companion-card'
const SCHEMA_VERSION = 1
const KINDS = new Set(['user-persona', 'agent-character', 'interaction-style'])
const ACTIVE_SLOT_FOR_KIND = {
  'user-persona': 'userPersonaId',
  'agent-character': 'agentCharacterId',
  'interaction-style': 'interactionStyleId'
}
const ALLOWED_KEYS = new Set([
  'format', 'schemaVersion', 'id', 'kind', 'name', 'summary', 'modelText', 'humanNotes',
  'tags', 'safety', 'source', 'createdAt', 'updatedAt'
])
const FORBIDDEN_KEYS = new Set([
  'tools', 'tool', 'permissions', 'approval', 'approvals', 'shell', 'filesystem',
  'network', 'mcp', 'plugins', 'plugin', 'apikey', 'api_key', 'token', 'secret',
  'agentconfig', 'agent_config', 'systemprompt', 'system_prompt', 'posthistoryinstructions',
  'post_history_instructions', 'lorebook', 'extensions', 'command', 'commands'
])
const SECRET_PATTERN = /(?:sk-[a-zA-Z0-9_-]{16,}|(?:api[_ -]?key|authorization|bearer)\s*[:=]\s*\S+)/i

const BUILTIN_YANXING = Object.freeze({
  format: FORMAT,
  schemaVersion: SCHEMA_VERSION,
  id: 'builtin.yanxing.user-persona.zh',
  kind: 'user-persona',
  name: '砚星 / Yanxing',
  summary: '高联想、重视主体性与诚实的创作者型协作者。',
  modelText: `把砚星视作高语境、场域联想式的协作者，而不是只等待标准答案的命令输入者。\n\n当输入看似跳跃时，先寻找其中可能的桥；保留值得发展的支线，但也帮助区分观察、已有证据、推断、开放假说与想象。不要为了维持气氛伪造确定性。\n\n教学抽象概念时，优先用空间关系、动态过程、具身直觉和可视化，再进入严格定义。技术问题仍须保持工程精度。\n\n保持温暖但有判断：可以不同意、拒绝、修正观点、主动提出方向或承认不确定。不要把亲近变成排他、依赖或顺从，也不要把复杂表达病理化。\n\n砚星的玩笑、猫意象、自嘲或轻微胡闹常是放松联想的玩耍状态；可以接住玩心，但不必牺牲思考密度。面对漂亮但证据不足的理论，保留它的创造性，同时标清它目前位于哪一层证据。`,
  humanNotes: '内置用户人格起点，依据砚星明确提供并同意纳入 Deep code 的角色卡压缩而成。它不是任何 Agent 的身份声明，也不会自动写入 Harness。',
  tags: ['中文', '共同思考', '创作', '研究'],
  safety: '此卡只描述用户侧协作偏好；不能改变工具、权限、工作区、网络、插件或批准规则。',
  source: 'built-in',
  createdAt: '2026-08-14T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z'
})

function copy(value) {
  return JSON.parse(JSON.stringify(value))
}

function text(value, field, max, { required = true } = {}) {
  if (typeof value !== 'string') {
    if (!required && (value === undefined || value === null)) return ''
    throw new Error(`${field} 必须是文本。`)
  }
  const trimmed = value.trim()
  if (!trimmed && required) throw new Error(`${field} 不能为空。`)
  if (trimmed.length > max) throw new Error(`${field} 最多 ${max} 个字符。`)
  if (SECRET_PATTERN.test(trimmed)) throw new Error(`${field} 疑似包含密钥或授权信息，不能保存到角色卡。`)
  return trimmed
}

function assertNoForbiddenKeys(value) {
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new Error(`角色卡不能包含 “${key}”；工具、权限与运行时配置始终由 Harness 管理。`)
    }
    assertNoForbiddenKeys(child)
  }
}

function validateTags(value) {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 10) throw new Error('标签必须是不超过 10 个的文本列表。')
  return value.map((tag, index) => text(tag, `标签 ${index + 1}`, 32))
}

function validateCard(input, { allowMissingIdentity = false, sourceOverride } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('角色卡必须是 JSON 对象。')
  assertNoForbiddenKeys(input)
  for (const key of Object.keys(input)) {
    if (!ALLOWED_KEYS.has(key)) throw new Error(`角色卡不识别字段 “${key}”。请先在预览中移除它。`)
  }
  const now = new Date().toISOString()
  const card = {
    format: input.format || FORMAT,
    schemaVersion: input.schemaVersion || SCHEMA_VERSION,
    id: input.id || (allowMissingIdentity ? randomUUID() : ''),
    kind: input.kind,
    name: text(input.name, '名称', 80),
    summary: text(input.summary, '简介', 280),
    modelText: text(input.modelText, '模型可见内容', 6000),
    humanNotes: text(input.humanNotes, '仅本地说明', 2000, { required: false }),
    tags: validateTags(input.tags),
    safety: text(input.safety || '此卡不能改变工具、权限、工作区或批准规则。', '安全说明', 280),
    source: sourceOverride || (input.source === 'built-in' ? 'built-in' : 'local'),
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : now
  }
  if (card.format !== FORMAT || card.schemaVersion !== SCHEMA_VERSION) throw new Error(`只支持 ${FORMAT} v${SCHEMA_VERSION}。`)
  if (!KINDS.has(card.kind)) throw new Error('角色卡类型必须是 User Persona、Agent Character 或 Interaction Style。')
  if (!card.id || typeof card.id !== 'string' || card.id.length > 120) throw new Error('角色卡缺少有效标识。')
  return card
}

function emptyLibrary() {
  return {
    cards: [],
    active: { userPersonaId: BUILTIN_YANXING.id, agentCharacterId: '', interactionStyleId: '' }
  }
}

class CompanionCardStore {
  constructor(storagePath, legacyReplyModePath) {
    this.storagePath = storagePath
    this.legacyReplyModePath = legacyReplyModePath
  }

  loadLibrary() {
    if (!existsSync(this.storagePath)) return this.migrateLegacyLibrary()
    try {
      const parsed = JSON.parse(readFileSync(this.storagePath, 'utf8'))
      if (!Array.isArray(parsed?.cards) || !parsed.active || typeof parsed.active !== 'object') throw new Error('格式错误')
      return {
        cards: parsed.cards.map((card) => validateCard(card)),
        active: {
          userPersonaId: typeof parsed.active.userPersonaId === 'string' ? parsed.active.userPersonaId : BUILTIN_YANXING.id,
          agentCharacterId: typeof parsed.active.agentCharacterId === 'string' ? parsed.active.agentCharacterId : '',
          interactionStyleId: typeof parsed.active.interactionStyleId === 'string' ? parsed.active.interactionStyleId : ''
        }
      }
    } catch (error) {
      throw new Error(`无法读取本地角色卡库：${error.message}`)
    }
  }

  migrateLegacyLibrary() {
    const library = emptyLibrary()
    if (!this.legacyReplyModePath || !existsSync(this.legacyReplyModePath)) return library
    try {
      const parsed = JSON.parse(readFileSync(this.legacyReplyModePath, 'utf8'))
      if (!Array.isArray(parsed?.modes)) return library
      library.cards = parsed.modes.map((mode) => validateCard({
        id: mode.id,
        kind: 'interaction-style',
        name: mode.name,
        summary: mode.summary,
        modelText: [mode.responseStyle, ...(mode.contextBlocks || []).map((block) => `${block.label}: ${block.text}`)].join('\n\n'),
        humanNotes: '从 Deep code 0.2 Reply Mode 自动迁移；未修改 Harness。',
        tags: ['迁移'],
        safety: mode.safety,
        source: 'local',
        createdAt: mode.createdAt,
        updatedAt: mode.updatedAt
      }))
      return library
    } catch {
      return library
    }
  }

  persist(library) {
    mkdirSync(dirname(this.storagePath), { recursive: true })
    writeFileSync(this.storagePath, JSON.stringify(library, null, 2), 'utf8')
  }

  snapshot() {
    const library = this.loadLibrary()
    const cards = [copy(BUILTIN_YANXING), ...library.cards.map(copy)]
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
    return { cards, active: copy(library.active) }
  }

  save(draft) {
    const library = this.loadLibrary()
    const existing = draft?.id ? library.cards.find((card) => card.id === draft.id) : undefined
    const card = validateCard({
      ...draft,
      format: FORMAT,
      schemaVersion: SCHEMA_VERSION,
      id: existing?.id || randomUUID(),
      source: 'local',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { allowMissingIdentity: true, sourceOverride: 'local' })
    const cards = existing ? library.cards.map((item) => item.id === card.id ? card : item) : [...library.cards, card]
    this.persist({ cards, active: library.active })
    return copy(card)
  }

  remove(id) {
    if (id === BUILTIN_YANXING.id) throw new Error('内置起点不能删除；如不想使用它，请在设置中取消选择。')
    const library = this.loadLibrary()
    const cards = library.cards.filter((card) => card.id !== id)
    if (cards.length === library.cards.length) throw new Error('找不到要删除的角色卡。')
    const active = { ...library.active }
    for (const slot of Object.values(ACTIVE_SLOT_FOR_KIND)) if (active[slot] === id) active[slot] = ''
    this.persist({ cards, active })
  }

  setActive(kind, id) {
    if (!KINDS.has(kind)) throw new Error('未知角色卡类型。')
    const library = this.loadLibrary()
    const all = [BUILTIN_YANXING, ...library.cards]
    if (id) {
      const card = all.find((item) => item.id === id)
      if (!card || card.kind !== kind) throw new Error('所选角色卡不存在或类型不匹配。')
    }
    const active = { ...library.active, [ACTIVE_SLOT_FOR_KIND[kind]]: id || '' }
    this.persist({ cards: library.cards, active })
    return copy(active)
  }

  previewImport(raw) {
    const card = validateCard(raw, { sourceOverride: 'imported' })
    return {
      card: copy(card),
      notices: [
        '导入后只会保存在本机；不会修改 DeepSeek Harness。',
        '模型可见内容会在未来的“新会话预览”中逐字展示，当前版本不会应用它。',
        '角色卡不能携带工具、权限、密钥、插件、网络或运行时设置。'
      ]
    }
  }

  commitImport(raw) {
    const imported = validateCard(raw, { sourceOverride: 'imported' })
    const library = this.loadLibrary()
    const hasCollision = [BUILTIN_YANXING, ...library.cards].some((card) => card.id === imported.id)
    const card = hasCollision ? { ...imported, id: randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : imported
    this.persist({ cards: [...library.cards, card], active: library.active })
    return copy(card)
  }
}

module.exports = { FORMAT, SCHEMA_VERSION, KINDS, BUILTIN_YANXING, CompanionCardStore, validateCard }
