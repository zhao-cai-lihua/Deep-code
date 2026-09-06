const { existsSync } = require('node:fs')
const { spawn } = require('node:child_process')
const { isAbsolute, join } = require('node:path')
const { resolveNodeExecutable } = require('./runtime-supervisor.cjs')
const { sanitizedEnvironment } = require('./safe-child-environment.cjs')

const PROFILE = 'web'
const GITHUB_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/
const COMMIT = /^[a-f0-9]{40}$/i
const PACKAGE_NAME = /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i

function validateInstallPlan(value) {
  const fullName = String(value?.fullName || '').trim()
  const commit = String(value?.commit || '').trim()
  const packageName = String(value?.packageName || '').trim()
  const patch = String(value?.patch || '').trim().replace(/^\.\//, '')
  if (!GITHUB_NAME.test(fullName)) throw new Error('插件仓库名称无效。')
  if (!COMMIT.test(commit)) throw new Error('安装必须固定 commit，不能使用会变化的分支或标签。')
  if (!PACKAGE_NAME.test(packageName)) throw new Error('插件 package name 无效。')
  if (!patch || isAbsolute(patch) || patch.split(/[\\/]/).includes('..')) throw new Error('插件 bundle patch 路径无效。')
  return { fullName, commit: commit.toLowerCase(), packageName, patch, spec: `github:${fullName}#${commit.toLowerCase()}` }
}

function resolvePluginEntrypoint(runtimePath, pathExists = existsSync) {
  const built = join(runtimePath, 'apps', 'cli', 'lib', 'bin.js')
  if (pathExists(built)) return ['apps/cli/lib/bin.js']
  const source = join(runtimePath, 'apps', 'cli', 'src', 'bin.ts')
  if (pathExists(source)) return ['--import', 'tsx/esm', 'apps/cli/src/bin.ts']
  throw new Error('这份 Engine 缺少官方 CLI 入口，无法安装插件。')
}

class PluginInstaller {
  constructor({ spawnProcess = spawn, pathExists = existsSync, nodeExecutable = resolveNodeExecutable, environment = process.env } = {}) {
    this.spawnProcess = spawnProcess
    this.pathExists = pathExists
    this.nodeExecutable = nodeExecutable
    this.environment = environment
  }

  install({ runtimePath, plan }) {
    const checked = validateInstallPlan(plan)
    const executable = this.nodeExecutable({ environment: this.environment, pathExists: this.pathExists })
    const childEnvironment = sanitizedEnvironment(this.environment)
    const args = [...resolvePluginEntrypoint(runtimePath, this.pathExists), 'plugin', '--profile', PROFILE, 'add', checked.spec]
    return new Promise((resolve, reject) => {
      let stdout = ''
      let stderr = ''
      const child = this.spawnProcess(executable, args, {
        cwd: runtimePath,
        env: childEnvironment,
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      })
      const append = (current, value) => `${current}${String(value)}`.slice(-24000)
      child.stdout.on('data', (value) => { stdout = append(stdout, value) })
      child.stderr.on('data', (value) => { stderr = append(stderr, value) })
      child.on('error', reject)
      child.on('exit', (code, signal) => {
        if (code === 0) return resolve({ installed: true, profile: PROFILE, packageName: checked.packageName, commit: checked.commit, stdout, stderr })
        reject(new Error(`插件安装失败${code === null ? '' : `（退出代码 ${code}）`}${signal ? `，信号 ${signal}` : ''}。${stderr.trim() ? `\n${stderr.trim()}` : ''}`))
      })
    })
  }
}

module.exports = { PluginInstaller, validateInstallPlan, resolvePluginEntrypoint, PROFILE }
