const pages = document.querySelectorAll('.page')
const pageButtons = document.querySelectorAll('[data-page]')
const taskList = document.querySelector('#task-list')
const taskCount = document.querySelector('#task-count')
const newTaskButton = document.querySelector('#new-task')
const taskComposer = document.querySelector('#task-composer')
const createTaskButton = document.querySelector('#create-task')
const emptyTask = document.querySelector('#empty-task')
const activeTask = document.querySelector('#active-task')
const activeTaskTitle = document.querySelector('#active-task-title')
const activeTaskPrompt = document.querySelector('#active-task-prompt')
const taskEngineStatus = document.querySelector('#task-engine-status')
const conversationFeed = document.querySelector('#conversation-feed')
const taskEvidenceContent = document.querySelector('#task-evidence-content')
const cancelTaskButton = document.querySelector('#cancel-task')
const retryTaskButton = document.querySelector('#retry-task')
const deleteTaskButton = document.querySelector('#delete-task')
const previewHandoffButton = document.querySelector('#preview-handoff')
const handoffDialog = document.querySelector('#handoff-dialog')
const handoffText = document.querySelector('#handoff-text')
const closeHandoffButton = document.querySelector('#close-handoff')
const runtimeDot = document.querySelector('#runtime-dot')
const runtimeShort = document.querySelector('#runtime-short')
const runtimeSummary = document.querySelector('#runtime-summary')

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
const diagnosticsButton = document.querySelector('#export-diagnostics')
const careResult = document.querySelector('#care-result')
const skipSetupButton = document.querySelector('#skip-setup')
const finishSetupButton = document.querySelector('#finish-setup')
const setupDetectRuntime = document.querySelector('#setup-detect-runtime')
const setupSelectRuntime = document.querySelector('#setup-select-runtime')
const setupInstallRuntime = document.querySelector('#setup-install-runtime')
const setupWorkspaceName = document.querySelector('#setup-workspace-name')
const setupCreateWorkspace = document.querySelector('#setup-create-workspace')
const setupProgress = document.querySelector('#setup-progress')
const workspaceDialog = document.querySelector('#workspace-dialog')
const workspaceDialogForm = document.querySelector('#workspace-dialog-form')
const workspaceDialogName = document.querySelector('#workspace-dialog-name')
const cancelWorkspaceDialog = document.querySelector('#cancel-workspace-dialog')
const selectWorkspaceButton = document.querySelector('#select-workspace')
const selectWorkspaceSide = document.querySelector('#select-workspace-side')
const workspaceSummary = document.querySelector('#workspace-summary')
const settingsWorkspacePath = document.querySelector('#settings-workspace-path')
const openWorkspaceButton = document.querySelector('#open-workspace')
const explainProjectButton = document.querySelector('#explain-project')

const activeUserPersona = document.querySelector('#active-user-persona')
const activeAgentCharacter = document.querySelector('#active-agent-character')
const activeInteractionStyle = document.querySelector('#active-interaction-style')
const cardStack = document.querySelector('#active-card-stack')
const cardStackNote = document.querySelector('#card-stack-note')
const cardList = document.querySelector('#card-list')
const cardId = document.createElement('input')
const cardKind = document.querySelector('#card-kind')
const cardName = document.querySelector('#card-name')
const cardSummary = document.querySelector('#card-summary')
const cardTags = document.querySelector('#card-tags')
const cardModelText = document.querySelector('#card-model-text')
const cardHumanNotes = document.querySelector('#card-human-notes')
const saveCardButton = document.querySelector('#save-card')
const importCardButton = document.querySelector('#import-card')
const exportCardButton = document.querySelector('#export-card')
const deleteCardButton = document.querySelector('#delete-card')
const cardResult = document.querySelector('#card-result')

let workbench = { threads: [], activeThreadId: '' }
let cardSnapshot = { cards: [], active: {} }

