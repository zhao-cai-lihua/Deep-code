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
  return { version: 1, threads: [], activeThreadId: '' }
}

function validateThread(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('任务格式错误。')
  const prompt = cleanText(raw.prompt, '任务内容', MAX_PROMPT)
  return {
    id: cleanText(raw.id, '任务标识', 120),
    title: cleanText(raw.title, '任务标题', MAX_TITLE),
    prompt,
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
      if (raw?.version !== 1 || !Array.isArray(raw.threads)) throw new Error('版本或列表格式不兼容')
      const threads = raw.threads.map(validateThread)
      return { version: 1, threads, activeThreadId: typeof raw.activeThreadId === 'string' ? raw.activeThreadId : '' }
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
    const activeThreadId = threads.some((thread) => thread.id === state.activeThreadId) ? state.activeThreadId : (threads[0]?.id || '')
    return copy({ threads, activeThreadId })
  }

  create({ title, prompt }) {
    const body = cleanText(prompt, '任务内容', MAX_PROMPT)
    const now = new Date().toISOString()
    const thread = {
      id: randomUUID(),
      title: title && String(title).trim() ? cleanText(title, '任务标题', MAX_TITLE) : titleFromPrompt(body),
      prompt: body,
      createdAt: now,
      updatedAt: now
    }
    const state = this.load()
    this.persist({ version: 1, threads: [...state.threads, thread], activeThreadId: thread.id })
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
    this.persist({ version: 1, threads, activeThreadId })
    return this.snapshot()
  }
}

module.exports = { WorkbenchStore }
