const { VERIFIED_HARNESS } = require('./engine-trust.cjs')

const CAPABILITY_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'task-prompt',
    label: '发送与继续任务',
    description: '把你的原话作为普通消息交给当前 Harness Session。',
    requiresSession: true
  }),
  Object.freeze({
    id: 'live-session',
    label: '实时状态与轨迹',
    description: '读取同一 Session 的结构化事件并投影进度。',
    requiresSession: true
  }),
  Object.freeze({
    id: 'decision-response',
    label: '等待你的决定',
    description: '把 Harness 的问题与选择留在当前任务中，等待你回答。',
    requiresSession: true
  }),
  Object.freeze({
    id: 'model-selection',
    label: '模型与推理强度',
    description: '通过 Harness 的结构化设置选择本轮路线。',
    requiresSession: true
  }),
  Object.freeze({
    id: 'image-transport',
    label: '图片随任务发送',
    description: '安全传输并持久化图片；当前模型是否能看图仍由 Harness 的模型目录决定。',
    requiresSession: true,
    claimsModelVision: false
  }),
  Object.freeze({
    id: 'plan-projection',
    label: 'Plan 状态与清单',
    description: '只读展示 Harness 已写入 Session 的 Plan 状态和步骤。',
    requiresSession: true
  }),
  Object.freeze({
    id: 'plan-control',
    label: '在 Deep Code 中切换 Plan',
    description: '使用结构化远程命令切换 Plan，而不是发送伪装成消息的 /plan。',
    requiresSession: true
  })
])

const PINNED_RUNTIME_PROFILE = Object.freeze({
  tag: VERIFIED_HARNESS.tag,
  version: VERIFIED_HARNESS.version,
  revision: VERIFIED_HARNESS.revision,
  hostDescribeVersion: VERIFIED_HARNESS.hostDescribeVersion,
  source: 'official-source-audit',
  capabilities: Object.freeze({
    'task-prompt': true,
    'live-session': true,
    'decision-response': true,
    'model-selection': true,
    'image-transport': true,
    'plan-projection': true,
    'plan-control': false
  })
})

const DEFAULT_ADAPTER_CAPABILITIES = Object.freeze({
  'task-prompt': true,
  'live-session': true,
  'decision-response': true,
  'model-selection': true,
  'image-transport': true,
  'plan-projection': true,
  'plan-control': false
})

const STATE_COPY = Object.freeze({
  available: ['可用', '已由可信 Engine、当前 Session 与 Deep Code Adapter 共同确认。'],
  supported: ['已支持', '固定 Runtime 与 Deep Code Adapter 已验证；创建或连接任务后生效。'],
  'engine-untrusted': ['等待 Engine 验证', 'Engine 尚未进入可信 ready 状态，因此不能使用这项能力。'],
  'runtime-unverified': ['Runtime 未验证', '当前 Runtime 不在 Deep Code 的精确兼容清单中。'],
  'runtime-unsupported': ['当前 Runtime 未开放', '固定版本的官方远程接口没有提供这项能力。'],
  'adapter-missing': ['Deep Code 尚未适配', 'Harness 可能具备这项能力，但 Deep Code 还没有可信的调用实现。'],
  'session-required': ['需要任务 Session', '先创建或重新连接任务，才能确认这项 Session 能力。'],
  'session-unavailable': ['当前 Session 未提供', '当前 Session 的结构化投影明确没有这项能力。']
})

function exactProfile(runtime) {
  if (!runtime || runtime.official !== true) return null
  if (runtime.version !== PINNED_RUNTIME_PROFILE.version) return null
  if (runtime.revision !== PINNED_RUNTIME_PROFILE.revision) return null
  if (runtime.hostDescribeVersion !== PINNED_RUNTIME_PROFILE.hostDescribeVersion) return null
  return PINNED_RUNTIME_PROFILE
}

function stateFor({ definition, profile, connection, session, adapterCapabilities }) {
  if (!profile) return 'runtime-unverified'
  if (connection?.state !== 'ready' || !['managed-process', 'user-confirmed-shared'].includes(connection?.trust)) return 'engine-untrusted'
  if (profile.capabilities[definition.id] !== true) return 'runtime-unsupported'
  if (adapterCapabilities[definition.id] !== true) return 'adapter-missing'
  if (!definition.requiresSession) return 'available'
  if (session === undefined) return 'supported'
  if (session?.attached !== true) return 'session-required'
  if (session?.capabilities?.[definition.id] === false) return 'session-unavailable'
  return 'available'
}

function freezeSnapshot(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) freezeSnapshot(child)
  return Object.freeze(value)
}

function projectHarnessCapabilities({ runtime, connection, session, adapterCapabilities = {} } = {}) {
  const profile = exactProfile(runtime)
  const adapters = { ...DEFAULT_ADAPTER_CAPABILITIES, ...adapterCapabilities }
  const capabilities = CAPABILITY_DEFINITIONS.map((definition) => {
    const state = stateFor({ definition, profile, connection, session, adapterCapabilities: adapters })
    const [label, reason] = STATE_COPY[state]
    return {
      ...definition,
      state,
      stateLabel: label,
      reason,
      available: state === 'available',
      runtimeSupported: profile?.capabilities?.[definition.id] === true,
      adapterSupported: adapters[definition.id] === true,
      claimsModelVision: definition.claimsModelVision === true
    }
  })
  return freezeSnapshot({
    version: 1,
    verified: Boolean(profile),
    runtime: {
      tag: profile?.tag || null,
      version: String(runtime?.version || ''),
      revision: String(runtime?.revision || ''),
      hostDescribeVersion: String(runtime?.hostDescribeVersion || ''),
      evidence: profile?.source || 'none'
    },
    connection: {
      state: String(connection?.state || 'unknown'),
      kind: connection?.kind || null,
      trust: connection?.trust || null
    },
    capabilities
  })
}

function capabilityById(snapshot, id) {
  return snapshot?.capabilities?.find((item) => item.id === id) || null
}

function bindCapabilitiesToSession(snapshot, session = {}) {
  if (!snapshot || !Array.isArray(snapshot.capabilities)) return snapshot
  const capabilities = snapshot.capabilities.map((capability) => {
    if (!capability.requiresSession || capability.state !== 'supported') return { ...capability }
    const state = session?.attached !== true
      ? 'session-required'
      : session?.capabilities?.[capability.id] === false
        ? 'session-unavailable'
        : 'available'
    const [stateLabel, reason] = STATE_COPY[state]
    return { ...capability, state, stateLabel, reason, available: state === 'available' }
  })
  return freezeSnapshot({
    ...snapshot,
    session: {
      attached: session?.attached === true,
      id: typeof session?.id === 'string' && session.id ? session.id : null
    },
    capabilities
  })
}

function assertCapabilityAvailable(snapshot, id) {
  const capability = capabilityById(snapshot, id)
  if (!capability) throw new Error(`Deep Code 没有登记能力 ${String(id || '')}。`)
  if (capability.state !== 'available') throw new Error(`${capability.label}不可用：${capability.reason}`)
  return capability
}

module.exports = {
  CAPABILITY_DEFINITIONS,
  DEFAULT_ADAPTER_CAPABILITIES,
  PINNED_RUNTIME_PROFILE,
  assertCapabilityAvailable,
  bindCapabilitiesToSession,
  capabilityById,
  projectHarnessCapabilities
}
