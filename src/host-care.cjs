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
    return this.initializeWorkspace({ documentsPath, name })
  }

  initializeWorkspace({ documentsPath, name, description = '' }) {
    const cleanName = String(name || '我的安全工作区').trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').slice(0, 60) || '我的安全工作区'
    const cleanDescription = String(description || '').trim().slice(0, 500)
    const root = resolve(documentsPath, 'Deep code Workspaces')
    const target = resolve(root, cleanName)
    if (!target.startsWith(`${root}${sep}`)) throw new Error('工作区名称无效。')
    if (this.pathExists(target)) throw new Error('同名安全工作区已存在；请换一个名称。')
    this.makeDirectory(target, { recursive: true })
    const metadataDirectory = join(target, '.deep-code')
    this.makeDirectory(metadataDirectory, { recursive: true })
    const files = {
      'README.md': `# ${cleanName}\n\n${cleanDescription || '这是由 Deep code 初始化的本地 Agent 工作区。'}\n\n## 目标\n\n在这里写下这个项目真正要完成的事情。\n\n## 使用方式\n\n- 将项目文件放在这个目录中。\n- 在 Deep code 中创建任务，再显式交给官方 Harness。\n- 提交前检查密钥、个人数据和大文件。\n`,
      'AGENTS.md': `# Agent 协作约定\n\n- 只在当前工作区内读取和修改项目文件。\n- 修改前先理解现有文件与用户目标，不覆盖无关改动。\n- 对删除、覆盖、发布、联网或权限扩大保持谨慎。\n- 区分事实、推断与尚未验证的假设。\n- 完成后说明改了什么、如何验证、还有什么风险。\n`,
      '.gitignore': `# Credentials and local state\n.env\n.env.*\n*.key\n*.pem\n.deep-code/local/\n\n# Common generated output\nnode_modules/\ndist/\nout/\n*.log\n`,
      [join('.deep-code', 'project.json')]: `${JSON.stringify({ format: 'deep-code.project/v1', name: cleanName, description: cleanDescription, createdAt: new Date().toISOString() }, null, 2)}\n`
    }
    for (const [relativePath, content] of Object.entries(files)) this.writeText(join(target, relativePath), content, 'utf8')
    return { path: target, files: Object.keys(files), message: '已创建规范工作区与基础文档。请在官方 Harness 中选择这个文件夹。' }
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
