const { spawn } = require('node:child_process')
const { mkdtempSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join, resolve } = require('node:path')

const supervisorModulePath = process.argv[3]
  ? resolve(process.argv[3])
  : join(__dirname, '..', 'src', 'runtime-supervisor.cjs')
const { RuntimeSupervisor } = require(supervisorModulePath)

const runtimeRoot = resolve(process.argv[2] || '')
if (!process.argv[2]) {
  throw new Error('Usage: node scripts/dsh-015-runtime-supervisor-smoke.cjs <exact-dsh-runtime-path> [packaged-runtime-supervisor-module]')
}

const isolatedRoot = mkdtempSync(join(tmpdir(), 'deep-code-dsh-015-supervisor-'))
const statuses = []
let supervisor

function waitForStatus(predicate, timeoutMs = 45_000) {
  const current = supervisor.snapshot()
  if (predicate(current)) return Promise.resolve(current)
  return new Promise((resolvePromise, reject) => {
    const finish = (callback, value) => {
      clearTimeout(timer)
      supervisor.off('status', onStatus)
      callback(value)
    }
    const onStatus = status => {
      statuses.push({ state: status.state, protocol: status.protocol, owned: status.owned })
      if (predicate(status)) finish(resolvePromise, status)
      else if (status.state === 'error') finish(reject, new Error(status.message))
    }
    const timer = setTimeout(() => finish(reject, new Error('Runtime Supervisor smoke timed out.')), timeoutMs)
    supervisor.on('status', onStatus)
  })
}

async function startCandidate() {
  await supervisor.start(runtimeRoot)
  const ready = await waitForStatus(status => status.state === 'candidate-ready')
  if (ready.version !== '0.1.5-rc.2' || ready.protocol !== 'typert-0.1.5') {
    throw new Error('Runtime Supervisor published the wrong candidate identity.')
  }
  if (!ready.owned || ready.kind !== 'managed' || ready.trust !== 'managed-process') {
    throw new Error('Runtime Supervisor did not preserve managed-process trust.')
  }
  if (ready.capabilities?.runtime?.status !== 'candidate') {
    throw new Error('Runtime Supervisor did not publish the candidate Capability Gate profile.')
  }
  const exposedCapability = (ready.capabilities?.capabilities || [])
    .find(capability => capability.available || capability.state !== 'candidate-disabled')
  if (exposedCapability) throw new Error('A candidate capability escaped the product admission gate.')

  let productAdmissionClosed = false
  try {
    await supervisor.waitUntilReady({ timeoutMs: 100 })
  } catch (error) {
    productAdmissionClosed = /候选协议.*尚未开放/.test(error.message)
  }
  if (!productAdmissionClosed) throw new Error('The product task admission gate accepted a candidate runtime.')

  const serialized = JSON.stringify(ready)
  if (/([?&]token=)(?!\[redacted\])/i.test(serialized) || /dsh\.sid=/i.test(serialized)) {
    throw new Error('Runtime Supervisor exposed launch authentication in its snapshot.')
  }
  return ready
}

async function stopCandidate() {
  supervisor.stop()
  return waitForStatus(status => status.state === 'stopped', 15_000)
}

async function main() {
  supervisor = new RuntimeSupervisor({
    probeShared: async () => null,
    spawnProcess(command, args, options) {
      return spawn(command, args, {
        ...options,
        env: {
          ...options.env,
          DSH_HOME: join(isolatedRoot, '.dsh'),
          DSH_AGENTS_HOME: join(isolatedRoot, '.agents'),
          DSH_TELEMETRY_DISABLED: '1'
        }
      })
    }
  })

  const first = await startCandidate()
  await stopCandidate()
  const second = await startCandidate()
  await stopCandidate()

  const diagnostics = JSON.stringify(supervisor.snapshot().logs)
  if (/([?&]token=)(?!\[redacted\])/i.test(diagnostics) || /dsh\.sid=/i.test(diagnostics)) {
    throw new Error('Runtime Supervisor exposed launch authentication in diagnostics.')
  }

  process.stdout.write(`${JSON.stringify({
    runtime: `${second.version}@${second.capabilities.runtime.revision.slice(0, 12)}`,
    protocol: second.protocol,
    starts: statuses.filter(status => status.state === 'candidate-ready').length,
    managedTrust: first.trust === 'managed-process' && second.trust === 'managed-process',
    productAdmissionClosed: true,
    allCapabilitiesCandidateDisabled: second.capabilities.capabilities
      .every(capability => capability.available === false && capability.state === 'candidate-disabled'),
    stopped: supervisor.snapshot().state === 'stopped',
    providerRequests: 0,
    promptRequests: 0
  }, null, 2)}\n`)
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exitCode = 1
}).finally(async () => {
  if (supervisor?.child) {
    supervisor.stop()
    try { await waitForStatus(status => status.state === 'stopped', 5_000) } catch {}
  }
  rmSync(isolatedRoot, { recursive: true, force: true })
})
