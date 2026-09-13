const KNOWN_KEYS = new Set(['todos', 'plan', 'tokenUsage', 'contextPressure', 'sessionStats'])
const TODO_STATES = new Set(['pending', 'in_progress', 'completed'])

function copy(value) {
  return JSON.parse(JSON.stringify(value))
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasExactKeys(value, required, optional = []) {
  if (!isPlainObject(value)) return false
  const allowed = new Set([...required, ...optional])
  const keys = Object.keys(value)
  return required.every((key) => Object.hasOwn(value, key)) && keys.every((key) => allowed.has(key))
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0
}

function isNonNegativeNumber(value) {
  return Number.isFinite(value) && value >= 0
}

function validateTodos(value) {
  return value === null || (Array.isArray(value) && value.every((item) => (
    hasExactKeys(item, ['content', 'status'])
    && typeof item.content === 'string'
    && TODO_STATES.has(item.status)
  )))
}

function validatePlan(value) {
  return hasExactKeys(value, ['active', 'pending'])
    && typeof value.active === 'boolean'
    && typeof value.pending === 'boolean'
}

function validateTokenUsage(value) {
  const keys = ['uncachedInputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens']
  return hasExactKeys(value, keys) && keys.every((key) => isNonNegativeInteger(value[key]))
}

function validateContextPressure(value) {
  if (!hasExactKeys(value, [], ['pressureTokens', 'projectedTokens', 'contextWindow'])) return false
  return ['pressureTokens', 'projectedTokens'].every((key) => (
    !Object.hasOwn(value, key) || isNonNegativeInteger(value[key])
  )) && (!Object.hasOwn(value, 'contextWindow') || (isNonNegativeInteger(value.contextWindow) && value.contextWindow > 0))
}

function validateSessionStats(value) {
  const integerKeys = ['turns', 'steps', 'ttftSteps']
  const numberKeys = ['llmMs', 'toolMs', 'ttftMs', 'decodeMs', 'decodeTokens']
  return hasExactKeys(value, [...integerKeys, ...numberKeys])
    && integerKeys.every((key) => isNonNegativeInteger(value[key]))
    && numberKeys.every((key) => isNonNegativeNumber(value[key]))
}

const validators = {
  todos: validateTodos,
  plan: validatePlan,
  tokenUsage: validateTokenUsage,
  contextPressure: validateContextPressure,
  sessionStats: validateSessionStats
}

class SessionProjectionStore {
  constructor(sessionId) {
    if (typeof sessionId !== 'string' || !sessionId) throw new Error('投影存储缺少 Session 标识。')
    this.sessionId = sessionId
    this.asOfSeq = -1
    this.values = {}
    this.seqs = new Map()
    this.invalidProjectionFrames = 0
    this.unknownProjectionKeys = 0
  }

  seed(block) {
    if (!isPlainObject(block) || !Number.isInteger(block.asOfSeq) || block.asOfSeq < -1 || !isPlainObject(block.values)) {
      this.invalidProjectionFrames += 1
      return false
    }
    let changed = false
    for (const [key, value] of Object.entries(block.values)) {
      if (!KNOWN_KEYS.has(key)) {
        this.unknownProjectionKeys += 1
        continue
      }
      if (!validators[key](value)) {
        this.invalidProjectionFrames += 1
        continue
      }
      const previousSeq = this.seqs.get(key) ?? -Infinity
      if (block.asOfSeq < previousSeq) continue
      this.values[key] = copy(value)
      this.seqs.set(key, block.asOfSeq)
      changed = true
    }
    this.asOfSeq = Math.max(this.asOfSeq, block.asOfSeq)
    return changed
  }

  apply(frame) {
    if (!isPlainObject(frame) || frame.type !== 'session/projection'
      || frame.sessionId !== this.sessionId || !Number.isInteger(frame.seq) || frame.seq < 0
      || typeof frame.key !== 'string' || !frame.key) {
      this.invalidProjectionFrames += 1
      return false
    }
    if (!KNOWN_KEYS.has(frame.key)) {
      this.unknownProjectionKeys += 1
      this.asOfSeq = Math.max(this.asOfSeq, frame.seq)
      return false
    }
    if (!validators[frame.key](frame.value)) {
      this.invalidProjectionFrames += 1
      this.asOfSeq = Math.max(this.asOfSeq, frame.seq)
      return false
    }
    const previousSeq = this.seqs.get(frame.key) ?? -Infinity
    this.asOfSeq = Math.max(this.asOfSeq, frame.seq)
    if (frame.seq <= previousSeq) return false
    this.values[frame.key] = copy(frame.value)
    this.seqs.set(frame.key, frame.seq)
    return true
  }

  snapshot() {
    return copy({
      sessionId: this.sessionId,
      asOfSeq: this.asOfSeq,
      values: this.values,
      health: {
        invalidProjectionFrames: this.invalidProjectionFrames,
        unknownProjectionKeys: this.unknownProjectionKeys
      }
    })
  }
}

module.exports = { SessionProjectionStore }
