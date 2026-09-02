const pages = document.querySelectorAll('.page')
const pageButtons = document.querySelectorAll('[data-page]')
const mainPanel = document.querySelector('.main-panel')
const workbenchPage = document.querySelector('#page-workbench')
const workbenchHeading = document.querySelector('#workbench-heading')
const themeToggle = document.querySelector('#theme-toggle')
const taskList = document.querySelector('#task-list')
const taskCount = document.querySelector('#task-count')
const newTaskButton = document.querySelector('#new-task')
const taskComposer = document.querySelector('#task-composer')
const createTaskButton = document.querySelector('#create-task')
const composerStopButton = document.querySelector('#composer-stop')
const addImagesButton = document.querySelector('#add-images')
const imageDraftRail = document.querySelector('#image-draft-rail')
const imageDraftStatus = document.querySelector('#image-draft-status')
const composerHint = document.querySelector('#composer-hint')
const modelRouteButton = document.querySelector('#model-route-button')
const modelRouteDialog = document.querySelector('#model-route-dialog')
const modelRouteForm = document.querySelector('#model-route-form')
const modelChoice = document.querySelector('#model-choice')
const modelChoiceDescription = document.querySelector('#model-choice-description')
const effortChoice = document.querySelector('#effort-choice')
const effortChoiceDescription = document.querySelector('#effort-choice-description')
const cancelModelRoute = document.querySelector('#cancel-model-route')
const emptyTask = document.querySelector('#empty-task')
const activeTask = document.querySelector('#active-task')
const activeTaskTitle = document.querySelector('#active-task-title')
const activeTaskPrompt = document.querySelector('#active-task-prompt')
const taskViewTabs = document.querySelector('#task-view-tabs')
const conversationView = document.querySelector('#conversation-view')
const receiptView = document.querySelector('#receipt-view')
const traceView = document.querySelector('#trace-view')
const taskViewButtons = document.querySelectorAll('[data-task-view]')
const taskEngineStatus = document.querySelector('#task-engine-status')
const taskRecovery = document.querySelector('#task-recovery')
const taskRecoveryCause = document.querySelector('#task-recovery-cause')
const taskRecoverySafety = document.querySelector('#task-recovery-safety')
const taskRecoveryNext = document.querySelector('#task-recovery-next')
const taskOutcome = document.querySelector('#task-outcome')
const taskOutcomeTitle = document.querySelector('#task-outcome-title')
const taskOutcomeBadge = document.querySelector('#task-outcome-badge')
const taskOutcomeSummary = document.querySelector('#task-outcome-summary')
const taskOutcomeSections = document.querySelector('#task-outcome-sections')
const showOutcomeEvidence = document.querySelector('#show-outcome-evidence')
const decisionGates = document.querySelector('#decision-gates')
const activityTimeline = document.querySelector('#activity-timeline')
const activityList = document.querySelector('#activity-list')
const liveConnectionLabel = document.querySelector('#live-connection-label')
const conversationFeed = document.querySelector('#conversation-feed')
const jumpLatestButton = document.querySelector('#jump-latest')
const runDetails = document.querySelector('#run-details')
const runDetailsLabel = document.querySelector('#run-details-label')
const technicalDetails = document.querySelector('.technical-details')
const permissionFacts = document.querySelector('#permission-facts')
const changedFiles = document.querySelector('#changed-files')
const toolCardsContainer = document.querySelector('#tool-cards')
const taskEvidenceContent = document.querySelector('#task-evidence-content')
const outcomeMap = document.querySelector('#outcome-map')
const outcomeMapFlow = document.querySelector('#outcome-map-flow')
const outcomeMapLegend = document.querySelector('#outcome-map-legend')
const outcomeMapEmpty = document.querySelector('#outcome-map-empty')
const cancelTaskButton = document.querySelector('#cancel-task')
const retryTaskButton = document.querySelector('#retry-task')
const deleteTaskButton = document.querySelector('#delete-task')
const previewHandoffButton = document.querySelector('#preview-handoff')
const handoffDialog = document.querySelector('#handoff-dialog')
const handoffText = document.querySelector('#handoff-text')
const closeHandoffButton = document.querySelector('#close-handoff')
const runtimeDot = document.querySelector('#runtime-dot')
const runtimeShort = document.querySelector('#runtime-short')
const currentRunContext = document.querySelector('#current-run-context')
const sidebarRunPanel = document.querySelector('#sidebar-run-panel')
const currentRunState = document.querySelector('#current-run-state')
const currentRunModel = document.querySelector('#current-run-model')
const currentRunEvidence = document.querySelector('#current-run-evidence')
const currentRunUsage = document.querySelector('#current-run-usage')
const openRunDetailsButton = document.querySelector('#open-run-details')

const pathInput = document.querySelector('#runtime-path')
const selectButton = document.querySelector('#select-runtime')
const startButton = document.querySelector('#start')
const stopButton = document.querySelector('#stop')
const label = document.querySelector('#status-label')
const message = document.querySelector('#status-message')
const dot = document.querySelector('#status-dot')
const logs = document.querySelector('#logs')
const inspectButton = document.querySelector('#inspect')
const workspaceButton = document.querySelector('#create-workspace')
const sidebarCreateWorkspace = document.querySelector('#sidebar-create-workspace')
const sidebarSelectWorkspace = document.querySelector('#sidebar-select-workspace')
const sidebarWorkspaceName = document.querySelector('#sidebar-workspace-name')
const diagnosticsButton = document.querySelector('#export-diagnostics')
const careResult = document.querySelector('#care-result')
const modelStatusDot = document.querySelector('#model-status-dot')
const modelStatusLabel = document.querySelector('#model-status-label')
const modelStatusMessage = document.querySelector('#model-status-message')
const modelCatalogSummary = document.querySelector('#model-catalog-summary')
const checkModelConnectionButton = document.querySelector('#check-model-connection')
const addModelProviderButton = document.querySelector('#add-model-provider')
const configureModelCredentialButton = document.querySelector('#configure-model-credential')
const clearModelCredentialButton = document.querySelector('#clear-model-credential')
const verifyModelConnectionButton = document.querySelector('#verify-model-connection')
const modelCredentialNote = document.querySelector('#model-credential-note')
const modelCredentialResult = document.querySelector('#model-credential-result')
const credentialDialog = document.querySelector('#credential-dialog')
const credentialDialogForm = document.querySelector('#credential-dialog-form')
const credentialProviderChoice = document.querySelector('#credential-provider-choice')
const credentialProviderDescription = document.querySelector('#credential-provider-description')
const modelApiKey = document.querySelector('#model-api-key')
const saveModelCredentialButton = document.querySelector('#save-model-credential')
const cancelCredentialDialog = document.querySelector('#cancel-credential-dialog')
const providerDialog = document.querySelector('#provider-dialog')
const providerDialogForm = document.querySelector('#provider-dialog-form')
const providerChoice = document.querySelector('#provider-choice')
const providerChoiceDescription = document.querySelector('#provider-choice-description')
const providerApiKey = document.querySelector('#provider-api-key')
const cancelProviderDialog = document.querySelector('#cancel-provider-dialog')
const skipSetupButton = document.querySelector('#skip-setup')
const finishSetupButton = document.querySelector('#finish-setup')
const setupDetectRuntime = document.querySelector('#setup-detect-runtime')
const setupSelectRuntime = document.querySelector('#setup-select-runtime')
const setupInstallRuntime = document.querySelector('#setup-install-runtime')
const setupWorkspaceName = document.querySelector('#setup-workspace-name')
const setupCreateWorkspace = document.querySelector('#setup-create-workspace')
const setupCheckModel = document.querySelector('#setup-check-model')
const setupProgress = document.querySelector('#setup-progress')
const workspaceDialog = document.querySelector('#workspace-dialog')
const workspaceDialogForm = document.querySelector('#workspace-dialog-form')
const workspaceDialogName = document.querySelector('#workspace-dialog-name')
const cancelWorkspaceDialog = document.querySelector('#cancel-workspace-dialog')
const selectWorkspaceButton = document.querySelector('#select-workspace')
const workspaceSummary = document.querySelector('#workspace-summary')
const settingsWorkspacePath = document.querySelector('#settings-workspace-path')
const openWorkspaceButton = document.querySelector('#open-workspace')
const explainProjectButton = document.querySelector('#explain-project')
const ecosystemEnabled = document.querySelector('#ecosystem-enabled')
const refreshEcosystemButton = document.querySelector('#refresh-ecosystem')
const ecosystemSource = document.querySelector('#ecosystem-source')
const ecosystemList = document.querySelector('#ecosystem-list')
const refreshControlCenterButton = document.querySelector('#refresh-control-center')
const controlProject = document.querySelector('#control-project')
const controlSkillStatus = document.querySelector('#control-skill-status')
const controlSkillList = document.querySelector('#control-skill-list')

let workbench = { threads: [], activeThreadId: '' }
let lastRuntimeState = ''
let lastRenderedThreadId = ''
let forceFollowNextRender = true
const taskViewState = window.DeepCodeTaskViewState.createTaskViewState()
let imageDrafts = []
let workspaceDialogTrigger = workspaceButton
let modelCatalog = { current: null, groups: [] }
let manualModelSelection = null
let modelConnectionState = { activeProviders: [] }

function catalogModels() {
  return (modelCatalog.groups || []).flatMap((group) => (group.models || []).map((model) => ({ ...model, provider: group.id, providerName: group.name })))
}

function updateModelRouteButton() {
  if (!manualModelSelection) { modelRouteButton.textContent = '模型：Harness 当前设置'; return }
  const model = catalogModels().find((item) => item.provider === manualModelSelection.provider && item.id === manualModelSelection.model)
  const effort = manualModelSelection.reasoningEffort ? ` · ${manualModelSelection.reasoningEffort}` : ''
  modelRouteButton.textContent = `模型：${model?.name || manualModelSelection.model}${effort}`
}