function showPage(name) {
  for (const page of pages) page.classList.toggle('is-active', page.id === `page-${name}`)
  for (const button of document.querySelectorAll('.nav-item')) button.classList.toggle('is-active', button.dataset.page === name)
}

function renderRuntime(status) {
  pathInput.value = status.runtimePath || pathInput.value
  const stateLabel = ({ stopped: '尚未启动', starting: '正在启动', ready: '已就绪', stopping: '正在停止', error: '启动失败' })[status.state] || status.state
  label.textContent = stateLabel
  message.textContent = status.message || ''
  dot.className = `status-dot ${status.state}`
  runtimeDot.className = `status-dot ${status.state}`
  runtimeShort.textContent = status.state === 'ready' ? 'Engine 已连接' : `Engine ${stateLabel}`
  runtimeSummary.textContent = status.state === 'ready'
    ? 'Engine 已准备好，Deep code 可以直接使用它。'
    : (status.runtimePath ? '已找到本机 Engine，启动后由 Deep code 在后台使用。' : '尚未找到 Deep code Engine。')
  startButton.disabled = status.state === 'starting' || status.state === 'ready' || !pathInput.value
  stopButton.disabled = !['starting', 'ready', 'stopping'].includes(status.state)
  logs.textContent = status.logs?.length ? status.logs.map(({ stream, line }) => `[${stream}] ${line}`).join('\n') : '还没有运行日志。'
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

function activeThread() {
  return workbench.threads.find((thread) => thread.id === workbench.activeThreadId)
}

function renderWorkbench() {
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
      try { workbench = await window.desktopHost.selectTask(thread.id); renderWorkbench(); showPage('workbench') } catch (error) { careResult.textContent = error.message }
    })
    taskList.append(button)
  }
  const thread = activeThread()
  emptyTask.classList.toggle('hidden', Boolean(thread))
  activeTask.classList.toggle('hidden', !thread)
  if (thread) {
    activeTaskTitle.textContent = thread.title
    activeTaskPrompt.textContent = thread.prompt
    const labels = {
      draft: '任务已保存，等待连接 Engine。',
      running: 'Deep code 正在处理。结果会自动更新。',
      ready: '这一轮已经完成。你可以继续追问，或展开技术证据。',
      error: `没有完成：${thread.engineError || 'Engine 返回了未知错误。'}`
    }
    taskEngineStatus.textContent = labels[thread.engineState] || labels.draft
    taskEngineStatus.dataset.state = thread.engineState || 'draft'
    cancelTaskButton.disabled = thread.engineState !== 'running'
    retryTaskButton.classList.toggle('hidden', !['draft', 'error'].includes(thread.engineState))
    conversationFeed.replaceChildren()
    for (const item of thread.agent?.messages || []) {
      const bubble = document.createElement('article')
      bubble.className = `message-bubble ${item.role}`
      const role = document.createElement('strong')
      role.textContent = item.role === 'assistant' ? 'Deep code' : '你'
      const text = document.createElement('p')
      text.textContent = item.text
      bubble.append(role, text)
      conversationFeed.append(bubble)
    }
    const evidence = thread.agent?.evidence || []
    taskEvidenceContent.textContent = evidence.length
      ? evidence.map((item) => `${item.type}\n${JSON.stringify(item.detail, null, 2)}`).join('\n\n')
      : '还没有工具记录。'
  }
}

async function refreshWorkbench() {
  workbench = await window.desktopHost.workbenchSnapshot()
  renderWorkbench()
}

async function createTask() {
  const prompt = taskComposer.value.trim()
  if (!prompt) { taskComposer.focus(); return }
  try {
    createTaskButton.disabled = true
    taskComposer.disabled = true
    const thread = activeThread()
    workbench = thread?.sessionId
      ? await window.desktopHost.sendMessage(thread.id, prompt)
      : await window.desktopHost.createTask({ prompt })
    taskComposer.value = ''
    renderWorkbench()
  } catch (error) {
    taskEngineStatus.textContent = `没有发送：${error.message}`
    taskEngineStatus.dataset.state = 'error'
  } finally {
    createTaskButton.disabled = false
    taskComposer.disabled = false
    taskComposer.focus()
  }
}

