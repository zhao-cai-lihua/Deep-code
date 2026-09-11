const { randomUUID } = require('node:crypto')
const { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } = require('node:fs')
const { basename, dirname, extname, join } = require('node:path')
const { normalizeTaskContract } = require('./task-contract.cjs')

const MAX_TITLE = 120
const MAX_PROMPT = 12000

function copy(value) {
  return JSON.parse(JSON.stringify(value))
}

function cleanText(value, field, max, { required = true } = {}) {
  if (typeof value !== 'string') {
    if (!required && (value === undefined || value === null)) return ''
    throw new Error(`${field} 必须是文本。`)
  }
  const result = value.trim()
  if (!result && required) throw new Error(`${field} 不能为空。`)
  if (result.length > max) throw new Error(`${field} 最多 ${max} 个字符。`)
  return result
}

function titleFromPrompt(prompt) {
  return prompt.replace(/\s+/g, ' ').slice(0, 52) || '未命名任务'
}

function defaultState() {
  return { version: 6, threads: [], activeThreadId: '' }
}

function validateState(raw) {
  if (![1, 2, 3, 4, 5, 6].includes(raw?.version) || !Array.isArray(raw.threads)) throw new Error('版本或列表格式不兼容')
  return { version: 6, threads: raw.threads.map(validateThread), activeThreadId: typeof raw.activeThreadId === 'string' ? raw.activeThreadId : '' }
}

function validateAdmission(raw) {
  if (!raw || typeof raw !== 'object') return null
  const messageId = typeof raw.messageId === 'string' ? raw.messageId.slice(0, 240) : ''
  const rpcId = typeof raw.rpcId === 'string' ? raw.rpcId.slice(0, 240) : ''
  if (raw.accepted !== true && !messageId) return null
  return {
    accepted: true,
    ...(messageId ? { messageId } : {}),
    ...(rpcId ? { rpcId } : {}),
    acceptedAt: typeof raw.acceptedAt === 'string' ? raw.acceptedAt.slice(0, 80) : ''
  }
}

function validateRoute(raw) {
  if (!raw || typeof raw !== 'object') return null
  const provider = typeof raw.provider === 'string' ? raw.provider.slice(0, 120) : ''
  const model = typeof raw.model === 'string' ? raw.model.slice(0, 180) : ''
  if (!provider || !model) return null
  return { provider, model, reasoningEffort: typeof raw.reasoningEffort === 'string' ? raw.reasoningEffort.slice(0, 80) : '' }
}

function validatePurpose(raw) {
  if (!raw || raw.kind !== 'model-connection-test') return null
  const requestedRoute = validateRoute(raw.requestedRoute)
  return requestedRoute ? { kind: 'model-connection-test', requestedRoute } : null
}

function validateVerificationReceipt(raw) {
  if (!raw || raw.version !== 1 || !['passed', 'failed', 'interrupted'].includes(raw.state)) return null
  const route = validateRoute(raw)
  if (!route || raw.routeEvidence !== 'request/header') return null
  const failure = raw.failure && typeof raw.failure === 'object' ? {
    kind: typeof raw.failure.kind === 'string' ? raw.failure.kind.slice(0, 80) : '',
    title: typeof raw.failure.title === 'string' ? raw.failure.title.slice(0, 240) : '',
    detail: typeof raw.failure.detail === 'string' ? raw.failure.detail.slice(0, 600) : '',
    nextAction: typeof raw.failure.nextAction === 'string' ? raw.failure.nextAction.slice(0, 600) : ''
  } : null
  return {
    version: 1,
    state: raw.state,
    ...route,
    modelName: typeof raw.modelName === 'string' ? raw.modelName.slice(0, 180) : route.model,
    routeEvidence: 'request/header',
    terminalReason: typeof raw.terminalReason === 'string' ? raw.terminalReason.slice(0, 120) : '',
    ...(failure ? { failure } : {}),
    recordedAt: typeof raw.recordedAt === 'string' ? raw.recordedAt.slice(0, 80) : ''
  }
}

