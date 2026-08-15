const { EventEmitter } = require('node:events')
const { existsSync } = require('node:fs')
const { spawn } = require('node:child_process')
const { delimiter, join } = require('node:path')
const http = require('node:http')

const LOCAL_URL = /http:\/\/127\.0\.0\.1:(\d+)/

function resolveNodeExecutable({
  platform = process.platform,
  environment = process.env,
  pathExists = existsSync
} = {}) {
  if (platform !== 'win32') return 'node'
  const pathCandidates = String(environment.PATH || '')
    .split(delimiter)
    .map((entry) => entry.trim().replace(/^"|"$/g, ''))
    .filter(Boolean)
    .map((entry) => join(entry, 'node.exe'))
  const fixedCandidates = [
    environment.ProgramFiles && join(environment.ProgramFiles, 'nodejs', 'node.exe'),
    environment['ProgramFiles(x86)'] && join(environment['ProgramFiles(x86)'], 'nodejs', 'node.exe'),
    environment.LOCALAPPDATA && join(environment.LOCALAPPDATA, 'Programs', 'nodejs', 'node.exe')
  ].filter(Boolean)
  const executable = [...pathCandidates, ...fixedCandidates].find((candidate) => pathExists(candidate))
  if (!executable) {
    throw new Error('没有找到 Engine 需要的 Node.js。请运行“检查 Runtime”或使用首次向导自动修复。')
  }
  return executable
}

/** Owns one official Harness child process and a bounded diagnostic log. */
class RuntimeSupervisor extends EventEmitter {
  constructor({
    spawnProcess = spawn,
    pathExists = existsSync,
    probeReady = probeDefaultHarness,
    maxLogLines = 250,
    platform = process.platform,
    environment = process.env
  } = {}) {
    super()
    this.spawnProcess = spawnProcess
    this.pathExists = pathExists
    this.probeReady = probeReady
    this.maxLogLines = maxLogLines
    this.platform = platform
    this.environment = environment
    this.child = null
    this.status = { state: 'stopped', url: null, runtimePath: null, owned: false, message: 'Harness 未运行。' }
    this.logs = []
  }

  snapshot() {
    return { ...this.status, logs: [...this.logs] }
  }

  append(stream, value) {
    for (const line of String(value).split(/\r?\n/)) {
      if (!line) continue
      this.logs.push({ stream, line, at: new Date().toISOString() })
      if (this.logs.length > this.maxLogLines) this.logs.shift()
      const match = line.match(LOCAL_URL)
      if (match) this.setStatus({ state: 'ready', url: `http://127.0.0.1:${match[1]}`, message: 'Harness 已就绪。' })
    }
    this.emit('log', this.snapshot())
  }

  setStatus(next) {
    this.status = { ...this.status, ...next }
    this.emit('status', this.snapshot())
  }

  /** Accept the checkout itself or a parent folder containing deepseek-harness. */
  resolveRuntimePath(selectedPath) {
    if (!selectedPath || !this.pathExists(selectedPath)) throw new Error('请选择存在的 DeepSeek Harness 文件夹。')
    for (const candidate of [selectedPath, join(selectedPath, 'deepseek-harness')]) {
      if (this.pathExists(join(candidate, 'package.json'))) return candidate
    }
    throw new Error('这里不是 Harness 本体。请选择 deepseek-harness 文件夹，或选择包含它的上层文件夹。')
  }

  async start(selectedPath) {
    if (this.child) return this.snapshot()
    const runtimePath = this.resolveRuntimePath(selectedPath)
    if (await this.probeReady()) {
      this.setStatus({
        state: 'ready',
        url: 'http://127.0.0.1:3080',
        runtimePath,
        owned: false,
        message: 'Harness 已在本机运行；Desktop Host 已连接到它。'
      })
      return this.snapshot()
    }
    this.logs = []
    this.setStatus({ state: 'starting', url: null, runtimePath, owned: true, message: '正在启动官方 Harness runtime…' })
    // Start the official CLI entrypoint directly through Node. Desktop apps do
    // not inherit development-shell PATH helpers, so relying on a global pnpm
    // made a valid Harness checkout exit immediately on Windows.
    const nodeExecutable = resolveNodeExecutable({
      platform: this.platform,
      environment: this.environment,
      pathExists: this.pathExists
    })
    const child = this.spawnProcess(nodeExecutable, ['--import', 'tsx/esm', 'apps/cli/src/bin.ts', 'web'], {
      cwd: runtimePath,
      env: this.environment,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    this.child = child
    child.stdout.on('data', (value) => this.append('stdout', value))
    child.stderr.on('data', (value) => this.append('stderr', value))
    child.on('error', (error) => this.setStatus({ state: 'error', message: error.message }))
    child.on('exit', (code, signal) => {
      this.child = null
      const message = this.status.state === 'stopping'
        ? 'Harness 已停止。'
        : `Harness 已退出${code === null ? '' : `，退出代码 ${code}`}${signal ? ` (${signal})` : ''}。`
      this.setStatus({ state: 'stopped', url: null, owned: false, message })
    })
    return this.snapshot()
  }

  stop() {
    if (!this.child) {
      if (this.status.state === 'ready' && !this.status.owned) {
        this.setStatus({ message: '这份 Harness 由其他终端启动；请在那个终端中停止它。' })
      }
      return this.snapshot()
    }
    this.setStatus({ state: 'stopping', message: '正在停止 Harness…' })
    this.child.kill('SIGINT')
    return this.snapshot()
  }
}

/** Return true only when the official default loopback UI answers HTTP. */
function probeDefaultHarness() {
  return new Promise((resolve) => {
    const request = http.get('http://127.0.0.1:3080/', { timeout: 800 }, (response) => {
      response.resume()
      resolve(response.statusCode >= 200 && response.statusCode < 400)
    })
    request.on('timeout', () => { request.destroy(); resolve(false) })
    request.on('error', () => resolve(false))
  })
}

module.exports = { RuntimeSupervisor, probeDefaultHarness, resolveNodeExecutable }
