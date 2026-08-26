const { app, BrowserWindow, Menu, clipboard, dialog, nativeImage, protocol, session, shell } = require('electron')
const { existsSync, readFileSync, writeFileSync } = require('node:fs')
const { readFile } = require('node:fs/promises')
const { join } = require('node:path')
const { RuntimeSupervisor } = require('./runtime-supervisor.cjs')
const { HostCare } = require('./host-care.cjs')
const { ReplyModeStore } = require('./reply-mode-store.cjs')
const { CompanionCardStore } = require('./companion-card-store.cjs')
const { WorkbenchStore } = require('./workbench-store.cjs')
const { SetupAssistant } = require('./setup-assistant.cjs')
const { buildHandoffPreview } = require('./handoff-preview.cjs')
const { DshAdapter } = require('./dsh-adapter.cjs')
const { DshLiveSession } = require('./dsh-live-session.cjs')
const { buildProjectBriefPrompt } = require('./project-explainer.cjs')
const { reconcileOfflineWorkbench, retryDisposition } = require('./workbench-projection.cjs')
const { normalizeExternalUrl } = require('./external-links.cjs')
const { projectTaskOutcome } = require('./task-outcome-projection.cjs')
const { projectTaskRun } = require('./run-projection.cjs')
const { ImageDraftStore } = require('./image-draft-store.cjs')
const { EcosystemCatalog } = require('./ecosystem-catalog.cjs')

protocol.registerSchemesAsPrivileged([{
  scheme: 'deep-code-image',
  privileges: { standard: true, secure: true, supportFetchAPI: false, corsEnabled: false }
}])

const supervisor = new RuntimeSupervisor()
const hostCare = new HostCare()
const dshAdapter = new DshAdapter()
const MODEL_CONNECTION_TEST_PROMPT = '这是 Deep code 发起的模型连接验证。请不要调用工具、读取文件或修改任何内容，只回复一句：模型连接验证成功。'
let mainWindow
let settings
let replyModes
let companionCards
let workbench
let setupAssistant
let liveSession
let imageDrafts
let ecosystemCatalog

function closeLiveSession() {
  if (liveSession) liveSession.close()
  liveSession = null
}

function ensureLiveSession(baseUrl, sessionId) {
  if (liveSession?.baseUrl === baseUrl && liveSession?.sessionId === sessionId && !liveSession.closed) return liveSession
  closeLiveSession()
  liveSession = new DshLiveSession({ baseUrl, sessionId }).start()
  return liveSession
}

function settingsPath() {
  return join(app.getPath('userData'), 'host-settings.json')
}

function readSettings() {
  try { return JSON.parse(readFileSync(settingsPath(), 'utf8')) } catch { return { runtimePath: process.env.DSH_RUNTIME_PATH || '' } }
}

function saveSettings(next) {
  settings = { ...settings, ...next }
  writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf8')
  return settings
}

async function ensureEngineReady() {
  const current = supervisor.snapshot()
  if (current.state === 'ready' && current.url) return current
  if (!settings.runtimePath) throw new Error('Engine 尚未准备好。请先在首次向导中自动检测或安装。')
  const started = await supervisor.start(settings.runtimePath)
  if (started.state === 'ready' && started.url) return started
  return supervisor.waitUntilReady()
}

async function launchTask(thread, { images = [] } = {}) {
  try {
    if (!settings.workspacePath) throw new Error('请先创建一个安全工作区，或在设置中选择项目文件夹。')
    const runtime = await ensureEngineReady()
    const sessionId = (await dshAdapter.createSession({
      baseUrl: runtime.url,
      cwd: settings.workspacePath,
      ...(thread.sessionId ? { sessionId: thread.sessionId } : {})
    })).sessionId
    workbench.setEngineState(thread.id, { sessionId, state: 'running', notice: images.length ? undefined : '' })
    ensureLiveSession(runtime.url, sessionId)
    await prepareImagesForPrompt({ runtime, sessionId, threadId: thread.id, images })
    await dshAdapter.prompt({ baseUrl: runtime.url, sessionId, text: thread.prompt, images })
    return true
  } catch (error) {
    workbench.setEngineState(thread.id, { state: 'error', error: error.message })
    return false
  }
}

