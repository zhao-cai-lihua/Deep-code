(function exposeEngineCapabilityView(root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  if (root) root.DeepCodeEngineCapabilityView = api
})(typeof window === 'undefined' ? globalThis : window, function engineCapabilityViewFactory() {
  const usableStates = new Set(['available', 'supported'])

  function projectEngineCapabilityView(snapshot) {
    const capabilities = Array.isArray(snapshot?.capabilities) ? snapshot.capabilities : []
    if (snapshot?.verified !== true || !capabilities.length) {
      return {
        state: 'offline',
        title: '等待可信 Engine',
        summary: '启动并验证 Engine 后显示能力；这项检查不会调用模型，也不消耗模型 token。',
        availableCount: 0,
        unavailableCount: 0,
        rows: []
      }
    }

    const rows = capabilities.map((capability) => {
      const usable = usableStates.has(capability.state)
      const visionBoundary = capability.id === 'image-transport' && capability.claimsModelVision !== true
        ? ' 这只证明图片传输链路可用，不等于当前模型已经通过识图验证。'
        : ''
      return {
        id: String(capability.id || ''),
        label: String(capability.label || capability.id || '未命名能力'),
        state: usable ? 'usable' : 'unavailable',
        stateLabel: String(capability.stateLabel || (usable ? '已支持' : '尚不可用')),
        detail: `${String(capability.description || '')} ${String(capability.reason || '')}${visionBoundary}`.trim()
      }
    })
    const availableCount = rows.filter((row) => row.state === 'usable').length
    const unavailableCount = rows.length - availableCount
    const shortRevision = String(snapshot.runtime?.revision || '').slice(0, 8) || 'unknown'
    if (snapshot.runtime?.status === 'candidate') {
      return {
        state: 'candidate',
        title: `候选协议已核对：Harness ${String(snapshot.runtime?.version || 'unknown')}`,
        summary: `固定提交 ${shortRevision} 已通过候选检查，但任务入口仍保持关闭；${unavailableCount} 项能力不会被普通任务调用。`,
        availableCount: 0,
        unavailableCount,
        rows
      }
    }
    return {
      state: 'verified',
      title: `已核对 Harness ${String(snapshot.runtime?.version || 'unknown')}`,
      summary: `能力证据绑定固定提交 ${shortRevision}；${availableCount} 项已支持，${unavailableCount} 项尚不可用。读取这里不会调用模型。`,
      availableCount,
      unavailableCount,
      rows
    }
  }

  return { projectEngineCapabilityView }
})
