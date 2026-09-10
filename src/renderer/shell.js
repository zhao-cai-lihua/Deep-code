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
const applyModelRouteButton = document.querySelector('#apply-model-route')
const modelRoutePurposeCopy = document.querySelector('#model-route-purpose')
const modelChoice = document.querySelector('#model-choice')
const modelChoiceDescription = document.querySelector('#model-choice-description')
const effortChoice = document.querySelector('#effort-choice')
const effortChoiceDescription = document.querySelector('#effort-choice-description')
const cancelModelRoute = document.querySelector('#cancel-model-route')
const emptyTask = document.querySelector('#empty-task')
const activeTask = document.querySelector('#active-task')
const activeTaskTitle = document.querySelector('#active-task-title')
const activeTaskWorkspace = document.querySelector('#active-task-workspace')
const useTaskWorkspaceButton = document.querySelector('#use-task-workspace')
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
const taskGuidance = document.querySelector('#task-guidance')
const taskGuidanceTitle = document.querySelector('#task-guidance-title')
const taskGuidanceSummary = document.querySelector('#task-guidance-summary')
const taskGuidanceActions = document.querySelector('#task-guidance-actions')
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
const taskEvidenceRaw = document.querySelector('#task-evidence-raw')
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
const confirmSharedEngineButton = document.querySelector('#confirm-shared-engine')
const startManagedEngineButton = document.querySelector('#start-managed-engine')
const engineTrustNote = document.querySelector('#engine-trust-note')
const stopButton = document.querySelector('#stop')
const label = document.querySelector('#status-label')
const message = document.querySelector('#status-message')
const dot = document.querySelector('#status-dot')
const logs = document.querySelector('#logs')
const inspectButton = document.querySelector('#inspect')
const workspaceButton = document.querySelector('#create-workspace')
const sidebarCreateWorkspace = document.querySelector('#sidebar-create-workspace')
const sidebarSelectWorkspace = document.querySelector('#sidebar-select-workspace')
const sidebarOpenWorkspace = document.querySelector('#sidebar-open-workspace')
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
const refreshModelServicesButton = document.querySelector('#refresh-model-services')
const modelServicesTitle = document.querySelector('#model-services-title')
const modelServicesMessage = document.querySelector('#model-services-message')
const modelServicesStatus = document.querySelector('#model-services-status')
const modelServicesList = document.querySelector('#model-services-list')
const manageModelServicesButton = document.querySelector('#manage-model-services')
const verifyModelServiceButton = document.querySelector('#verify-model-service')
const credentialDialog = document.querySelector('#credential-dialog')
const credentialDialogForm = document.querySelector('#credential-dialog-form')
const credentialProviderChoice = document.querySelector('#credential-provider-choice')
const credentialProviderDescription = document.querySelector('#credential-provider-description')
const modelApiKey = document.querySelector('#model-api-key')
const saveModelCredentialButton = document.querySelector('#save-model-credential')
const removeModelProviderButton = document.querySelector('#remove-model-provider')
const cancelCredentialDialog = document.querySelector('#cancel-credential-dialog')
const providerDialog = document.querySelector('#provider-dialog')
const providerDialogForm = document.querySelector('#provider-dialog-form')
const providerChoice = document.querySelector('#provider-choice')
const providerChoiceDescription = document.querySelector('#provider-choice-description')
const providerApiKey = document.querySelector('#provider-api-key')
const saveModelProviderButton = document.querySelector('#save-model-provider')
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
const memoryForm = document.querySelector('#memory-form')
const memoryKind = document.querySelector('#memory-kind')
const memoryScope = document.querySelector('#memory-scope')
const memoryTitle = document.querySelector('#memory-title')
const memoryContent = document.querySelector('#memory-content')
const memoryReason = document.querySelector('#memory-reason')
const memoryLimits = document.querySelector('#memory-limits')
const memoryStatus = document.querySelector('#memory-status')
const memoryCandidateCount = document.querySelector('#memory-candidate-count')
const memoryConfirmedCount = document.querySelector('#memory-confirmed-count')
const memoryCandidateList = document.querySelector('#memory-candidate-list')
const memoryConfirmedList = document.querySelector('#memory-confirmed-list')
const openMemoryFolderButton = document.querySelector('#open-memory-folder')
const memoryPreviewQuery = document.querySelector('#memory-preview-query')
const previewMemoryButton = document.querySelector('#preview-memory')
const memoryPreviewStatus = document.querySelector('#memory-preview-status')
const memoryPreviewResults = document.querySelector('#memory-preview-results')
const composeMemoryPreviewButton = document.querySelector('#compose-memory-preview')
const memoryContextPreview = document.querySelector('#memory-context-preview')
const memoryContextSummary = document.querySelector('#memory-context-summary')
const memoryContextText = document.querySelector('#memory-context-text')

let workbench = { threads: [], activeThreadId: '' }
const workbenchRefreshGate = window.DeepCodeWorkbenchRefreshGate.createWorkbenchRefreshGate()
const runLatestWorkbenchRequest = window.DeepCodeWorkbenchRefreshGate.runLatestWorkbenchRequest
const composerDraftState = window.DeepCodeComposerDraftState.createComposerDraftState('new-task')

function composerTextScope(snapshot = workbench) {
  return String(snapshot?.activeThreadId || 'new-task')
}