function selectedCatalogModel() {
  return catalogModels().find((item) => `${item.provider}\u0000${item.id}` === modelChoice.value)
}

function renderEffortChoices(preferred = '') {
  const model = selectedCatalogModel()
  effortChoice.replaceChildren(new Option('模型默认', ''))
  for (const effort of model?.reasoning?.efforts || []) effortChoice.append(new Option(effort.name || effort.id, effort.id))
  effortChoice.disabled = !model || !(model.reasoning?.efforts || []).length
  effortChoice.value = [...effortChoice.options].some((option) => option.value === preferred) ? preferred : ''
  const selected = (model?.reasoning?.efforts || []).find((item) => item.id === effortChoice.value)
  effortChoiceDescription.textContent = selected?.description
    || (model?.reasoning?.defaultEffort ? `模型默认：${model.reasoning.defaultEffort}` : '该模型没有公布可调推理强度，将使用 Provider 默认值。')
}

function renderModelChoices() {
  modelChoice.replaceChildren(new Option('沿用 Harness 当前设置', ''))
  for (const group of modelCatalog.groups || []) {
    const options = document.createElement('optgroup')
    options.label = group.name || group.id
    for (const model of group.models || []) options.append(new Option(model.name || model.id, `${group.id}\u0000${model.id}`))
    modelChoice.append(options)
  }
  const preferred = manualModelSelection ? `${manualModelSelection.provider}\u0000${manualModelSelection.model}` : ''
  modelChoice.value = [...modelChoice.querySelectorAll('option')].some((option) => option.value === preferred) ? preferred : ''
  const model = selectedCatalogModel()
  modelChoiceDescription.textContent = model?.description || (model ? `${model.providerName} · ${model.id}` : '不指定模型；沿用当前 Session 的模型与推理强度。')
  renderEffortChoices(manualModelSelection?.reasoningEffort || '')
}

async function openModelRouteDialog() {
  modelRouteButton.disabled = true
  try {
    modelCatalog = await window.desktopHost.modelRoutingCatalog(activeThread()?.id || '')
    renderModelChoices()
    modelRouteDialog.showModal()
  } catch (error) {
    taskEngineStatus.textContent = `无法读取模型列表：${error.message}`
    taskEngineStatus.dataset.state = 'error'
  } finally { modelRouteButton.disabled = false }
}

modelChoice.addEventListener('change', () => {
  const model = selectedCatalogModel()
  modelChoiceDescription.textContent = model?.description || (model ? `${model.providerName} · ${model.id}` : '不指定模型；Deep code 不会自动切换。')
  renderEffortChoices('')
})
effortChoice.addEventListener('change', () => renderEffortChoices(effortChoice.value))
modelRouteButton.addEventListener('click', openModelRouteDialog)
cancelModelRoute.addEventListener('click', () => modelRouteDialog.close())
modelRouteForm.addEventListener('submit', () => {
  const model = selectedCatalogModel()
  manualModelSelection = model ? {
    provider: model.provider,
    model: model.id,
    ...(effortChoice.value ? { reasoningEffort: effortChoice.value } : {})
  } : null
  updateModelRouteButton()
})
updateModelRouteButton()

function showPage(name) {
  const nextPage = document.querySelector(`#page-${name}`)
  if (!nextPage || nextPage.classList.contains('is-active')) return
  for (const page of pages) page.classList.toggle('is-active', page.id === `page-${name}`)
  for (const button of document.querySelectorAll('.nav-item')) button.classList.toggle('is-active', button.dataset.page === name)
  mainPanel.scrollTop = 0
  nextPage.querySelector('h1')?.focus({ preventScroll: true })
  if (name === 'workbench') requestAnimationFrame(updateJumpLatest)
  if (name === 'control-center') refreshControlCenter().catch((error) => { controlSkillStatus.textContent = error.message })
}

