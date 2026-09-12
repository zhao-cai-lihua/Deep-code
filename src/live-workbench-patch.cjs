function createLiveWorkbenchPatch({ taskId, sessionId, generation, live }) {
  if (!taskId || !sessionId || !Number.isInteger(generation)) throw new Error('实时补丁缺少任务、Session 或 generation。')
  return { version: 1, taskId: String(taskId), sessionId: String(sessionId), generation, live }
}

function acceptsLiveWorkbenchPatch(patch, visible) {
  return patch?.version === 1
    && patch.taskId === visible?.taskId
    && patch.sessionId === visible?.sessionId
    && patch.generation === visible?.generation
}

function createLivePatchCoalescer({ emit, waitMs = 120, setTimeoutImpl = setTimeout, clearTimeoutImpl = clearTimeout }) {
  let timer = null
  let pending = null
  function flush() {
    if (timer !== null) clearTimeoutImpl(timer)
    timer = null
    if (!pending) return
    const value = pending
    pending = null
    emit(value)
  }
  return {
    push(value, urgency = 'normal') {
      if (urgency !== 'normal') {
        flush()
        emit(value)
        return
      }
      pending = value
      if (timer !== null) return
      timer = setTimeoutImpl(() => {
        timer = null
        if (!pending) return
        const value = pending
        pending = null
        emit(value)
      }, waitMs)
    },
    flush,
    close() {
      if (timer !== null) clearTimeoutImpl(timer)
      timer = null
      pending = null
    }
  }
}

module.exports = { createLivePatchCoalescer, createLiveWorkbenchPatch, acceptsLiveWorkbenchPatch }