function replaceWorkbench(next) {
  workbenchRefreshGate.invalidate()
  taskComposer.value = composerDraftState.switchTo(composerTextScope(next), taskComposer.value)
  workbench = next
  return workbench
}
let currentWorkspacePath = ''
let pendingProviderRemoval = ''
let providerRemovalTimer = null
let providerSaveTimer = null
let lastRuntimeState = ''
let lastRenderedThreadId = ''
let forceFollowNextRender = true
const taskViewState = window.DeepCodeTaskViewState.createTaskViewState()
const providerProvisioningFlow = window.DeepCodeProviderProvisioningFlow.createProviderProvisioningFlow()
const { modelConnectionLines } = window.DeepCodeModelConnectionView
const modelServicesView = window.DeepCodeModelServicesView.createModelServicesView({
  document,
  elements: {
    title: modelServicesTitle,
    message: modelServicesMessage,
    status: modelServicesStatus,
    list: modelServicesList,
    verifyAllButton: verifyModelServiceButton
  },
  onVerifyProvider: openProviderVerification
})
const conversationMessageView = window.DeepCodeConversationMessageView.createConversationMessageView({
  document,
  renderMarkdown: (container, source) => window.deepCodeMarkdown.renderInto(container, source),
  copyText: (value) => window.desktopHost.copyText(value),
  formatImageBytes: imageBytes
})
const taskEvidenceView = window.DeepCodeTaskEvidenceView.createTaskEvidenceView({
  document,
  elements: {
    trace: {
      label: runDetailsLabel,
      permissionFacts,
      changedFiles,
      toolCards: toolCardsContainer,
      evidenceContent: taskEvidenceContent,
      evidenceRaw: taskEvidenceRaw
    },
    receipt: {
      outcome: taskOutcome,
      title: taskOutcomeTitle,
      badge: taskOutcomeBadge,
      summary: taskOutcomeSummary,
      sections: taskOutcomeSections,
      map: outcomeMap,
      mapFlow: outcomeMapFlow,
      mapLegend: outcomeMapLegend,
      mapEmpty: outcomeMapEmpty
    },
    guidance: {
      root: taskGuidance,
      title: taskGuidanceTitle,
      summary: taskGuidanceSummary,
      actions: taskGuidanceActions
    }
  },
  formatDuration: displayDuration,
  onGuidanceAction: runGuidanceAction,
  onEvidenceTarget: openTaskEvidenceTarget
})
let imageDrafts = []
let workspaceDialogTrigger = workspaceButton
let modelCatalog = { current: null, groups: [] }
let manualModelSelection = null
let modelConnectionState = { activeProviders: [] }
let selectedMemoryIds = new Set()
let lastMemoryPreviewQuery = ''
let modelRoutePurpose = 'task'

function catalogModels() {
  return (modelCatalog.groups || []).flatMap((group) => (group.models || []).map((model) => ({ ...model, provider: group.id, providerName: group.name })))
}

function updateModelRouteButton() {
  if (!manualModelSelection) { modelRouteButton.textContent = '模型：Harness 当前设置'; return }
  const model = catalogModels().find((item) => item.provider === manualModelSelection.provider && item.id === manualModelSelection.model)
  const effort = manualModelSelection.reasoningEffort ? ` · ${manualModelSelection.reasoningEffort}` : ''
  modelRouteButton.textContent = `模型：${model?.name || manualModelSelection.model}${effort}`
}

function selectedChoiceValue(container) {
  return container.querySelector('[role="radio"][aria-checked="true"]')?.dataset.value || ''
}

function selectChoice(container, value) {
  for (const choice of container.querySelectorAll('[role="radio"]')) {
    const selected = choice.dataset.value === value
    choice.setAttribute('aria-checked', selected ? 'true' : 'false')
    choice.classList.toggle('is-selected', selected)
  }
}

function createChoice(label, value) {
  const choice = document.createElement('button')
  choice.type = 'button'
  choice.className = 'route-choice-option'
  choice.setAttribute('role', 'radio')
  choice.setAttribute('aria-checked', 'false')
  choice.dataset.value = value
  choice.textContent = label
  return choice
}

function selectedCatalogModel() {
  const value = selectedChoiceValue(modelChoice)
  return catalogModels().find((item) => `${item.provider}\u0000${item.id}` === value)
}

function renderEffortChoices(preferred = '') {
  const model = selectedCatalogModel()
  const efforts = model?.reasoning?.efforts || []
  effortChoice.replaceChildren(createChoice('模型默认', ''))
  for (const effort of efforts) effortChoice.append(createChoice(effort.name || effort.id, effort.id))
  const availableValues = new Set(['', ...efforts.map((effort) => effort.id)])
  selectChoice(effortChoice, availableValues.has(preferred) ? preferred : '')
  effortChoice.setAttribute('aria-disabled', !model || !efforts.length ? 'true' : 'false')
  for (const choice of effortChoice.querySelectorAll('[role="radio"]')) choice.disabled = !model || !efforts.length
  const selected = efforts.find((item) => item.id === selectedChoiceValue(effortChoice))
  effortChoiceDescription.textContent = selected?.description
    || (model?.reasoning?.defaultEffort ? `模型默认：${model.reasoning.defaultEffort}` : '该模型没有公布可调推理强度，将使用 Provider 默认值。')
}

function renderModelChoices() {
  modelChoice.replaceChildren(createChoice('沿用 Harness 当前设置', ''))
  for (const group of modelCatalog.groups || []) {
    const heading = document.createElement('p')
    heading.className = 'route-choice-group'
    heading.textContent = group.name || group.id
    modelChoice.append(heading)
    for (const model of group.models || []) modelChoice.append(createChoice(model.name || model.id, `${group.id}\u0000${model.id}`))
  }
  const preferred = manualModelSelection ? `${manualModelSelection.provider}\u0000${manualModelSelection.model}` : ''
  const availableValues = new Set([...modelChoice.querySelectorAll('[role="radio"]')].map((choice) => choice.dataset.value))
  selectChoice(modelChoice, availableValues.has(preferred) ? preferred : '')
  const model = selectedCatalogModel()
  modelChoiceDescription.textContent = model?.description || (model ? `${model.providerName} · ${model.id}` : '不指定模型；沿用当前 Session 的模型与推理强度。')
  renderEffortChoices(manualModelSelection?.reasoningEffort || '')
}