function preferredTheme() {
  try {
    const saved = window.localStorage.getItem('deep-code-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* A blocked preference store should never block the Workbench. */ }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(theme, persist = false) {
  const normalized = theme === 'light' ? 'light' : 'dark'
  document.documentElement.dataset.theme = normalized
  const nextLabel = normalized === 'dark' ? '切换到明亮界面' : '切换到深色界面'
  themeToggle.setAttribute('aria-pressed', String(normalized === 'light'))
  themeToggle.title = nextLabel
  themeToggle.querySelector('[aria-hidden="true"]').textContent = normalized === 'dark' ? '☀' : '☾'
  themeToggle.lastElementChild.textContent = nextLabel
  if (persist) {
    try { window.localStorage.setItem('deep-code-theme', normalized) } catch { /* Preference stays session-only. */ }
  }
}

applyTheme(preferredTheme())

function renderRuntime(status) {
  const runtimeChanged = lastRuntimeState !== status.state
  lastRuntimeState = status.state
  pathInput.value = status.runtimePath || pathInput.value
  const stateLabel = ({ stopped: '尚未启动', starting: '正在启动', ready: '已就绪', stopping: '正在停止', error: '启动失败' })[status.state] || status.state
  label.textContent = stateLabel
  message.textContent = status.message || ''
  dot.className = `status-dot ${status.state}`
  runtimeDot.className = `status-dot ${status.state}`
  runtimeShort.textContent = status.state === 'ready' ? 'Engine 已连接' : `Engine ${stateLabel}`
  startButton.disabled = status.state === 'starting' || status.state === 'ready' || !pathInput.value
  stopButton.disabled = !['starting', 'ready', 'stopping'].includes(status.state)
  logs.textContent = status.logs?.length ? status.logs.map(({ stream, line }) => `[${stream}] ${line}`).join('\n') : '还没有运行日志。'
  if (runtimeChanged) refreshModelConnection().catch(() => {})
}

function ecosystemDate(value) {
  if (!value) return '未知'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '未知' : date.toLocaleDateString('zh-CN')
}

function renderEcosystem(snapshot) {
  ecosystemEnabled.checked = snapshot.enabled === true
  refreshEcosystemButton.disabled = !snapshot.enabled
  ecosystemList.replaceChildren()
  if (!snapshot.enabled) {
    ecosystemSource.textContent = '生态发现尚未开启。关闭状态不会发出网络请求。'
    return
  }
  if (snapshot.error) {
    ecosystemSource.textContent = snapshot.error
    return
  }
  if (!snapshot.source) {
    ecosystemSource.textContent = '已允许生态发现。点击“更新公开项目”后才会连接 GitHub。'
    return
  }
  ecosystemSource.textContent = `${snapshot.source.label} · 更新于 ${ecosystemDate(snapshot.source.checkedAt)} · ${snapshot.source.contract}`
  for (const entry of snapshot.entries) {
    const card = document.createElement('article')
    card.className = 'ecosystem-card'
    const heading = document.createElement('div')
    heading.className = 'ecosystem-card-heading'
    const title = document.createElement('h3')
    title.textContent = entry.fullName
    const badge = document.createElement('span')
    badge.textContent = entry.archived ? '已归档' : '社区候选'
    heading.append(title, badge)
    const description = document.createElement('p')
    description.textContent = entry.plainDescription
    description.title = entry.plainDescriptionBasis
    const signals = document.createElement('dl')
    for (const [label, value] of [
      ['Stars（热度）', entry.stars],
      ['Forks', entry.forks],
      ['许可', entry.license],
      ['上游原文', entry.description],
      ['最近更新', ecosystemDate(entry.updatedAt)],
      ['固定 commit', entry.checkedCommit || '未固定'],
      ['Bundle 证据', entry.bundleEvidence]
    ]) {
      const term = document.createElement('dt')
      term.textContent = label
      const detail = document.createElement('dd')
      detail.textContent = String(value)
      signals.append(term, detail)
    }
    const warning = document.createElement('p')
    warning.className = 'ecosystem-warning'
    warning.textContent = entry.warnings.join(' ')
    const open = document.createElement('button')
    open.type = 'button'
    open.className = 'quiet-button'
    open.textContent = '查看上游源代码'
    open.addEventListener('click', async () => {
      try { await window.desktopHost.openExternal(entry.repository) } catch (error) { ecosystemSource.textContent = `无法打开：${error.message}` }
    })
    const install = document.createElement('button')
    install.type = 'button'
    install.className = 'primary-button'
    install.textContent = '检查并安装…'
    install.disabled = entry.archived
    install.addEventListener('click', async () => {
      install.disabled = true
      ecosystemSource.textContent = `正在只读检查 ${entry.fullName} 的固定版本与 Bundle 声明…`
      try {
        const preview = await window.desktopHost.prepareEcosystemInstall(entry.id)
        const accepted = window.confirm([
          `准备安装 ${preview.packageName}`,
          `仓库：${preview.fullName}`,
          `固定 commit：${preview.commit}`,
          `Bundle：${preview.patch}`,
          '',
          preview.warning,
          preview.activation,
          '',
          '确认继续安装吗？'
        ].join('\n'))
        if (!accepted) {
          ecosystemSource.textContent = '已取消安装；本机 profile 没有被修改。'
          return
        }
        ecosystemSource.textContent = `正在通过官方 DSH CLI 安装 ${preview.packageName}…`
        const result = await window.desktopHost.installEcosystemPlugin(preview.token)
        ecosystemSource.textContent = result.message
      } catch (error) {
        ecosystemSource.textContent = `没有安装：${error.message}`
      } finally { install.disabled = entry.archived }
    })
    const actions = document.createElement('div')
    actions.className = 'button-row'
    actions.append(open, install)
    card.append(heading, description, signals, warning, actions)
    ecosystemList.append(card)
  }
  if (!snapshot.entries.length) ecosystemList.textContent = '当前来源没有返回可展示的候选项目。'
}

async function refreshEcosystemStatus() {
  renderEcosystem(await window.desktopHost.ecosystemStatus())
}

function renderControlCenter(snapshot) {
  const projectPath = snapshot.project?.path || '尚未选择项目文件夹。'
  const activeTask = snapshot.task?.title ? `当前任务：${snapshot.task.title}` : '当前没有打开任务。'
  controlProject.replaceChildren()
  const path = document.createElement('strong')
  path.textContent = projectPath
  const facts = document.createElement('p')
  facts.textContent = `${snapshot.project?.taskCount || 0} 个本地任务 · ${activeTask}`
  controlProject.append(path, facts)
  controlSkillStatus.textContent = snapshot.skillsMessage
  controlSkillList.replaceChildren()
  for (const skill of snapshot.skills || []) {
    const card = document.createElement('article')
    card.className = 'control-skill-card'
    const heading = document.createElement('div')
    heading.className = 'ecosystem-card-heading'
    const title = document.createElement('h3')
    title.textContent = `/${skill.name}`
    const badge = document.createElement('span')
    badge.textContent = skill.modelInvocable ? 'Agent 可调用' : '仅用户调用'
    heading.append(title, badge)
    const description = document.createElement('p')
    description.textContent = skill.description
    card.append(heading, description)
    if (skill.whenToUse) {
      const when = document.createElement('small')
      when.textContent = `适用时机：${skill.whenToUse}`
      card.append(when)
    }
    controlSkillList.append(card)
  }
  if (snapshot.skillsState === 'ready' && !snapshot.skills?.length) controlSkillList.textContent = '当前项目没有报告可用 Skill。'
}

async function refreshControlCenter() {
  renderControlCenter(await window.desktopHost.controlCenterSnapshot())
}

function renderModelConnection(snapshot) {
  modelConnectionState = snapshot
  modelStatusDot.className = `status-dot ${snapshot.state}`
  modelStatusLabel.textContent = snapshot.title
  modelStatusMessage.textContent = snapshot.message
  const lines = []
  for (const provider of snapshot.activeProviders) {
    const credential = provider.credential
    const credentialText = !credential
      ? '凭据：此提供方未提供可检查的凭据状态'
      : credential.configured === true
        ? '凭据：已配置（密钥内容不可见）'
        : credential.configured === false
          ? '凭据：尚未配置'
          : '凭据：状态未确认'
    lines.push(`${provider.name} · ${provider.modelCount} 个模型`, credentialText)
    for (const model of provider.models) lines.push(`  • ${model.name}`)
  }
  if (!snapshot.activeProviders.length) lines.push('尚未发现已激活的模型提供方。')
  if (snapshot.dormantProviderCount) lines.push('', `另有 ${snapshot.dormantProviderCount} 个未启用的提供方，未列入可用模型。`)
  if (snapshot.failures.length) {
    lines.push('', '需要留意：')
    for (const failure of snapshot.failures) lines.push(`  • ${failure.provider}：${failure.message}`)
  }
  modelCatalogSummary.textContent = lines.join('\n')
  checkModelConnectionButton.disabled = snapshot.state === 'engine-offline'
  const management = snapshot.credentialManagement || { supported: false, writable: false, configured: false, providerCount: 0 }
  const credentialProviders = (snapshot.activeProviders || []).filter((provider) => provider.credential)
  const writableProviders = credentialProviders.filter((provider) => provider.credential.writable === true)
  const configuredWritableProviders = writableProviders.filter((provider) => provider.credential.configured === true)
  const previousRef = credentialProviderChoice.value
  credentialProviderChoice.replaceChildren(...writableProviders.map((provider) => new Option(provider.name, provider.credential.ref)))
  if ([...credentialProviderChoice.options].some((option) => option.value === previousRef)) credentialProviderChoice.value = previousRef
  configureModelCredentialButton.disabled = !writableProviders.length
  const provisioning = snapshot.provisioning || { supported: false, writable: false, providers: [] }
  addModelProviderButton.disabled = !provisioning.supported
  clearModelCredentialButton.disabled = !configuredWritableProviders.length
  verifyModelConnectionButton.disabled = snapshot.state === 'engine-offline' || !credentialProviders.some((provider) => provider.credential.configured === true)
  modelCredentialNote.textContent = !management.supported
    ? '当前 Harness 配置没有公布简单 API Key。OAuth、本地无密钥或复杂认证请使用对应 Provider 的官方设置。'
    : !management.writable
      ? '当前 API Key 都来自只读来源，Deep code 不会用本地值覆盖它们。'
      : `${management.providerCount || credentialProviders.length} 个 Provider 公布了简单 API Key 配置。密钥只会单向交给 Harness。`
}

function renderProviderChoices() {
  const providers = modelConnectionState.provisioning?.providers || []
  providerChoice.replaceChildren(...providers.map((provider) => new Option(provider.name, provider.id)))
  const selected = providers.find((provider) => provider.id === providerChoice.value) || providers[0]
  providerChoiceDescription.textContent = selected
    ? `${selected.name} · 由当前 Harness catalog 提供配置，不由 Deep code 猜测接口。`
    : '当前 Harness 没有公布可用的简单 API Key Provider。'
}

function selectedCredentialProvider({ configuredOnly = false } = {}) {
  const providers = (modelConnectionState.activeProviders || []).filter((provider) => provider.credential?.writable === true)
  const selected = providers.find((provider) => provider.credential.ref === credentialProviderChoice.value)
  if (selected && (!configuredOnly || selected.credential.configured === true)) return selected
  return providers.find((provider) => !configuredOnly || provider.credential.configured === true)
}

function updateCredentialProviderDescription() {
  const provider = selectedCredentialProvider()
  credentialProviderDescription.textContent = provider
    ? `${provider.name} · ${provider.credential.ref} · ${provider.credential.configured ? '已配置，可替换' : '尚未配置'}`
    : '当前没有 Harness 允许 Deep code 写入的简单 API Key。'
}

async function refreshModelConnection() {
  const snapshot = await window.desktopHost.modelConnection()
  renderModelConnection(snapshot)
  return snapshot
}

async function safelyRenderStatus(action) {
  try { renderRuntime(await action()) } catch (error) { renderRuntime({ state: 'error', message: error.message, logs: [] }) }
}

async function runVisibleAction({ button, status, working, action, success }) {
  const oldText = button.textContent
  button.disabled = true
  button.setAttribute('aria-busy', 'true')
  status.textContent = working
  status.dataset.state = 'working'
  status.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  try {
    const result = await action()
    status.textContent = success(result)
    status.dataset.state = 'success'
    return result
  } catch (error) {
    status.textContent = `没有完成：${error.message}\n\n你可以重试；若仍失败，请到“设置与故障恢复”导出脱敏诊断。`
    status.dataset.state = 'error'
    return null
  } finally {
    button.disabled = false
    button.removeAttribute('aria-busy')
    button.textContent = oldText
  }
}

async function selectRuntimeNative() {
  const result = await window.desktopHost.selectRuntime()
  if (result.canceled) return false
  pathInput.value = result.runtimePath
  const status = await window.desktopHost.status()
  renderRuntime(status)
  setupProgress.textContent = `已找到并记住 Deep code Engine：\n${result.runtimePath}`
  setupProgress.dataset.state = 'success'
  return true
}

function displayTime(value) {
  try { return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) } catch { return '刚刚' }
}

function displayDuration(value) {
  return window.deepCodeReading.formatDuration(value)
}

async function copyWithFeedback(value, button) {
  const original = button.textContent
  button.disabled = true
  try {
    await window.desktopHost.copyText(value)
    button.textContent = '已复制'
  } catch {
    button.textContent = '复制失败'
  } finally {
    setTimeout(() => {
      if (!button.isConnected) return
      button.disabled = false
      button.textContent = original
    }, 1400)
  }
}

function copyButton(value, label = '复制') {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'copy-button'
  button.textContent = label
  button.addEventListener('click', () => copyWithFeedback(value, button))
  return button
}

function appendResponseText(container, source, { copyCode = true } = {}) {
  window.deepCodeMarkdown.renderInto(container, source)
  if (!copyCode) return
  for (const code of [...container.querySelectorAll('pre > code')]) {
    const pre = code.parentElement
    const wrapper = document.createElement('div')
    wrapper.className = 'code-block'
    const button = copyButton(code.textContent, '复制代码')
    button.setAttribute('aria-label', '复制这段代码')
    pre.replaceWith(wrapper)
    wrapper.append(pre, button)
  }
}

function renderMessageBubble({ role: messageRole, text: source, images = [], draft = false, truncated = false }) {
  const bubble = document.createElement('article')
  bubble.className = `message-bubble ${messageRole}${draft ? ' live-draft' : ''}`
  const heading = document.createElement('div')
  heading.className = 'message-heading'
  const role = document.createElement('strong')
  role.textContent = messageRole === 'assistant'
    ? draft
      ? (truncated ? 'Deep code · 生成中（预览已截短）' : 'Deep code · 生成中')
      : 'Deep code'
    : '你'
  heading.append(role)
  if (messageRole === 'assistant' && !draft && source) heading.append(copyButton(source, '复制回答'))
  bubble.append(heading)
  if (source) {
    const text = document.createElement('div')
    text.className = 'message-content'
    appendResponseText(text, source, { copyCode: !draft })
    bubble.append(text)
  }
  if (images.length) {
    const gallery = document.createElement('ul')
    gallery.className = 'message-attachments'
    for (const image of images) {
      const item = document.createElement('li')
      const dimensions = image.width && image.height ? ` · ${image.width} × ${image.height}` : ''
      const size = Number.isFinite(image.bytes) ? ` · ${imageBytes(image.bytes)}` : ''
      item.textContent = `图片 · ${image.name}${dimensions}${size}`
      gallery.append(item)
    }
    bubble.append(gallery)
  }
  if (draft) {
    bubble.setAttribute('aria-live', 'polite')
    bubble.setAttribute('aria-label', 'Deep code 正在生成尚未定稿的回复')
    const notice = document.createElement('small')
    notice.className = 'live-draft-notice'
    notice.textContent = '尚未定稿；Harness 提交后会由正式任务记录替换。'
    bubble.append(notice)
  }
  return bubble
}

function updateJumpLatest() {
  const visible = workbenchPage.classList.contains('is-active') && Boolean(activeThread())
  jumpLatestButton.classList.toggle('hidden', !visible || window.deepCodeReading.shouldFollow(mainPanel))
}

function replaceFactList(container, items, emptyCopy, copy) {
  container.replaceChildren()
  for (const item of items?.length ? items : [null]) {
    const row = document.createElement('li')
    row.textContent = item ? copy(item) : emptyCopy
    if (!item) row.className = 'fact-empty'
    container.append(row)
  }
}

function appendPre(container, text, className = '') {
  const pre = document.createElement('pre')
  if (className) pre.className = className
  pre.textContent = String(text || '')
  container.append(pre)
}

function toolCardState(card) {
  if (card.state === 'error') return '失败'
  if (card.state === 'working') return '进行中'
  return '已完成'
}

function renderDiffCard(body, card) {
  if (!card.diffs?.length) {
    body.textContent = 'Harness 没有提供可显示的差异。'
    return
  }
  for (const diff of card.diffs) {
    const file = document.createElement('details')
    file.className = 'diff-file'
    file.open = card.diffs.length === 1
    const label = document.createElement('summary')
    label.textContent = diff.path
    const panes = document.createElement('div')
    panes.className = 'diff-panes'
    const before = document.createElement('section')
    const after = document.createElement('section')
    const beforeLabel = document.createElement('strong')
    const afterLabel = document.createElement('strong')
    beforeLabel.textContent = diff.oldText === null ? '此前内容未提供' : '修改前'
    afterLabel.textContent = diff.oldText === null ? '新内容' : '修改后'
    before.append(beforeLabel)
    after.append(afterLabel)
    appendPre(before, diff.oldText === null ? '（新建文件或 Harness 未提供修改前内容）' : diff.oldText, 'diff-before')
    appendPre(after, diff.newText, 'diff-after')
    panes.append(before, after)
    file.append(label, panes)
    body.append(file)
  }
}

function renderTerminalCard(body, card) {
  const meta = document.createElement('p')
  meta.className = 'tool-card-meta'
  meta.textContent = [card.cwd ? `目录：${card.cwd}` : '', Number.isInteger(card.exitCode) ? `退出代码：${card.exitCode}` : '', card.signal ? `信号：${card.signal}` : ''].filter(Boolean).join(' · ') || 'Harness 没有提供工作目录或退出状态。'
  body.append(meta)
  appendPre(body, card.output || '（命令没有返回可显示的输出）', 'terminal-output')
}

function renderReadCard(body, card) {
  const meta = document.createElement('p')
  meta.className = 'tool-card-meta'
  meta.textContent = `${card.path || '未提供路径'}${Number.isInteger(card.totalLines) ? ` · 文件共 ${card.totalLines} 行` : ''}${card.lang ? ` · ${card.lang}` : ''}`
  body.append(meta)
  const lines = document.createElement('div')
  lines.className = 'read-lines'
  for (const line of card.lines || []) {
    const number = document.createElement('span')
    const text = document.createElement('code')
    number.textContent = String(line.number)
    text.textContent = line.text
    lines.append(number, text)
  }
  if (!card.lines?.length) lines.textContent = 'Harness 没有返回可显示的文本行。'
  body.append(lines)
}

function renderSearchCard(body, card) {
  const meta = document.createElement('p')
  meta.className = 'tool-card-meta'
  meta.textContent = `${Number.isInteger(card.total) ? `共找到 ${card.total} 项` : '搜索结果'}${card.truncated ? ' · 当前只显示部分结果' : ''}`
  body.append(meta)
  if (card.shape === 'matches') {
    for (const file of card.files || []) {
      const group = document.createElement('details')
      group.className = 'search-group'
      const label = document.createElement('summary')
      label.textContent = `${file.path} · ${file.matches.length} 处`
      const matches = document.createElement('div')
      matches.className = 'read-lines'
      for (const match of file.matches) {
        const number = document.createElement('span')
        const line = document.createElement('code')
        number.textContent = String(match.lineNumber)
        line.textContent = match.line
        matches.append(number, line)
      }
      group.append(label, matches)
      body.append(group)
    }
  } else {
    const paths = document.createElement('ul')
    paths.className = 'tool-path-list'
    for (const path of card.paths || []) {
      const item = document.createElement('li')
      item.textContent = path
      paths.append(item)
    }
    body.append(paths)
  }
}

function renderWebCard(body, card) {
  const meta = document.createElement('p')
  meta.className = 'tool-card-meta'
  meta.textContent = card.kind === 'fetch'
    ? `${Number.isInteger(card.statusCode) ? `HTTP ${card.statusCode}` : '网页读取'}${card.truncated ? ' · 内容已截断' : ''}`
    : `${card.sources?.length || 0} 个来源${card.truncated ? ' · 来源列表已截断' : ''}`
  body.append(meta)
  if (card.answer) {
    const answer = document.createElement('p')
    answer.textContent = card.answer
    body.append(answer)
  }
  if (card.kind === 'fetch' && card.url) {
    const link = document.createElement('a')
    link.href = card.url
    link.textContent = card.url
    body.append(link)
  }
  for (const source of card.sources || []) {
    const sourceNode = document.createElement('article')
    sourceNode.className = 'web-source'
    const link = document.createElement('a')
    link.href = source.url
    link.textContent = source.title || source.url
    sourceNode.append(link)
    if (source.snippet) {
      const snippet = document.createElement('p')
      snippet.textContent = source.snippet
      sourceNode.append(snippet)
    }
    body.append(sourceNode)
  }
}

function renderGenericCard(body, card) {
  if (card.locations?.length) {
    const locations = document.createElement('ul')
    locations.className = 'tool-path-list'
    for (const location of card.locations) {
      const item = document.createElement('li')
      item.textContent = `${location.path}${location.line ? `:${location.line}` : ''}`
      locations.append(item)
    }
    body.append(locations)
  }
  if (card.rawInput !== null && card.rawInput !== undefined) {
    appendPre(body, typeof card.rawInput === 'string' ? card.rawInput : JSON.stringify(card.rawInput, null, 2))
  }
  const content = (card.content || []).filter((item) => item?.type === 'text').map((item) => item.text).join('')
  if (content) appendPre(body, content)
  if (!body.childNodes.length) body.textContent = 'Harness 没有提供更详细的展示信息。'
}

function renderToolCard(card) {
  const node = document.createElement('details')
  node.className = 'tool-card'
  node.dataset.card = card.type
  node.dataset.cardId = String(card.id || '')
  node.dataset.state = card.state
  node.open = card.state === 'error'
  const summary = document.createElement('summary')
  const kind = document.createElement('span')
  kind.className = 'tool-card-kind'
  kind.textContent = ({ terminal: '命令', diff: '文件', read: '读取', search: '搜索', web: '网页', generic: '工具' })[card.type] || '工具'
  const title = document.createElement('strong')
  title.textContent = card.title
  const status = document.createElement('span')
  status.className = 'tool-card-status'
  status.textContent = `${toolCardState(card)}${Number.isFinite(card.durationMs) ? ` · ${displayDuration(card.durationMs)}` : ''}`
  summary.append(kind, title, status)
  const body = document.createElement('div')
  body.className = 'tool-card-body'
  if (card.type === 'diff') renderDiffCard(body, card)
  else if (card.type === 'terminal') renderTerminalCard(body, card)
  else if (card.type === 'read') renderReadCard(body, card)
  else if (card.type === 'search') renderSearchCard(body, card)
  else if (card.type === 'web') renderWebCard(body, card)
  else renderGenericCard(body, card)
  node.append(summary, body)
  return node
}

function renderToolCards(cards) {
  toolCardsContainer.replaceChildren()
  if (!cards?.length) {
    const empty = document.createElement('p')
    empty.className = 'fact-empty'
    empty.textContent = '没有工具操作。'
    toolCardsContainer.append(empty)
    return
  }
  toolCardsContainer.append(...cards.map(renderToolCard))
}

function renderRunDetails(thread) {
  const details = thread.agent?.runDetails || {}
  const duration = displayDuration(details.durationMs)
  const changedCount = details.changedFiles?.length || 0
  const activityCount = details.activities?.length || 0
  const labelParts = ['运行详情']
  if (duration) labelParts.push(`用时 ${duration}`)
  if (changedCount) labelParts.push(`改动 ${changedCount} 个文件`)
  else if (activityCount) labelParts.push(`${activityCount} 项操作`)
  runDetailsLabel.textContent = labelParts.join(' · ')
  replaceFactList(permissionFacts, details.permissionFacts, 'Harness 没有提供可确认的权限快照。', (item) => `${item.label}。${item.detail}`)
  replaceFactList(changedFiles, details.changedFiles, '没有确认到文件改动。', (item) => `${item.path}（${item.operation}）`)
  renderToolCards(details.toolCards || [])
  const evidence = thread.agent?.evidence || []
  const context = details.runtimeContext || []
  const sections = []
  if (context.length) sections.push(`运行上下文（不作为你的发言显示）\n\n${context.map((item) => `[${item.source?.plugin || item.source?.kind || 'Harness'}] ${item.raw}`).join('\n\n')}`)
  if (evidence.length) sections.push(`Harness 技术证据\n\n${evidence.map((item) => `${item.type}\n${JSON.stringify(item.detail, null, 2)}`).join('\n\n')}`)
  taskEvidenceContent.textContent = sections.join('\n\n---\n\n') || '还没有技术记录。'
}

function appendOutcomeSection(title, items, className = '') {
  if (!items.length) return
  const section = document.createElement('section')
  const heading = document.createElement('h4')
  heading.textContent = title
  const list = document.createElement('ul')
  if (className) list.className = className
  for (const value of items) {
    const item = document.createElement('li')
    item.textContent = value
    list.append(item)
  }
  section.append(heading, list)
  taskOutcomeSections.append(section)
}

function renderTaskOutcome(thread) {
  const outcome = thread.outcome
  taskOutcome.classList.toggle('hidden', !outcome?.visible)
  renderOutcomeMap(outcome?.map)
  if (!outcome?.visible) return
  taskOutcome.dataset.state = outcome.state
  taskOutcomeTitle.textContent = outcome.title
  taskOutcomeBadge.textContent = outcome.state === 'success' ? '已完成' : '需要处理'
  taskOutcomeSummary.textContent = outcome.summary
  taskOutcomeSections.replaceChildren()
  appendOutcomeSection('确认的文件改动', outcome.changes.map((item) => `${item.operation} · ${item.path}`))
  const verificationLabel = (state) => state === 'passed' ? '通过' : state === 'failed' ? '未通过' : '未确认'
  appendOutcomeSection('明确的验证', outcome.verifications.map((item) => `${verificationLabel(item.state)} · ${item.label}（${item.detail}）`), 'outcome-verifications')
  appendOutcomeSection('仍需留意', outcome.warnings, 'outcome-warnings')
  appendOutcomeSection('这会影响什么', outcome.impact ? [outcome.impact] : [])
  appendOutcomeSection('接下来只需做什么', outcome.nextAction ? [outcome.nextAction] : [])
}

function renderOutcomeMap(map) {
  const visible = Boolean(map?.visible && map.nodes?.length)
  outcomeMap.classList.toggle('hidden', !visible)
  outcomeMapEmpty.classList.toggle('hidden', visible)
  outcomeMapFlow.replaceChildren()
  outcomeMapLegend.textContent = visible ? map.legend : ''
  if (!visible) return
  const edgeTargets = new Set((map.edges || []).map((edge) => edge.to))
  for (const node of map.nodes) {
    const card = document.createElement('button')
    card.type = 'button'
    card.className = 'outcome-map-node'
    card.dataset.state = node.state
    card.dataset.kind = node.kind
    if (edgeTargets.has(node.id)) card.classList.add('has-incoming-edge')
    const eyebrow = document.createElement('span')
    eyebrow.className = 'outcome-map-node-eyebrow'
    eyebrow.textContent = node.eyebrow
    const title = document.createElement('strong')
    title.textContent = node.title
    const summary = document.createElement('span')
    summary.className = 'outcome-map-node-summary'
    summary.textContent = node.summary
    const action = document.createElement('span')
    action.className = 'outcome-map-node-action'
    action.textContent = '查看证据 →'
    card.append(eyebrow, title, summary, action)
    card.addEventListener('click', () => {
      setTaskView('trace')
      const selector = { changes: '#trace-changes', tools: '#trace-tools', technical: '.technical-details' }[node.evidenceTarget] || '#run-details'
      const target = document.querySelector(selector)
      if (target?.tagName === 'DETAILS') target.open = true
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    outcomeMapFlow.append(card)
  }
}

function captureTaskViewState(taskId) {
  if (!taskId) return
  taskViewState.save(taskId, {
    activeView: traceView.classList.contains('is-active') ? 'trace' : receiptView.classList.contains('is-active') ? 'receipt' : 'conversation',
    technicalDetailsOpen: technicalDetails.open,
    openToolCards: [...toolCardsContainer.querySelectorAll('.tool-card[open]')]
      .map((card) => card.dataset.cardId)
      .filter(Boolean)
  })
}

function restoreTaskViewState(taskId) {
  const snapshot = taskViewState.load(taskId)
  setTaskView(snapshot.activeView)
  technicalDetails.open = snapshot.technicalDetailsOpen
  if (!taskViewState.has(taskId)) return
  const openCards = new Set(snapshot.openToolCards)
  for (const card of toolCardsContainer.querySelectorAll('.tool-card')) {
    card.open = openCards.has(card.dataset.cardId)
  }
}

function setTaskView(view) {
  const selected = ['trace', 'receipt'].includes(view) ? view : 'conversation'
  conversationView.classList.toggle('is-active', selected === 'conversation')
  receiptView.classList.toggle('is-active', selected === 'receipt')
  traceView.classList.toggle('is-active', selected === 'trace')
  for (const button of taskViewButtons) button.classList.toggle('is-active', button.dataset.taskView === selected)
  taskComposer.closest('.composer-wrap').classList.toggle('hidden', selected !== 'conversation')
}

function activeThread() {
  return workbench.threads.find((thread) => thread.id === workbench.activeThreadId)
}

function composerScope() {
  return activeThread()?.id || 'new-task'
}

function imageBytes(bytes) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function renderImageDrafts() {
  imageDraftRail.replaceChildren()
  imageDraftRail.classList.toggle('hidden', !imageDrafts.length)
  composerHint.textContent = imageDrafts.length
    ? `${imageDrafts.length} 张图片只在本机预览；发送后才交给当前模型。`
    : 'Deep code 工作台'
  for (const draft of imageDrafts) {
    const card = document.createElement('figure')
    card.className = 'image-draft'
    const image = document.createElement('img')
    image.src = draft.previewUrl
    image.alt = draft.name
    const caption = document.createElement('figcaption')
    const name = document.createElement('strong')
    name.textContent = draft.name
    const detail = document.createElement('span')
    detail.textContent = `${draft.width} × ${draft.height} · ${imageBytes(draft.bytes)}`
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.setAttribute('aria-label', `移除 ${draft.name}`)
    remove.textContent = '×'
    remove.addEventListener('click', async () => {
      try {
        imageDrafts = await window.desktopHost.removeImage(composerScope(), draft.id)
        renderImageDrafts()
      } catch (error) { imageDraftStatus.textContent = `无法移除图片：${error.message}` }
    })
    caption.append(name, detail)
    card.append(image, caption, remove)
    imageDraftRail.append(card)
  }
}

async function syncImageDrafts(scopeId = composerScope()) {
  imageDrafts = await window.desktopHost.imageDrafts(scopeId)
  renderImageDrafts()
}

async function respondToInteraction(thread, response, card, errorNode) {
  const controls = card.querySelectorAll('button, input, textarea')
  for (const control of controls) control.disabled = true
  errorNode.textContent = '正在把你的决定交给 Harness…'
  try {
    workbench = await window.desktopHost.respondToInteraction(thread.id, response)
    renderWorkbench()
  } catch (error) {
    for (const control of controls) control.disabled = false
    errorNode.textContent = `没有提交：${error.message}`
  }
}

function renderDecisionGate(thread, interaction) {
  const card = document.createElement('article')
  card.className = 'decision-card'
  card.dataset.kind = interaction.kind
  const label = document.createElement('p')
  label.className = 'decision-label'
  label.textContent = interaction.kind === 'approval'
    ? 'DECISION GATE · 一次性批准'
    : interaction.kind === 'plan-review'
      ? 'PLAN REVIEW · 计划审阅'
      : 'USER QUESTION · 等待回答'
  const title = document.createElement('h3')
  title.textContent = interaction.title
  const summary = document.createElement('p')
  summary.className = 'decision-summary'
  summary.textContent = interaction.summary
  card.append(label, title, summary)
  if (interaction.detail) {
    const detail = document.createElement('p')
    detail.className = 'decision-detail'
    detail.textContent = interaction.detail
    card.append(detail)
  }
  const consequence = document.createElement('p')
  consequence.className = 'decision-consequence'
  consequence.textContent = interaction.consequence
  card.append(consequence)
  const timeoutNotice = document.createElement('p')
  timeoutNotice.className = 'decision-timeout'
  timeoutNotice.textContent = '这项任务正在等待你的回答。5 分钟内没有响应时，Deep code 会停止本轮，不会替你选择。'
  card.append(timeoutNotice)
  const errorNode = document.createElement('p')
  errorNode.className = 'decision-error'
  errorNode.setAttribute('aria-live', 'polite')

  if (interaction.kind === 'approval') {
    const actions = document.createElement('div')
    actions.className = 'button-row'
    const allow = document.createElement('button')
    allow.type = 'button'
    allow.className = 'primary-button'
    allow.textContent = '只允许这一次'
    const reject = document.createElement('button')
    reject.type = 'button'
    reject.className = 'danger-button'
    reject.textContent = '拒绝'
    allow.addEventListener('click', () => respondToInteraction(thread, { interactionId: interaction.id, action: 'allow' }, card, errorNode))
    reject.addEventListener('click', () => respondToInteraction(thread, { interactionId: interaction.id, action: 'reject' }, card, errorNode))
    actions.append(allow, reject)
    card.append(actions, errorNode)
    if (interaction.responding) {
      for (const control of card.querySelectorAll('button')) control.disabled = true
      errorNode.textContent = '已提交，正在等待 Harness 确认。'
    }
    return card
  }

  const form = document.createElement('form')
  const touchIdleWindow = () => {
    window.desktopHost.touchInteraction(thread.id, interaction.id).catch(() => {})
  }
  form.addEventListener('input', touchIdleWindow)
  form.addEventListener('change', touchIdleWindow)
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const answers = interaction.questions.map((question, questionIndex) => {
      const selected = [...form.querySelectorAll(`[name="decision-${questionIndex}"]:checked`)].map((input) => input.value)
      const custom = form.querySelector(`[data-custom="${questionIndex}"]`)?.value || ''
      return { id: question.id, selected, custom }
    })
    respondToInteraction(thread, { interactionId: interaction.id, answers }, card, errorNode)
  })
  interaction.questions.forEach((question, questionIndex) => {
    const fieldset = document.createElement('fieldset')
    fieldset.className = 'decision-question'
    const legend = document.createElement('legend')
    legend.textContent = question.header || question.question
    fieldset.append(legend)
    if (question.header && question.question) {
      const questionCopy = document.createElement('p')
      questionCopy.className = 'decision-question-detail'
      questionCopy.textContent = question.question
      fieldset.append(questionCopy)
    }
    if (question.detail) {
      const detail = document.createElement('p')
      detail.className = 'decision-question-detail'
      detail.textContent = question.detail
      fieldset.append(detail)
    }
    question.options.forEach((option) => {
      const optionLabel = document.createElement('label')
      optionLabel.className = 'decision-option'
      const input = document.createElement('input')
      input.type = question.multiSelect ? 'checkbox' : 'radio'
      input.name = `decision-${questionIndex}`
      input.value = option.label
      const optionCopy = document.createElement('span')
      optionCopy.textContent = option.label
      if (option.description) {
        const description = document.createElement('small')
        description.textContent = option.description
        optionCopy.append(description)
      }
      optionLabel.append(input, optionCopy)
      fieldset.append(optionLabel)
    })
    const custom = document.createElement('textarea')
    custom.className = 'decision-custom'
    custom.dataset.custom = String(questionIndex)
    custom.maxLength = 4000
    custom.placeholder = question.options.length ? '也可以补充自己的回答（可选）' : '在这里输入回答'
    fieldset.append(custom)
    form.append(fieldset)
  })
  const submit = document.createElement('button')
  submit.type = 'submit'
  submit.className = 'primary-button'
  submit.textContent = interaction.kind === 'plan-review' ? '提交计划审阅结果' : '提交回答'
  const actions = document.createElement('div')
  actions.className = 'button-row'
  actions.append(submit)
  form.append(actions, errorNode)
  card.append(form)
  if (interaction.responding) {
    for (const control of card.querySelectorAll('button, input, textarea')) control.disabled = true
    errorNode.textContent = '已提交，正在等待 Harness 确认。'
  }
  return card
}

function renderLiveState(thread) {
  const live = thread.agent?.live
  const interactions = live?.interactions || []
  decisionGates.replaceChildren(...interactions.map((interaction) => renderDecisionGate(thread, interaction)))
  const activities = live?.activities || []
  activityTimeline.classList.toggle('hidden', !activities.length && !live?.error)
  liveConnectionLabel.textContent = ({
    connected: '实时状态已连接', connecting: '正在连接实时状态',
    reconnecting: '实时状态正在重连', error: '实时状态受限'
  })[live?.status] || ''
  activityList.replaceChildren()
  for (const activity of activities.slice(-6).reverse()) {
    const item = document.createElement('li')
    item.className = 'activity-item'
    item.dataset.state = activity.state
    const activityCopy = document.createElement('span')
    activityCopy.textContent = activity.label
    if (activity.detail) {
      const detail = document.createElement('small')
      detail.textContent = activity.detail
      activityCopy.append(detail)
    }
    item.append(activityCopy)
    activityList.append(item)
  }
  if (live?.error) {
    const error = document.createElement('li')
    error.className = 'activity-item'
    error.dataset.state = 'error'
    error.textContent = live.error
    activityList.prepend(error)
  }
  return {
    pendingCount: interactions.length,
    queuedCount: Number(live?.queue?.queued || 0) + Number(live?.queue?.steering || 0)
  }
}

function renderRunContext(thread) {
  const run = thread?.run
  sidebarRunPanel.classList.toggle('hidden', !thread)
  currentRunContext.classList.toggle('hidden', !run)
  if (!run) return
  currentRunState.textContent = run.label
  currentRunState.dataset.state = run.state
  const route = thread.routeEvidence
  if (route?.requested) {
    const requestedEffort = route.requested.reasoningEffort ? ` · ${route.requested.reasoningEffort}` : ' · Provider 默认强度'
    const requestedLabel = route.source === 'user' ? '用户选择' : 'Harness 当前设置'
    const actual = route.effective
      ? `${route.effective.name || route.effective.id}${route.effective.reasoningEffort ? ` · ${route.effective.reasoningEffort}` : ' · Provider 默认强度'}`
      : '等待 Harness 的 request/header 证据'
    const mismatch = route.matches === false ? '（与请求不同）' : ''
    currentRunModel.textContent = `${requestedLabel}：${route.label || `${route.requested.model}${requestedEffort}`}；实际采用：${actual}${mismatch}`
  } else {
    currentRunModel.textContent = run.model?.available
      ? `${run.model.confirmed ? '本轮实际采用' : 'Session 已选择'}：${run.model.name}${run.model.reasoningEffort ? ` · ${run.model.reasoningEffort}` : ' · Provider 默认强度'}`
      : (run.model?.label || 'Harness 未提供实际模型。')
  }
  currentRunEvidence.textContent = `证据：${run.evidence?.toolCount || 0} 项工具 · ${run.evidence?.changedFileCount || 0} 个文件改动`
  currentRunUsage.textContent = run.usage?.available ? run.usage.label : (run.usage?.label || '本轮用量未知。')
}

function renderWorkbench() {
  const selectedThreadId = workbench.activeThreadId || ''
  if (lastRenderedThreadId) captureTaskViewState(lastRenderedThreadId)
  if (selectedThreadId !== lastRenderedThreadId && handoffDialog.open) handoffDialog.close()
  const scrollPlan = workbenchPage.classList.contains('is-active')
    ? window.deepCodeReading.capture(mainPanel, {
      force: Boolean(selectedThreadId) && (forceFollowNextRender || selectedThreadId !== lastRenderedThreadId)
    })
    : null
  taskCount.textContent = String(workbench.threads.length)
  taskList.replaceChildren()
  for (const thread of workbench.threads) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `task-item${thread.id === workbench.activeThreadId ? ' is-active' : ''}`
    button.innerHTML = `<span class="task-item-title"></span><span class="task-item-time"></span>`
    button.querySelector('.task-item-title').textContent = thread.title
    button.querySelector('.task-item-time').textContent = displayTime(thread.updatedAt)
    button.addEventListener('click', async () => {
      try {
        workbench = await window.desktopHost.selectTask(thread.id)
        await syncImageDrafts(thread.id)
        forceFollowNextRender = true
        showPage('workbench')
        renderWorkbench()
      } catch (error) { careResult.textContent = error.message }
    })
    taskList.append(button)
  }
  const thread = activeThread()
  renderRunContext(thread)
  taskViewTabs.classList.toggle('hidden', !thread)
  workbenchHeading.textContent = thread?.title || '今天要推进什么？'
  emptyTask.classList.toggle('hidden', Boolean(thread))
  activeTask.classList.toggle('hidden', !thread)
  if (thread) {
    activeTaskTitle.textContent = thread.title
    const agentMessages = thread.agent?.messages || []
    const hasHumanMessage = agentMessages.some((message) => message.role === 'user')
    activeTaskPrompt.classList.toggle('hidden', hasHumanMessage)
    activeTaskPrompt.textContent = thread.prompt
      ? `待发送的任务目标：${thread.prompt}`
      : '待发送的任务只有图片。'
    const labels = {
      draft: '任务已保存，等待连接 Engine。',
      running: 'Deep code 正在处理。结果会自动更新。',
      ready: '这一轮已经完成。你可以继续追问，或展开技术证据。',
      error: `没有完成：${thread.engineError || 'Engine 返回了未知错误。'}`
    }
    const { pendingCount, queuedCount } = renderLiveState(thread)
    const statusCopy = pendingCount
      ? `任务正在等待你的决定。这里有 ${pendingCount} 项需要处理；Harness 不会在 Deep code 背后替你批准。`
      : queuedCount
        ? `Deep code 正在处理。还有 ${queuedCount} 条消息排队，正式结果会按顺序写入任务记录。`
        : (labels[thread.engineState] || labels.draft)
    const timing = window.deepCodeReading.timingLabel({
      state: thread.engineState,
      startedAt: thread.updatedAt,
      durationMs: thread.agent?.runDetails?.durationMs
    })
    const notice = thread.engineNotice ? `\n${thread.engineNotice}` : ''
    taskEngineStatus.textContent = `${statusCopy}${timing ? ` ${timing}。` : ''}${notice}`
    taskEngineStatus.dataset.state = pendingCount ? 'waiting' : (thread.engineState || 'draft')
    const recovery = thread.recovery
    taskRecovery.classList.toggle('hidden', !recovery)
    taskRecoveryCause.textContent = recovery ? `原因：${recovery.cause}` : ''
    taskRecoverySafety.textContent = recovery ? `已经确认：${recovery.safety}` : ''
    taskRecoveryNext.textContent = recovery ? `下一步：${recovery.nextAction}` : ''
    cancelTaskButton.disabled = thread.engineState !== 'running'
    composerStopButton.classList.toggle('hidden', thread.engineState !== 'running')
    const canRetry = ['draft', 'error'].includes(thread.engineState)
    retryTaskButton.classList.remove('hidden')
    retryTaskButton.disabled = !canRetry
    retryTaskButton.textContent = canRetry
      ? (hasHumanMessage ? '重新连接任务' : '重新发送任务')
      : (thread.engineState === 'running' ? '正在处理' : '已连接，无需重试')
    conversationFeed.replaceChildren()
    for (const item of agentMessages) {
      conversationFeed.append(renderMessageBubble({ role: item.role, text: item.text, images: item.images || [] }))
    }
    const draft = thread.agent?.live?.draft
    if (draft?.text) {
      conversationFeed.append(renderMessageBubble({ role: 'assistant', text: draft.text, draft: true, truncated: draft.truncated }))
    }
    renderRunDetails(thread)
    renderTaskOutcome(thread)
    restoreTaskViewState(selectedThreadId)
  } else {
    decisionGates.replaceChildren()
    activityList.replaceChildren()
    activityTimeline.classList.add('hidden')
    taskOutcome.classList.add('hidden')
    taskRecovery.classList.add('hidden')
    composerStopButton.classList.add('hidden')
    technicalDetails.open = false
    setTaskView('conversation')
  }
  lastRenderedThreadId = selectedThreadId
  forceFollowNextRender = false
  requestAnimationFrame(() => {
    if (scrollPlan) window.deepCodeReading.restore(mainPanel, scrollPlan)
    updateJumpLatest()
  })
}

