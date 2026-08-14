const { spawn } = require('node:child_process')
const { mkdtempSync } = require('node:fs')
const { createRequire } = require('node:module')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { pathToFileURL } = require('node:url')
const { DshAdapter } = require('../src/dsh-adapter.cjs')

const dshRoot = process.argv[2]
if (!dshRoot) throw new Error('Usage: node scripts/smoke-dsh-adapter.cjs <deepseek-harness-path>')

const workspace = mkdtempSync(join(tmpdir(), 'deep-code-dsh-smoke-'))
const tsxLoader = pathToFileURL(createRequire(join(dshRoot, 'package.json')).resolve('tsx')).href
const child = spawn(process.execPath, ['--import', tsxLoader, join(dshRoot, 'apps', 'cli', 'src', 'bin.ts'), 'web', '--port', '0'], {
  cwd: workspace,
  windowsHide: true,
  env: {
    ...process.env,
    DEEPSEEK_API_KEY: 'deep-code-protocol-smoke-no-model-call',
    DSH_HOME: join(workspace, '.dsh'),
    DSH_AGENTS_HOME: join(workspace, '.agents'),
    TSX_TSCONFIG_PATH: join(dshRoot, 'tsconfig.json')
  },
  stdio: ['ignore', 'pipe', 'pipe']
})

let output = ''
let settled = false
const timeout = setTimeout(() => finish(new Error(`DSH did not become ready.\n${output}`)), 90_000)

async function verify(baseUrl) {
  const adapter = new DshAdapter()
  const created = await adapter.createSession({ baseUrl, cwd: workspace })
  const snapshot = await adapter.snapshot({ baseUrl, sessionId: created.sessionId })
  await adapter.cancel({ baseUrl, sessionId: created.sessionId })
  return { baseUrl, sessionId: created.sessionId, messages: snapshot.messages.length, running: snapshot.running }
}

function finish(error, result) {
  if (settled) return
  settled = true
  clearTimeout(timeout)
  if (child.exitCode === null) child.kill('SIGTERM')
  if (error) {
    console.error(error)
    process.exitCode = 1
  } else {
    console.log(JSON.stringify({ ...result, workspace }))
  }
}

function onData(chunk) {
  output += chunk.toString()
  const match = /dsh web: (http:\/\/127\.0\.0\.1:\d+)/.exec(output)
  if (!match?.[1] || settled) return
  verify(match[1]).then((result) => finish(null, result), (error) => finish(error))
}

child.stdout.on('data', onData)
child.stderr.on('data', onData)
child.once('exit', (code) => {
  if (!settled) finish(new Error(`DSH exited early with code ${code}.\n${output}`))
})
