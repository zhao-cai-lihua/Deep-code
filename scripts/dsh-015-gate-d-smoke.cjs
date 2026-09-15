const { spawn } = require('node:child_process')
const { randomUUID } = require('node:crypto')
const {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync
} = require('node:fs')
const { createRequire } = require('node:module')
const { homedir, tmpdir } = require('node:os')
const { join, resolve } = require('node:path')
const { setTimeout: delay } = require('node:timers/promises')

const { CandidateGateDRunner } = require('../src/candidate-gate-d-runner.cjs')
const { CandidateSessionLab } = require('../src/candidate-session-lab.cjs')
const { DshAdapterV2 } = require('../src/dsh-adapter-v2.cjs')
const { sanitizedEnvironment } = require('../src/safe-child-environment.cjs')
const {
  TYPERT_015_CANDIDATE_PROFILE,
  observeManagedTypertLaunch,
  redactLaunchTokens
} = require('../src/typert-managed-connection.cjs')

const runtimeRoot = resolve(process.argv[2] || '')
const mode = process.argv[3] || '--preflight'
if (!process.argv[2] || !['--preflight', '--execute-once'].includes(mode)) {
  throw new Error('Usage: node scripts/dsh-015-gate-d-smoke.cjs <exact-dsh-runtime-path> [--preflight|--execute-once]')
}

const route = Object.freeze({
  provider: 'deepseek-official',
  model: 'deepseek-v4-flash',
  reasoningEffort: 'low'
})
const sourceHome = join(homedir(), '.dsh')
const sourceCredentials = join(sourceHome, '.credentials.yaml')
const sourceSettings = join(sourceHome, 'settings.yaml')
for (const path of [sourceCredentials, sourceSettings]) {
  if (!existsSync(path)) throw new Error('Gate D 找不到现有 Harness 凭据或设置；没有发送 Prompt。')
}

const root = mkdtempSync(join(tmpdir(), 'deep-code-dsh-015-gate-d-'))
let cleaned = false

function cleanup() {
  if (cleaned) return
  cleaned = true
  try {
    rmSync(root, { recursive: true, force: true })
  } catch {
    // Exit cleanup must never replace the original failure or signal outcome.
  }
}

process.once('exit', cleanup)

const dshHome = join(root, '.dsh')
const agentsHome = join(root, '.agents')
const workspace = join(root, 'workspace')
const presetRoot = join(dshHome, '.agent-presets', 'deep-code-gate-d-text-only')
const patchPath = join(root, 'gate-d.patch.yml')
mkdirSync(dshHome, { recursive: true })
mkdirSync(agentsHome, { recursive: true })
mkdirSync(workspace, { recursive: true })
mkdirSync(presetRoot, { recursive: true })
copyFileSync(sourceCredentials, join(dshHome, '.credentials.yaml'))
copyFileSync(sourceSettings, join(dshHome, 'settings.yaml'))
writeFileSync(join(presetRoot, 'agent.cordis.yml'), [
  "- id: persona",
  "  name: '@deepseek-ai/dsh-persona'",
  "  config:",
  "    prefix: You are a protocol test responder. Follow the one short user instruction and do not request tools.",
  "    complete: true",
  "    includeRuntimeContext: false",
  ""
].join('\n'), { encoding: 'utf8', flag: 'wx' })
writeFileSync(patchPath, [
  '- id: llm-deepseek',
  '  config:',
  '    maxTokens: 32',
  '    retryPolicy:',
  '      mode: normal',
  '      maxRetries: 0',
  '- id: session-title-llm',
  '  disabled: true',
  ''
].join('\n'), { encoding: 'utf8', flag: 'wx' })

const runtime = Object.freeze({
  official: true,
  tag: TYPERT_015_CANDIDATE_PROFILE.tag,
  version: TYPERT_015_CANDIDATE_PROFILE.version,
  revision: TYPERT_015_CANDIDATE_PROFILE.revision
})
const builtBin = join(runtimeRoot, 'apps', 'cli', 'lib', 'bin.js')
const WebSocket = createRequire(join(runtimeRoot, 'apps', 'cli', 'package.json'))('ws')
let connection = null
let child = null
let partialLine = ''
let generation = 1
let interrupting = false

function safeMessage(error) {
  return redactLaunchTokens(error instanceof Error ? error.message : String(error))
    .replace(/\b(?:sk|ds|key)-[A-Za-z0-9_-]{8,}\b/giu, '[redacted]')
    .slice(0, 800)
}

function observeLine(line, ready) {
  if (connection || !line.startsWith('dsh web: ')) return
  const observation = observeManagedTypertLaunch(line, {
    runtime,
    generation,
    fetchImpl: fetch,
    isGenerationCurrent: value => value === generation,
    webSocketFactory: ({ url, headers }) => new WebSocket(url, { headers })
  })
  if (observation.connection) {
    connection = observation.connection
    ready.resolve(connection)
  }
}

