const { EventEmitter } = require('node:events')
const { existsSync } = require('node:fs')
const { spawn } = require('node:child_process')
const { delimiter, join } = require('node:path')
const { sanitizedEnvironment } = require('./safe-child-environment.cjs')
const { assertHostMatchesRuntime, describeHarnessHost, inspectCompatibleRuntime } = require('./engine-trust.cjs')

const LOCAL_URL = /http:\/\/127\.0\.0\.1:(\d+)/

function resolveNodeExecutable({ platform = process.platform, environment = process.env, pathExists = existsSync } = {}) {
  if (platform !== 'win32') return 'node'
  const pathCandidates = String(environment.PATH || '').split(delimiter).map((entry) => entry.trim().replace(/^"|"$/g, '')).filter(Boolean).map((entry) => join(entry, 'node.exe'))
  const fixedCandidates = [
    environment.ProgramFiles && join(environment.ProgramFiles, 'nodejs', 'node.exe'),
    environment['ProgramFiles(x86)'] && join(environment['ProgramFiles(x86)'], 'nodejs', 'node.exe'),
    environment.LOCALAPPDATA && join(environment.LOCALAPPDATA, 'Programs', 'nodejs', 'node.exe')
  ].filter(Boolean)
  const executable = [...pathCandidates, ...fixedCandidates].find((candidate) => pathExists(candidate))
  if (!executable) throw new Error('没有找到 Engine 需要的 Node.js。请运行“检查 Runtime”或使用首次向导自动修复。')
  return executable
}

function resolveHarnessEntrypoint(runtimePath, pathExists = existsSync) {
  const builtEntrypoint = join(runtimePath, 'apps', 'cli', 'lib', 'bin.js')
  if (pathExists(builtEntrypoint)) return ['apps/cli/lib/bin.js', 'web', '--no-open', '--port', '0']
  return ['--import', 'tsx/esm', 'apps/cli/src/bin.ts', 'web', '--no-open', '--port', '0']
}

class RuntimeSupervisor extends EventEmitter {
  constructor({
    spawnProcess = spawn, pathExists = existsSync, probeShared = probeSharedHarness,
    describeHost = describeHarnessHost, inspectRuntime = inspectCompatibleRuntime,
    maxLogLines = 250, platform = process.platform, environment = process.env
  } = {}) {
    super()
    this.spawnProcess = spawnProcess
    this.pathExists = pathExists
    this.probeShared = probeShared
    this.describeHost = describeHost
    this.inspectRuntime = inspectRuntime
    this.maxLogLines = maxLogLines
    this.platform = platform
    this.environment = environment
    this.child = null
    this.sharedCandidate = null
    this.verifyingUrl = null
    this.status = { state: 'stopped', url: null, runtimePath: null, owned: false, kind: null, trust: null, version: null, hostDescribeVersion: null, cwd: null, message: 'Harness 未运行。' }
    this.logs = []
    this.startingAt = 0
  }

  snapshot() { return { ...this.status, logs: [...this.logs] } }

  append(stream, value) {
    for (const line of String(value).split(/\r?\n/)) {
      if (!line) continue
      this.logs.push({ stream, line, at: new Date().toISOString() })
      if (this.logs.length > this.maxLogLines) this.logs.shift()
      const match = line.match(LOCAL_URL)
      if (match && this.child) this.verifyManagedUrl(`http://127.0.0.1:${match[1]}`).catch(() => {})
    }
    this.emit('log', this.snapshot())
  }

