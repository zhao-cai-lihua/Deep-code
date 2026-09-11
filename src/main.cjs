const { app, BrowserWindow, Menu, clipboard, dialog, nativeImage, protocol, session, shell } = require('electron')
const { existsSync, readFileSync, writeFileSync } = require('node:fs')
const { readFile } = require('node:fs/promises')
const { join } = require('node:path')
const { RuntimeSupervisor } = require('./runtime-supervisor.cjs')
const { HostCare } = require('./host-care.cjs')
const { WorkbenchStore } = require('./workbench-store.cjs')
const { SetupAssistant } = require('./setup-assistant.cjs')
const { buildHandoffPreview } = require('./handoff-preview.cjs')
const { DshAdapter } = require('./dsh-adapter.cjs')
const { DshLiveSession } = require('./dsh-live-session.cjs')
const { buildProjectBriefPrompt } = require('./project-explainer.cjs')
const { reconcileOfflineWorkbench, retryDisposition, projectOnlineEngineState } = require('./workbench-projection.cjs')
const { normalizeExternalUrl } = require('./external-links.cjs')
const { projectTaskOutcome } = require('./task-outcome-projection.cjs')
const { isAllowedAppNavigation } = require('./navigation-policy.cjs')
const { projectTaskRun } = require('./run-projection.cjs')
const { ImageDraftStore } = require('./image-draft-store.cjs')
const { EcosystemCatalog } = require('./ecosystem-catalog.cjs')
const { chooseModelRoute } = require('./model-router.cjs')
const { WorkspaceBaseline } = require('./workspace-baseline.cjs')
const { MemoryCandidateStore } = require('./memory-candidate-store.cjs')
const { composeMemoryContext, previewMemoryRetrieval } = require('./memory-retrieval.cjs')
const { projectModelConnectionWithHistory, projectModelServices } = require('./model-service-projection.cjs')
const { projectModelVerificationReceipt } = require('./model-verification-receipt.cjs')
const { projectTaskGuidance } = require('./task-guidance-projection.cjs')
const { acquireSingleInstance } = require('./single-instance.cjs')
const { stopAndDeleteTask } = require('./task-lifecycle.cjs')
const { projectConfirmedBaselineChanges } = require('./baseline-change-projection.cjs')
const { assertCurrentTaskTarget } = require('./task-target-guard.cjs')
const { projectInteractionTimeout } = require('./interaction-timeout-projection.cjs')

protocol.registerSchemesAsPrivileged([{
  scheme: 'deep-code-image',
  privileges: { standard: true, secure: true, supportFetchAPI: false, corsEnabled: false }
}])

const supervisor = new RuntimeSupervisor()
const hostCare = new HostCare()
const dshAdapter = new DshAdapter()
const workspaceBaseline = new WorkspaceBaseline()
const MODEL_CONNECTION_TEST_PROMPT = '这是 Deep code 发起的模型连接验证。请不要调用工具、读取文件或修改任何内容，只回复一句：模型连接验证成功。'
let mainWindow
let settings
let workbench
let setupAssistant
let liveSession
let imageDrafts
let ecosystemCatalog
let memoryStore
const requestedModelRoutes = new Map()
const hasSingleInstanceLock = acquireSingleInstance({ app, getWindow: () => mainWindow })

function closeLiveSession() {
  if (liveSession) liveSession.close()
  liveSession = null
}

function ensureLiveSession(baseUrl, sessionId) {
  if (liveSession?.baseUrl === baseUrl && liveSession?.sessionId === sessionId && !liveSession.closed) return liveSession
  closeLiveSession()
  liveSession = new DshLiveSession({
    baseUrl,
    sessionId,
    onInteractionTimeout: handleInteractionTimeout
  }).start()
  return liveSession
}

function publishWorkbenchChanged() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('workbench:changed')
}