async function refreshWorkbench() {
  workbench = await window.desktopHost.workbenchSnapshot()
  renderWorkbench()
}

async function createTask() {
  const prompt = taskComposer.value.trim()
  if (!prompt && !imageDrafts.length) { taskComposer.focus(); return }
  try {
    createTaskButton.disabled = true
    taskComposer.disabled = true
    modelRouteButton.disabled = true
    const thread = activeThread()
    const attachmentIds = imageDrafts.map((draft) => draft.id)
    const routing = { manualSelection: manualModelSelection }
    workbench = thread?.sessionId
      ? await window.desktopHost.sendMessage(thread.id, prompt, attachmentIds, routing)
      : await window.desktopHost.createTask({ prompt, attachmentScope: composerScope(), attachmentIds, routing })
    taskComposer.value = ''
    await syncImageDrafts(workbench.activeThreadId || 'new-task')
    forceFollowNextRender = true
    renderWorkbench()
  } catch (error) {
    taskEngineStatus.textContent = `没有发送：${error.message}`
    taskEngineStatus.dataset.state = 'error'
  } finally {
    createTaskButton.disabled = false
    taskComposer.disabled = false
    modelRouteButton.disabled = false
    taskComposer.focus()
  }
}

async function refreshWorkspace() {
  const result = await window.desktopHost.workspaceStatus()
  renderWorkspace(result.workspacePath)
  settingsWorkspacePath.textContent = result.workspacePath || '尚未选择工作区'
  openWorkspaceButton.disabled = !result.workspacePath
}

