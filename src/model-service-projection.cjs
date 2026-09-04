function credentialStage(credential) {
  if (!credential) return { state: 'unknown', label: '认证方式未公开', detail: 'Harness 没有公布可检查的简单 API Key。' }
  if (credential.configured === true) return { state: 'saved', label: '凭据已保存', detail: '只证明 Harness 报告凭据存在，不代表真实调用成功。' }
  if (credential.configured === false) return { state: 'missing', label: '缺少凭据', detail: '需要配置此 Provider 的 API Key。' }
  return { state: 'unknown', label: '凭据状态未确认', detail: 'Harness 没有返回明确状态。' }
}

function projectModelServices(connection, currentRoute = null) {
  const failures = Array.isArray(connection?.failures) ? connection.failures : []
  const providers = (connection?.activeProviders || []).map((provider) => {
    const providerFailures = failures.filter((failure) => failure.provider === provider.id)
    const active = currentRoute?.requested?.provider === provider.id
    return {
      id: provider.id,
      name: provider.name,
      profile: { state: 'active', label: 'Provider 已启用', detail: '来自 Harness 当前 Provider 配置。' },
      credential: credentialStage(provider.credential),
      catalog: provider.modelCount > 0
        ? { state: 'available', label: `${provider.modelCount} 个目录模型`, detail: '目录存在不代表账号有权调用每一个模型。' }
        : { state: 'empty', label: '目录没有模型', detail: 'Provider 已启用，但 Harness 没有返回模型。' },
      verification: providerFailures.length
        ? { state: 'failed', label: '读取状态时发生错误', detail: providerFailures.map((item) => item.message).join('；') }
        : { state: 'unverified', label: '尚无可归属的真实验证', detail: '凭据状态和真实调用是两回事。' },
      current: active
        ? { state: currentRoute.confirmed ? 'confirmed' : 'requested', label: currentRoute.confirmed ? '当前任务已确认采用' : '当前任务曾请求采用', detail: currentRoute.label || provider.name }
        : { state: 'inactive', label: '当前任务未指向此服务', detail: '这不影响它供其他任务选择。' },
      models: (provider.models || []).map((model) => ({ id: model.id, name: model.name, reasoning: model.reasoning || null }))
    }
  })
  return {
    state: connection?.state || 'unknown', title: connection?.title || '模型服务状态未知', message: connection?.message || '', providers,
    dormantProviderCount: Number(connection?.dormantProviderCount) || 0,
    failures: failures.filter((failure) => !providers.some((provider) => provider.id === failure.provider)), factsOnly: true
  }
}

module.exports = { projectModelServices }