async function refreshWorkspace() {
  const result = await window.desktopHost.workspaceStatus()
  workspaceSummary.textContent = result.workspacePath || '尚未选择工作区。'
  settingsWorkspacePath.textContent = result.workspacePath || '尚未选择工作区'
  openWorkspaceButton.disabled = !result.workspacePath
}

async function selectWorkspace() {
  const result = await window.desktopHost.selectWorkspace()
  if (!result.canceled) {
    workspaceSummary.textContent = result.workspacePath
    settingsWorkspacePath.textContent = result.workspacePath
    openWorkspaceButton.disabled = false
    careResult.textContent = `当前项目已切换为：\n${result.workspacePath}\n\n新任务会在这里运行。`
  }
}

function cardsOfKind(kind) {
  return cardSnapshot.cards.filter((card) => card.kind === kind)
}

function fillOptions(select, kind, activeId) {
  select.replaceChildren(new Option('暂不选择', ''))
  for (const card of cardsOfKind(kind)) select.add(new Option(`${card.name} — ${card.summary}`, card.id))
  select.value = activeId || ''
}

function clearCardForm() {
  cardId.value = ''
  cardKind.value = 'agent-character'
  cardName.value = ''
  cardSummary.value = ''
  cardTags.value = ''
  cardModelText.value = ''
  cardHumanNotes.value = ''
  cardList.value = ''
}

function fillCardForm(card) {
  cardId.value = card.id
  cardKind.value = card.kind
  cardName.value = card.name
  cardSummary.value = card.summary
  cardTags.value = card.tags.join(', ')
  cardModelText.value = card.modelText
  cardHumanNotes.value = card.humanNotes
  cardList.value = card.id
  const builtIn = card.source === 'built-in'
  saveCardButton.textContent = builtIn ? '复制为本地卡' : '保存本地修改'
  deleteCardButton.disabled = builtIn
  exportCardButton.disabled = false
}

function cardForActive(kind) {
  const slot = ({ 'user-persona': 'userPersonaId', 'agent-character': 'agentCharacterId', 'interaction-style': 'interactionStyleId' })[kind]
  return cardSnapshot.cards.find((card) => card.id === cardSnapshot.active[slot])
}

function renderActiveStack() {
  cardStack.replaceChildren()
  for (const [kind, labelText] of [['user-persona', 'USER PERSONA'], ['agent-character', 'AGENT CHARACTER'], ['interaction-style', 'INTERACTION STYLE']]) {
    const card = cardForActive(kind)
    const item = document.createElement('div')
    item.className = 'stack-card'
    item.innerHTML = `<span class="stack-kind"></span><span class="stack-name"></span>`
    item.querySelector('.stack-kind').textContent = labelText
    item.querySelector('.stack-name').textContent = card ? card.name : '暂未选择'
    if (!card) item.querySelector('.stack-name').className = 'stack-name stack-empty'
    cardStack.append(item)
  }
  const names = [['用户人格', cardForActive('user-persona')], ['Agent Character', cardForActive('agent-character')], ['互动风格', cardForActive('interaction-style')]]
    .filter(([, card]) => card).map(([kind, card]) => `${kind}：${card.name}`)
  cardStackNote.textContent = names.length ? `${names.join('\n\n')}\n\n当前选择只保存在本机，尚未写入 Harness。` : '当前未选择任何卡。'
}

