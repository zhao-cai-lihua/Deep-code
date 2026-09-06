(function exposeProviderProvisioningFlow(root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  if (root) root.DeepCodeProviderProvisioningFlow = api
})(typeof window === 'undefined' ? globalThis : window, function providerProvisioningFlowFactory() {
  function normalizeProvider(provider) {
    const id = String(provider?.id || '').trim()
    if (!id) return null
    return { id, name: String(provider?.name || id).trim() || id }
  }

  function defaultView(provider) {
    return provider
      ? {
          buttonLabel: `保存给 ${provider.name}`,
          description: `${provider.name} · 将只为这个 Harness route 保存密钥。请确认厂商选对；Deep code 无法根据密钥内容可靠识别厂商。`
        }
      : {
          buttonLabel: '添加并保存到 Harness',
          description: '当前 Harness 没有公布可用的简单 API Key Provider。'
        }
  }

  function createProviderProvisioningFlow({ timeoutMs = 10000, now = Date.now } = {}) {
    let pending = null

    function reset() {
      pending = null
    }

    function view(provider) {
      const normalized = normalizeProvider(provider)
      if (!normalized || !pending || pending.providerId !== normalized.id || now() >= pending.expiresAt) {
        if (pending && now() >= pending.expiresAt) reset()
        return defaultView(normalized)
      }
      return {
        buttonLabel: `再次点击确认保存给 ${normalized.name}`,
        description: `即将把这串密钥保存到 ${normalized.name} 的凭据槽。Deep code 不能从密钥内容判断厂商；请核对后再次点击。`,
        expiresAt: pending.expiresAt
      }
    }

    function request(provider) {
      const normalized = normalizeProvider(provider)
      if (!normalized) return { confirmed: false, reason: 'missing-provider', view: defaultView(null) }
      const timestamp = now()
      if (pending?.providerId === normalized.id && timestamp < pending.expiresAt) {
        reset()
        return { confirmed: true, provider: normalized, view: defaultView(normalized) }
      }
      pending = { providerId: normalized.id, expiresAt: timestamp + timeoutMs }
      return { confirmed: false, reason: 'confirmation-required', provider: normalized, view: view(normalized) }
    }

    return { request, reset, view }
  }

  return { createProviderProvisioningFlow }
})