  setStatus(next) {
    this.status = { ...this.status, ...next }
    this.emit('status', this.snapshot())
  }

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
    const runtime = this.inspectRuntime(runtimePath)
    const shared = await this.probeShared().catch(() => null)
    if (!shared?.descriptor) return this.startManaged(runtimePath, { resolved: true })
    try {
      const descriptor = assertHostMatchesRuntime(shared.descriptor, runtimePath, runtime)
      this.sharedCandidate = { baseUrl: shared.baseUrl, descriptor, runtimePath, runtime }
      this.setStatus({
        state: 'awaiting-user', url: null, runtimePath, owned: false, kind: 'shared', trust: null,
        version: runtime.version, hostDescribeVersion: descriptor.version, cwd: descriptor.cwd,
        message: '发现不是由 Deep Code 启动的共享 Harness。确认来源后才能连接。'
      })
    } catch (error) {
      this.setStatus({ state: 'incompatible', url: null, runtimePath, owned: false, kind: 'shared', trust: null, message: error.message })
    }
    return this.snapshot()
  }

  async startManaged(selectedPath, { resolved = false } = {}) {
    if (this.child) return this.snapshot()
    const runtimePath = resolved ? selectedPath : this.resolveRuntimePath(selectedPath)
    const runtime = this.inspectRuntime(runtimePath)
    this.sharedCandidate = null
    this.logs = []
    this.startingAt = Date.now()
    this.setStatus({ state: 'starting', url: null, runtimePath, owned: true, kind: 'managed', trust: null, version: runtime.version, hostDescribeVersion: null, cwd: null, message: '正在启动固定版本的官方 Harness runtime…' })
    const nodeExecutable = resolveNodeExecutable({ platform: this.platform, environment: this.environment, pathExists: this.pathExists })
    const child = this.spawnProcess(nodeExecutable, resolveHarnessEntrypoint(runtimePath, this.pathExists), {
      cwd: runtimePath, env: sanitizedEnvironment(this.environment), shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
    })
    this.child = child
    child.stdout.on('data', (value) => this.append('stdout', value))
    child.stderr.on('data', (value) => this.append('stderr', value))
    child.on('error', (error) => this.setStatus({ state: 'error', url: null, trust: null, message: error.message }))
    child.on('exit', (code, signal) => {
      this.child = null
      const wasError = this.status.state === 'error'
      const message = this.status.state === 'stopping'
        ? 'Harness 已停止.'
        : wasError ? this.status.message : `Harness 已退出${code === null ? '' : `，退出代码 ${code}`}${signal ? ` (${signal})` : ''}。`
      this.setStatus({ state: wasError ? 'error' : 'stopped', url: null, owned: false, trust: null, message })
    })
    return this.snapshot()
  }

  async verifyManagedUrl(url) {
    if (this.verifyingUrl === url || this.status.state === 'ready') return
    this.verifyingUrl = url
    this.setStatus({ state: 'probing', url: null, message: '正在核对 Engine 版本与工作目录…' })
    try {
      const runtime = this.inspectRuntime(this.status.runtimePath)
      const descriptor = assertHostMatchesRuntime(await this.describeHost(url), this.status.runtimePath, runtime)
      const elapsedSeconds = this.startingAt ? Math.max(0.1, (Date.now() - this.startingAt) / 1000).toFixed(1) : null
      this.setStatus({
        state: 'ready', url, owned: true, kind: 'managed', trust: 'managed-process',
        version: runtime.version, hostDescribeVersion: descriptor.version, cwd: descriptor.cwd,
        message: elapsedSeconds ? `由 Deep Code 启动的 Harness 已验证，用时 ${elapsedSeconds} 秒。` : '由 Deep Code 启动的 Harness 已验证。'
      })
    } catch (error) {
      this.setStatus({ state: 'error', url: null, trust: null, message: `Engine 验证失败：${error.message}` })
      if (this.child) this.child.kill('SIGINT')
      throw error
    } finally { this.verifyingUrl = null }
  }

  async confirmShared() {
    const candidate = this.sharedCandidate
    if (!candidate || this.status.state !== 'awaiting-user') throw new Error('当前没有等待确认的共享 Engine。')
    const currentRuntime = this.inspectRuntime(candidate.runtimePath)
    const descriptor = assertHostMatchesRuntime(await this.describeHost(candidate.baseUrl), candidate.runtimePath, currentRuntime)
    if (descriptor.version !== candidate.descriptor.version || descriptor.cwd !== candidate.descriptor.cwd) {
      this.sharedCandidate = null
      throw new Error('共享 Engine 在确认前发生了变化，请重新检查。')
    }
    this.setStatus({
      state: 'ready', url: candidate.baseUrl, runtimePath: candidate.runtimePath, owned: false, kind: 'shared', trust: 'user-confirmed-shared',
      version: currentRuntime.version, hostDescribeVersion: descriptor.version, cwd: descriptor.cwd,
      message: '已连接你明确确认的共享 Harness。Deep Code 无法控制它继承的环境变量。'
    })
    return this.snapshot()
  }

  waitUntilReady({ timeoutMs = 20000 } = {}) {
    const current = this.snapshot()
    if (current.state === 'ready' && current.url && current.trust) return Promise.resolve(current)
    if (current.state === 'awaiting-user') return Promise.reject(new Error('共享 Engine 正在等待你的明确确认。'))
    if (['error', 'stopped', 'incompatible'].includes(current.state)) return Promise.reject(new Error(current.message || 'Harness 没有启动。'))
    return new Promise((resolvePromise, reject) => {
      let settled = false
      const finish = (callback, value) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        this.off('status', onStatus)
        callback(value)
      }
      const onStatus = (status) => {
        if (status.state === 'ready' && status.url && status.trust) finish(resolvePromise, status)
        else if (['error', 'stopped', 'awaiting-user', 'incompatible'].includes(status.state)) finish(reject, new Error(status.message || 'Harness 没有启动。'))
      }
      const timer = setTimeout(() => finish(reject, new Error(`Harness 启动超过 ${Math.ceil(timeoutMs / 1000)} 秒，仍未通过身份检查。`)), timeoutMs)
      this.on('status', onStatus)
      onStatus(this.snapshot())
    })
  }

  stop() {
    if (!this.child) {
      if (this.status.state === 'ready' && !this.status.owned) this.setStatus({ message: '这份 Harness 由其他终端启动；请在那个终端中停止它。' })
      return this.snapshot()
    }
    this.setStatus({ state: 'stopping', message: '正在停止 Harness…' })
    this.child.kill('SIGINT')
    return this.snapshot()
  }
}

async function probeSharedHarness() {
  try { return { baseUrl: 'http://127.0.0.1:3080', descriptor: await describeHarnessHost('http://127.0.0.1:3080') } } catch { return null }
}

module.exports = { RuntimeSupervisor, probeSharedHarness, resolveHarnessEntrypoint, resolveNodeExecutable }
