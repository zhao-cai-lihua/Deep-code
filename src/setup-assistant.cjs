const { spawn, execFileSync } = require('node:child_process')
const { existsSync, mkdirSync, readFileSync } = require('node:fs')
const { join, resolve } = require('node:path')
const { sanitizedEnvironment } = require('./safe-child-environment.cjs')
const { VERIFIED_HARNESS } = require('./engine-trust.cjs')

const OFFICIAL_REPOSITORY = 'https://github.com/deepseek-ai/deepseek-harness.git'

function normalizedRepository(value) {
  return String(value || '').trim().toLowerCase().replace(/\.git$/, '').replace(/^git@github\.com:/, 'https://github.com/')
}

function verifyPinnedCheckout(runtimePath, { readText = readFileSync, runGit = execFileSync } = {}) {
  const manifest = JSON.parse(readText(join(runtimePath, 'package.json'), 'utf8'))
  const origin = String(runGit('git', ['-C', runtimePath, 'config', '--get', 'remote.origin.url'], { encoding: 'utf8', windowsHide: true })).trim()
  const revision = String(runGit('git', ['-C', runtimePath, 'rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true })).trim()
  if (normalizedRepository(origin) !== normalizedRepository(OFFICIAL_REPOSITORY)) throw new Error('克隆结果的 origin 不是官方 DeepSeek Harness 仓库。')
  if (manifest.name !== VERIFIED_HARNESS.packageName || manifest.version !== VERIFIED_HARNESS.version) throw new Error('克隆结果的 Harness package 身份或版本不匹配。')
  if (revision !== VERIFIED_HARNESS.revision) throw new Error('克隆结果的 Git HEAD 与固定版本不匹配。')
  return { origin, revision, version: manifest.version }
}

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
      env: sanitizedEnvironment(process.env)
    })
    child.stdout?.on('data', (chunk) => onLine(String(chunk).trim()))
    child.stderr?.on('data', (chunk) => onLine(String(chunk).trim()))
    child.on('error', (error) => reject(new Error(`无法运行 ${command}。请先安装它并重新打开 Deep code。${error.code ? ` (${error.code})` : ''}`)))
    child.on('exit', (code) => code === 0 ? resolvePromise() : reject(new Error(`${command} 退出，代码 ${code}。`)))
  })
}

class SetupAssistant {
  constructor({ pathExists = existsSync, readText = readFileSync, makeDirectory = mkdirSync, commandRunner = runCommand, verifyRuntime = verifyPinnedCheckout } = {}) {
    this.pathExists = pathExists
    this.readText = readText
    this.makeDirectory = makeDirectory
    this.commandRunner = commandRunner
    this.verifyRuntime = verifyRuntime
  }

  runtimeCandidates({ desktopPath, documentsPath, configuredPath = '' }) {
    return [
      configuredPath,
      join(desktopPath, 'deepseek-harness'),
      join(documentsPath, 'Deep code Runtime', `deepseek-harness-${VERIFIED_HARNESS.revision.slice(0, 8)}`),
      join(documentsPath, 'Deep code Runtime', 'deepseek-harness')
    ].filter(Boolean)
  }

  detectRuntime(paths) {
    return this.runtimeCandidates(paths).find((candidate) => isOfficialHarness(candidate, { pathExists: this.pathExists, readText: this.readText })) || ''
  }

  async provisionRuntime({ documentsPath, onLine = () => {} }) {
    const runtimeRoot = resolve(documentsPath, 'Deep code Runtime')
    const target = resolve(runtimeRoot, `deepseek-harness-${VERIFIED_HARNESS.revision.slice(0, 8)}`)
    if (this.pathExists(target)) {
      if (isOfficialHarness(target, { pathExists: this.pathExists, readText: this.readText })) {
        this.verifyRuntime(target)
        return target
      }
      throw new Error(`目标目录已存在但不是官方 Harness：${target}`)
    }
    this.makeDirectory(runtimeRoot, { recursive: true })
    onLine('正在克隆官方 DeepSeek Harness…')
    await this.commandRunner('git', ['clone', '--depth', '1', '--branch', VERIFIED_HARNESS.tag, '--single-branch', OFFICIAL_REPOSITORY, target], { cwd: runtimeRoot, onLine })
    this.verifyRuntime(target)
    onLine('正在安装 Harness 依赖…')
    await this.commandRunner('pnpm', ['install', '--frozen-lockfile'], { cwd: target, onLine })
    onLine('正在构建 Harness Web 界面…')
    await this.commandRunner('pnpm', ['run', 'build'], { cwd: target, onLine })
    if (!isOfficialHarness(target, { pathExists: this.pathExists, readText: this.readText })) throw new Error('安装完成后仍无法确认官方 Harness checkout。')
    this.verifyRuntime(target)
    return target
  }
}

module.exports = { OFFICIAL_REPOSITORY, SetupAssistant, isOfficialHarness, normalizedRepository, runCommand, verifyPinnedCheckout }
