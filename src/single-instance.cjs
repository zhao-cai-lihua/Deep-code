function acquireSingleInstance({ app, getWindow = () => null }) {
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return false
  }
  app.on('second-instance', () => {
    const window = getWindow()
    if (!window || window.isDestroyed()) return
    if (window.isMinimized()) window.restore()
    window.focus()
  })
  return true
}

module.exports = { acquireSingleInstance }