async function openModelRouteDialog() {
  modelRoutePurpose = 'task'
  applyModelRouteButton.textContent = '应用到后续消息'
  modelRoutePurposeCopy.textContent = '列表和当前选择都来自 Harness。选择“沿用 Harness 当前设置”时，Deep code 不会根据任务文字替你切换模型或提高推理强度。'
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

modelChoice.addEventListener('click', (event) => {
  const choice = event.target.closest('[role="radio"]')
  if (!choice) return
  selectChoice(modelChoice, choice.dataset.value)
  const model = selectedCatalogModel()
  modelChoiceDescription.textContent = model?.description || (model ? `${model.providerName} · ${model.id}` : '不指定模型；Deep code 不会自动切换。')
  renderEffortChoices('')
})
effortChoice.addEventListener('click', (event) => {
  const choice = event.target.closest('[role="radio"]')
  if (!choice || choice.disabled) return
  selectChoice(effortChoice, choice.dataset.value)
  renderEffortChoices(choice.dataset.value)
})
modelRouteButton.addEventListener('click', openModelRouteDialog)
cancelModelRoute.addEventListener('click', () => modelRouteDialog.close())
modelRouteForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const model = selectedCatalogModel()
  const selection = model ? {
    provider: model.provider,
    model: model.id,
    ...(selectedChoiceValue(effortChoice) ? { reasoningEffort: selectedChoiceValue(effortChoice) } : {})
  } : null
  if (modelRoutePurpose === 'verification') {
    if (!selection) { modelChoiceDescription.textContent = '验证必须明确选择一个模型。'; return }
    modelRouteDialog.close()
    await createVisibleConnectionTest(verifyModelServiceButton, modelServicesStatus, { manualSelection: selection })
    return
  }
  manualModelSelection = selection
  updateModelRouteButton()
  modelRouteDialog.close()
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
  if (name === 'memory') refreshMemory().catch((error) => { memoryStatus.textContent = `无法读取记忆：${error.message}` })
  if (name === 'model-services') refreshModelServices().catch((error) => { modelServicesStatus.textContent = `无法读取：${error.message}` })
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
  const stateLabel = ({ stopped: '尚未启动', starting: '正在启动', probing: '正在验证', 'awaiting-user': '等待你确认', incompatible: '版本不兼容', ready: '已就绪', stopping: '正在停止', error: '启动失败' })[status.state] || status.state
  label.textContent = stateLabel
  message.textContent = status.message || ''
  dot.className = `status-dot ${status.state}`
  runtimeDot.className = `status-dot ${status.state}`
  runtimeShort.textContent = status.state === 'ready' ? 'Engine 已连接' : `Engine ${stateLabel}`
  startButton.disabled = ['starting', 'probing', 'ready', 'awaiting-user'].includes(status.state) || !pathInput.value
  confirmSharedEngineButton.classList.toggle('hidden', status.state !== 'awaiting-user')
  startManagedEngineButton.classList.toggle('hidden', !['awaiting-user', 'incompatible'].includes(status.state))
  confirmSharedEngineButton.disabled = status.state !== 'awaiting-user'
  startManagedEngineButton.disabled = !['awaiting-user', 'incompatible'].includes(status.state)
  stopButton.disabled = !['starting', 'probing', 'ready', 'stopping'].includes(status.state)
  engineTrustNote.textContent = status.kind === 'shared'
    ? '共享 Engine 不是由 Deep Code 启动，无法进行密码学身份认证，也无法控制它继承的环境变量。确认只适用于当前地址、版本和工作目录。'
    : '托管 Engine 会使用净化后的环境变量；桌面环境中的 API Key 不会被自动继承。请在“模型服务”中保存凭据。'
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
    install.className = 'quiet-button'
    install.textContent = '安装暂时暂停'
    install.title = '等待 Engine 信任与插件权限底座完成；你仍可查看上游源码和官方说明。'
    install.disabled = true
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

function memoryScopeLabel(scope) {
  if (scope === 'global') return '所有项目'
  if (!String(scope || '').startsWith('project:')) return '未知范围'
  const path = String(scope).slice('project:'.length)
  return `项目：${path.split(/[\\/]/).filter(Boolean).at(-1) || '当前项目'}`
}

function memoryKindLabel(kind) {
  return ({ preference: '协作偏好', decision: '项目决定', handoff: '交接事实', learning: '验证经验' })[kind] || '记忆'
}

function createMemoryCard(record, status) {
  const card = document.createElement('article')
  card.className = 'memory-card'
  const heading = document.createElement('div')
  heading.className = 'ecosystem-card-heading'
  const title = document.createElement('h3')
  title.textContent = record.title
  const badge = document.createElement('span')
  badge.textContent = `${memoryKindLabel(record.kind)} · ${memoryScopeLabel(record.scope)}`
  heading.append(title, badge)
  const content = document.createElement('p')
  content.textContent = record.content
  const details = document.createElement('details')
  const summary = document.createElement('summary')
  summary.textContent = '查看来源、保留理由与例外'
  const reason = document.createElement('p')
  reason.textContent = `为什么保留：${record.reason}`
  const limits = document.createElement('p')
  limits.textContent = `不适用范围：${record.limits}`
  const source = document.createElement('p')
  source.textContent = `来源：${(record.sourceRefs || []).join('、') || '未注明'}`
  details.append(summary, reason, limits, source)
  const actions = document.createElement('div')
  actions.className = 'button-row'
  if (status === 'candidate') {
    const confirm = document.createElement('button')
    confirm.type = 'button'
    confirm.className = 'primary-button'
    confirm.textContent = '确认保留'
    confirm.addEventListener('click', async () => {
      confirm.disabled = true
      try { renderMemory(await window.desktopHost.reviewMemoryCandidate(record.id, 'confirmed')); memoryStatus.textContent = '已确认。它仍未接入任务提示词。' }
      catch (error) { memoryStatus.textContent = `没有确认：${error.message}`; confirm.disabled = false }
    })
    const reject = document.createElement('button')
    reject.type = 'button'
    reject.className = 'quiet-button'
    reject.textContent = '拒绝'
    reject.addEventListener('click', async () => {
      reject.disabled = true
      try { renderMemory(await window.desktopHost.reviewMemoryCandidate(record.id, 'rejected')); memoryStatus.textContent = '已拒绝并移入本地归档。' }
      catch (error) { memoryStatus.textContent = `没有拒绝：${error.message}`; reject.disabled = false }
    })
    actions.append(confirm, reject)
  }
  const remove = document.createElement('button')
  remove.type = 'button'
  remove.className = 'danger-button'
  remove.textContent = '删除'
  remove.addEventListener('click', async () => {
    if (remove.dataset.confirm !== 'true') {
      remove.dataset.confirm = 'true'
      remove.textContent = '再次点击确认删除'
      setTimeout(() => { remove.dataset.confirm = ''; remove.textContent = '删除' }, 10000)
      return
    }
    remove.disabled = true
    try { renderMemory(await window.desktopHost.removeMemory(record.id)); memoryStatus.textContent = '已从本机永久删除这条记忆。' }
    catch (error) { memoryStatus.textContent = `没有删除：${error.message}`; remove.disabled = false }
  })
  actions.append(remove)
  card.append(heading, content, details, actions)
  return card
}

function renderMemory(snapshot) {
  memoryCandidateList.replaceChildren()
  memoryConfirmedList.replaceChildren()
  memoryCandidateCount.textContent = `${snapshot.candidates.length} 项`
  memoryConfirmedCount.textContent = `${snapshot.confirmed.length} 项`
  for (const record of snapshot.candidates) memoryCandidateList.append(createMemoryCard(record, 'candidate'))
  for (const record of snapshot.confirmed) memoryConfirmedList.append(createMemoryCard(record, 'confirmed'))
  if (!snapshot.candidates.length) memoryCandidateList.textContent = '收件箱是空的。只有你主动保存的内容才会出现在这里。'
  if (!snapshot.confirmed.length) memoryConfirmedList.textContent = '还没有已确认记忆。'
  memoryStatus.textContent = snapshot.enginePromptConnected
    ? '已确认记忆可能用于任务。'
    : `候选和已确认记忆均未接入 Engine Prompt。另有 ${snapshot.rejectedCount || 0} 条拒绝记录保存在本地归档。`
  selectedMemoryIds = new Set()
  lastMemoryPreviewQuery = ''
  memoryPreviewResults.replaceChildren()
  composeMemoryPreviewButton.disabled = true
  memoryContextPreview.classList.add('hidden')
}

async function refreshMemory() {
  renderMemory(await window.desktopHost.memorySnapshot())
}

function renderMemoryPreview(preview) {
  memoryPreviewResults.replaceChildren()
  selectedMemoryIds = new Set(preview.matches.map((match) => match.id))
  lastMemoryPreviewQuery = preview.query
  memoryContextPreview.classList.add('hidden')
  if (!preview.matches.length) {
    memoryPreviewResults.textContent = `检查了 ${preview.eligibleCount} 条适用记忆，没有找到明确的文字匹配。没有内容会被加入任务。`
  } else {
    for (const match of preview.matches) {
      const card = document.createElement('article')
      card.className = 'memory-preview-card'
      const choice = document.createElement('label')
      choice.className = 'memory-preview-choice'
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = true
      checkbox.value = match.id
      const title = document.createElement('strong')
      title.textContent = match.title
      choice.append(checkbox, title)
      const reason = document.createElement('p')
      reason.textContent = match.reasons.join('；')
      const content = document.createElement('p')
      content.textContent = match.content
      const limits = document.createElement('small')
      limits.textContent = `例外：${match.limits}`
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedMemoryIds.add(match.id)
        else selectedMemoryIds.delete(match.id)
        composeMemoryPreviewButton.disabled = selectedMemoryIds.size === 0
        memoryContextPreview.classList.add('hidden')
      })
      card.append(choice, reason, content, limits)
      memoryPreviewResults.append(card)
    }
  }
  memoryPreviewStatus.textContent = `本机规则检查了 ${preview.consideredCount} 条已确认记忆，其中 ${preview.eligibleCount} 条作用域适用，找到 ${preview.matches.length} 条候选；约 ${preview.estimatedCharacters} 个字符。没有调用模型，也没有修改任务。`
  composeMemoryPreviewButton.disabled = selectedMemoryIds.size === 0
}