function renderCardLibrary() {
  const selectedId = cardId.value
  cardList.replaceChildren(new Option('新建一张角色或协作卡', ''))
  for (const card of cardSnapshot.cards) {
    const kind = ({ 'user-persona': '用户', 'agent-character': 'Agent', 'interaction-style': '风格' })[card.kind]
    cardList.add(new Option(`[${kind}] ${card.name} — ${card.summary}`, card.id))
  }
  cardList.value = selectedId
  const selected = cardSnapshot.cards.find((card) => card.id === selectedId)
  exportCardButton.disabled = !selected
  deleteCardButton.disabled = !selected || selected.source === 'built-in'
  if (!selected) saveCardButton.textContent = '保存为本地卡'
}

async function refreshCards(selectedId = cardId.value) {
  cardSnapshot = await window.desktopHost.cardSnapshot()
  fillOptions(activeUserPersona, 'user-persona', cardSnapshot.active.userPersonaId)
  fillOptions(activeAgentCharacter, 'agent-character', cardSnapshot.active.agentCharacterId)
  fillOptions(activeInteractionStyle, 'interaction-style', cardSnapshot.active.interactionStyleId)
  renderActiveStack()
  renderCardLibrary()
  const selected = cardSnapshot.cards.find((card) => card.id === selectedId)
  if (selected) fillCardForm(selected)
  else clearCardForm()
}

function draftFromForm() {
  return {
    id: cardId.value || undefined,
    kind: cardKind.value,
    name: cardName.value,
    summary: cardSummary.value,
    tags: cardTags.value.split(',').map((tag) => tag.trim()).filter(Boolean),
    modelText: cardModelText.value,
    humanNotes: cardHumanNotes.value
  }
}

async function saveActive(kind, select) {
  try {
    await window.desktopHost.setActiveCard(kind, select.value)
    await refreshCards(cardId.value)
    cardResult.textContent = '已更新本地卡组。当前选择还没有写入或改变 Harness。'
  } catch (error) { cardResult.textContent = error.message }
}