async function handleInteractionTimeout({ sessionId, interactionCount }) {
  const snapshot = workbench.snapshot()
  const thread = snapshot.threads.find((item) => item.sessionId === String(sessionId || ''))
  if (!thread) return
  const runtime = supervisor.snapshot()
  let cancelAccepted = false
  if (runtime.state === 'ready' && runtime.url && runtime.trust) {
    try {
      await dshAdapter.cancel({ baseUrl: runtime.url, sessionId: thread.sessionId })
      cancelAccepted = true
    } catch { /* Recovery text below stays honest about an unconfirmed cancellation. */ }
  }
  const timeout = projectInteractionTimeout({ interactionCount, cancelAccepted })
  workbench.setEngineState(thread.id, timeout.engine)
  workbench.setRecovery(thread.id, timeout.recovery)
  closeLiveSession()
  publishWorkbenchChanged()
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
  if (current.state === 'ready' && current.url && current.trust) return current
  if (!settings.runtimePath) throw new Error('Engine 尚未准备好。请先在首次向导中自动检测或安装。')
  const started = await supervisor.start(settings.runtimePath)
  if (started.state === 'ready' && started.url && started.trust) return started
  return supervisor.waitUntilReady()
}

async function launchTask(thread, { images = [], routing = null } = {}) {
  try {
    workbench.clearRecovery(thread.id)
    if (thread.purpose?.kind === 'model-connection-test') workbench.clearVerificationReceipt(thread.id)
    const workspacePath = thread.workspacePath || settings.workspacePath
    if (!workspacePath) throw new Error('请先创建一个安全工作区，或在设置中选择项目文件夹。')
    const baseline = await workspaceBaseline.capture(workspacePath)
    workbench.setWorkspaceBaseline(thread.id, { workspacePath, baseline })
    const runtime = await ensureEngineReady()
    const sessionId = (await dshAdapter.createSession({
      baseUrl: runtime.url,
      cwd: workspacePath,
      ...(thread.sessionId ? { sessionId: thread.sessionId } : {})
    })).sessionId
    workbench.setEngineState(thread.id, { sessionId, state: 'running', notice: images.length ? undefined : '' })
    ensureLiveSession(runtime.url, sessionId)
    await prepareModelRoute({ runtime, sessionId, threadId: thread.id, routing })
    assertCurrentTaskTarget(workbench.snapshot(), { taskId: thread.id, sessionId })
    workbench.clearAdmission(thread.id)
    const admission = await dshAdapter.prompt({ baseUrl: runtime.url, sessionId, text: thread.prompt, images })
    if (admission?.accepted === true || (typeof admission?.messageId === 'string' && admission.messageId)) {
      workbench.setAdmission(thread.id, {
        accepted: true,
        ...(admission?.messageId ? { messageId: admission.messageId } : {}),
        ...(admission?.rpcId ? { rpcId: admission.rpcId } : {}),
        acceptedAt: new Date().toISOString()
      })
      workbench.setEngineState(thread.id, { state: 'queued' })
    } else {
      workbench.setEngineState(thread.id, { state: 'unknown' })
    }
    return true
  } catch (error) {
    workbench.setEngineState(thread.id, { state: 'error', error: error.message })
    workbench.setRecovery(thread.id, {
      kind: 'launch-failed',
      cause: `任务在发送给模型前没有完成启动：${error.message}`,
      safety: 'Deep code 没有把失败的启动步骤当成模型回复成功。',
      nextAction: '检查模型选择与连接状态后，再从可用模型重新发起。'
    })
    return false
  }
}

function sameSelection(current, selected) {
  return current?.provider === selected?.provider
    && current?.model === selected?.model
    && String(current?.reasoningEffort || '') === String(selected?.reasoningEffort || '')
}

