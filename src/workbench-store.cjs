const { randomUUID } = require('node:crypto')
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const { dirname } = require('node:path')

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
  return { version: 3, threads: [], activeThreadId: '' }
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
    sessionId: typeof raw.sessionId === 'string' ? raw.sessionId : '',
    engineState: ['draft', 'running', 'ready', 'error'].includes(raw.engineState) ? raw.engineState : 'draft',
    engineError: typeof raw.engineError === 'string' ? raw.engineError.slice(0, 1200) : '',
    engineNotice: typeof raw.engineNotice === 'string' ? raw.engineNotice.slice(0, 1200) : '',
    recovery: validateRecovery(raw.recovery),
    createdAt: cleanText(raw.createdAt, '创建时间', 80),
    updatedAt: cleanText(raw.updatedAt, '更新时间', 80)
  }
}

class WorkbenchStore {
  constructor(storagePath) {
    this.storagePath = storagePath
  }

  load() {
    if (!existsSync(this.storagePath)) return defaultState()
    try {
      const raw = JSON.parse(readFileSync(this.storagePath, 'utf8'))
      if (![1, 2, 3].includes(raw?.version) || !Array.isArray(raw.threads)) throw new Error('版本或列表格式不兼容')
      const threads = raw.threads.map(validateThread)
      return { version: 3, threads, activeThreadId: typeof raw.activeThreadId === 'string' ? raw.activeThreadId : '' }
    } catch (error) {
      throw new Error(`无法读取本地任务库：${error.message}`)
    }
  }

  persist(state) {
    mkdirSync(dirname(this.storagePath), { recursive: true })
    writeFileSync(this.storagePath, JSON.stringify(state, null, 2), 'utf8')
  }

  snapshot() {
    const state = this.load()
    const threads = [...state.threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const activeThreadId = state.activeThreadId === ''
      ? ''
      : threads.some((thread) => thread.id === state.activeThreadId)
        ? state.activeThreadId
        : (threads[0]?.id || '')
    return copy({ threads, activeThreadId })
  }

  create({ title, prompt, hasAttachments = false }) {
    const body = cleanText(prompt, '任务内容', MAX_PROMPT, { required: !hasAttachments })
    const now = new Date().toISOString()
    const thread = {
      id: randomUUID(),
      title: title && String(title).trim() ? cleanText(title, '任务标题', MAX_TITLE) : (body ? titleFromPrompt(body) : '图片任务'),
      prompt: body,
      workspacePath: '',
      baseline: null,
      sessionId: '',
      engineState: 'draft',
      engineError: '',
      engineNotice: '',
      recovery: null,
      createdAt: now,
      updatedAt: now
    }
    const state = this.load()
    this.persist({ version: 3, threads: [...state.threads, thread], activeThreadId: thread.id })
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
    this.persist({ version: 3, threads, activeThreadId })
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
        engineState: ['draft', 'running', 'ready', 'error'].includes(state) ? state : thread.engineState,
        engineError: String(error || '').slice(0, 1200),
        engineNotice: notice === undefined ? thread.engineNotice : String(notice || '').slice(0, 1200),
        updatedAt: now
      }
    })
    if (!found) throw new Error('找不到要更新的任务。')
    this.persist({ version: 3, threads, activeThreadId: current.activeThreadId })
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
    this.persist({ version: 3, threads, activeThreadId: current.activeThreadId })
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
    this.persist({ version: 3, threads, activeThreadId: current.activeThreadId })
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
        updatedAt: normalizedBaseline.capturedAt || thread.updatedAt
      }
    })
    if (!found) throw new Error('找不到要更新的任务。')
    this.persist({ version: 3, threads, activeThreadId: current.activeThreadId })
    return this.snapshot()
  }
}

module.exports = { WorkbenchStore }
