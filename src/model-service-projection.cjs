function credentialStage(credential) {
  if (!credential) return { state: 'unknown', label: '认证方式未公开', detail: 'Harness 没有公布可检查的简单 API Key。' }
  if (credential.configured === true) return { state: 'saved', label: '凭据已保存', detail: '只证明 Harness 报告凭据存在，不代表真实调用成功。' }
  if (credential.configured === false) return { state: 'missing', label: '缺少凭据', detail: '需要配置此 Provider 的 API Key。' }
  return { state: 'unknown', label: '凭据状态未确认', detail: 'Harness 没有返回明确状态。' }
}

function projectModelServices(connection, currentRoute = null, verificationReceipts = []) {
  const failures = Array.isArray(connection?.failures) ? connection.failures : []
  const providers = (connection?.activeProviders || []).map((provider) => {
    const providerFailures = failures.filter((failure) => failure.provider === provider.id)
    const latestReceipt = verificationReceipts
      .filter((receipt) => receipt?.provider === provider.id)
      .sort((a, b) => String(b.recordedAt || '').localeCompare(String(a.recordedAt || '')))[0] || null
    const active = currentRoute?.requested?.provider === provider.id
    return {
      id: provider.id,
      name: provider.name,
      profile: { state: 'active', label: 'Provider 已启用', detail: '来自 Harness 当前 Provider 配置。' },
      credential: credentialStage(provider.credential),
      catalog: provider.modelCount > 0
        ? { state: 'available', label: `${provider.modelCount} 个目录模型`, detail: '目录存在不代表账号有权调用每一个模型。' }
        : { state: 'empty', label: '目录没有模型', detail: 'Provider 已启用，但 Harness 没有返回模型。' },
      verification: latestReceipt
        ? {
            state: latestReceipt.state === 'passed' ? 'passed' : latestReceipt.state === 'failed' ? 'failed' : 'interrupted',
            label: latestReceipt.state === 'passed' ? '最近一次真实验证通过' : latestReceipt.state === 'failed' ? '最近一次真实验证未通过' : '最近一次真实验证已中止',
            detail: `${latestReceipt.modelName || latestReceipt.model}${latestReceipt.reasoningEffort ? ` · ${latestReceipt.reasoningEffort}` : ''}；记录于 ${latestReceipt.recordedAt || '未知时间'}。只证明当时这次 Harness 请求的结果。`
          }
        : providerFailures.length
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

function projectModelConnectionWithHistory(connection, verificationReceipts = []) {
  const projected = projectModelServices(connection, null, verificationReceipts)
  const stages = new Map(projected.providers.map((provider) => [provider.id, provider.verification]))
  const activeProviders = (connection?.activeProviders || []).map((provider) => ({
    ...provider,
    verification: stages.get(provider.id) || {
      state: 'unverified',
      label: '尚无可归属的真实验证',
      detail: '凭据状态和真实调用是两回事。'
    }
  }))
  const passed = projected.providers.filter((provider) => provider.verification.state === 'passed')
  const history = passed.length
    ? ` ${passed.map((provider) => provider.name).join('、')} 有最近一次真实验证通过记录；模型、时间和历史边界见下方。`
    : ''
  return { ...connection, message: `${connection?.message || ''}${history}`.trim(), activeProviders }
}

module.exports = { projectModelConnectionWithHistory, projectModelServices }