function renderWorkspace(workspacePath) {
  const normalized = String(workspacePath || '')
  const segments = normalized.split(/[\\/]/).filter(Boolean)
  sidebarWorkspaceName.textContent = segments.at(-1) || '尚未选择'
  workspaceSummary.textContent = normalized || '新任务需要一个本地工作区。'
  workspaceSummary.title = normalized
}

async function selectWorkspace() {
  const result = await window.desktopHost.selectWorkspace()
  if (!result.canceled) {
    renderWorkspace(result.workspacePath)
    settingsWorkspacePath.textContent = result.workspacePath
    openWorkspaceButton.disabled = false
    careResult.textContent = `当前项目已切换为：\n${result.workspacePath}\n\n新任务会在这里运行。`
  }
}

for (const button of pageButtons) button.addEventListener('click', () => showPage(button.dataset.page))
themeToggle.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true))
newTaskButton.addEventListener('click', async () => {
  workbench = await window.desktopHost.selectTask('')
  await syncImageDrafts('new-task')
  showPage('workbench')
  forceFollowNextRender = false
  mainPanel.scrollTop = 0
  renderWorkbench()
  taskComposer.focus()
})
createTaskButton.addEventListener('click', createTask)
addImagesButton.addEventListener('click', async () => {
  addImagesButton.disabled = true
  try {
    imageDraftStatus.textContent = ''
    imageDrafts = await window.desktopHost.pickImages(composerScope())
    renderImageDrafts()
  } catch (error) {
    imageDraftStatus.textContent = `没有添加图片：${error.message}`
  } finally { addImagesButton.disabled = false }
})
ecosystemEnabled.addEventListener('change', async () => {
  ecosystemEnabled.disabled = true
  ecosystemSource.textContent = ecosystemEnabled.checked ? '正在读取 GitHub 的公开 topic 元数据…' : '正在关闭生态发现…'
  try { renderEcosystem(await window.desktopHost.setEcosystemEnabled(ecosystemEnabled.checked)) } catch (error) { ecosystemSource.textContent = `无法更新设置：${error.message}` }
  finally { ecosystemEnabled.disabled = false }
})
refreshEcosystemButton.addEventListener('click', async () => {
  refreshEcosystemButton.disabled = true
  ecosystemSource.textContent = '正在更新 GitHub 的公开项目元数据；不会启动 Engine 或调用模型…'
  try { renderEcosystem(await window.desktopHost.refreshEcosystem()) } catch (error) { ecosystemSource.textContent = `更新失败：${error.message}` }
  finally { refreshEcosystemButton.disabled = !ecosystemEnabled.checked }
})
refreshControlCenterButton.addEventListener('click', async () => {
  refreshControlCenterButton.disabled = true
  controlSkillStatus.textContent = '正在向本机 Harness 读取当前项目的 Skills 清单…'
  try { await refreshControlCenter() } catch (error) { controlSkillStatus.textContent = `刷新失败：${error.message}` }
  finally { refreshControlCenterButton.disabled = false }
})
mainPanel.addEventListener('scroll', updateJumpLatest, { passive: true })
jumpLatestButton.addEventListener('click', () => {
  mainPanel.scrollTo({ top: mainPanel.scrollHeight, behavior: 'smooth' })
})
showOutcomeEvidence.addEventListener('click', () => {
  setTaskView('trace')
  mainPanel.scrollTo({ top: 0, behavior: 'smooth' })
})
openRunDetailsButton.addEventListener('click', () => {
  if (!activeThread()) return
  setTaskView('trace')
  mainPanel.scrollTo({ top: 0, behavior: 'smooth' })
})
for (const button of taskViewButtons) button.addEventListener('click', () => {
  setTaskView(button.dataset.taskView)
  captureTaskViewState(workbench.activeThreadId)
  mainPanel.scrollTop = 0
})
activeTask.addEventListener('click', async (event) => {
  const link = event.target.closest('a')
  if (!link || !activeTask.contains(link)) return
  event.preventDefault()
  try {
    await window.desktopHost.openExternal(link.href)
  } catch (error) {
    taskEngineStatus.textContent = `没有打开链接：${error.message}`
    taskEngineStatus.dataset.state = 'error'
  }
})
explainProjectButton.addEventListener('click', async () => {
  explainProjectButton.disabled = true
  try { workbench = await window.desktopHost.createProjectBrief(); forceFollowNextRender = true; renderWorkbench() } catch (error) {
    taskEngineStatus.textContent = `无法开始项目说明：${error.message}`
    taskEngineStatus.dataset.state = 'error'
  } finally { explainProjectButton.disabled = false }
})
taskComposer.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') createTask() })
for (const button of document.querySelectorAll('[data-suggestion]')) button.addEventListener('click', () => { taskComposer.value = button.dataset.suggestion; taskComposer.focus() })
deleteTaskButton.addEventListener('click', async () => {
  const thread = activeThread()
  if (!thread || !window.confirm(`删除本机任务“${thread.title}”？这不会影响 Harness。`)) return
  try { workbench = await window.desktopHost.deleteTask(thread.id); taskViewState.clear(thread.id); renderWorkbench() } catch (error) { careResult.textContent = error.message }
})
async function stopActiveTask() {
  const thread = activeThread()
  if (!thread) return
  cancelTaskButton.disabled = true
  composerStopButton.disabled = true
  try { workbench = await window.desktopHost.cancelTask(thread.id); renderWorkbench() } catch (error) {
    taskEngineStatus.textContent = `无法停止：${error.message}`
    taskEngineStatus.dataset.state = 'error'
  } finally { composerStopButton.disabled = false }
}
cancelTaskButton.addEventListener('click', stopActiveTask)
composerStopButton.addEventListener('click', stopActiveTask)
retryTaskButton.addEventListener('click', async () => {
  const thread = activeThread()
  if (!thread) return
  retryTaskButton.disabled = true
  try { workbench = await window.desktopHost.retryTask(thread.id); forceFollowNextRender = true; renderWorkbench() } catch (error) {
    taskEngineStatus.textContent = `重试失败：${error.message}`
    taskEngineStatus.dataset.state = 'error'
  } finally { renderWorkbench() }
})
previewHandoffButton.addEventListener('click', async () => {
  try {
    const preview = await window.desktopHost.handoffPreview(workbench.activeThreadId)
    handoffText.textContent = preview.text
    handoffDialog.showModal()
  } catch (error) { careResult.textContent = error.message; showPage('settings') }
})
closeHandoffButton.addEventListener('click', () => handoffDialog.close())
handoffDialog.addEventListener('click', (event) => { if (event.target === handoffDialog) handoffDialog.close() })