function validateBaseline(raw) {
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return null
  const states = ['clean', 'dirty', 'not-git', 'unavailable']
  return {
    version: 1,
    state: states.includes(raw.state) ? raw.state : 'unavailable',
    workspacePath: typeof raw.workspacePath === 'string' ? raw.workspacePath.slice(0, 2048) : '',
    repoRoot: typeof raw.repoRoot === 'string' ? raw.repoRoot.slice(0, 2048) : '',
    head: typeof raw.head === 'string' ? raw.head.slice(0, 120) : '',
    dirtyPaths: Array.isArray(raw.dirtyPaths)
      ? [...new Set(raw.dirtyPaths.filter((path) => typeof path === 'string').map((path) => path.slice(0, 2048)))].slice(0, 5000)
      : [],
    capturedAt: typeof raw.capturedAt === 'string' ? raw.capturedAt.slice(0, 80) : '',
    message: typeof raw.message === 'string' ? raw.message.slice(0, 1200) : ''
  }
}

function validateRecovery(raw) {
  if (!raw || typeof raw !== 'object') return null
  const kind = typeof raw.kind === 'string' ? raw.kind.slice(0, 80) : ''
  const cause = typeof raw.cause === 'string' ? raw.cause.slice(0, 1200) : ''
  const safety = typeof raw.safety === 'string' ? raw.safety.slice(0, 1200) : ''
  const nextAction = typeof raw.nextAction === 'string' ? raw.nextAction.slice(0, 1200) : ''
  if (!kind || !cause || !nextAction) return null
  return {
    kind,
    cause,
    safety,
    nextAction,
    occurredAt: typeof raw.occurredAt === 'string' ? raw.occurredAt.slice(0, 80) : ''
  }
}

function validateThread(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('任务格式错误。')
  const prompt = cleanText(raw.prompt, '任务内容', MAX_PROMPT, { required: false })
  return {
    id: cleanText(raw.id, '任务标识', 120),
    title: cleanText(raw.title, '任务标题', MAX_TITLE),
    prompt,
    workspacePath: typeof raw.workspacePath === 'string' ? raw.workspacePath.slice(0, 2048) : '',
    baseline: validateBaseline(raw.baseline),
    completionBaseline: validateBaseline(raw.completionBaseline),
    sessionId: typeof raw.sessionId === 'string' ? raw.sessionId : '',
    admission: validateAdmission(raw.admission),
    engineState: ['draft', 'queued', 'running', 'ready', 'unknown', 'error'].includes(raw.engineState) ? raw.engineState : 'draft',
    engineError: typeof raw.engineError === 'string' ? raw.engineError.slice(0, 1200) : '',
    engineNotice: typeof raw.engineNotice === 'string' ? raw.engineNotice.slice(0, 1200) : '',
    recovery: validateRecovery(raw.recovery),
    taskContract: normalizeTaskContract(raw.taskContract),
    purpose: validatePurpose(raw.purpose),
    verificationReceipt: validateVerificationReceipt(raw.verificationReceipt),
    createdAt: cleanText(raw.createdAt, '创建时间', 80),
    updatedAt: cleanText(raw.updatedAt, '更新时间', 80)
  }
}

class WorkbenchStore {
  constructor(storagePath) {
    this.storagePath = storagePath
    this.lastRecovery = null
  }

  generationEntries() {
    const directory = dirname(this.storagePath)
    if (!existsSync(directory)) return []
    const stem = basename(this.storagePath, extname(this.storagePath)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`^${stem}\\.(\\d{8})\\.json$`)
    return readdirSync(directory).map((name) => {
      const match = name.match(pattern)
      return match ? { name, sequence: Number(match[1]), path: join(directory, name) } : null
    }).filter(Boolean).sort((a, b) => b.sequence - a.sequence)
  }

  load() {
    this.lastRecovery = null
    const generations = this.generationEntries()
    for (let index = 0; index < generations.length; index += 1) {
      try {
        const state = validateState(JSON.parse(readFileSync(generations[index].path, 'utf8')))
        if (index > 0) this.lastRecovery = { kind: 'generation-fallback', message: `最新任务记录不完整，已恢复到本地版本 ${generations[index].sequence}。` }
        return state
      } catch { /* Try the previous immutable generation. */ }
    }
    if (existsSync(this.storagePath)) {
      try {
        const state = validateState(JSON.parse(readFileSync(this.storagePath, 'utf8')))
        this.persist(state)
        this.lastRecovery = { kind: 'legacy-migrated', message: '旧任务记录已安全迁移为可恢复版本，原文件仍保留。' }
        return state
      } catch (error) {
        throw new Error(`无法读取本地任务库：${error.message}`)
      }
    }
    if (generations.length) throw new Error('无法读取本地任务库：所有可恢复版本都已损坏。')
    return defaultState()
  }

