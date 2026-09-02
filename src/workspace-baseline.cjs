const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const { existsSync, statSync } = require('node:fs')

const execFileAsync = promisify(execFile)
const GIT_TIMEOUT_MS = 5000
const GIT_MAX_BUFFER = 2 * 1024 * 1024

function normalizePath(value) {
  return String(value || '').trim().replaceAll('\\', '/')
}

function parsePorcelain(output) {
  const fields = String(output || '').split('\0')
  const paths = []
  for (let index = 0; index < fields.length; index += 1) {
    const entry = fields[index]
    if (!entry) continue
    const status = entry.slice(0, 2)
    const path = normalizePath(entry.slice(3))
    if (path) paths.push(path)
    if (status.includes('R') || status.includes('C')) {
      const originalPath = normalizePath(fields[index + 1])
      if (originalPath) paths.push(originalPath)
      index += 1
    }
  }
  return [...new Set(paths)].sort()
}

async function defaultRunGit(cwd, args) {
  const result = await execFileAsync('git', args, {
    cwd,
    windowsHide: true,
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: GIT_MAX_BUFFER,
    encoding: 'utf8'
  })
  return String(result.stdout || '')
}

function failure(state, workspacePath, message, capturedAt) {
  return { version: 1, state, workspacePath, repoRoot: '', head: '', dirtyPaths: [], capturedAt, message }
}

class WorkspaceBaseline {
  constructor({ runGit = defaultRunGit, now = () => new Date().toISOString() } = {}) {
    this.runGit = runGit
    this.now = now
  }

  async capture(workspacePath) {
    const requestedPath = String(workspacePath || '').trim()
    const capturedAt = this.now()
    let directoryExists = false
    try { directoryExists = Boolean(requestedPath && existsSync(requestedPath) && statSync(requestedPath).isDirectory()) } catch { directoryExists = false }
    if (!directoryExists) {
      return failure('unavailable', requestedPath, '任务工作区不存在，无法记录 Git 基线。', capturedAt)
    }

    let repoRoot
    try {
      repoRoot = String(await this.runGit(requestedPath, ['rev-parse', '--show-toplevel'])).trim()
    } catch (error) {
      const notGit = error?.code === 128 || /not a git repository/i.test(String(error?.stderr || error?.message || ''))
      return failure(
        notGit ? 'not-git' : 'unavailable', requestedPath,
        notGit ? '这个工作区不是 Git 仓库；Deep Code 不会假装它有 Git 恢复点。' : 'Git 当前不可用，无法记录任务开始前的状态。',
        capturedAt
      )
    }

    let head = ''
    try { head = await this.runGit(repoRoot, ['rev-parse', '--verify', 'HEAD']) } catch { /* An unborn repository has no HEAD. */ }

    try {
      const status = await this.runGit(repoRoot, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
      const dirtyPaths = parsePorcelain(status)
      return {
        version: 1,
        state: dirtyPaths.length ? 'dirty' : 'clean',
        workspacePath: requestedPath,
        repoRoot: String(repoRoot || '').trim(),
        head: String(head || '').trim(),
        dirtyPaths,
        capturedAt,
        message: dirtyPaths.length ? `任务开始前已有 ${dirtyPaths.length} 个未提交路径。` : '任务开始前 Git 工作区干净。'
      }
    } catch {
      return failure('unavailable', requestedPath, '读取 Git 工作区状态失败，无法判断改动归属。', capturedAt)
    }
  }
}

module.exports = { WorkspaceBaseline, parsePorcelain }
