const { app, BrowserWindow } = require('electron')
const { join } = require('node:path')

// PROTOTYPE ONLY — opens the zero-token task-state gallery without Main, Preload, Engine, or task storage.
app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1040,
    minHeight: 680,
    title: 'Deep code · Evidence prototype',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  await window.loadFile(join(__dirname, '..', 'src', 'renderer', 'task-evidence-prototype.html'))
})

app.on('window-all-closed', () => app.quit())