  persist(state) {
    const directory = dirname(this.storagePath)
    mkdirSync(directory, { recursive: true })
    const stem = basename(this.storagePath, extname(this.storagePath))
    const reservedPattern = new RegExp(`^${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.(\\d{8})\\.json(?:\\.tmp)?$`)
    const highestReserved = readdirSync(directory).reduce((highest, name) => {
      const match = name.match(reservedPattern)
      return match ? Math.max(highest, Number(match[1])) : highest
    }, 0)
    const nextSequence = highestReserved + 1
    const finalPath = join(directory, `${stem}.${String(nextSequence).padStart(8, '0')}.json`)
    const temporaryPath = `${finalPath}.tmp`
    const descriptor = openSync(temporaryPath, 'wx')
    try {
      writeFileSync(descriptor, JSON.stringify(validateState(state), null, 2), 'utf8')
      fsyncSync(descriptor)
    } finally { closeSync(descriptor) }
    renameSync(temporaryPath, finalPath)
    validateState(JSON.parse(readFileSync(finalPath, 'utf8')))
    const valid = []
    for (const entry of this.generationEntries()) {
      try { validateState(JSON.parse(readFileSync(entry.path, 'utf8'))); valid.push(entry) } catch { /* Corrupt evidence is retained. */ }
    }
    for (const entry of valid.slice(3)) unlinkSync(entry.path)
  }

