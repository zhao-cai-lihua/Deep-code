const test = require('node:test')
const assert = require('node:assert/strict')
const {
  assertCapabilityAvailable,
  bindCapabilitiesToSession,
  capabilityById,
  projectHarnessCapabilities
} = require('../src/harness-capability-gate.cjs')

const pinnedRuntime = {
  official: true,
  version: '0.1.1-rc.2',
  revision: 'b150a551b8d465e31e418e1b2eaf5e79bbb7d28e',
  hostDescribeVersion: '0.0.1'
}

const readyConnection = {
  state: 'ready',
  kind: 'managed',
  trust: 'managed-process'
}

test('projects only the intersection of a verified runtime and Deep Code adapters', () => {
  const snapshot = projectHarnessCapabilities({ runtime: pinnedRuntime, connection: readyConnection })

  assert.equal(snapshot.verified, true)
  assert.equal(snapshot.runtime.revision, pinnedRuntime.revision)
  assert.equal(capabilityById(snapshot, 'task-prompt').state, 'supported')
  assert.equal(capabilityById(snapshot, 'task-prompt').available, false)
  assert.equal(capabilityById(snapshot, 'image-transport').state, 'supported')
  assert.equal(capabilityById(snapshot, 'image-transport').claimsModelVision, false)
  assert.equal(capabilityById(snapshot, 'plan-projection').state, 'supported')
  assert.equal(capabilityById(snapshot, 'plan-control').state, 'runtime-unsupported')
  assert.equal(capabilityById(snapshot, 'plan-control').available, false)
})

test('does not expose capabilities before Engine trust is ready', () => {
  const snapshot = projectHarnessCapabilities({
    runtime: pinnedRuntime,
    connection: { state: 'awaiting-user', kind: 'shared', trust: null }
  })

  assert.equal(snapshot.verified, true)
  assert.equal(capabilityById(snapshot, 'task-prompt').state, 'engine-untrusted')
  assert.equal(capabilityById(snapshot, 'task-prompt').available, false)
})

test('fails closed for a runtime outside the exact audited profile', () => {
  const snapshot = projectHarnessCapabilities({
    runtime: { ...pinnedRuntime, revision: 'new-unverified-head' },
    connection: readyConnection
  })

  assert.equal(snapshot.verified, false)
  assert.equal(capabilityById(snapshot, 'task-prompt').state, 'runtime-unverified')
  assert.equal(capabilityById(snapshot, 'plan-control').state, 'runtime-unverified')
})

test('keeps an audited candidate profile visible but unavailable to product operations', () => {
  const snapshot = projectHarnessCapabilities({
    runtime: {
      official: true,
      tag: 'dsh-v0.1.5-rc.2',
      version: '0.1.5-rc.2',
      revision: 'fb2c4b9e698e30edb738bca4cf0618587db7d203',
      protocol: 'typert-0.1.5',
      status: 'candidate'
    },
    connection: readyConnection,
    adapterCapabilities: { 'plan-control': true }
  })

  assert.equal(snapshot.verified, true)
  assert.equal(snapshot.runtime.protocol, 'typert-0.1.5')
  assert.equal(snapshot.runtime.status, 'candidate')
  assert.equal(capabilityById(snapshot, 'task-prompt').state, 'candidate-disabled')
  assert.equal(capabilityById(snapshot, 'plan-control').state, 'candidate-disabled')
  assert.equal(capabilityById(snapshot, 'plan-control').available, false)
})

test('distinguishes engine support from current Session availability', () => {
  const withoutSession = projectHarnessCapabilities({
    runtime: pinnedRuntime,
    connection: readyConnection,
    session: { attached: false }
  })
  assert.equal(capabilityById(withoutSession, 'task-prompt').state, 'session-required')

  const withSession = projectHarnessCapabilities({
    runtime: pinnedRuntime,
    connection: readyConnection,
    session: { attached: true, capabilities: { 'plan-projection': false } }
  })
  assert.equal(capabilityById(withSession, 'task-prompt').state, 'available')
  assert.equal(capabilityById(withSession, 'plan-projection').state, 'session-unavailable')
})

test('an adapter cannot create a capability the runtime does not expose', () => {
  const snapshot = projectHarnessCapabilities({
    runtime: pinnedRuntime,
    connection: readyConnection,
    adapterCapabilities: { 'plan-control': true }
  })

  assert.equal(capabilityById(snapshot, 'plan-control').state, 'runtime-unsupported')
})

test('a missing adapter keeps a runtime capability unavailable', () => {
  const snapshot = projectHarnessCapabilities({
    runtime: pinnedRuntime,
    connection: readyConnection,
    adapterCapabilities: { 'model-selection': false }
  })

  assert.equal(capabilityById(snapshot, 'model-selection').state, 'adapter-missing')
  assert.equal(capabilityById(snapshot, 'model-selection').available, false)
})

test('returns an immutable snapshot so UI code cannot mutate trust facts', () => {
  const snapshot = projectHarnessCapabilities({ runtime: pinnedRuntime, connection: readyConnection })

  assert.equal(Object.isFrozen(snapshot), true)
  assert.equal(Object.isFrozen(snapshot.capabilities), true)
  assert.equal(Object.isFrozen(snapshot.capabilities[0]), true)
})

test('binds a verified Engine snapshot to one attached Session before admission', () => {
  const engine = projectHarnessCapabilities({ runtime: pinnedRuntime, connection: readyConnection })
  const session = bindCapabilitiesToSession(engine, { attached: true })

  assert.equal(capabilityById(engine, 'task-prompt').state, 'supported')
  assert.equal(capabilityById(session, 'task-prompt').state, 'available')
  assert.equal(capabilityById(session, 'task-prompt').available, true)
  assert.doesNotThrow(() => assertCapabilityAvailable(session, 'task-prompt'))
  assert.throws(() => assertCapabilityAvailable(session, 'plan-control'), /没有提供这项能力/)
})

test('cannot bind an unverified or untrusted Engine snapshot into an available Session capability', () => {
  const untrusted = projectHarnessCapabilities({
    runtime: pinnedRuntime,
    connection: { state: 'awaiting-user', kind: 'shared', trust: null }
  })
  const session = bindCapabilitiesToSession(untrusted, { attached: true })

  assert.equal(capabilityById(session, 'task-prompt').state, 'engine-untrusted')
  assert.throws(() => assertCapabilityAvailable(session, 'task-prompt'), /尚未进入可信 ready 状态/)
})
