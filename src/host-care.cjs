const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const { join, resolve, sep } = require('node:path')

const SECRET_PATTERNS = [
  /(sk-[A-Za-z0-9_-]{8,})/g,
  /((?:api[_ -]?key|authorization)\s*[:=]\s*)([^\s,;]+)/gi,
  /(Bearer\s+)([^\s,;]+)/gi
]

/**
 * Owns beginner-facing runtime inspection, safe workspace creation, and
 * redacted diagnostics. It never reads credentials or Harness session data.
 */
class HostCare {
  constructor({ pathExists = existsSync, readText = readFileSync, makeDirectory = mkdirSync, writeText = writeFileSync } = {}) {
    this.pathExists = pathExists
    this.readText = readText
    this.makeDirectory = makeDirectory
    this.writeText = writeText
  }

  inspectRuntime(runtimePath) {
    const manifestPath = join(runtimePath || '', 'package.json')
    const checks = []
    if (!runtimePath || !this.pathExists(manifestPath)) {
      return { runtimePath: runtimePath || '', identity: 'unknown', checks: [{ id: 'checkout', state: 'error', label: '未找到 Harness 源码', detail: '请选择 deepseek-harness 文件夹，或它的上层文件夹。' }] }
    }
    let manifest
    try { manifest = JSON.parse(this.readText(manifestPath, 'utf8')) } catch {
      return { runtimePath, identity: 'unknown', checks: [{ id: 'manifest', state: 'error', label: '无法读取 package.json', detail: '这个文件夹不是可用的 Harness checkout。' }] }
    }
    const official = manifest.name === '@deepseek-ai/dsh-root'
    checks.push({
      id: 'identity',
      state: official ? 'pass' : 'warn',
      label: official ? `官方 Harness ${manifest.version || 'unknown'}` : `未知 runtime：${manifest.name || '未命名 package'}`,
      detail: official ? '已识别为官方 Harness checkout。' : '未能用 package name 确认官方 Harness；启动前请核对来源。'
    })
    checks.push({
      id: 'dependencies',
      state: this.pathExists(join(runtimePath, 'node_modules')) ? 'pass' : 'warn',
      label: this.pathExists(join(runtimePath, 'node_modules')) ? '依赖已安装' : '依赖尚未安装',
      detail: this.pathExists(join(runtimePath, 'node_modules')) ? 'Host 可以尝试启动 runtime。' : '请在该文件夹运行 pnpm install。'
    })
    checks.push({
      id: 'web-build',
      state: this.pathExists(join(runtimePath, 'apps', 'web', 'dist')) ? 'pass' : 'warn',
      label: this.pathExists(join(runtimePath, 'apps', 'web', 'dist')) ? 'Web 界面已构建' : 'Web 界面可能尚未构建',
      detail: this.pathExists(join(runtimePath, 'apps', 'web', 'dist')) ? '发现 apps/web/dist。' : '如果启动失败，请在该文件夹运行 pnpm run build。'
    })
    return { runtimePath, identity: official ? 'official' : 'unverified', version: manifest.version || null, checks }
  }

  createSafeWorkspace({ documentsPath, name }) {
    const cleanName = String(name || '我的安全工作区').trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').slice(0, 60) || '我的安全工作区'
    const root = resolve(documentsPath, 'DSH Workspaces')
    const target = resolve(root, cleanName)
    if (!target.startsWith(`${root}${sep}`)) throw new Error('工作区名称无效。')
    if (this.pathExists(target)) throw new Error('同名安全工作区已存在；请换一个名称。')
    this.makeDirectory(target, { recursive: true })
    return { path: target, message: '已创建独立工作区。请在官方 Harness 中选择这个文件夹。' }
  }

  exportDiagnostics({ destinationPath, hostVersion, runtimeReport, runtimeStatus }) {
    const payload = {
      format: 'dsh-desktop-host-diagnostics/v1',
      exportedAt: new Date().toISOString(),
      hostVersion,
      runtime: runtimeReport,
      runtimeStatus: {
        state: runtimeStatus.state,
        url: runtimeStatus.url,
        owned: runtimeStatus.owned,
        message: redact(runtimeStatus.message),
        logs: (runtimeStatus.logs || []).map(({ stream, line, at }) => ({ stream, at, line: redact(line) }))
      },
      excluded: ['API keys', 'model credentials', 'Harness sessions', 'workspace files', 'chat content']
    }
    this.writeText(destinationPath, JSON.stringify(payload, null, 2), 'utf8')
    return { path: destinationPath, message: '已导出脱敏诊断包。' }
  }
}

function redact(value) {
  let result = String(value || '')
  for (const pattern of SECRET_PATTERNS) result = result.replace(pattern, '$1[REDACTED]')
  return result
}

module.exports = { HostCare, redact }
