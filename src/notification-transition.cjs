const NOTIFIABLE = new Set(['waiting', 'completed', 'failed', 'interrupted'])

function projectedState(thread) {
  const interaction = thread?.agent?.live?.interactions?.[0]
  if (interaction) return { kind: 'waiting', identity: String(interaction.id || 'decision') }
  const terminal = thread?.agent?.taskRunSnapshot?.terminal
  const kind = String(terminal?.state || '')
  if (['completed', 'failed', 'interrupted'].includes(kind)) {
    const turn = thread?.agent?.taskRunSnapshot?.turn
    return { kind, identity: String(turn?.id ?? terminal?.seq ?? 'terminal') }
  }
  const turn = thread?.agent?.taskRunSnapshot?.turn
  return { kind: String(turn?.state || thread?.engineState || 'unknown'), identity: String(turn?.id ?? 'current') }
}

class NotificationTransitionTracker {
  constructor() {
    this.current = new Map()
    this.seen = new Set()
  }

  prime(workbench) {
    this.current.clear()
    this.seen.clear()
    for (const thread of workbench?.threads || []) {
      const state = projectedState(thread)
      this.current.set(String(thread.id), state)
      this.seen.add(`${thread.id}:${state.identity}:${state.kind}`)
    }
  }

  observe(workbench) {
    const events = []
    const present = new Set()
    for (const thread of workbench?.threads || []) {
      const taskId = String(thread?.id || '')
      if (!taskId) continue
      present.add(taskId)
      const next = projectedState(thread)
      const previous = this.current.get(taskId)
      this.current.set(taskId, next)
      const key = `${taskId}:${next.identity}:${next.kind}`
      if (NOTIFIABLE.has(next.kind) && previous?.kind !== next.kind && !this.seen.has(key)) {
        this.seen.add(key)
        events.push({ taskId, kind: next.kind })
      }
    }
    for (const taskId of this.current.keys()) {
      if (!present.has(taskId)) this.current.delete(taskId)
    }
    return events
  }
}

module.exports = { NotificationTransitionTracker, projectedState }
