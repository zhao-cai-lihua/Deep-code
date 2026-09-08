const { randomUUID } = require('node:crypto')
const { readFileSync } = require('node:fs')
const { execFileSync } = require('node:child_process')
const { resolve, normalize } = require('node:path')

const VERIFIED_HARNESS = Object.freeze({
  tag: 'dsh-v0.1.1-rc.2',
  version: '0.1.1-rc.2',
  revision: 'b150a551b8d465e31e418e1b2eaf5e79bbb7d28e',
  packageName: '@deepseek-ai/dsh-root',
  // This pinned upstream checkout hard-codes host.describe.version to 0.0.1.
  // It is a build marker, not the Harness release or an independent protocol version.
  hostDescribeVersion: '0.0.1'
})

function normalizeLocalPath(value) {
  const path = normalize(resolve(String(value || '')))
  return process.platform === 'win32' ? path.toLowerCase() : path
}

function validateHostDescription(value) {
  if (!value || typeof value !== 'object'
    || typeof value.version !== 'string' || !value.version
    || typeof value.cwd !== 'string' || !value.cwd
    || !Number.isInteger(value.attachedSessions) || value.attachedSessions < 0
    || typeof value.home !== 'string' || !value.home
    || typeof value.canOpenPath !== 'boolean') {
    throw new Error('Engine 的 host.describe 结构不完整，不能建立可信连接。')
  }
  return {
    version: value.version,
    cwd: value.cwd,
    ...(typeof value.provider === 'string' ? { provider: value.provider } : {}),
    ...(typeof value.model === 'string' ? { model: value.model } : {}),
    attachedSessions: value.attachedSessions,
    home: value.home,
    canOpenPath: value.canOpenPath
  }
}

async function describeHarnessHost(baseUrl, fetchImpl = globalThis.fetch) {
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(String(baseUrl || ''))) throw new Error('Engine 必须位于本机回环地址。')
  if (typeof fetchImpl !== 'function') throw new Error('当前环境不支持 Engine 身份检查。')
  let response
  try {
    response = await fetchImpl(`${baseUrl}/api/host.describe`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: `deep-code-trust-${randomUUID()}`, method: 'host.describe', payload: {} })
    })
  } catch { throw new Error('本机服务没有响应 host.describe，不能把它当作 Harness。') }
  if (!response?.ok) throw new Error(`本机服务没有提供可用的 host.describe（HTTP ${response?.status || 'unknown'}）。`)
  let body
  try { body = await response.json() } catch { throw new Error('Engine 的 host.describe 不是有效 JSON。') }
  if (!body?.result?.ok) throw new Error('Engine 拒绝了 host.describe，不能建立可信连接。')
  return validateHostDescription(body.result.value)
}

function inspectCompatibleRuntime(runtimePath, { readText = readFileSync, runGit = execFileSync } = {}) {
  let manifest
  try { manifest = JSON.parse(readText(resolve(runtimePath, 'package.json'), 'utf8')) } catch { throw new Error('无法读取 Harness package.json。') }
  let revision = ''
  try { revision = String(runGit('git', ['-C', runtimePath, 'rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true })).trim() } catch {
    throw new Error('无法确认 Harness 的 Git HEAD；不会启动未经固定的 runtime。')
  }
  const result = {
    official: manifest.name === VERIFIED_HARNESS.packageName,
    version: String(manifest.version || ''),
    revision,
    hostDescribeVersion: VERIFIED_HARNESS.hostDescribeVersion
  }
  if (!result.official) throw new Error('所选目录不是官方 DeepSeek Harness checkout。')
  if (result.version !== VERIFIED_HARNESS.version || result.revision !== VERIFIED_HARNESS.revision) {
    throw new Error(`Harness 版本尚未验证：需要 ${VERIFIED_HARNESS.version} (${VERIFIED_HARNESS.revision.slice(0, 8)})。`)
  }
  return result
}

function assertHostMatchesRuntime(descriptor, runtimePath, runtime) {
  const host = validateHostDescription(descriptor)
  if (!runtime?.hostDescribeVersion) throw new Error('已验证 runtime 缺少 host.describe 兼容标记，不能建立可信连接。')
  if (host.version !== runtime.hostDescribeVersion) {
    throw new Error(`Engine 的 host.describe 标记为 ${host.version}，与此 runtime 固定提交的预期标记 ${runtime.hostDescribeVersion} 不一致。`)
  }
  if (normalizeLocalPath(host.cwd) !== normalizeLocalPath(runtimePath)) throw new Error('Engine 的工作目录与所选 Harness runtime 不一致。')
  return host
}

module.exports = { VERIFIED_HARNESS, assertHostMatchesRuntime, describeHarnessHost, inspectCompatibleRuntime, normalizeLocalPath, validateHostDescription }