async function prepareImagesForPrompt({ runtime, sessionId, threadId, images }) {
  if (!images.length) return
  const vision = await dshAdapter.selectOfficialVisionModel({ baseUrl: runtime.url, sessionId })
  workbench.setEngineState(threadId, {
    sessionId,
    state: 'running',
    notice: vision.changed
      ? '这条消息包含图片，Deep code 已明确切换到官方 DeepSeek-V4-Flash-Vision-Exp。'
      : '这条消息正由官方 DeepSeek-V4-Flash-Vision-Exp 处理。'
  })
}

function imageDraftScope(value) {
  const requested = String(value || '')
  if (requested === 'new-task') return requested
  const exists = workbench.snapshot().threads.some((thread) => thread.id === requested)
  if (!exists) throw new Error('找不到这些图片所属的任务。')
  return requested
}

async function workbenchSnapshot() {
  const snapshot = workbench.snapshot()
  const thread = snapshot.threads.find((item) => item.id === snapshot.activeThreadId)
  const runtime = supervisor.snapshot()
  if (!thread?.sessionId || runtime.state !== 'ready' || !runtime.url) {
    closeLiveSession()
    const offline = reconcileOfflineWorkbench(snapshot)
    if (thread) {
      thread.run = projectTaskRun(thread)
      thread.outcome = projectTaskOutcome(thread)
    }
    return offline
  }
  try {
    const live = ensureLiveSession(runtime.url, thread.sessionId)
    thread.agent = await dshAdapter.snapshot({ baseUrl: runtime.url, sessionId: thread.sessionId })
    live.reconcileRunning(thread.agent.running)
    thread.agent.live = live.snapshot()
    const terminal = thread.agent.runDetails?.terminal
    thread.engineState = thread.agent.running
      ? 'running'
      : terminal && ['failed', 'interrupted'].includes(terminal.state)
        ? 'error'
        : 'ready'
    thread.engineError = terminal?.state === 'failed'
      ? `Harness 报告这一轮失败（${terminal.reason}）。`
      : terminal?.state === 'interrupted'
        ? `Harness 报告这一轮已停止（${terminal.reason}）。`
        : ''
  } catch (error) {
    thread.engineState = 'error'
    thread.engineError = error.message
  }
  thread.run = projectTaskRun(thread)
  thread.outcome = projectTaskOutcome(thread)
  return snapshot
}

async function modelConnectionSnapshot() {
  const runtime = supervisor.snapshot()
  if (runtime.state !== 'ready' || !runtime.url) {
    return {
      state: 'engine-offline',
      title: '先启动 Engine',
      message: settings.runtimePath
        ? '已找到本机 Engine。启动后，Deep code 才能检查模型与 API Key 的配置状态。'
        : '尚未找到本机 Engine。请先完成首次向导中的 Runtime 准备。',
      modelCount: 0,
      activeProviders: [],
      dormantProviderCount: 0,
      failures: [],
      credentialManagement: { supported: false, writable: false, configured: false },
      evidence: { activeProviderIds: [], modelGroupIds: [], credentialRefsChecked: [] }
    }
  }
  return dshAdapter.connectionSnapshot({ baseUrl: runtime.url })
}

function runningEngine() {
  const runtime = supervisor.snapshot()
  if (runtime.state !== 'ready' || !runtime.url) {
    throw new Error('Engine 尚未启动。请先启动 Engine，再配置模型连接。')
  }
  return runtime
}

function isLocalHarnessUrl(value) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' && parsed.hostname === '127.0.0.1' && /^\d+$/.test(parsed.port)
  } catch { return false }
}

function publishStatus() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const snapshot = supervisor.snapshot()
  if (['stopped', 'error'].includes(snapshot.state)) closeLiveSession()
  mainWindow.webContents.send('host:status', snapshot)
}

function loadHost() {
  return mainWindow.loadFile(join(__dirname, 'renderer', 'index.html'))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1040,
    minHeight: 680,
    title: 'Deep code',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event, target) => {
    if (target.startsWith('file:') || isLocalHarnessUrl(target)) return
    event.preventDefault()
  })
  loadHost()
}

function createMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Deep code',
      submenu: [
        { label: 'Host setup', click: () => loadHost() },
        { label: 'Stop local runtime', click: () => supervisor.stop() },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }
  ]))
}

