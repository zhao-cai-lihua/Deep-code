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

const activeUserPersona = document.querySelector('#active-user-persona')
const activeAgentCharacter = document.querySelector('#active-agent-character')
const activeInteractionStyle = document.querySelector('#active-interaction-style')
const cardList = document.querySelector('#card-list')
const cardId = document.querySelector('#card-id')
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
let cardSnapshot = { cards: [], active: {} }

function render(status) {
  pathInput.value = status.runtimePath || pathInput.value
  label.textContent = ({ stopped: '尚未启动', starting: '正在启动', ready: '已就绪', stopping: '正在停止', error: '启动失败' })[status.state] || status.state
  message.textContent = status.message || ''
  dot.className = `dot ${status.state}`
  startButton.disabled = status.state === 'starting' || status.state === 'ready' || !pathInput.value
  stopButton.disabled = !['starting', 'ready', 'stopping'].includes(status.state)
  openButton.disabled = status.state !== 'ready'
  logs.textContent = status.logs?.length ? status.logs.map(({ stream, line }) => `[${stream}] ${line}`).join('\n') : '还没有运行日志。'
}

async function safely(action) {
  try { render(await action()) } catch (error) { render({ state: 'error', message: error.message, logs: [] }) }
}

selectButton.addEventListener('click', async () => {
  const result = await window.desktopHost.selectRuntime()
  if (result.canceled) return
  pathInput.value = result.runtimePath
  render({ ...(await window.desktopHost.status()), runtimePath: result.runtimePath })
})
startButton.addEventListener('click', () => safely(() => window.desktopHost.start(pathInput.value)))
stopButton.addEventListener('click', () => safely(() => window.desktopHost.stop()))
openButton.addEventListener('click', () => safely(() => window.desktopHost.openHarness()))
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

window.desktopHost.onStatus(render)
window.desktopHost.status().then(render)
refreshCards().catch((error) => { cardResult.textContent = error.message })