async function prepareModelRoute({ runtime, sessionId, threadId, routing = null }) {
  const directory = await dshAdapter.modelDirectory({ baseUrl: runtime.url, sessionId })
  const request = routing && typeof routing === 'object' ? routing : {}
  const route = chooseModelRoute({
    directory,
    manualSelection: request.manualSelection || null
  })
  const requested = route.selection || route.current
  const selected = !route.selection || sameSelection(directory.current, route.selection)
    ? directory.current
    : await dshAdapter.selectModel({ baseUrl: runtime.url, sessionId, selection: route.selection })
  const effort = selected.reasoningEffort ? ` · ${route.effortName || selected.reasoningEffort}` : ''
  requestedModelRoutes.set(threadId, {
    source: route.source,
    requested: { ...requested },
    label: `${route.modelName}${effort}`
  })
  workbench.setEngineState(threadId, {
    sessionId,
    state: 'running',
    notice: `${route.source === 'user' ? '用户选择' : 'Harness 当前设置'}：${route.modelName}${effort}。${route.explanation}`
  })
  return { route, selected }
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
  if (!thread?.sessionId || runtime.state !== 'ready' || !runtime.url || !runtime.trust) {
    closeLiveSession()
    const offline = reconcileOfflineWorkbench(snapshot)
    if (thread) {
      thread.outcome = projectTaskOutcome(thread)
      thread.run = projectTaskRun(thread)
      thread.guidance = projectTaskGuidance(thread)
    }
    return offline
  }
  try {
    const live = ensureLiveSession(runtime.url, thread.sessionId)
    thread.agent = await dshAdapter.snapshot({
      baseUrl: runtime.url,
      sessionId: thread.sessionId,
      admission: thread.admission,
      engine: { kind: runtime.kind, version: runtime.version, trust: runtime.trust }
    })
    const persistedRequest = thread.purpose?.kind === 'model-connection-test' ? thread.purpose.requestedRoute : null
    const requestedRoute = requestedModelRoutes.get(thread.id) || (persistedRequest ? {
      source: 'user', requested: persistedRequest,
      label: `${persistedRequest.provider} / ${persistedRequest.model}${persistedRequest.reasoningEffort ? ` · ${persistedRequest.reasoningEffort}` : ''}`
    } : null)
    const effective = thread.agent.effectiveModel?.available ? thread.agent.effectiveModel : null
    if (requestedRoute) {
      thread.routeEvidence = {
        ...requestedRoute,
        effective,
        confirmed: Boolean(effective),
        matches: effective
          ? sameSelection(requestedRoute.requested, { provider: effective.provider, model: effective.id, reasoningEffort: effective.reasoningEffort })
          : null
      }
    }
    const projectedState = thread.agent.taskRunSnapshot?.turn?.state || 'unknown'
    if (thread.agent.taskRunSnapshot?.terminal && thread.baseline && thread.workspacePath) {
      const after = thread.completionBaseline || await workspaceBaseline.capture(thread.workspacePath)
      if (!thread.completionBaseline) {
        workbench.setCompletionBaseline(thread.id, after)
        thread.completionBaseline = after
      }
      const independentChanges = projectConfirmedBaselineChanges(thread.baseline, after)
      const known = new Set((thread.agent.taskRunSnapshot.confirmedChanges || []).map((item) => item.path))
      for (const change of independentChanges) {
        if (!known.has(change.path)) thread.agent.taskRunSnapshot.confirmedChanges.push(change)
        if (!(thread.agent.runDetails.changedFiles || []).some((item) => item.path === change.path)) {
          thread.agent.runDetails.changedFiles.push(change)
        }
      }
    }
    thread.agent.running = ['queued', 'running'].includes(projectedState)
    live.reconcileRunning(thread.agent.running)
    thread.agent.live = live.snapshot()
    const terminal = thread.agent.runDetails?.terminal
    if (!thread.verificationReceipt) {
      const verificationReceipt = projectModelVerificationReceipt(thread)
      if (verificationReceipt) {
        workbench.setVerificationReceipt(thread.id, verificationReceipt)
        thread.verificationReceipt = verificationReceipt
      }
    }
    if (thread.recovery?.kind === 'launch-failed' && thread.engineState === 'error') {
      thread.agent.effectiveModel = { available: false, label: '任务未完成模型启动，Session 默认路线不作为本轮采用证据。' }
    }
    const onlineState = projectOnlineEngineState({
      projectedState,
      terminal: thread.agent.taskRunSnapshot?.terminal,
      recovery: thread.recovery,
      existingError: thread.engineError
    })
    thread.engineState = onlineState.state
    thread.engineError = onlineState.error
  } catch (error) {
    thread.engineState = 'error'
    thread.engineError = error.message
  }
  thread.outcome = projectTaskOutcome(thread)
  thread.run = projectTaskRun(thread)
  thread.guidance = projectTaskGuidance(thread)
  return snapshot
}