app.whenReady().then(() => {
  settings = readSettings()
  replyModes = new ReplyModeStore(join(app.getPath('userData'), 'reply-modes.json'))
  companionCards = new CompanionCardStore(
    join(app.getPath('userData'), 'companion-cards.json'),
    join(app.getPath('userData'), 'reply-modes.json')
  )
  workbench = new WorkbenchStore(join(app.getPath('userData'), 'local-tasks.json'))
  imageDrafts = new ImageDraftStore({
    readFile,
    inspectImage: (data) => {
      const image = nativeImage.createFromBuffer(data)
      if (image.isEmpty()) return { width: 0, height: 0 }
      return image.getSize()
    }
  })
  session.defaultSession.protocol.handle('deep-code-image', (request) => {
    try {
      const url = new URL(request.url)
      const [scopeId, id] = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
      if (url.hostname !== 'draft' || !scopeId || !id) return new Response('', { status: 404 })
      const preview = imageDrafts.preview(scopeId, id)
      if (!preview) return new Response('', { status: 404 })
      return new Response(preview.data, { status: 200, headers: { 'content-type': preview.mediaType, 'cache-control': 'no-store' } })
    } catch {
      return new Response('', { status: 400 })
    }
  })
  ecosystemCatalog = new EcosystemCatalog()
  setupAssistant = new SetupAssistant()
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  supervisor.on('status', publishStatus)
  supervisor.on('log', publishStatus)
  createMenu()
  createWindow()
})

app.on('window-all-closed', () => {
  closeLiveSession()
  supervisor.stop()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  closeLiveSession()
  supervisor.stop()
})