selectButton.addEventListener('click', selectRuntimeNative)
startButton.addEventListener('click', () => safelyRenderStatus(() => window.desktopHost.start(pathInput.value)))
stopButton.addEventListener('click', () => safelyRenderStatus(() => window.desktopHost.stop()))
checkModelConnectionButton.addEventListener('click', async () => {
  await runVisibleAction({
    button: checkModelConnectionButton,
    status: modelCatalogSummary,
    working: '正在只读检查模型目录与凭据配置状态…',
    action: refreshModelConnection,
    success: () => modelCatalogSummary.textContent
  })
})
configureModelCredentialButton.addEventListener('click', () => {
  modelApiKey.value = ''
  updateCredentialProviderDescription()
  credentialDialog.showModal()
  modelApiKey.focus()
})
credentialProviderChoice.addEventListener('change', updateCredentialProviderDescription)
providerChoice.addEventListener('change', renderProviderChoices)
addModelProviderButton.addEventListener('click', () => {
  providerApiKey.value = ''
  renderProviderChoices()
  providerDialog.showModal()
  providerApiKey.focus()
})
cancelProviderDialog.addEventListener('click', () => {
  providerApiKey.value = ''
  providerDialog.close()
})
providerDialog.addEventListener('cancel', () => { providerApiKey.value = '' })
providerDialogForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const provider = providerChoice.value
  const value = providerApiKey.value
  if (!provider) { modelCredentialResult.textContent = '当前没有可添加的模型服务。'; return }
  if (!value) { providerApiKey.focus(); return }
  const submit = providerDialogForm.querySelector('[type="submit"]')
  submit.disabled = true
  modelCredentialResult.textContent = '正在创建 Provider Profile，并把 API Key 单向交给 Harness…'
  modelCredentialResult.dataset.state = 'working'
  try {
    const snapshot = await window.desktopHost.addModelProvider(provider, value)
    providerApiKey.value = ''
    providerDialog.close()
    renderModelConnection(snapshot)
    modelCredentialResult.textContent = '模型服务与凭据已经保存。下一步可创建一个可见的真实验证任务。'
    modelCredentialResult.dataset.state = 'success'
  } catch (error) {
    providerApiKey.value = ''
    modelCredentialResult.textContent = `没有完全添加：${error.message}\n\n输入框已清空。若提示 Profile 已创建，请刷新后使用“替换 API Key”重试，不要重复创建。`
    modelCredentialResult.dataset.state = 'error'
  } finally {
    submit.disabled = false
  }
})
cancelCredentialDialog.addEventListener('click', () => {
  modelApiKey.value = ''
  credentialDialog.close()
})
credentialDialog.addEventListener('cancel', () => { modelApiKey.value = '' })
credentialDialogForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const value = modelApiKey.value
  const provider = selectedCredentialProvider()
  if (!provider) { modelCredentialResult.textContent = '当前没有可写的 Provider API Key。'; return }
  if (!value) { modelApiKey.focus(); return }
  saveModelCredentialButton.disabled = true
  saveModelCredentialButton.setAttribute('aria-busy', 'true')
  modelCredentialResult.textContent = '正在把新的 API Key 单向交给本机 Harness…'
  modelCredentialResult.dataset.state = 'working'
  try {
    const snapshot = await window.desktopHost.saveModelCredential(provider.credential.ref, value)
    modelApiKey.value = ''
    credentialDialog.close()
    renderModelConnection(snapshot)
    modelCredentialResult.textContent = 'Harness 已接受并保存凭据。密钥内容未保存在 Deep code；可继续创建真实验证任务。'
    modelCredentialResult.dataset.state = 'success'
  } catch (error) {
    modelApiKey.value = ''
    modelCredentialResult.textContent = `没有保存：${error.message}\n\n输入框已清空，请检查后重新粘贴。`
    modelCredentialResult.dataset.state = 'error'
  } finally {
    saveModelCredentialButton.disabled = false
    saveModelCredentialButton.removeAttribute('aria-busy')
  }
})
clearModelCredentialButton.addEventListener('click', async () => {
  const provider = selectedCredentialProvider({ configuredOnly: true })
  if (!provider) return
  if (!window.confirm(`清除 Harness 中为 ${provider.name} 保存的 API Key？清除后，该 Provider 可能无法调用模型。`)) return
  clearModelCredentialButton.disabled = true
  modelCredentialResult.textContent = '正在请求 Harness 清除可写凭据…'
  let settled = false
  try {
    const snapshot = await window.desktopHost.clearModelCredential(provider.credential.ref)
    renderModelConnection(snapshot)
    settled = true
    modelCredentialResult.textContent = 'Harness 已清除可写凭据。Deep code 从未保存密钥副本。'
    modelCredentialResult.dataset.state = 'success'
  } catch (error) {
    modelCredentialResult.textContent = `没有清除：${error.message}`
    modelCredentialResult.dataset.state = 'error'
  } finally {
    if (!settled) clearModelCredentialButton.disabled = false
  }
})
verifyModelConnectionButton.addEventListener('click', async () => {
  if (!window.confirm('这会创建一个可见的“验证模型连接”任务并真实调用模型，可能产生极少量 token。继续吗？')) return
  verifyModelConnectionButton.disabled = true
  modelCredentialResult.textContent = '正在创建真实验证任务…'
  try {
    workbench = await window.desktopHost.createConnectionTest()
    renderWorkbench()
    showPage('workbench')
  } catch (error) {
    modelCredentialResult.textContent = `无法创建验证任务：${error.message}`
    modelCredentialResult.dataset.state = 'error'
  } finally {
    verifyModelConnectionButton.disabled = false
  }
})
inspectButton.addEventListener('click', async () => {
  await runVisibleAction({
    button: inspectButton,
    status: careResult,
    working: '正在检查 Engine 文件、依赖和构建结果…',
    action: () => window.desktopHost.inspectRuntime(pathInput.value),
    success: (report) => report.checks.map((check) => `[${check.state}] ${check.label}\n${check.detail}`).join('\n\n')
  })
})
selectWorkspaceButton.addEventListener('click', selectWorkspace)
sidebarSelectWorkspace.addEventListener('click', selectWorkspace)
openWorkspaceButton.addEventListener('click', async () => {
  await runVisibleAction({
    button: openWorkspaceButton,
    status: careResult,
    working: '正在打开当前工作区…',
    action: () => window.desktopHost.openWorkspace(),
    success: (result) => `已在文件资源管理器中打开：\n${result.workspacePath}`
  })
})
function openWorkspaceDialog(trigger = workspaceButton) {
  workspaceDialogTrigger = trigger
  workspaceDialogName.value = '我的第一个项目'
  workspaceDialog.showModal()
  workspaceDialogName.select()
}
workspaceButton.addEventListener('click', () => openWorkspaceDialog(workspaceButton))
sidebarCreateWorkspace.addEventListener('click', () => openWorkspaceDialog(sidebarCreateWorkspace))
cancelWorkspaceDialog.addEventListener('click', () => workspaceDialog.close())
workspaceDialogForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const name = workspaceDialogName.value
  workspaceDialog.close()
  const result = await runVisibleAction({
    button: workspaceDialogTrigger,
    status: careResult,
    working: '正在创建独立工作区和新手文档…',
    action: () => window.desktopHost.createSafeWorkspace(name),
    success: (result) => `${result.message}\n${result.path}\n\n已生成：\n${result.files.join('\n')}`
  })
  if (result) await refreshWorkspace()
})
diagnosticsButton.addEventListener('click', async () => {
  const result = await window.desktopHost.exportDiagnostics()
  careResult.textContent = result.canceled ? '未导出诊断包。' : `${result.message}\n${result.path}`
})
skipSetupButton.addEventListener('click', () => showPage('workbench'))
finishSetupButton.addEventListener('click', () => showPage('workbench'))
setupSelectRuntime.addEventListener('click', selectRuntimeNative)
setupDetectRuntime.addEventListener('click', async () => {
  await runVisibleAction({
    button: setupDetectRuntime,
    status: setupProgress,
    working: '正在检查已保存位置、桌面和 Deep code Runtime 目录…',
    action: async () => {
      const result = await window.desktopHost.autoDetectRuntime()
      renderRuntime(await window.desktopHost.status())
      return result
    },
    success: (result) => result.found
      ? `已找到 Deep code Engine：\n${result.runtimePath}\n\n这一步已经完成。`
      : '没有在默认位置找到 Engine。你可以手动定位已有文件夹，或使用下一步自动安装。'
  })
})
setupInstallRuntime.addEventListener('click', async () => {
  await runVisibleAction({
    button: setupInstallRuntime,
    status: setupProgress,
    working: '正在准备 Engine。第一次下载和构建可能需要几分钟，进度会继续显示在这里…',
    action: async () => {
      const result = await window.desktopHost.provisionRuntime()
      renderRuntime(await window.desktopHost.status())
      return result
    },
    success: (result) => `Engine 已安装完成：\n${result.runtimePath}\n\n这一步已经完成。`
  })
})
setupCreateWorkspace.addEventListener('click', async () => {
  const result = await runVisibleAction({
    button: setupCreateWorkspace,
    status: setupProgress,
    working: '正在创建独立工作区和新手文档…',
    action: () => window.desktopHost.createSafeWorkspace(setupWorkspaceName.value),
    success: (result) => `${result.message}\n${result.path}\n\n已生成：\n${result.files.join('\n')}\n\n这一步已经完成。`
  })
  if (result) await refreshWorkspace()
})
setupCheckModel.addEventListener('click', async () => {
  await runVisibleAction({
    button: setupCheckModel,
    status: setupProgress,
    working: '正在启动 Engine，并只读检查模型目录与凭据状态…',
    action: async () => {
      const status = await window.desktopHost.status()
      if (status.state !== 'ready') await window.desktopHost.start(status.runtimePath)
      const snapshot = await refreshModelConnection()
      return snapshot
    },
    success: (snapshot) => `${snapshot.title}\n${snapshot.message}\n\n这一步${snapshot.state === 'ready' ? '已经完成。' : '还需要处理。'}`
  })
})