function renderModelConnection(snapshot) {
  modelConnectionState = snapshot
  modelStatusDot.className = `status-dot ${snapshot.state}`
  modelStatusLabel.textContent = snapshot.title
  modelStatusMessage.textContent = snapshot.message
  modelCatalogSummary.textContent = modelConnectionLines(snapshot).join('\n')
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

function updateProviderChoiceDescription() {
  const providers = modelConnectionState.provisioning?.providers || []
  const selected = providers.find((provider) => provider.id === providerChoice.value) || providers[0]
  const view = providerProvisioningFlow.view(selected)
  providerChoiceDescription.textContent = view.description
  saveModelProviderButton.textContent = view.buttonLabel
}

function resetProviderSaveConfirmation() {
  providerProvisioningFlow.reset()
  if (providerSaveTimer) clearTimeout(providerSaveTimer)
  providerSaveTimer = null
  updateProviderChoiceDescription()
}

function renderProviderChoices() {
  const providers = modelConnectionState.provisioning?.providers || []
  const previousProvider = providerChoice.value
  providerChoice.replaceChildren(...providers.map((provider) => new Option(provider.name, provider.id)))
  if (providers.some((provider) => provider.id === previousProvider)) providerChoice.value = previousProvider
  updateProviderChoiceDescription()
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
    ? `${provider.name} · ${provider.credential.ref} · ${provider.credential.configured ? '有已保存值，可替换；Deep code 不读取密钥内容' : '尚未保存凭据'}`
    : '当前没有 Harness 允许 Deep code 写入的简单 API Key。'
  removeModelProviderButton.disabled = !provider?.removable
}

function resetProviderRemovalConfirmation() {
  pendingProviderRemoval = ''
  if (providerRemovalTimer) clearTimeout(providerRemovalTimer)
  providerRemovalTimer = null
  removeModelProviderButton.textContent = '移除此模型服务'
}

async function refreshModelConnection() {
  const snapshot = await window.desktopHost.modelConnection()
  renderModelConnection(snapshot)
  return snapshot
}

async function refreshModelServices() {
  const snapshot = await window.desktopHost.modelServicesSnapshot()
  modelServicesView.render(snapshot)
  return snapshot
}

async function openProviderVerification(providerId, trigger) {
  trigger.disabled = true
  modelServicesStatus.textContent = `正在读取 ${providerId} 的可验证模型…`
  try {
    const catalog = await window.desktopHost.modelRoutingCatalog('')
    const group = (catalog.groups || []).find((item) => item.id === providerId)
    if (!group?.models?.length) throw new Error('Harness 没有为这个 Provider 公布可选择模型。')
    modelCatalog = { ...catalog, groups: [group] }
    modelRoutePurpose = 'verification'
    manualModelSelection = null
    renderModelChoices()
    const first = group.models[0]
    selectChoice(modelChoice, `${group.id}\u0000${first.id}`)
    modelChoiceDescription.textContent = first.description || `${group.name} · ${first.id}`
    renderEffortChoices(first.reasoning?.defaultEffort || '')
    applyModelRouteButton.textContent = '用这个模型创建验证任务'
    modelRoutePurposeCopy.textContent = '这会创建一个可见任务，真实调用你选择的这个模型，并可能产生极少量 token。模型列表和推理强度均来自 Harness。'
    modelRouteDialog.showModal()
    modelServicesStatus.textContent = `请选择要真实验证的 ${group.name} 模型与推理强度。`
  } catch (error) { modelServicesStatus.textContent = `无法准备验证：${error.message}` }
  finally { trigger.disabled = false }
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

function updateJumpLatest() {
  const visible = workbenchPage.classList.contains('is-active') && Boolean(activeThread())
  jumpLatestButton.classList.toggle('hidden', !visible || window.deepCodeReading.shouldFollow(mainPanel))
}


async function startNewTask() {
  if (modelRouteDialog.open) modelRouteDialog.close()
  const next = await runLatestWorkbenchRequest({
    gate: workbenchRefreshGate,
    expected: { taskId: '', sessionId: '' },
    request: () => window.desktopHost.selectTask('')
  })
  if (!next) return
  replaceWorkbench(next)
  await syncImageDrafts('new-task')
  showPage('workbench')
  forceFollowNextRender = false
  mainPanel.scrollTop = 0
  renderWorkbench()
  taskComposer.focus()
}

function runGuidanceAction(id) {
  if (id === 'retry-task') { retryTaskButton.click(); return }
  if (id === 'open-model-services') { showPage('model-services'); return }
  if (id === 'choose-model') { openModelRouteDialog(); return }
  if (id === 'open-settings') { showPage('settings'); return }
  if (id === 'open-trace') { setTaskView('trace'); runDetails.scrollIntoView({ behavior: 'smooth', block: 'start' }); return }
  if (id === 'open-receipt') { setTaskView('receipt'); receiptView.scrollIntoView({ behavior: 'smooth', block: 'start' }); return }
  if (id === 'new-task') startNewTask().catch((error) => { careResult.textContent = error.message; showPage('settings') })
}

function openTaskEvidenceTarget(evidenceTarget) {
  setTaskView('trace')
  const selector = { changes: '#trace-changes', tools: '#trace-tools', technical: '.technical-details' }[evidenceTarget] || '#run-details'
  const target = document.querySelector(selector)
  if (target?.tagName === 'DETAILS') target.open = true
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
    replaceWorkbench(await window.desktopHost.respondToInteraction(thread.id, response))
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
        if (modelRouteDialog.open) modelRouteDialog.close()
        const next = await runLatestWorkbenchRequest({
          gate: workbenchRefreshGate,
          expected: { taskId: thread.id, sessionId: thread.sessionId },
          request: () => window.desktopHost.selectTask(thread.id)
        })
        if (!next) return
        replaceWorkbench(next)
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
    activeTaskWorkspace.textContent = thread.workspacePath ? `此任务的项目：${thread.workspacePath}` : '此任务尚未记录项目。'
    activeTaskWorkspace.title = thread.workspacePath || ''
    useTaskWorkspaceButton.classList.toggle('hidden', !thread.workspacePath || thread.workspacePath === currentWorkspacePath)
    const agentMessages = thread.agent?.messages || []
    const hasHumanMessage = agentMessages.some((message) => message.role === 'user')
    activeTaskPrompt.classList.toggle('hidden', hasHumanMessage)
    activeTaskPrompt.textContent = thread.prompt
      ? `待发送的任务目标：${thread.prompt}`
      : '待发送的任务只有图片。'
    const terminalFailure = thread.agent?.runDetails?.terminal?.failure
    const terminalFailureCopy = terminalFailure
      ? `${terminalFailure.title}。${terminalFailure.detail} 下一步：${terminalFailure.nextAction}`
      : ''
    const labels = {
      draft: '任务已保存，等待连接 Engine。',
      queued: 'Harness 已接收消息，正在等待这一轮开始。',
      running: 'Deep code 正在处理。结果会自动更新。',
      ready: '这一轮已经完成。你可以继续追问，或展开技术证据。',
      unknown: 'Deep code 当前没有足够事件确认这一轮是否结束；不会把空闲误报成完成。',
      error: `没有完成：${terminalFailureCopy || thread.engineError || 'Engine 返回了未知错误。'}`
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
    const recovery = thread.outcome?.visible ? (thread.outcome.recovery || null) : thread.recovery
    taskRecovery.classList.toggle('hidden', !recovery)
    taskRecoveryCause.textContent = recovery ? `原因：${recovery.cause}` : ''
    taskRecoverySafety.textContent = recovery ? `状态边界：${recovery.safety}` : ''
    taskRecoveryNext.textContent = recovery ? `下一步：${recovery.nextAction}` : ''
    cancelTaskButton.disabled = !['queued', 'running'].includes(thread.engineState)
    composerStopButton.classList.toggle('hidden', !['queued', 'running'].includes(thread.engineState))
    const canRetry = ['draft', 'unknown', 'error'].includes(thread.engineState)
    retryTaskButton.classList.remove('hidden')
    retryTaskButton.disabled = !canRetry
    retryTaskButton.textContent = canRetry
      ? (hasHumanMessage ? '重新连接任务' : '重新发送任务')
      : (['queued', 'running'].includes(thread.engineState) ? '正在处理' : '已连接，无需重试')
    conversationFeed.replaceChildren()
    for (const item of agentMessages) {
      conversationFeed.append(conversationMessageView.render({ role: item.role, text: item.text, images: item.images || [] }))
    }
    const draft = thread.agent?.live?.draft
    if (draft?.text) {
      conversationFeed.append(conversationMessageView.render({ role: 'assistant', text: draft.text, draft: true, truncated: draft.truncated }))
    }
    taskEvidenceView.render(thread)
    restoreTaskViewState(selectedThreadId)
  } else {
    decisionGates.replaceChildren()
    activityList.replaceChildren()
    activityTimeline.classList.add('hidden')
    taskOutcome.classList.add('hidden')
    taskRecovery.classList.add('hidden')
    taskGuidance.classList.add('hidden')
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
  const current = activeThread()
  const ticket = workbenchRefreshGate.begin({ taskId: workbench.activeThreadId, sessionId: current?.sessionId })
  const next = await window.desktopHost.workbenchSnapshot()
  const visible = activeThread()
  if (!workbenchRefreshGate.accept(ticket, { taskId: workbench.activeThreadId, sessionId: visible?.sessionId })) return false
  workbench = next
  renderWorkbench()
  return true
}

async function createTask() {
  const prompt = taskComposer.value.trim()
  if (!prompt && !imageDrafts.length) { taskComposer.focus(); return }
  const sourceComposerScope = composerTextScope()
  try {
    createTaskButton.disabled = true
    taskComposer.disabled = true
    modelRouteButton.disabled = true
    const thread = activeThread()
    const attachmentIds = imageDrafts.map((draft) => draft.id)
    const routing = { manualSelection: manualModelSelection }
    const nextWorkbench = thread?.sessionId
      ? await window.desktopHost.sendMessage(thread.id, prompt, attachmentIds, routing)
      : await window.desktopHost.createTask({ prompt, attachmentScope: composerScope(), attachmentIds, routing })
    replaceWorkbench(nextWorkbench)
    composerDraftState.clear(sourceComposerScope)
    composerDraftState.clear(composerTextScope())
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
  currentWorkspacePath = result.workspacePath || ''
  renderWorkspace(result.workspacePath)
  settingsWorkspacePath.textContent = result.workspacePath || '尚未选择工作区'
  openWorkspaceButton.disabled = !result.workspacePath
  sidebarOpenWorkspace.disabled = !result.workspacePath
}

function renderWorkspace(workspacePath) {
  const normalized = String(workspacePath || '')
  currentWorkspacePath = normalized
  const segments = normalized.split(/[\\/]/).filter(Boolean)
  sidebarWorkspaceName.textContent = segments.at(-1) || '尚未选择'
  workspaceSummary.textContent = normalized ? `位置：${normalized}` : '新任务需要一个本地工作区。'
  workspaceSummary.title = normalized
}

async function selectWorkspace() {
  const result = await window.desktopHost.selectWorkspace()
  if (!result.canceled) {
    if (modelRouteDialog.open) modelRouteDialog.close()
    const next = await runLatestWorkbenchRequest({
      gate: workbenchRefreshGate,
      expected: { taskId: '', sessionId: '' },
      request: () => window.desktopHost.selectTask('')
    })
    if (!next) return
    replaceWorkbench(next)
    renderWorkspace(result.workspacePath)
    settingsWorkspacePath.textContent = result.workspacePath
    openWorkspaceButton.disabled = false
    sidebarOpenWorkspace.disabled = false
    careResult.textContent = `新任务工作区已切换为：\n${result.workspacePath}\n\n已打开空白新任务页。旧任务仍留在各自启动时的项目中，不会被偷偷迁移。`
    showPage('workbench')
    forceFollowNextRender = false
    mainPanel.scrollTop = 0
    renderWorkbench()
  }
}

for (const button of pageButtons) button.addEventListener('click', () => showPage(button.dataset.page))
themeToggle.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true))
newTaskButton.addEventListener('click', () => startNewTask().catch((error) => {
  careResult.textContent = `没有打开新任务：${error.message}`
  showPage('settings')
}))
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
memoryForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const submit = memoryForm.querySelector('[type="submit"]')
  submit.disabled = true
  memoryStatus.textContent = '正在写入本地候选收件箱；不会调用模型…'
  try {
    const snapshot = await window.desktopHost.createMemoryCandidate({
      kind: memoryKind.value,
      scope: memoryScope.value,
      sensitivity: 'private',
      title: memoryTitle.value,
      content: memoryContent.value,
      reason: memoryReason.value,
      limits: memoryLimits.value
    })
    memoryForm.reset()
    renderMemory(snapshot)
    memoryStatus.textContent = '候选已保存，尚未成为长期记忆，也不会影响任务回复。'
  } catch (error) { memoryStatus.textContent = `没有保存：${error.message}` }
  finally { submit.disabled = false }
})
openMemoryFolderButton.addEventListener('click', async () => {
  openMemoryFolderButton.disabled = true
  try {
    const result = await window.desktopHost.openMemoryFolder()
    memoryStatus.textContent = `已打开：${result.path}`
  } catch (error) { memoryStatus.textContent = `无法打开：${error.message}` }
  finally { openMemoryFolderButton.disabled = false }
})
previewMemoryButton.addEventListener('click', async () => {
  previewMemoryButton.disabled = true
  memoryPreviewStatus.textContent = '正在本机进行确定性匹配；不会调用模型…'
  try { renderMemoryPreview(await window.desktopHost.previewMemoryRetrieval(memoryPreviewQuery.value)) }
  catch (error) { memoryPreviewStatus.textContent = `无法预览：${error.message}` }
  finally { previewMemoryButton.disabled = false }
})
memoryPreviewQuery.addEventListener('input', () => {
  if (!lastMemoryPreviewQuery || memoryPreviewQuery.value.trim() === lastMemoryPreviewQuery) return
  selectedMemoryIds = new Set()
  composeMemoryPreviewButton.disabled = true
  memoryContextPreview.classList.add('hidden')
  memoryPreviewResults.replaceChildren()
  memoryPreviewStatus.textContent = '任务描述已更改，请重新进行本机预览。'
})
composeMemoryPreviewButton.addEventListener('click', async () => {
  composeMemoryPreviewButton.disabled = true
  memoryContextPreview.classList.add('hidden')
  memoryPreviewStatus.textContent = '正在重新核对作用域与记忆状态…'
  try {
    const result = await window.desktopHost.composeMemoryPreview(lastMemoryPreviewQuery, [...selectedMemoryIds])
    memoryContextText.textContent = result.text || '没有可组成上下文的有效记忆。'
    const omitted = result.omitted.length ? `；${result.omitted.length} 条因超过 3000 字符上限而未纳入` : ''
    memoryContextSummary.textContent = `${result.included.length} 条，${result.characterCount} 个字符${omitted}。没有发送给 Engine。`
    memoryContextPreview.classList.remove('hidden')
    memoryPreviewStatus.textContent = '已重新核对当前项目和确认状态。以下只是精确预览，没有调用模型、创建任务或修改 Prompt。'
  } catch (error) { memoryPreviewStatus.textContent = `无法生成最终预览：${error.message}` }
  finally { composeMemoryPreviewButton.disabled = selectedMemoryIds.size === 0 }
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
  try { replaceWorkbench(await window.desktopHost.createProjectBrief()); forceFollowNextRender = true; renderWorkbench() } catch (error) {
    taskEngineStatus.textContent = `无法开始项目说明：${error.message}`
    taskEngineStatus.dataset.state = 'error'
  } finally { explainProjectButton.disabled = false }
})
taskComposer.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') createTask() })
for (const button of document.querySelectorAll('[data-suggestion]')) button.addEventListener('click', () => { taskComposer.value = button.dataset.suggestion; taskComposer.focus() })
deleteTaskButton.addEventListener('click', async () => {
  const thread = activeThread()
  const active = ['queued', 'running', 'unknown'].includes(thread?.engineState)
  const question = active
    ? `停止并删除“${thread?.title}”？Deep code 会先向 Harness 请求停止，只有收到结束证据后才删除本地记录。`
    : `删除本机任务“${thread?.title}”？已确认的工作区文件不会被删除。`
  if (!thread || !window.confirm(question)) return
  try { replaceWorkbench(await window.desktopHost.deleteTask(thread.id)); taskViewState.clear(thread.id); composerDraftState.clear(thread.id); renderWorkbench() } catch (error) { careResult.textContent = error.message }
})
async function stopActiveTask() {
  const thread = activeThread()
  if (!thread) return
  cancelTaskButton.disabled = true
  composerStopButton.disabled = true
  try { replaceWorkbench(await window.desktopHost.cancelTask(thread.id)); renderWorkbench() } catch (error) {
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
  try { replaceWorkbench(await window.desktopHost.retryTask(thread.id)); forceFollowNextRender = true; renderWorkbench() } catch (error) {
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
confirmSharedEngineButton.addEventListener('click', () => safelyRenderStatus(() => window.desktopHost.confirmSharedEngine()))
startManagedEngineButton.addEventListener('click', () => safelyRenderStatus(() => window.desktopHost.startManaged(pathInput.value)))
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
  resetProviderRemovalConfirmation()
  updateCredentialProviderDescription()
  credentialDialog.showModal()
  modelApiKey.focus()
})
credentialProviderChoice.addEventListener('change', () => {
  resetProviderRemovalConfirmation()
  updateCredentialProviderDescription()
})
providerChoice.addEventListener('change', resetProviderSaveConfirmation)
providerApiKey.addEventListener('input', () => {
  resetProviderSaveConfirmation()
})
addModelProviderButton.addEventListener('click', () => {
  providerApiKey.value = ''
  resetProviderSaveConfirmation()
  renderProviderChoices()
  providerDialog.showModal()
  providerApiKey.focus()
})
cancelProviderDialog.addEventListener('click', () => {
  providerApiKey.value = ''
  resetProviderSaveConfirmation()
  providerDialog.close()
})
providerDialog.addEventListener('cancel', () => { providerApiKey.value = ''; resetProviderSaveConfirmation() })
providerDialogForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const provider = providerChoice.value
  const value = providerApiKey.value
  if (!provider) { modelCredentialResult.textContent = '当前没有可添加的模型服务。'; return }
  if (!value) { providerApiKey.focus(); return }
  const selected = (modelConnectionState.provisioning?.providers || []).find((item) => item.id === provider)
  const confirmation = providerProvisioningFlow.request(selected || { id: provider, name: provider })
  if (!confirmation.confirmed) {
    saveModelProviderButton.textContent = confirmation.view.buttonLabel
    providerChoiceDescription.textContent = confirmation.view.description
    providerSaveTimer = setTimeout(resetProviderSaveConfirmation, 10000)
    return
  }
  resetProviderSaveConfirmation()
  const submit = providerDialogForm.querySelector('[type="submit"]')
  submit.disabled = true
  modelCredentialResult.textContent = '正在创建 Provider Profile，并把 API Key 单向交给 Harness…'
  modelCredentialResult.dataset.state = 'working'
  try {
    const result = await window.desktopHost.addModelProvider(provider, value)
    providerApiKey.value = ''
    providerDialog.close()
    renderModelConnection(result.snapshot)
    modelCredentialResult.textContent = `${result.provisioned.name}（${result.provisioned.provider}）与凭据已经保存，但尚未验证连接。下一步可创建一个可见的真实验证任务。`
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
  resetProviderRemovalConfirmation()
  credentialDialog.close()
})
credentialDialog.addEventListener('cancel', () => {
  modelApiKey.value = ''
  resetProviderRemovalConfirmation()
})
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
removeModelProviderButton.addEventListener('click', async () => {
  const provider = selectedCredentialProvider()
  if (!provider?.removable) return
  if (pendingProviderRemoval !== provider.id) {
    resetProviderRemovalConfirmation()
    pendingProviderRemoval = provider.id
    removeModelProviderButton.textContent = `再次点击确认移除 ${provider.name}`
    credentialProviderDescription.textContent = `将先清除 ${provider.name} 的凭据并移除 Provider Profile；不会删除其他模型服务。10 秒内再次点击才会执行。`
    removeModelProviderButton.focus()
    providerRemovalTimer = setTimeout(() => {
      resetProviderRemovalConfirmation()
      updateCredentialProviderDescription()
    }, 10000)
    return
  }
  resetProviderRemovalConfirmation()
  removeModelProviderButton.disabled = true
  modelCredentialResult.textContent = `正在移除 ${provider.name}…`
  modelCredentialResult.dataset.state = 'working'
  try {
    const result = await window.desktopHost.removeModelProvider(provider.id)
    credentialDialog.close()
    renderModelConnection(result.snapshot)
    modelCredentialResult.textContent = `${result.removed.name} 的凭据和 Provider Profile 已移除。`
    modelCredentialResult.dataset.state = 'success'
  } catch (error) {
    modelCredentialResult.textContent = `没有完全移除：${error.message}`
    modelCredentialResult.dataset.state = 'error'
  } finally {
    resetProviderRemovalConfirmation()
    updateCredentialProviderDescription()
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
async function createVisibleConnectionTest(trigger, statusTarget, routing = null) {
  trigger.disabled = true
  statusTarget.textContent = '正在创建真实验证任务…'
  try {
    replaceWorkbench(await window.desktopHost.createConnectionTest(routing))
    renderWorkbench()
    showPage('workbench')
  } catch (error) {
    statusTarget.textContent = `无法创建验证任务：${error.message}`
    statusTarget.dataset.state = 'error'
  } finally {
    trigger.disabled = false
  }
}
verifyModelConnectionButton.addEventListener('click', () => {
  modelCredentialResult.textContent = '请到“模型服务”页面，从具体 Provider 卡片选择要验证的模型。'
  showPage('model-services')
})
verifyModelServiceButton.addEventListener('click', () => { modelServicesStatus.textContent = '请从下方具体 Provider 卡片点击“验证这个服务”。' })
refreshModelServicesButton.addEventListener('click', async () => {
  refreshModelServicesButton.disabled = true
  modelServicesStatus.textContent = '正在读取 Harness Provider、模型目录和凭据状态…'
  try { await refreshModelServices() } catch (error) { modelServicesStatus.textContent = `刷新失败：${error.message}` }
  finally { refreshModelServicesButton.disabled = false }
})
manageModelServicesButton.addEventListener('click', () => showPage('settings'))
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
useTaskWorkspaceButton.addEventListener('click', async () => {
  const thread = activeThread()
  if (!thread?.workspacePath) return
  try {
    const result = await window.desktopHost.useTaskWorkspace(thread.id)
    renderWorkspace(result.workspacePath)
    settingsWorkspacePath.textContent = result.workspacePath
    openWorkspaceButton.disabled = false
    sidebarOpenWorkspace.disabled = false
    careResult.textContent = `已切换到此任务的项目：\n${result.workspacePath}\n\n现在的新任务也会默认使用这里；当前任务的 Engine Session 没有被重建。`
    renderWorkbench()
  } catch (error) {
    careResult.textContent = `没有切换：${error.message}`
  }
})
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
sidebarOpenWorkspace.addEventListener('click', async () => {
  sidebarOpenWorkspace.disabled = true
  try {
    const result = await window.desktopHost.openWorkspace()
    workspaceSummary.textContent = `已打开：${result.workspacePath}`
    workspaceSummary.title = result.workspacePath
  } catch (error) {
    workspaceSummary.textContent = `没有打开：${error.message}`
  } finally {
    sidebarOpenWorkspace.disabled = false
  }
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
  if (!thread?.sessionId || !['queued', 'running'].includes(thread.engineState)) return
  // 等待你的回答时暂停自动刷新；否则整棵 Decision Gate DOM 会被替换，已选选项和输入文字会丢失。
  if (thread.agent?.live?.interactions?.length) return
  try { await refreshWorkbench() } catch { /* Keep the last readable state visible. */ }
}, 1500)
