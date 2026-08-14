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
const continueInHarness = document.querySelector('#continue-in-harness')
const deleteTaskButton = document.querySelector('#delete-task')
const openHarnessTop = document.querySelector('#open-harness-top')
const openHarnessSide = document.querySelector('#open-harness-side')
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
const openButton = document.querySelector('#open')
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
  runtimeShort.textContent = status.state === 'ready' ? 'Harness 已连接' : `Harness ${stateLabel}`
  runtimeSummary.textContent = status.state === 'ready'
    ? 'Harness 已准备好。Deep code 会在独立工作窗口中打开它。'
    : (status.runtimePath ? '已选择本地 Runtime；启动后可打开官方 Harness。' : '尚未选择官方 DeepSeek Harness 文件夹。')
  startButton.disabled = status.state === 'starting' || status.state === 'ready' || !pathInput.value
  stopButton.disabled = !['starting', 'ready', 'stopping'].includes(status.state)
  openButton.disabled = status.state !== 'ready'
  openHarnessSide.disabled = status.state !== 'ready'
  logs.textContent = status.logs?.length ? status.logs.map(({ stream, line }) => `[${stream}] ${line}`).join('\n') : '还没有运行日志。'
}

async function safelyRenderStatus(action) {
  try { renderRuntime(await action()) } catch (error) { renderRuntime({ state: 'error', message: error.message, logs: [] }) }
}

async function openHarness() {
  try { await window.desktopHost.openHarness() } catch (error) {
    showPage('settings')
    careResult.textContent = `无法打开 Harness：${error.message}`
  }
}

async function selectRuntimeNative() {
  const result = await window.desktopHost.selectRuntime()
  if (result.canceled) return false
  pathInput.value = result.runtimePath
  const status = await window.desktopHost.status()
  renderRuntime(status)
  setupProgress.textContent = `已选择本地文件夹：\n${result.runtimePath}\n\n你可以继续进入工作台并启动 Harness。`
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
    await window.desktopHost.createTask({ prompt })
    taskComposer.value = ''
    await refreshWorkbench()
  } catch (error) { careResult.textContent = error.message; showPage('settings') }
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
newTaskButton.addEventListener('click', () => { showPage('workbench'); taskComposer.focus() })
createTaskButton.addEventListener('click', createTask)
taskComposer.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') createTask() })
for (const button of document.querySelectorAll('[data-suggestion]')) button.addEventListener('click', () => { taskComposer.value = button.dataset.suggestion; taskComposer.focus() })
deleteTaskButton.addEventListener('click', async () => {
  const thread = activeThread()
  if (!thread || !window.confirm(`删除本机任务“${thread.title}”？这不会影响 Harness。`)) return
  try { workbench = await window.desktopHost.deleteTask(thread.id); renderWorkbench() } catch (error) { careResult.textContent = error.message }
})
continueInHarness.addEventListener('click', openHarness)
openHarnessTop.addEventListener('click', openHarness)
openHarnessSide.addEventListener('click', openHarness)
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
openButton.addEventListener('click', openHarness)
inspectButton.addEventListener('click', async () => {
  const report = await window.desktopHost.inspectRuntime(pathInput.value)
  careResult.textContent = report.checks.map((check) => `[${check.state}] ${check.label}\n${check.detail}`).join('\n\n')
})
workspaceButton.addEventListener('click', async () => {
  const name = window.prompt('给这个独立安全工作区起一个名字：', '我的第一个 Harness 工作区')
  if (name === null) return
  try { careResult.textContent = (await window.desktopHost.createSafeWorkspace(name)).message } catch (error) { careResult.textContent = error.message }
})
diagnosticsButton.addEventListener('click', async () => {
  const result = await window.desktopHost.exportDiagnostics()
  careResult.textContent = result.canceled ? '未导出诊断包。' : `${result.message}\n${result.path}`
})
skipSetupButton.addEventListener('click', () => showPage('workbench'))
finishSetupButton.addEventListener('click', () => showPage('workbench'))
setupSelectRuntime.addEventListener('click', selectRuntimeNative)
setupDetectRuntime.addEventListener('click', async () => {
  setupProgress.textContent = '正在检查桌面与 Deep code Runtime 目录…'
  try {
    const result = await window.desktopHost.autoDetectRuntime()
    setupProgress.textContent = result.found ? `已找到官方 Harness：\n${result.runtimePath}` : '没有在有限的默认位置找到官方 Harness。你可以手动选择，或使用下一步自动安装。'
    renderRuntime(await window.desktopHost.status())
  } catch (error) { setupProgress.textContent = error.message }
})
setupInstallRuntime.addEventListener('click', async () => {
  setupInstallRuntime.disabled = true
  setupProgress.textContent = '准备自动安装。第一次构建可能需要几分钟，请保持网络连接。'
  try {
    const result = await window.desktopHost.provisionRuntime()
    setupProgress.textContent += `\n\n安装完成：\n${result.runtimePath}`
    renderRuntime(await window.desktopHost.status())
  } catch (error) { setupProgress.textContent += `\n\n安装未完成：${error.message}` }
  finally { setupInstallRuntime.disabled = false }
})
setupCreateWorkspace.addEventListener('click', async () => {
  setupCreateWorkspace.disabled = true
  try {
    const result = await window.desktopHost.createSafeWorkspace(setupWorkspaceName.value)
    setupProgress.textContent = `${result.message}\n${result.path}\n\n已生成：\n${result.files.join('\n')}`
  } catch (error) { setupProgress.textContent = error.message }
  finally { setupCreateWorkspace.disabled = false }
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