window.desktopHost.onStatus(renderRuntime)
window.desktopHost.onWorkbenchChanged(() => {
  refreshWorkbench().catch((error) => { careResult.textContent = error.message })
})
window.desktopHost.onSetupProgress((line) => {
  if (!line) return
  setupProgress.textContent = `${setupProgress.textContent}\n${line}`.trim()
  setupProgress.scrollTop = setupProgress.scrollHeight
})
window.desktopHost.status().then((status) => {
  renderRuntime(status)
  if (!status.runtimePath) showPage('setup')
})
refreshWorkbench().then(() => syncImageDrafts()).catch((error) => { careResult.textContent = error.message })
refreshWorkspace().catch((error) => { careResult.textContent = error.message })
refreshEcosystemStatus().catch((error) => { ecosystemSource.textContent = error.message })
refreshControlCenter().catch((error) => { controlSkillStatus.textContent = error.message })

setInterval(async () => {
  const thread = activeThread()
  if (!thread?.sessionId || thread.engineState !== 'running') return
  // 等待你的回答时暂停自动刷新；否则整棵 Decision Gate DOM 会被替换，已选选项和输入文字会丢失。
  if (thread.agent?.live?.interactions?.length) return
  try { await refreshWorkbench() } catch { /* Keep the last readable state visible. */ }
}, 1500)
