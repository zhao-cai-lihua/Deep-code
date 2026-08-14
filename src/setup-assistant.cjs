const { spawn } = require('node:child_process')
const { existsSync, mkdirSync, readFileSync } = require('node:fs')
const { join, resolve } = require('node:path')

const OFFICIAL_REPOSITORY = 'https://github.com/deepseek-ai/deepseek-harness.git'

function isOfficialHarness(path, { pathExists = existsSync, readText = readFileSync } = {}) {
  const manifestPath = join(path || '', 'package.json')
  if (!path || !pathExists(manifestPath)) return false
  try { return JSON.parse(readText(manifestPath, 'utf8')).name === '@deepseek-ai/dsh-root' } catch { return false }
}

function runCommand(command, args, { cwd, onLine = () => {}, spawnProcess = spawn } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawnProcess(command, args, {
      cwd,
      windowsHide: true,
      shell: process.platform === 'win32' && command === 'pnpm',
      env: process.env
    })
    child.stdout?.on('data', (chunk) => onLine(String(chunk).trim()))
    child.stderr?.on('data', (chunk) => onLine(String(chunk).trim()))
    child.on('error', (error) => reject(new Error(`无法运行 ${command}。请先安装它并重新打开 Deep code。${error.code ? ` (${error.code})` : ''}`)))
    child.on('exit', (code) => code === 0 ? resolvePromise() : reject(new Error(`${command} 退出，代码 ${code}。`)))
  })
}

class SetupAssistant {
  constructor({ pathExists = existsSync, readText = readFileSync, makeDirectory = mkdirSync, commandRunner = runCommand } = {}) {
    this.pathExists = pathExists
    this.readText = readText
    this.makeDirectory = makeDirectory
    this.commandRunner = commandRunner
  }

  runtimeCandidates({ desktopPath, documentsPath, configuredPath = '' }) {
    return [
      configuredPath,
      join(desktopPath, 'deepseek-harness'),
      join(documentsPath, 'Deep code Runtime', 'deepseek-harness')
    ].filter(Boolean)
  }

  detectRuntime(paths) {
    return this.runtimeCandidates(paths).find((candidate) => isOfficialHarness(candidate, { pathExists: this.pathExists, readText: this.readText })) || ''
  }

  async provisionRuntime({ documentsPath, onLine = () => {} }) {
    const runtimeRoot = resolve(documentsPath, 'Deep code Runtime')
    const target = resolve(runtimeRoot, 'deepseek-harness')
    if (this.pathExists(target)) {
      if (isOfficialHarness(target, { pathExists: this.pathExists, readText: this.readText })) return target
      throw new Error(`目标目录已存在但不是官方 Harness：${target}`)
    }
    this.makeDirectory(runtimeRoot, { recursive: true })
    onLine('正在克隆官方 DeepSeek Harness…')
    await this.commandRunner('git', ['clone', '--depth', '1', OFFICIAL_REPOSITORY, target], { cwd: runtimeRoot, onLine })
    onLine('正在安装 Harness 依赖…')
    await this.commandRunner('pnpm', ['install', '--frozen-lockfile'], { cwd: target, onLine })
    onLine('正在构建 Harness Web 界面…')
    await this.commandRunner('pnpm', ['run', 'build'], { cwd: target, onLine })
    if (!isOfficialHarness(target, { pathExists: this.pathExists, readText: this.readText })) throw new Error('安装完成后仍无法确认官方 Harness checkout。')
    return target
  }
}

module.exports = { OFFICIAL_REPOSITORY, SetupAssistant, isOfficialHarness, runCommand }