  snapshot() {
    const state = this.load()
    const threads = [...state.threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const activeThreadId = state.activeThreadId === ''
      ? ''
      : threads.some((thread) => thread.id === state.activeThreadId)
        ? state.activeThreadId
        : (threads[0]?.id || '')
    return copy({ threads, activeThreadId, ...(this.lastRecovery ? { storageRecovery: this.lastRecovery } : {}) })
  }

  create({ title, prompt, hasAttachments = false, taskContract = null, purpose = null }) {
    const body = cleanText(prompt, '任务内容', MAX_PROMPT, { required: !hasAttachments })
    const now = new Date().toISOString()
    const thread = {
      id: randomUUID(),
      title: title && String(title).trim() ? cleanText(title, '任务标题', MAX_TITLE) : (body ? titleFromPrompt(body) : '图片任务'),
      prompt: body,
      workspacePath: '',
      baseline: null,
      completionBaseline: null,
      sessionId: '',
      admission: null,
      engineState: 'draft',
      engineError: '',
      engineNotice: '',
      recovery: null,
      taskContract: normalizeTaskContract(taskContract),
      purpose: validatePurpose(purpose),
      verificationReceipt: null,
      createdAt: now,
      updatedAt: now
    }
    const state = this.load()
    this.persist({ version: 6, threads: [...state.threads, thread], activeThreadId: thread.id })
    return copy(thread)
  }

  select(id) {
    const state = this.load()
    if (id && !state.threads.some((thread) => thread.id === id)) throw new Error('找不到所选任务。')
    this.persist({ ...state, activeThreadId: id || '' })
    return this.snapshot()
  }

  remove(id) {
    const state = this.load()
    const threads = state.threads.filter((thread) => thread.id !== id)
    if (threads.length === state.threads.length) throw new Error('找不到要删除的任务。')
    const activeThreadId = state.activeThreadId === id ? (threads[0]?.id || '') : state.activeThreadId
    this.persist({ version: 6, threads, activeThreadId })
    return this.snapshot()
  }

  setEngineState(id, { sessionId, state, error = '', notice }) {
    const current = this.load()
    let found = false
    const now = new Date().toISOString()
    const threads = current.threads.map((thread) => {
      if (thread.id !== id) return thread
      found = true
      return {
        ...thread,
        sessionId: sessionId === undefined ? thread.sessionId : String(sessionId || ''),
        engineState: ['draft', 'queued', 'running', 'ready', 'unknown', 'error'].includes(state) ? state : thread.engineState,
        engineError: String(error || '').slice(0, 1200),
        engineNotice: notice === undefined ? thread.engineNotice : String(notice || '').slice(0, 1200),
        updatedAt: now
      }
    })
    if (!found) throw new Error('找不到要更新的任务。')
    this.persist({ version: 6, threads, activeThreadId: current.activeThreadId })
    return this.snapshot()
  }

  setAdmission(id, admission) {
    const current = this.load()
    const normalized = validateAdmission(admission)
    if (!normalized) throw new Error('Engine 接纳回执格式不完整。')
    let found = false
    const threads = current.threads.map((thread) => {
      if (thread.id !== id) return thread
      found = true
      return { ...thread, admission: normalized, updatedAt: normalized.acceptedAt || thread.updatedAt }
    })
    if (!found) throw new Error('找不到要保存接纳回执的任务。')
    this.persist({ version: 6, threads, activeThreadId: current.activeThreadId })
    return this.snapshot()
  }

  clearAdmission(id) {
    const current = this.load()
    let found = false
    const threads = current.threads.map((thread) => {
      if (thread.id !== id) return thread
      found = true
      return { ...thread, admission: null }
    })
    if (!found) throw new Error('找不到要清除接纳回执的任务。')
    this.persist({ version: 6, threads, activeThreadId: current.activeThreadId })
    return this.snapshot()
  }

  setRecovery(id, recovery) {
    const current = this.load()
    let found = false
    const normalized = validateRecovery({ ...recovery, occurredAt: recovery?.occurredAt || new Date().toISOString() })
    if (!normalized) throw new Error('恢复说明格式不完整。')
    const threads = current.threads.map((thread) => {
      if (thread.id !== id) return thread
      found = true
      return { ...thread, recovery: normalized, updatedAt: normalized.occurredAt }
    })
    if (!found) throw new Error('找不到要更新的任务。')
    this.persist({ version: 6, threads, activeThreadId: current.activeThreadId })
    return this.snapshot()
  }

  clearRecovery(id) {
    const current = this.load()
    let found = false
    const threads = current.threads.map((thread) => {
      if (thread.id !== id) return thread
      found = true
      return { ...thread, recovery: null }
    })
    if (!found) throw new Error('找不到要更新的任务。')
    this.persist({ version: 6, threads, activeThreadId: current.activeThreadId })
    return this.snapshot()
  }

  setWorkspaceBaseline(id, { workspacePath, baseline }) {
    const current = this.load()
    let found = false
    const normalizedPath = cleanText(workspacePath, '工作区路径', 2048)
    const normalizedBaseline = validateBaseline(baseline)
    if (!normalizedBaseline) throw new Error('Git 基线格式不完整。')
    const threads = current.threads.map((thread) => {
      if (thread.id !== id) return thread
      found = true
      return {
        ...thread,
        workspacePath: normalizedPath,
        baseline: normalizedBaseline,
        completionBaseline: null,
        updatedAt: normalizedBaseline.capturedAt || thread.updatedAt
      }
    })
    if (!found) throw new Error('找不到要更新的任务。')
    this.persist({ version: 6, threads, activeThreadId: current.activeThreadId })
    return this.snapshot()
  }

  setCompletionBaseline(id, baseline) {
    const current = this.load()
    const normalized = validateBaseline(baseline)
    if (!normalized) throw new Error('任务结束基线格式不完整。')
    let found = false
    const threads = current.threads.map((thread) => {
      if (thread.id !== id) return thread
      found = true
      return { ...thread, completionBaseline: normalized }
    })
    if (!found) throw new Error('找不到要保存结束基线的任务。')
    this.persist({ version: 6, threads, activeThreadId: current.activeThreadId })
    return this.snapshot()
  }

  setVerificationReceipt(id, receipt) {
    const current = this.load()
    let found = false
    const normalized = validateVerificationReceipt(receipt)
    if (!normalized) throw new Error('模型验证回执格式不完整。')
    const threads = current.threads.map((thread) => {
      if (thread.id !== id) return thread
      found = true
      return { ...thread, verificationReceipt: normalized, updatedAt: normalized.recordedAt || thread.updatedAt }
    })
    if (!found) throw new Error('找不到要保存回执的任务。')
    this.persist({ version: 6, threads, activeThreadId: current.activeThreadId })
    return this.snapshot()
  }

  clearVerificationReceipt(id) {
    const current = this.load()
    let found = false
    const threads = current.threads.map((thread) => {
      if (thread.id !== id) return thread
      found = true
      return { ...thread, verificationReceipt: null }
    })
    if (!found) throw new Error('找不到要更新回执的任务。')
    this.persist({ version: 6, threads, activeThreadId: current.activeThreadId })
    return this.snapshot()
  }
}

module.exports = { WorkbenchStore }
