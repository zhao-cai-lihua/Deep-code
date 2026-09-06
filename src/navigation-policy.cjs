const { pathToFileURL } = require('node:url')

function isAllowedAppNavigation(target, appPagePath) {
  try {
    const requested = new URL(target)
    const allowed = new URL(pathToFileURL(appPagePath).href)
    requested.hash = ''
    requested.search = ''
    return requested.href === allowed.href
  } catch {
    return false
  }
}

module.exports = { isAllowedAppNavigation }