async function modelConnectionSnapshot() {
  const runtime = supervisor.snapshot()
  if (runtime.state !== 'ready' || !runtime.url || !runtime.trust) {
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

function modelVerificationReceipts() {
  if (!workbench) return []
  return workbench.snapshot().threads.map((thread) => thread.verificationReceipt).filter(Boolean)
}

function modelConnectionWithHistory(connection) {
  return projectModelConnectionWithHistory(connection, modelVerificationReceipts())
}

function runningEngine() {
  const runtime = supervisor.snapshot()
  if (runtime.state !== 'ready' || !runtime.url || !runtime.trust) {
    throw new Error('Engine 尚未启动。请先启动 Engine，再配置模型连接。')
  }
  return runtime
}

async function writableProviderCredential(ref, { requireConfigured = false } = {}) {
  const requestedRef = String(ref || '')
  const snapshot = await modelConnectionSnapshot()
  const provider = (snapshot.activeProviders || []).find((item) => item.credential?.ref === requestedRef)
  if (!provider?.credential) throw new Error('当前 Harness 没有为这个 Provider 公布简单 API Key 配置。')
  if (provider.credential.writable !== true) throw new Error('这个凭据来自只读来源，Deep code 不会覆盖它。')
  if (requireConfigured && provider.credential.configured !== true) throw new Error('这个 Provider 当前没有可清除的 API Key。')
  return { provider, credential: provider.credential }
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
    if (!isAllowedAppNavigation(target, join(__dirname, 'renderer', 'index.html'))) event.preventDefault()
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

if (hasSingleInstanceLock) app.whenReady().then(() => {
  settings = readSettings()
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
  memoryStore = new MemoryCandidateStore(join(app.getPath('userData'), 'memory-vault'))
  memoryStore.initialize()
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
ipcMain.handle('host:model-connection', async () => modelConnectionWithHistory(await modelConnectionSnapshot()))
ipcMain.handle('model-services:snapshot', async () => {
  const snapshot = workbench.snapshot()
  const receipts = modelVerificationReceipts()
  return projectModelServices(await modelConnectionSnapshot(), requestedModelRoutes.get(snapshot.activeThreadId) || null, receipts)
})
ipcMain.handle('host:add-model-provider', async (_event, input) => {
  const runtime = await ensureEngineReady()
  const provisioned = await dshAdapter.provisionCatalogProvider({
    baseUrl: runtime.url,
    provider: input?.provider,
    value: input?.value
  })
  const snapshot = await modelConnectionSnapshot()
  const active = snapshot.activeProviders.find((provider) => provider.id === provisioned.provider)
  if (!active || active.credential?.ref !== provisioned.credentialRef || active.credential?.configured !== true) {
    throw new Error(`Harness 没有用脱敏状态确认“${provisioned.name}”的 Profile 与凭据已经写入。请刷新状态后检查，不要改用其他 Provider 重试。`)
  }
  return { provisioned, snapshot: modelConnectionWithHistory(snapshot) }
})
ipcMain.handle('host:save-model-credential', async (_event, ref, value) => {
  const runtime = runningEngine()
  await writableProviderCredential(ref)
  await dshAdapter.saveCredential({ baseUrl: runtime.url, ref: String(ref || ''), value: String(value || '') })
  return modelConnectionWithHistory(await modelConnectionSnapshot())
})
ipcMain.handle('host:clear-model-credential', async (_event, ref) => {
  const runtime = runningEngine()
  await writableProviderCredential(ref, { requireConfigured: true })
  await dshAdapter.clearCredential({ baseUrl: runtime.url, ref: String(ref || '') })
  return modelConnectionWithHistory(await modelConnectionSnapshot())
})
ipcMain.handle('host:remove-model-provider', async (_event, provider) => {
  const runtime = runningEngine()
  const removed = await dshAdapter.removeCatalogProvider({ baseUrl: runtime.url, provider: String(provider || '') })
  const snapshot = await modelConnectionSnapshot()
  if (snapshot.activeProviders.some((item) => item.id === removed.provider)) throw new Error(`Harness 尚未确认“${removed.name}”已经退出可用服务。凭据已清除，请刷新后重试移除 Profile。`)
  return { removed, snapshot: modelConnectionWithHistory(snapshot) }
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
ipcMain.handle('host:start-managed', (_event, runtimePath) => supervisor.startManaged(String(runtimePath || settings.runtimePath || '')).then((status) => {
  saveSettings({ runtimePath: status.runtimePath })
  return status
}))
ipcMain.handle('host:confirm-shared', () => supervisor.confirmShared())
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
ipcMain.handle('host:use-task-workspace', (_event, id) => {
  const snapshot = workbench.snapshot()
  const thread = snapshot.threads.find((item) => item.id === String(id || snapshot.activeThreadId || ''))
  if (!thread?.workspacePath) throw new Error('这个任务还没有记录自己的工作区。')
  if (!existsSync(thread.workspacePath)) throw new Error('这个任务原来的工作区已经不存在或暂时不可访问。')
  saveSettings({ workspacePath: thread.workspacePath })
  return { workspacePath: thread.workspacePath, taskId: thread.id }
})
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
ipcMain.handle('workbench:snapshot', () => workbenchSnapshot())
ipcMain.handle('workbench:model-catalog', async (_event, id) => {
  const runtime = await ensureEngineReady()
  const thread = workbench.snapshot().threads.find((item) => item.id === String(id || ''))
  const directory = thread?.sessionId
    ? await dshAdapter.modelDirectory({ baseUrl: runtime.url, sessionId: thread.sessionId })
    : await dshAdapter.globalModelDirectory({ baseUrl: runtime.url })
  return {
    current: directory?.current || null,
    routable: directory?.routable !== false,
    groups: (directory?.groups || []).map((group) => ({
      id: String(group?.id || ''),
      name: String(group?.name || group?.id || ''),
      models: (group?.models || []).map((model) => ({
        id: String(model?.id || ''),
        name: String(model?.name || model?.id || ''),
        description: String(model?.description || ''),
        reasoning: model?.reasoning ? {
          defaultEffort: String(model.reasoning.defaultEffort || ''),
          efforts: (model.reasoning.efforts || []).map((effort) => ({
            id: String(effort?.id || ''), name: String(effort?.name || effort?.id || ''), description: String(effort?.description || '')
          })).filter((effort) => effort.id)
        } : null
      })).filter((model) => model.id)
    })).filter((group) => group.id)
  }
})
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
    engine: { state: runtime.state, ready: runtime.state === 'ready' && Boolean(runtime.url) && Boolean(runtime.trust) },
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
    await dshAdapter.createSession({ baseUrl: runtime.url, cwd: thread.workspacePath || settings.workspacePath, sessionId: thread.sessionId })
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
function memorySnapshot() {
  const present = (record) => ({
    id: record.id,
    kind: record.kind,
    scope: record.scope,
    status: record.status,
    sensitivity: record.sensitivity,
    sourceRefs: [...record.sourceRefs],
    createdAt: record.createdAt,
    title: record.title,
    content: record.content,
    reason: record.reason,
    limits: record.limits
  })
  return {
    candidates: memoryStore.list('candidate').map(present),
    confirmed: memoryStore.list('confirmed').map(present),
    rejectedCount: memoryStore.list('rejected').length,
    enginePromptConnected: false
  }
}
ipcMain.handle('memory:snapshot', () => memorySnapshot())
ipcMain.handle('memory:create', (_event, input) => {
  if (input?.scope !== 'global' && !settings.workspacePath) throw new Error('还没有当前项目。请先选择工作区，或明确改为“所有项目”。')
  const scope = input?.scope === 'global' ? 'global' : `project:${settings.workspacePath}`
  memoryStore.createCandidate({
    kind: String(input?.kind || ''),
    scope,
    sensitivity: 'private',
    sourceRefs: ['user:manual'],
    title: String(input?.title || ''),
    content: String(input?.content || ''),
    reason: String(input?.reason || ''),
    limits: String(input?.limits || '')
  })
  return memorySnapshot()
})
ipcMain.handle('memory:review', (_event, id, status) => {
  memoryStore.review(id, status)
  return memorySnapshot()
})
ipcMain.handle('memory:remove', (_event, id) => {
  memoryStore.remove(id)
  return memorySnapshot()
})
ipcMain.handle('memory:open-folder', async () => {
  const target = join(app.getPath('userData'), 'memory-vault')
  memoryStore.initialize()
  const error = await shell.openPath(target)
  if (error) throw new Error(`无法打开记忆文件夹：${error}`)
  return { path: target }
})
ipcMain.handle('memory:preview', (_event, query) => previewMemoryRetrieval({
  records: memoryStore.list('confirmed'),
  query,
  projectPath: settings.workspacePath || ''
}))
ipcMain.handle('memory:compose-preview', (_event, input) => composeMemoryContext({
  records: memoryStore.list('confirmed'),
  query: input?.query,
  projectPath: settings.workspacePath || '',
  selectedIds: input?.selectedIds,
  maxCharacters: 3000
}))
ipcMain.handle('workbench:remove-image', (_event, scopeId, id) => imageDrafts.remove(imageDraftScope(scopeId), id))
ipcMain.handle('workbench:create-task', async (_event, draft) => {
  const attachmentIds = Array.isArray(draft?.attachmentIds) ? draft.attachmentIds.map(String) : []
  const thread = workbench.create({ title: String(draft?.title || ''), prompt: String(draft?.prompt || ''), hasAttachments: attachmentIds.length > 0 })
  const sourceScope = imageDraftScope(draft?.attachmentScope || 'new-task')
  imageDrafts.moveScope(sourceScope, thread.id)
  const sent = await launchTask(thread, {
    images: imageDrafts.resolve(thread.id, attachmentIds),
    routing: draft?.routing || null
  })
  if (sent) imageDrafts.clear(thread.id, attachmentIds)
  return workbenchSnapshot()
})
ipcMain.handle('workbench:create-project-brief', async () => {
  const thread = workbench.create({ title: '用人话看懂这个项目', prompt: buildProjectBriefPrompt() })
  await launchTask(thread)
  return workbenchSnapshot()
})
ipcMain.handle('workbench:create-connection-test', async (_event, routing) => {
  if (!routing?.manualSelection?.provider || !routing?.manualSelection?.model) {
    throw new Error('请先明确选择要验证的 Provider 和模型。')
  }
  const requestedRoute = {
    provider: String(routing.manualSelection.provider),
    model: String(routing.manualSelection.model),
    reasoningEffort: String(routing.manualSelection.reasoningEffort || '')
  }
  const thread = workbench.create({
    title: '验证模型连接', prompt: MODEL_CONNECTION_TEST_PROMPT,
    purpose: { kind: 'model-connection-test', requestedRoute }
  })
  await launchTask(thread, { routing })
  return workbenchSnapshot()
})
ipcMain.handle('workbench:retry-task', async (_event, id) => {
  const snapshot = workbench.snapshot()
  const thread = snapshot.threads.find((item) => item.id === String(id || snapshot.activeThreadId || ''))
  if (!thread) throw new Error('找不到要重试的任务。')
  workbench.clearRecovery(thread.id)
  const runtime = await ensureEngineReady()
  if (thread.sessionId) {
    await dshAdapter.createSession({ baseUrl: runtime.url, cwd: thread.workspacePath || settings.workspacePath, sessionId: thread.sessionId })
    const agent = await dshAdapter.snapshot({
      baseUrl: runtime.url,
      sessionId: thread.sessionId,
      admission: thread.admission,
      engine: { kind: runtime.kind, version: runtime.version, trust: runtime.trust }
    })
    if (retryDisposition(agent) === 'reconnect') {
      ensureLiveSession(runtime.url, thread.sessionId)
      workbench.setEngineState(thread.id, { state: agent.running ? 'running' : 'ready', error: '' })
      return workbenchSnapshot()
    }
  }
  const attachmentIds = imageDrafts.list(thread.id).map((item) => item.id)
  const retryRouting = thread.purpose?.kind === 'model-connection-test'
    ? { manualSelection: thread.purpose.requestedRoute }
    : null
  const sent = await launchTask(thread, { images: imageDrafts.resolve(thread.id, attachmentIds), routing: retryRouting })
  if (sent) imageDrafts.clear(thread.id, attachmentIds)
  return workbenchSnapshot()
})
ipcMain.handle('workbench:send-message', async (_event, id, text, attachmentIds, routing) => {
  const snapshot = workbench.snapshot()
  const thread = snapshot.threads.find((item) => item.id === String(id || snapshot.activeThreadId || ''))
  if (!thread?.sessionId) throw new Error('这个任务还没有连接到 Engine 会话。')
  assertCurrentTaskTarget(snapshot, { taskId: thread.id, sessionId: thread.sessionId })
  workbench.clearRecovery(thread.id)
  const runtime = await ensureEngineReady()
  const workspacePath = thread.workspacePath || settings.workspacePath
  if (!workspacePath) throw new Error('这个任务没有可用的工作区。请先在设置中选择项目文件夹。')
  const baseline = await workspaceBaseline.capture(workspacePath)
  workbench.setWorkspaceBaseline(thread.id, { workspacePath, baseline })
  await dshAdapter.createSession({ baseUrl: runtime.url, cwd: workspacePath, sessionId: thread.sessionId })
  ensureLiveSession(runtime.url, thread.sessionId)
  const ids = Array.isArray(attachmentIds) ? attachmentIds.map(String) : []
  const images = imageDrafts.resolve(thread.id, ids)
  await prepareModelRoute({
    runtime,
    sessionId: thread.sessionId,
    threadId: thread.id,
    prompt: String(text || ''),
    images,
    routing: routing || null
  })
  assertCurrentTaskTarget(workbench.snapshot(), { taskId: thread.id, sessionId: thread.sessionId })
  workbench.clearAdmission(thread.id)
  const admission = await dshAdapter.prompt({
    baseUrl: runtime.url,
    sessionId: thread.sessionId,
    text: String(text || ''),
    images
  })
  imageDrafts.clear(thread.id, ids)
  if (admission?.accepted === true || (typeof admission?.messageId === 'string' && admission.messageId)) {
    workbench.setAdmission(thread.id, {
      accepted: true,
      ...(admission?.messageId ? { messageId: admission.messageId } : {}),
      ...(admission?.rpcId ? { rpcId: admission.rpcId } : {}),
      acceptedAt: new Date().toISOString()
    })
    workbench.setEngineState(thread.id, { state: 'queued', notice: undefined })
  } else {
    workbench.setEngineState(thread.id, { state: 'unknown', notice: undefined })
  }
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
  try {
    await live.respond({
      interactionId: String(response?.interactionId || ''),
      action: String(response?.action || ''),
      answers: response?.answers
    })
  } catch (error) {
    if (error?.code !== 'INTERACTION_NOT_PENDING') throw error
    workbench.setEngineState(thread.id, {
      state: 'error',
      error: '这项提问在提交前已经不再等待；你的回答没有送达 Harness。',
      notice: '原问题已经失效，需要重新连接后再回答。'
    })
    workbench.setRecovery(thread.id, {
      kind: 'interaction-expired',
      cause: 'Harness 已经结束、取消或由其他连接处理了这项等待，因此拒绝了旧问题的回答。',
      safety: 'Deep code 没有把答案发送给其他任务，也没有自行替你选择。',
      nextAction: '点击“重新连接任务”。如果原问题没有再次出现，请把刚才的答案作为一条新消息发送。'
    })
    publishWorkbenchChanged()
  }
  return workbenchSnapshot()
})
ipcMain.handle('workbench:touch-interaction', (_event, id, interactionId) => {
  const snapshot = workbench.snapshot()
  const thread = snapshot.threads.find((item) => item.id === String(id || snapshot.activeThreadId || ''))
  if (!thread?.sessionId || liveSession?.sessionId !== thread.sessionId) return { touched: false }
  return { touched: liveSession.touchInteraction(String(interactionId || '')) }
})
ipcMain.handle('workbench:select-task', async (_event, id) => {
  workbench.select(String(id || ''))
  return workbenchSnapshot()
})
ipcMain.handle('workbench:delete-task', async (_event, id) => {
  const taskId = String(id || '')
  const snapshot = workbench.snapshot()
  const thread = snapshot.threads.find((item) => item.id === taskId)
  if (!thread) throw new Error('找不到要删除的任务。')
  const removeLocal = () => {
    imageDrafts.clear(taskId)
    requestedModelRoutes.delete(taskId)
    return workbench.remove(taskId)
  }
  if (!thread.sessionId || thread.engineState === 'draft' || (thread.engineState === 'error' && thread.recovery?.kind === 'launch-failed')) {
    return removeLocal()
  }

  const runtime = supervisor.snapshot()
  if (runtime.state !== 'ready' || !runtime.url || !runtime.trust) {
    workbench.setEngineState(taskId, {
      state: 'unknown',
      error: 'Deep code 当前无法确认 Harness 是否仍在执行，因此没有删除本地任务记录。'
    })
    workbench.setRecovery(taskId, {
      kind: 'stop-unconfirmed',
      cause: 'Engine 当前离线或尚未通过信任检查，无法确认这项任务是否仍在运行。',
      safety: '本地任务记录仍保留；Deep code 没有声称后台执行已经停止。',
      nextAction: '重新连接原 Engine 后再次选择“停止并删除”，或保留这条记录。'
    })
    return workbenchSnapshot()
  }

  const readAgent = () => dshAdapter.snapshot({
    baseUrl: runtime.url,
    sessionId: thread.sessionId,
    admission: thread.admission,
    engine: { kind: runtime.kind, version: runtime.version, trust: runtime.trust }
  })
  const before = await readAgent()
  if (before.taskRunSnapshot?.terminal) return removeLocal()
  if (!['queued', 'running'].includes(before.taskRunSnapshot?.turn?.state)) {
    workbench.setEngineState(taskId, { state: 'unknown', error: 'Harness 没有提供可确认的本轮终态，因此没有删除任务记录。' })
    workbench.setRecovery(taskId, {
      kind: 'stop-unconfirmed',
      cause: '当前 Session 既没有匹配的运行中轮次，也没有匹配的结束事件。',
      safety: 'Deep code 保留了任务记录，没有把未知状态当成已停止。',
      nextAction: '先重新连接并查看轨迹；确认状态后再停止并删除。'
    })
    return workbenchSnapshot()
  }
  const result = await stopAndDeleteTask({
    expectedTurnId: before.taskRunSnapshot.turn.id,
    cancel: () => dshAdapter.cancel({ baseUrl: runtime.url, sessionId: thread.sessionId }),
    readSnapshot: readAgent,
    remove: removeLocal
  })
  if (result.deleted) return workbench.snapshot()
  workbench.setEngineState(taskId, { state: 'unknown', error: '已发送停止请求，但 10 秒内没有看到 Harness 的同轮结束事件。' })
  workbench.setRecovery(taskId, {
    kind: 'stop-unconfirmed',
    cause: 'Harness 接收了停止请求，但 Deep code 在 10 秒内没有收到同一轮的结束证据。',
    safety: '任务记录仍保留，避免失去重新连接和再次停止所需的信息。',
    nextAction: '重新连接后再次停止，或保留记录并稍后核对轨迹。'
  })
  return workbenchSnapshot()
})
ipcMain.handle('workbench:handoff-preview', (_event, id) => {
  const taskState = workbench.snapshot()
  const thread = taskState.threads.find((item) => item.id === String(id || taskState.activeThreadId || ''))
  return buildHandoffPreview({ thread })
})
