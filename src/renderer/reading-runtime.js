(function exposeReadingRuntime(root, createReadingRuntime) {
  if (typeof module === 'object' && module.exports) {
    module.exports = { createReadingRuntime }
  } else {
    root.deepCodeReading = createReadingRuntime()
  }
})(typeof globalThis === 'object' ? globalThis : this, function createReadingRuntime({ followThreshold = 160 } = {}) {
  function distanceFromBottom(view) {
    if (!view) return Infinity
    return Math.max(0, Number(view.scrollHeight || 0) - Number(view.scrollTop || 0) - Number(view.clientHeight || 0))
  }

  function shouldFollow(view) {
    return distanceFromBottom(view) <= followThreshold
  }

  function capture(view, { force = false } = {}) {
    return { follow: force || shouldFollow(view), scrollTop: Number(view?.scrollTop || 0) }
  }

  function restore(view, plan) {
    if (!view || !plan) return
    view.scrollTop = plan.follow ? Number(view.scrollHeight || 0) : plan.scrollTop
  }

  function formatDuration(value) {
    if (!Number.isFinite(value) || value < 0) return ''
    if (value < 1000) return `${Math.max(1, Math.round(value))} 毫秒`
    const seconds = Math.round(value / 100) / 10
    if (seconds < 60) return `${seconds} 秒`
    const minutes = Math.floor(seconds / 60)
    return `${minutes} 分 ${Math.round(seconds % 60)} 秒`
  }

  function timingLabel({ state, startedAt, durationMs }, now = Date.now()) {
    if (state === 'running') {
      const start = Date.parse(startedAt)
      return Number.isFinite(start) ? `已用时 ${formatDuration(Math.max(0, now - start))}` : ''
    }
    const duration = formatDuration(durationMs)
    return duration ? `用时 ${duration}` : ''
  }

  return { capture, distanceFromBottom, formatDuration, restore, shouldFollow, timingLabel }
})