for (const button of pageButtons) button.addEventListener('click', () => showPage(button.dataset.page))
newTaskButton.addEventListener('click', async () => {
  workbench = await window.desktopHost.selectTask('')
  renderWorkbench()
  showPage('workbench')
  taskComposer.focus()
})
createTaskButton.addEventListener('click', createTask)
explainProjectButton.addEventListener('click', async () => {
  explainProjectButton.disabled = true
  try { workbench = await window.desktopHost.createProjectBrief(); renderWorkbench() } catch (error) {
    taskEngineStatus.textContent = `无法开始项目说明：${error.message}`
    taskEngineStatus.dataset.state = 'error'
  } finally { explainProjectButton.disabled = false }
})
taskComposer.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') createTask() })
for (const button of document.querySelectorAll('[data-suggestion]')) button.addEventListener('click', () => { taskComposer.value = button.dataset.suggestion; taskComposer.focus() })
deleteTaskButton.addEventListener('click', async () => {
  const thread = activeThread()
  if (!thread || !window.confirm(`删除本机任务“${thread.title}”？这不会影响 Harness。`)) return
  try { workbench = await window.desktopHost.deleteTask(thread.id); renderWorkbench() } catch (error) { careResult.textContent = error.message }
})
cancelTaskButton.addEventListener('click', async () => {
  const thread = activeThread()
  if (!thread) return
  try { workbench = await window.desktopHost.cancelTask(thread.id); renderWorkbench() } catch (error) {
    taskEngineStatus.textContent = `无法停止：${error.message}`
    taskEngineStatus.dataset.state = 'error'
  }
})
retryTaskButton.addEventListener('click', async () => {
  const thread = activeThread()
  if (!thread) return
  retryTaskButton.disabled = true
  try { workbench = await window.desktopHost.retryTask(thread.id); renderWorkbench() } catch (error) {
    taskEngineStatus.textContent = `重试失败：${error.message}`
    taskEngineStatus.dataset.state = 'error'
  } finally { retryTaskButton.disabled = false }
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
selectWorkspaceSide.addEventListener('click', selectWorkspace)
openWorkspaceButton.addEventListener('click', async () => {
  await runVisibleAction({
    button: openWorkspaceButton,
    status: careResult,
    working: '正在打开当前工作区…',
    action: () => window.desktopHost.openWorkspace(),
    success: (result) => `已在文件资源管理器中打开：\n${result.workspacePath}`
  })
})
workspaceButton.addEventListener('click', () => {
  workspaceDialogName.value = '我的第一个项目'
  workspaceDialog.showModal()
  workspaceDialogName.select()
})
cancelWorkspaceDialog.addEventListener('click', () => workspaceDialog.close())
workspaceDialogForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const name = workspaceDialogName.value
  workspaceDialog.close()
  const result = await runVisibleAction({
    button: workspaceButton,
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

activeUserPersona.addEventListener('change', () => saveActive('user-persona', activeUserPersona))
activeAgentCharacter.addEventListener('change', () => saveActive('agent-character', activeAgentCharacter))
activeInteractionStyle.addEventListener('change', () => saveActive('interaction-style', activeInteractionStyle))
cardList.addEventListener('change', () => {
  const selected = cardSnapshot.cards.find((card) => card.id === cardList.value)
  if (selected) fillCardForm(selected)
  else clearCardForm()
  renderCardLibrary()
})
saveCardButton.addEventListener('click', async () => {
  try {
    const wasBuiltIn = cardSnapshot.cards.find((card) => card.id === cardId.value)?.source === 'built-in'
    const card = await window.desktopHost.saveCard(draftFromForm())
    await refreshCards(card.id)
    cardResult.textContent = wasBuiltIn ? `已从内置起点复制出你的本地版本：${card.name}` : `已保存在本机：${card.name}`
  } catch (error) { cardResult.textContent = error.message }
})
importCardButton.addEventListener('click', async () => {
  try {
    const result = await window.desktopHost.prepareCardImport()
    if (result.canceled) return
    const preview = [`准备导入：[${result.card.kind}] ${result.card.name}`, `简介：${result.card.summary}`, '', ...result.notices].join('\n')
    if (!window.confirm(`${preview}\n\n确认保存到本机？`)) return
    const card = await window.desktopHost.commitCardImport(result.card)
    await refreshCards(card.id)
    cardResult.textContent = `已导入并保存在本机：${card.name}`
  } catch (error) { cardResult.textContent = error.message }
})
exportCardButton.addEventListener('click', async () => {
  try {
    const result = await window.desktopHost.exportCard(cardId.value)
    cardResult.textContent = result.canceled ? '未导出角色卡。' : `已导出可分享的角色卡：\n${result.path}`
  } catch (error) { cardResult.textContent = error.message }
})
deleteCardButton.addEventListener('click', async () => {
  const selected = cardSnapshot.cards.find((card) => card.id === cardId.value)
  if (!selected || !window.confirm(`删除本机卡“${selected.name}”？这不会影响 Harness。`)) return
  try {
    await window.desktopHost.deleteCard(selected.id)
    await refreshCards()
    cardResult.textContent = `已删除本机卡：${selected.name}`
  } catch (error) { cardResult.textContent = error.message }
})

window.desktopHost.onStatus(renderRuntime)
window.desktopHost.onSetupProgress((line) => {
  if (!line) return
  setupProgress.textContent = `${setupProgress.textContent}\n${line}`.trim()
  setupProgress.scrollTop = setupProgress.scrollHeight
})
window.desktopHost.status().then((status) => {
  renderRuntime(status)
  if (!status.runtimePath) showPage('setup')
})
refreshWorkbench().catch((error) => { careResult.textContent = error.message })
refreshCards().catch((error) => { cardResult.textContent = error.message })
refreshWorkspace().catch((error) => { careResult.textContent = error.message })

setInterval(async () => {
  const thread = activeThread()
  if (!thread?.sessionId || thread.engineState !== 'running') return
  try { await refreshWorkbench() } catch { /* Keep the last readable state visible. */ }
}, 1500)