function observeChunk(chunk, ready) {
  partialLine += String(chunk)
  const lines = partialLine.split(/\r?\n/u)
  partialLine = lines.pop() || ''
  for (const line of lines) observeLine(line, ready)
  if (!connection && /^dsh web:\s+http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+$/u.test(partialLine)) {
    observeLine(partialLine, ready)
    partialLine = ''
  }
}

async function start() {
  const ready = Promise.withResolvers()
  const timer = setTimeout(() => ready.reject(new Error('Gate D Engine 未在 60 秒内发布认证地址。')), 60_000)
  child = spawn(process.execPath, [
    builtBin, 'web', '--patch', patchPath, '--no-open', '--host', '127.0.0.1', '--port', '0'
  ], {
    cwd: workspace,
    windowsHide: true,
    env: {
      ...sanitizedEnvironment(process.env),
      DSH_HOME: dshHome,
      DSH_AGENTS_HOME: agentsHome,
      DSH_TELEMETRY_DISABLED: '1'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  child.stdout.on('data', chunk => observeChunk(chunk, ready))
  child.stderr.on('data', chunk => observeChunk(chunk, ready))
  child.once('error', error => ready.reject(new Error(`Gate D Engine 无法启动：${safeMessage(error)}`)))
  child.once('exit', code => {
    if (!connection) ready.reject(new Error(`Gate D Engine 在就绪前退出（code ${String(code)}）。`))
  })
  try {
    const managed = await ready.promise
    await managed.authenticate()
    return managed
  } finally {
    clearTimeout(timer)
  }
}

async function stop() {
  generation += 1
  connection?.dispose()
  if (!child || child.exitCode !== null) return
  const closed = Promise.withResolvers()
  child.once('close', () => closed.resolve())
  child.kill('SIGTERM')
  if (await Promise.race([closed.promise.then(() => true), delay(10_000, false, { ref: false })])) return
  if (child.exitCode === null) child.kill('SIGKILL')
  await Promise.race([closed.promise, delay(5_000, undefined, { ref: false })])
}

function interrupt(exitCode) {
  if (interrupting) return
  interrupting = true
  void stop().finally(() => {
    cleanup()
    process.exit(exitCode)
  })
}

process.once('SIGINT', () => interrupt(130))
process.once('SIGTERM', () => interrupt(143))

async function main() {
  const managed = await start()
  const adapter = new DshAdapterV2({ connection: managed })
  if (mode === '--preflight') {
    const catalog = await adapter.modelCatalog()
    const group = catalog.groups.find(value => value?.id === route.provider)
    const model = group?.models?.find(value => value?.id === route.model)
    if (!catalog.routableProviders.includes(route.provider) || !model) {
      throw new Error('Gate D 的低成本文本路由没有通过结构化目录预检；没有发送 Prompt。')
    }
    const efforts = Array.isArray(model.reasoning)
      ? model.reasoning.map(value => typeof value === 'string' ? value : value?.id).filter(Boolean)
      : []
    if (efforts.length > 0 && !efforts.includes(route.reasoningEffort)) {
      throw new Error('Gate D 的低推理强度没有通过结构化目录预检；没有发送 Prompt。')
    }
    return {
      phase: 'preflight',
      runtime: `${runtime.version}@${runtime.revision.slice(0, 12)}`,
      state: 'ready',
      route,
      modality: 'text',
      retryPolicy: { mode: 'normal', maxRetries: 0 },
      outputTokenCap: 32,
      auxiliaryModelCalls: false,
      isolatedCredentialCopy: true,
      promptRequests: 0
    }
  }

  const lab = new CandidateSessionLab({
    adapter,
    connectionGeneration: managed.snapshot().generation
  })
  try {
    await lab.attach({
      cwd: workspace,
      agentPreset: 'deep-code-gate-d-text-only'
    })
    const runner = new CandidateGateDRunner({
      adapter,
      lab,
      requestIdFactory: () => `deep-code-gate-d-${randomUUID()}`,
      timeoutMs: 120_000
    })
    const preflight = await runner.preflight({ selection: route })
    const receipt = await runner.executeOnce({
      text: '这是一次连接验收。不要调用工具，只回复：收到。'
    })
    return {
      phase: 'execute-once',
      runtime: `${runtime.version}@${runtime.revision.slice(0, 12)}`,
      preflight,
      receipt
    }
  } finally {
    await lab.close()
  }
}

main().then(async result => {
  await stop()
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}).catch(async error => {
  await stop()
  process.stderr.write(`${safeMessage(error)}\n`)
  process.exitCode = 1
}).finally(() => {
  cleanup()
})
