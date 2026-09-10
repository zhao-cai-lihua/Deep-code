(function exposeModelServicesView(root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  if (root) root.DeepCodeModelServicesView = api
})(typeof window === 'undefined' ? globalThis : window, function modelServicesViewFactory() {
  const stageDefinitions = [
    ['Provider', 'profile'],
    ['模型目录', 'catalog'],
    ['凭据', 'credential'],
    ['真实验证', 'verification'],
    ['当前任务', 'current']
  ]

  function createModelServicesView({ document, elements, onVerifyProvider = () => {} }) {
    const { title, message, status, list, verifyAllButton } = elements

    function renderStage(name, stage = {}) {
      const item = document.createElement('section')
      item.dataset.state = String(stage.state || 'unknown')
      const label = document.createElement('small')
      label.textContent = name
      const value = document.createElement('strong')
      value.textContent = String(stage.label || '尚未确认')
      const detail = document.createElement('p')
      detail.textContent = String(stage.detail || 'Harness 没有提供这项事实。')
      item.append(label, value, detail)
      return item
    }

    function renderProvider(provider = {}) {
      const models = Array.isArray(provider.models) ? provider.models : []
      const card = document.createElement('article')
      card.className = 'model-service-card'

      const heading = document.createElement('div')
      heading.className = 'ecosystem-card-heading'
      const providerName = document.createElement('h3')
      providerName.textContent = String(provider.name || provider.id || '未命名 Provider')
      const badge = document.createElement('span')
      badge.textContent = String(provider.id || 'unknown')
      heading.append(providerName, badge)

      const stages = document.createElement('div')
      stages.className = 'model-service-stages'
      for (const [label, field] of stageDefinitions) stages.append(renderStage(label, provider[field]))

      const modelDirectory = document.createElement('details')
      const summary = document.createElement('summary')
      summary.textContent = `查看 ${models.length} 个目录模型`
      const modelNames = document.createElement('p')
      modelNames.textContent = models.map((model) => String(model?.name || model?.id || '未命名模型')).join('、') || 'Harness 没有返回模型。'
      modelDirectory.append(summary, modelNames)

      const actions = document.createElement('div')
      actions.className = 'button-row'
      const verify = document.createElement('button')
      verify.type = 'button'
      verify.className = 'primary-button'
      verify.textContent = '验证这个服务…'
      verify.disabled = !models.length || provider.credential?.state === 'missing'
      verify.addEventListener('click', () => onVerifyProvider(String(provider.id || ''), verify))
      actions.append(verify)

      card.append(heading, stages, modelDirectory, actions)
      return card
    }

    function render(snapshot = {}) {
      const providers = Array.isArray(snapshot.providers) ? snapshot.providers : []
      title.textContent = String(snapshot.title || '等待检查')
      message.textContent = String(snapshot.message || 'Harness 没有提供模型服务摘要。')
      list.replaceChildren(...providers.map(renderProvider))
      if (!providers.length) list.textContent = '尚未发现已启用的 Provider。请先启动 Engine 或到设置中添加模型服务。'
      status.textContent = `Harness 报告 ${providers.length} 个已启用服务，另有 ${Number(snapshot.dormantProviderCount || 0)} 个未启用 Provider。读取这些状态不会调用模型。`
      verifyAllButton.disabled = snapshot.state === 'engine-offline' || !providers.length
    }

    return { render }
  }

  return { createModelServicesView }
})
