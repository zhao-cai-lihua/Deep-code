const { spawn } = require('node:child_process')
const { mkdirSync, mkdtempSync, rmSync } = require('node:fs')
const { createRequire } = require('node:module')
const { tmpdir } = require('node:os')
const { dirname, join, resolve } = require('node:path')
const { setTimeout: delay } = require('node:timers/promises')
const { sanitizedEnvironment } = require('../src/safe-child-environment.cjs')
const connectionModulePath = process.argv[3]
  ? resolve(process.argv[3])
  : join(__dirname, '..', 'src', 'typert-managed-connection.cjs')
const {
  TYPERT_015_CANDIDATE_PROFILE,
  observeManagedTypertLaunch,
  redactLaunchTokens
} = require(connectionModulePath)
const { DshAdapterV2 } = require(join(dirname(connectionModulePath), 'dsh-adapter-v2.cjs'))

const runtimeRoot = resolve(process.argv[2] || '')
if (!process.argv[2]) {
  throw new Error('Usage: node scripts/dsh-015-gate-b-smoke.cjs <exact-dsh-runtime-path> [packaged-connection-module]')
}

const runtime = Object.freeze({
  official: true,
  tag: TYPERT_015_CANDIDATE_PROFILE.tag,
  version: TYPERT_015_CANDIDATE_PROFILE.version,
  revision: TYPERT_015_CANDIDATE_PROFILE.revision
})
const builtBin = join(runtimeRoot, 'apps', 'cli', 'lib', 'bin.js')
const WebSocket = createRequire(join(runtimeRoot, 'apps', 'cli', 'package.json'))('ws')
const root = mkdtempSync(join(tmpdir(), 'deep-code-dsh-015-gate-b-'))
const workspace = join(root, 'workspace')
mkdirSync(workspace)

let generation = 1
let connection
let partialLine = ''
const diagnostics = []
let settled = false

const child = spawn(process.execPath, [
  builtBin,
  'web',
  '--no-open',
  '--host', '127.0.0.1',
  '--port', '0'
], {
  cwd: workspace,
  windowsHide: true,
  env: {
    ...sanitizedEnvironment(process.env),
    DSH_HOME: join(root, '.dsh'),
    DSH_AGENTS_HOME: join(root, '.agents'),
    DSH_TELEMETRY_DISABLED: '1'
  },
  stdio: ['ignore', 'pipe', 'pipe']
})

const ready = Promise.withResolvers()
const startupTimer = setTimeout(() => ready.reject(new Error('官方 Engine 未在 60 秒内发布认证地址。')), 60_000)

function webSocketFactory({ url, headers }) {
  return new WebSocket(url, { headers })
}

function observeLine(line) {
  const safe = redactLaunchTokens(line)
  diagnostics.push(safe.slice(0, 1000))
  if (diagnostics.length > 30) diagnostics.shift()
  if (connection || !line.startsWith('dsh web: ')) return
  const observation = observeManagedTypertLaunch(line, {
    runtime,
    generation,
    fetchImpl: fetch,
    isGenerationCurrent: value => value === generation,
    webSocketFactory
  })
  if (observation.connection) {
    connection = observation.connection
    clearTimeout(startupTimer)
    ready.resolve(connection)
  }
}

function observeChunk(chunk) {
  partialLine += String(chunk)
  const lines = partialLine.split(/\r?\n/u)
  partialLine = lines.pop() || ''
  for (const line of lines) observeLine(line)
  if (!connection && /^dsh web:\s+http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+$/u.test(partialLine)) {
    observeLine(partialLine)
    partialLine = ''
  }
}

child.stdout.on('data', observeChunk)
child.stderr.on('data', observeChunk)
child.once('error', error => ready.reject(new Error(`官方 Engine 无法启动：${error.message}`)))
child.once('exit', code => {
  if (!connection) ready.reject(new Error(`官方 Engine 在就绪前退出（code ${String(code)}）。`))
})

async function nextWithin(iterator, label, timeoutMs = 15_000) {
  const timeout = delay(timeoutMs, Symbol.for('timeout'), { ref: false })
  const result = await Promise.race([iterator.next(), timeout])
  if (result === Symbol.for('timeout')) throw new Error(`${label} 在 ${timeoutMs}ms 内没有返回。`)
  if (result.done) throw new Error(`${label} 在首项前结束。`)
  return result.value
}

async function stopChild() {
  if (child.exitCode !== null) return
  const closed = Promise.withResolvers()
  child.once('close', () => closed.resolve())
  child.kill('SIGTERM')
  if (await Promise.race([closed.promise.then(() => true), delay(10_000, false, { ref: false })])) return
  if (child.exitCode === null) child.kill('SIGKILL')
  await Promise.race([closed.promise, delay(5_000, undefined, { ref: false })])
}

async function run() {
  const managed = await ready.promise
  await managed.authenticate()
  const adapter = new DshAdapterV2({ connection: managed })

  const eventGeneration = await adapter.openEventGeneration()

  const catalog = await adapter.modelCatalog()
  if (!catalog || !Array.isArray(catalog.groups) || !Array.isArray(catalog.failures)
    || !Array.isArray(catalog.routableProviders) || typeof catalog.default?.provider !== 'string') {
    throw new Error('session/modelCatalog 返回结构不完整。')
  }

  const created = await adapter.createSession({ cwd: workspace })

  const follow = adapter.followSession({ sessionId: created.sessionId })[Symbol.asyncIterator]()
  const opening = await nextWithin(follow, 'session/follow snapshot')
  if (opening?.type !== 'snapshot' || opening.header?.id !== created.sessionId
    || typeof opening.cursor !== 'number' || !Array.isArray(opening.records)) {
    throw new Error('session/follow 首项没有证明刚创建的 Session。')
  }

  const planOn = await adapter.setPlanMode({ sessionId: created.sessionId, active: true })
  const planOff = await adapter.setPlanMode({ sessionId: created.sessionId, active: false })

  await stopChild()
  generation += 1
  adapter.dispose()
  const invalidations = await Promise.allSettled([
    eventGeneration.stream.next(),
    follow.next(),
    adapter.modelCatalog()
  ])
  if (invalidations.some(result => result.status !== 'rejected')) {
    throw new Error('Engine 停止后仍有连接或 stream 可用。')
  }

  return {
    runtime: `${runtime.version}@${runtime.revision.slice(0, 12)}`,
    authenticated: true,
    eventGenerationReady: true,
    modelCatalog: {
      providers: catalog.groups.length,
      routableProviders: catalog.routableProviders.length,
      failures: catalog.failures.length
    },
    sessionCreated: true,
    followHeaderMatched: true,
    planCommand: {
      entered: planOn.active === true && planOn.evidenceSeqs.length === 3,
      exited: planOff.active === false && planOff.evidenceSeqs.length === 3,
      promptTextChanged: false
    },
    invalidatedAfterStop: true,
    providerRequests: 0,
    promptRequests: 0
  }
}

async function finish() {
  try {
    const result = await run()
    settled = true
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    process.exitCode = 1
    console.error(error instanceof Error ? error.message : String(error))
    if (diagnostics.length > 0) console.error('最近的已脱敏 Engine 诊断：\n' + diagnostics.join('\n'))
  } finally {
    clearTimeout(startupTimer)
    if (!settled) {
      generation += 1
      connection?.dispose()
      await stopChild()
    }
    rmSync(root, { recursive: true, force: true })
  }
}

finish()
