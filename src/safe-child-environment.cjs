const ALLOWED_NAMES = new Set([
  'PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'USERPROFILE',
  'APPDATA', 'LOCALAPPDATA', 'PROGRAMDATA', 'PROGRAMFILES', 'PROGRAMFILES(X86)',
  'COMMONPROGRAMFILES', 'COMMONPROGRAMFILES(X86)', 'NUMBER_OF_PROCESSORS',
  'PROCESSOR_ARCHITECTURE', 'OS', 'NODE_ENV'
])
const ALLOWED_PREFIXES = ['NPM_CONFIG_', 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY']
const SECRET_NAME = /(KEY|SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL|AUTH)/i

function sanitizedEnvironment(environment = {}) {
  const result = {}
  for (const [name, value] of Object.entries(environment || {})) {
    const normalized = String(name).toUpperCase()
    if (SECRET_NAME.test(normalized)) continue
    if (!ALLOWED_NAMES.has(normalized) && !ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) continue
    if (value === undefined || value === null) continue
    result[name] = String(value)
  }
  return result
}

module.exports = { sanitizedEnvironment }
