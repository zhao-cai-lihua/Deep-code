(function exposeModelConnectionView(root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  if (root) root.DeepCodeModelConnectionView = api
})(typeof window === 'undefined' ? globalThis : window, function modelConnectionViewFactory() {
  function modelConnectionLines(snapshot = {}) {
    const lines = []
    const providers = Array.isArray(snapshot.activeProviders) ? snapshot.activeProviders : []
    for (const provider of providers) {
      const credential = provider?.credential
      const verification = provider?.verification
      const providerName = String(provider?.name || provider?.id || '未知 Provider')
      const modelCount = Number.isFinite(Number(provider?.modelCount)) ? Number(provider.modelCount) : 0
      const credentialText = !credential
        ? '凭据：此提供方未提供可检查的凭据状态'
        : credential.configured === true
          ? '凭据：已保存（密钥内容不可见）'
          : credential.configured === false
            ? '凭据：尚未配置'
            : '凭据：状态未确认'
      lines.push(`${providerName} · ${modelCount} 个模型`, credentialText)
      if (verification?.label) lines.push(`真实验证：${verification.label}`)
      if (verification?.detail) lines.push(`  ${verification.detail}`)
      for (const model of Array.isArray(provider?.models) ? provider.models : []) {
        lines.push(`  • ${String(model?.name || model?.id || '未命名模型')}`)
      }
    }
    if (!providers.length) lines.push('尚未发现已激活的模型提供方。')
    if (snapshot.dormantProviderCount) lines.push('', `另有 ${snapshot.dormantProviderCount} 个未启用的提供方，未列入可用模型。`)
    const failures = Array.isArray(snapshot.failures) ? snapshot.failures : []
    if (failures.length) {
      lines.push('', '需要留意：')
      for (const failure of failures) lines.push(`  • ${failure.provider}：${failure.message}`)
    }
    return lines
  }

  return { modelConnectionLines }
})