const { ipcMain } = require('electron')
ipcMain.handle('host:status', () => ({ ...supervisor.snapshot(), runtimePath: settings.runtimePath }))
ipcMain.handle('host:open-external', (_event, value) => shell.openExternal(normalizeExternalUrl(value)))
ipcMain.handle('host:copy-text', (_event, value) => {
  const text = String(value || '')
  if (!text) throw new Error('没有可复制的内容。')
  if (text.length > 1000000) throw new Error('内容过长，无法一次复制。')
  clipboard.writeText(text)
  return { copied: true }
})
ipcMain.handle('host:model-connection', () => modelConnectionSnapshot())
ipcMain.handle('host:save-deepseek-credential', async (_event, value) => {
  const runtime = runningEngine()
  await dshAdapter.saveDeepSeekCredential({ baseUrl: runtime.url, value: String(value || '') })
  return modelConnectionSnapshot()
})
ipcMain.handle('host:clear-deepseek-credential', async () => {
  const runtime = runningEngine()
  await dshAdapter.clearDeepSeekCredential({ baseUrl: runtime.url })
  return modelConnectionSnapshot()
})
ipcMain.handle('host:inspect-runtime', (_event, selectedPath) => {
  const selected = String(selectedPath || settings.runtimePath || '')
  try {
    return hostCare.inspectRuntime(supervisor.resolveRuntimePath(selected))
  } catch {
    return hostCare.inspectRuntime(selected)
  }
})
ipcMain.handle('host:select-runtime', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择官方 DeepSeek Harness 文件夹',
    buttonLabel: '选择此文件夹',
    properties: ['openDirectory', 'createDirectory', 'promptToCreate']
  })
  if (result.canceled) return { canceled: true, runtimePath: settings.runtimePath }
  saveSettings({ runtimePath: result.filePaths[0] })
  return { canceled: false, runtimePath: result.filePaths[0] }
})
ipcMain.handle('host:auto-detect-runtime', () => {
  const runtimePath = setupAssistant.detectRuntime({
    desktopPath: app.getPath('desktop'),
    documentsPath: app.getPath('documents'),
    configuredPath: settings.runtimePath || ''
  })
  if (runtimePath) saveSettings({ runtimePath })
  return { runtimePath, found: Boolean(runtimePath) }
})
ipcMain.handle('host:provision-runtime', async () => {
  const onLine = (line) => {
    if (!line || !mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send('setup:progress', line)
  }
  const runtimePath = await setupAssistant.provisionRuntime({ documentsPath: app.getPath('documents'), onLine })
  saveSettings({ runtimePath })
  return { runtimePath, report: hostCare.inspectRuntime(runtimePath) }
})
ipcMain.handle('host:start', (_event, runtimePath) => {
  const normalized = String(runtimePath || '')
  return supervisor.start(normalized).then((status) => {
    saveSettings({ runtimePath: status.runtimePath })
    return status
  })
})
ipcMain.handle('host:stop', () => {
  closeLiveSession()
  return supervisor.stop()
})
ipcMain.handle('host:create-safe-workspace', (_event, name) => {
  const result = hostCare.createSafeWorkspace({ documentsPath: app.getPath('documents'), name: String(name || '') })
  saveSettings({ workspacePath: result.path })
  return result
})
ipcMain.handle('host:select-workspace', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择 Deep code 要处理的项目文件夹',
    buttonLabel: '使用这个项目',
    properties: ['openDirectory']
  })
  if (result.canceled || !result.filePaths[0]) return { canceled: true, workspacePath: settings.workspacePath || '' }
  saveSettings({ workspacePath: result.filePaths[0] })
  return { canceled: false, workspacePath: result.filePaths[0] }
})
ipcMain.handle('host:workspace-status', () => ({ workspacePath: settings.workspacePath || '' }))
ipcMain.handle('host:open-workspace', async () => {
  const workspacePath = settings.workspacePath || ''
  if (!workspacePath || !existsSync(workspacePath)) throw new Error('当前工作区不存在，请先创建或选择一个项目文件夹。')
  const error = await shell.openPath(workspacePath)
  if (error) throw new Error(`无法打开当前工作区：${error}`)
  return { workspacePath }
})
ipcMain.handle('host:export-diagnostics', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '导出脱敏诊断包',
    defaultPath: 'dsh-desktop-diagnostics.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled || !result.filePath) return { canceled: true }
  const runtimeReport = hostCare.inspectRuntime(settings.runtimePath || '')
  return { canceled: false, ...hostCare.exportDiagnostics({
    destinationPath: result.filePath,
    hostVersion: app.getVersion(),
    runtimeReport,
    runtimeStatus: supervisor.snapshot()
  }) }
})
ipcMain.handle('mode:list', () => replyModes.list())
ipcMain.handle('mode:save', (_event, draft) => replyModes.save(draft))
ipcMain.handle('mode:delete', (_event, id) => replyModes.remove(String(id || '')))
ipcMain.handle('mode:prepare-import', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '导入 Reply Mode Package',
    properties: ['openFile'],
    filters: [{ name: 'Deep code Reply Mode', extensions: ['deepcode.json', 'json'] }]
  })
  if (result.canceled || !result.filePaths[0]) return { canceled: true }
  try {
    return { canceled: false, ...replyModes.previewImport(JSON.parse(readFileSync(result.filePaths[0], 'utf8'))) }
  } catch (error) {
    throw new Error(`无法导入此回复模式包：${error.message}`)
  }
})
ipcMain.handle('mode:commit-import', (_event, raw) => replyModes.commitImport(raw))
ipcMain.handle('mode:export', async (_event, id) => {
  const mode = replyModes.list().find((item) => item.id === String(id || ''))
  if (!mode) throw new Error('请先选择一个要导出的回复模式。')
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '导出 Reply Mode Package',
    defaultPath: `${mode.name.replace(/[\\/:*?"<>|]/g, '-')}.deepcode.json`,
    filters: [{ name: 'Deep code Reply Mode', extensions: ['deepcode.json'] }]
  })
  if (result.canceled || !result.filePath) return { canceled: true }
  writeFileSync(result.filePath, JSON.stringify(mode, null, 2), 'utf8')
  return { canceled: false, path: result.filePath }
})
ipcMain.handle('cards:snapshot', () => companionCards.snapshot())
ipcMain.handle('cards:save', (_event, draft) => companionCards.save(draft))
ipcMain.handle('cards:delete', (_event, id) => companionCards.remove(String(id || '')))
ipcMain.handle('cards:set-active', (_event, kind, id) => companionCards.setActive(String(kind || ''), String(id || '')))
ipcMain.handle('cards:prepare-import', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '导入 Deep code 角色卡',
    properties: ['openFile'],
    filters: [{ name: 'Deep code 角色卡', extensions: ['deepcode.json', 'json'] }]
  })
  if (result.canceled || !result.filePaths[0]) return { canceled: true }
  try {
    return { canceled: false, ...companionCards.previewImport(JSON.parse(readFileSync(result.filePaths[0], 'utf8'))) }
  } catch (error) {
    throw new Error(`无法导入此角色卡：${error.message}`)
  }
})
ipcMain.handle('cards:commit-import', (_event, raw) => companionCards.commitImport(raw))
ipcMain.handle('cards:export', async (_event, id) => {
  const card = companionCards.snapshot().cards.find((item) => item.id === String(id || ''))
  if (!card) throw new Error('请先选择一个要导出的角色卡。')
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '导出 Deep code 角色卡',
    defaultPath: `${card.name.replace(/[\\/:*?"<>|]/g, '-')}.deepcode.json`,
    filters: [{ name: 'Deep code 角色卡', extensions: ['deepcode.json'] }]
  })
  if (result.canceled || !result.filePath) return { canceled: true }
  writeFileSync(result.filePath, JSON.stringify(card, null, 2), 'utf8')
  return { canceled: false, path: result.filePath }
})
ipcMain.handle('workbench:snapshot', () => workbenchSnapshot())
ipcMain.handle('workbench:image-drafts', (_event, scopeId) => imageDrafts.list(imageDraftScope(scopeId)))
ipcMain.handle('workbench:pick-images', async (_event, scopeId) => {
  const key = imageDraftScope(scopeId)
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '添加要交给 Agent 查看的图片',
    buttonLabel: '添加这些图片',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
  })
  if (result.canceled) return imageDrafts.list(key)
  return imageDrafts.addFiles(key, result.filePaths)
})
ipcMain.handle('ecosystem:status', () => ecosystemCatalog.status(settings.ecosystemDiscoveryEnabled === true))
ipcMain.handle('ecosystem:set-enabled', async (_event, enabled) => {
  const next = enabled === true
  saveSettings({ ecosystemDiscoveryEnabled: next })
  return next ? ecosystemCatalog.refresh({ enabled: true }) : ecosystemCatalog.clear()
})
ipcMain.handle('ecosystem:refresh', () => ecosystemCatalog.refresh({ enabled: settings.ecosystemDiscoveryEnabled === true }))
ipcMain.handle('control-center:snapshot', async () => {
  const runtime = supervisor.snapshot()
  const snapshot = workbench.snapshot()
  const thread = snapshot.threads.find((item) => item.id === snapshot.activeThreadId)
  const result = {
    project: {
      path: settings.workspacePath || '',
      ready: Boolean(settings.workspacePath),
      taskCount: snapshot.threads.length
    },
    engine: { state: runtime.state, ready: runtime.state === 'ready' && Boolean(runtime.url) },
    task: thread ? { id: thread.id, title: thread.title, sessionId: thread.sessionId || '' } : null,
    skills: [],
    skillsState: 'needs-session',
    skillsMessage: '先在当前项目中创建或打开一个已连接 Engine 的任务，才能读取这个项目真实可用的 Skills。'
  }
  if (!result.engine.ready) {
    result.skillsState = 'engine-offline'
    result.skillsMessage = 'Engine 尚未启动。启动本机 Engine 本身不会调用模型或消耗模型 token。'
    return result
  }
  if (!thread?.sessionId) return result
  try {
    await dshAdapter.createSession({ baseUrl: runtime.url, cwd: settings.workspacePath, sessionId: thread.sessionId })
    const catalog = await dshAdapter.listSkills({ baseUrl: runtime.url, sessionId: thread.sessionId })
    result.skills = Array.isArray(catalog?.skills) ? catalog.skills.map((skill) => ({
      name: String(skill?.name || ''),
      description: String(skill?.description || '上游没有提供说明。'),
      whenToUse: typeof skill?.whenToUse === 'string' ? skill.whenToUse : '',
      modelInvocable: skill?.modelInvocable === true
    })).filter((skill) => skill.name) : []
    result.skillsState = 'ready'
    result.skillsMessage = `Harness 为当前项目报告了 ${result.skills.length} 个可调用 Skill。读取清单不会调用模型。`
  } catch (error) {
    result.skillsState = 'error'
    result.skillsMessage = `无法读取 Skills：${error.message}`
  }
  return result
})
ipcMain.handle('workbench:remove-image', (_event, scopeId, id) => imageDrafts.remove(imageDraftScope(scopeId), id))
ipcMain.handle('workbench:create-task', async (_event, draft) => {
  const attachmentIds = Array.isArray(draft?.attachmentIds) ? draft.attachmentIds.map(String) : []
  const thread = workbench.create({ title: String(draft?.title || ''), prompt: String(draft?.prompt || ''), hasAttachments: attachmentIds.length > 0 })
  const sourceScope = imageDraftScope(draft?.attachmentScope || 'new-task')
  imageDrafts.moveScope(sourceScope, thread.id)
  const sent = await launchTask(thread, { images: imageDrafts.resolve(thread.id, attachmentIds) })
  if (sent) imageDrafts.clear(thread.id, attachmentIds)
  return workbenchSnapshot()
})
ipcMain.handle('workbench:create-project-brief', async () => {
  const thread = workbench.create({ title: '用人话看懂这个项目', prompt: buildProjectBriefPrompt() })
  await launchTask(thread)
  return workbenchSnapshot()
})
ipcMain.handle('workbench:create-connection-test', async () => {
  const thread = workbench.create({ title: '验证模型连接', prompt: MODEL_CONNECTION_TEST_PROMPT })
  await launchTask(thread)
  return workbenchSnapshot()
})
ipcMain.handle('workbench:retry-task', async (_event, id) => {
  const snapshot = workbench.snapshot()
  const thread = snapshot.threads.find((item) => item.id === String(id || snapshot.activeThreadId || ''))
  if (!thread) throw new Error('找不到要重试的任务。')
  const runtime = await ensureEngineReady()
  if (thread.sessionId) {
    await dshAdapter.createSession({ baseUrl: runtime.url, cwd: settings.workspacePath, sessionId: thread.sessionId })
    const agent = await dshAdapter.snapshot({ baseUrl: runtime.url, sessionId: thread.sessionId })
    if (retryDisposition(agent) === 'reconnect') {
      ensureLiveSession(runtime.url, thread.sessionId)
      workbench.setEngineState(thread.id, { state: agent.running ? 'running' : 'ready', error: '' })
      return workbenchSnapshot()
    }
  }
  const attachmentIds = imageDrafts.list(thread.id).map((item) => item.id)
  const sent = await launchTask(thread, { images: imageDrafts.resolve(thread.id, attachmentIds) })
  if (sent) imageDrafts.clear(thread.id, attachmentIds)
  return workbenchSnapshot()
})
ipcMain.handle('workbench:send-message', async (_event, id, text, attachmentIds) => {
  const snapshot = workbench.snapshot()
  const thread = snapshot.threads.find((item) => item.id === String(id || snapshot.activeThreadId || ''))
  if (!thread?.sessionId) throw new Error('这个任务还没有连接到 Engine 会话。')
  const runtime = await ensureEngineReady()
  await dshAdapter.createSession({ baseUrl: runtime.url, cwd: settings.workspacePath, sessionId: thread.sessionId })
  ensureLiveSession(runtime.url, thread.sessionId)
  const ids = Array.isArray(attachmentIds) ? attachmentIds.map(String) : []
  const images = imageDrafts.resolve(thread.id, ids)
  await prepareImagesForPrompt({ runtime, sessionId: thread.sessionId, threadId: thread.id, images })
  await dshAdapter.prompt({
    baseUrl: runtime.url,
    sessionId: thread.sessionId,
    text: String(text || ''),
    images
  })
  imageDrafts.clear(thread.id, ids)
  workbench.setEngineState(thread.id, { state: 'running', notice: images.length ? undefined : '' })
  return workbenchSnapshot()
})
ipcMain.handle('workbench:cancel', async (_event, id) => {
  const snapshot = workbench.snapshot()
  const thread = snapshot.threads.find((item) => item.id === String(id || snapshot.activeThreadId || ''))
  if (!thread?.sessionId) throw new Error('这个任务还没有可停止的 Engine 会话。')
  const runtime = await ensureEngineReady()
  await dshAdapter.cancel({ baseUrl: runtime.url, sessionId: thread.sessionId })
  return workbenchSnapshot()
})
ipcMain.handle('workbench:respond-interaction', async (_event, id, response) => {
  const snapshot = workbench.snapshot()
  const thread = snapshot.threads.find((item) => item.id === String(id || snapshot.activeThreadId || ''))
  if (!thread?.sessionId) throw new Error('这个任务没有可响应的 Engine 会话。')
  const runtime = runningEngine()
  const live = ensureLiveSession(runtime.url, thread.sessionId)
  await live.respond({
    interactionId: String(response?.interactionId || ''),
    action: String(response?.action || ''),
    answers: response?.answers
  })
  return workbenchSnapshot()
})
ipcMain.handle('workbench:select-task', async (_event, id) => {
  workbench.select(String(id || ''))
  return workbenchSnapshot()
})
ipcMain.handle('workbench:delete-task', (_event, id) => {
  const taskId = String(id || '')
  if (taskId) imageDrafts.clear(taskId)
  return workbench.remove(taskId)
})
ipcMain.handle('workbench:handoff-preview', (_event, id) => {
  const taskState = workbench.snapshot()
  const thread = taskState.threads.find((item) => item.id === String(id || taskState.activeThreadId || ''))
  const cardState = companionCards.snapshot()
  return buildHandoffPreview({ thread, cards: cardState.cards, active: cardState.active })
})
