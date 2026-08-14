const { app, BrowserWindow, Menu, dialog, session } = require('electron')
const { existsSync, readFileSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')
const { RuntimeSupervisor } = require('./runtime-supervisor.cjs')
const { HostCare } = require('./host-care.cjs')
const { ReplyModeStore } = require('./reply-mode-store.cjs')
const { CompanionCardStore } = require('./companion-card-store.cjs')
const { WorkbenchStore } = require('./workbench-store.cjs')
const { SetupAssistant } = require('./setup-assistant.cjs')
const { buildHandoffPreview } = require('./handoff-preview.cjs')

const supervisor = new RuntimeSupervisor()
const hostCare = new HostCare()
let mainWindow
let harnessWindow
let settings
let replyModes
let companionCards
let workbench
let setupAssistant

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

function isLocalHarnessUrl(value) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' && parsed.hostname === '127.0.0.1' && /^\d+$/.test(parsed.port)
  } catch { return false }
}

function publishStatus() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('host:status', supervisor.snapshot())
}

function loadHost() {
  return mainWindow.loadFile(join(__dirname, 'renderer', 'index.html'))
}

function openHarness() {
  const { url } = supervisor.snapshot()
  if (!url) throw new Error('Harness is not ready yet.')
  if (harnessWindow && !harnessWindow.isDestroyed()) {
    harnessWindow.focus()
    return Promise.resolve()
  }
  harnessWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 920,
    minHeight: 620,
    title: 'DeepSeek Harness · Deep code',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true }
  })
  harnessWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  harnessWindow.on('closed', () => { harnessWindow = undefined })
  return harnessWindow.loadURL(url)
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
        { label: 'Open running Harness', click: () => openHarness().catch(() => loadHost()) },
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
  setupAssistant = new SetupAssistant()
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  supervisor.on('status', publishStatus)
  supervisor.on('log', publishStatus)
  createMenu()
  createWindow()
})

app.on('window-all-closed', () => {
  supervisor.stop()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => supervisor.stop())

const { ipcMain } = require('electron')
ipcMain.handle('host:status', () => ({ ...supervisor.snapshot(), runtimePath: settings.runtimePath }))
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
ipcMain.handle('host:stop', () => supervisor.stop())
ipcMain.handle('host:open-harness', () => openHarness())
ipcMain.handle('host:create-safe-workspace', (_event, name) => hostCare.createSafeWorkspace({
  documentsPath: app.getPath('documents'),
  name: String(name || '')
}))
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
ipcMain.handle('workbench:snapshot', () => workbench.snapshot())
ipcMain.handle('workbench:create-task', (_event, draft) => workbench.create({
  title: String(draft?.title || ''),
  prompt: String(draft?.prompt || '')
}))
ipcMain.handle('workbench:select-task', (_event, id) => workbench.select(String(id || '')))
ipcMain.handle('workbench:delete-task', (_event, id) => workbench.remove(String(id || '')))
ipcMain.handle('workbench:handoff-preview', (_event, id) => {
  const taskState = workbench.snapshot()
  const thread = taskState.threads.find((item) => item.id === String(id || taskState.activeThreadId || ''))
  const cardState = companionCards.snapshot()
  return buildHandoffPreview({ thread, cards: cardState.cards, active: cardState.active })
})
