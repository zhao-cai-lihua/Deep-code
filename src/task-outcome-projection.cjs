const { projectOutcomeMap } = require('./outcome-map-projection.cjs')
const { assessWorkReceipt } = require('./work-receipt-policy.cjs')

function text(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function workspaceProjection(thread) {
  const workspacePath = text(thread.workspacePath, text(thread.baseline?.workspacePath))
  const parts = workspacePath.split(/[\\/]+/).filter(Boolean)
  return {
    available: Boolean(workspacePath),
    label: parts.at(-1) || '未记录项目',
    baselineState: text(thread.baseline?.state, 'unavailable'),
    capturedAt: text(thread.baseline?.capturedAt),
    preExistingChangeCount: Array.isArray(thread.baseline?.dirtyPaths) ? thread.baseline.dirtyPaths.length : 0
  }
}

function verificationFrom(card) {
  if (card?.type !== 'terminal' || card.verificationIntent !== true) return null
  const label = text(card.command, text(card.title, '验证命令'))
  const exitCode = Number.isInteger(card.exitCode) ? card.exitCode : null
  const failed = card.state === 'error' || (exitCode !== null && exitCode !== 0)
  const passed = card.state === 'done' && exitCode === 0
  return {
    label,
    state: failed ? 'failed' : passed ? 'passed' : 'unknown',
    detail: exitCode === null ? (failed ? '命令失败' : 'Harness 没有提供可确认的退出代码') : `退出代码 ${exitCode}`
  }
}

function recoveryWithTerminalEvidence(recovery, terminalState) {
  if (recovery?.kind !== 'waiting-timeout' || !terminalState) return recovery
  const safety = terminalState === 'interrupted'
    ? 'Harness 已确认这一轮停止；Deep code 没有替你选择或填写任何答案。'
    : terminalState === 'failed'
      ? 'Harness 已确认这一轮以失败结束；Deep code 没有替你选择或填写任何答案。'
      : 'Harness 已确认这一轮完成；Deep code 没有替你选择或填写任何答案。'
  return { ...recovery, safety }
}

function projectTaskOutcome(thread = {}) {
  const snapshot = thread.agent?.taskRunSnapshot || {}
  const recovery = thread.recovery && typeof thread.recovery === 'object' ? thread.recovery : null
  const terminal = Boolean(snapshot.terminal || recovery || thread.engineState === 'error')
  if (!terminal) return { visible: false }

  const details = thread.agent?.runDetails || {}
  const changes = (snapshot.confirmedChanges || [])
    .filter((item) => item && text(item.path))
    .map((item) => ({ path: text(item.path), operation: text(item.operation, '文件变更') }))
  const tools = Array.isArray(details.toolCards) ? details.toolCards : []
  const verifications = tools.map(verificationFrom).filter(Boolean)
  const failedTools = tools.filter((card) => card?.state === 'error').length
  const warnings = []
  const terminalState = snapshot.terminal?.state
  const terminalConfirmed = Boolean(snapshot.terminal)
  const projectedRecovery = recoveryWithTerminalEvidence(recovery, terminalState)
  const assessment = assessWorkReceipt({ changes, verifications, recovery: projectedRecovery, baseline: thread.baseline || null })
  const workspace = workspaceProjection(thread)
  const modelVerification = thread.verificationReceipt || null

  if (changes.length && !verifications.length) {
    warnings.push('Harness 记录了文件改动，但没有看到明确的测试、检查或构建命令。完成状态不等于已经验证。')
  }
  if (failedTools) warnings.push(`有 ${failedTools} 项工具操作失败；可在运行详情中查看原始证据。`)
  if (verifications.some((item) => item.state === 'unknown')) warnings.push('检测到验证命令，但 Harness 没有提供足以确认通过的终态。')
  warnings.push(...assessment.warnings)

  if (recovery?.kind === 'waiting-timeout' && !terminalConfirmed) {
    const outcome = {
      visible: true,
      state: 'pending',
      title: '停止仍待 Harness 确认',
      summary: text(thread.engineError, '等待回答已经超时，但 Harness 尚未提供能证明这一轮停止的终态事件。'),
      changes,
      verifications,
      warnings,
      risks: assessment.risks,
      impact: recovery.safety,
      nextAction: recovery.nextAction,
      recovery,
      recoveryAssessment: assessment.recoveryAssessment,
      workspace,
      modelVerification,
      terminalConfirmed: false
    }
    return { ...outcome, map: projectOutcomeMap(outcome) }
  }

  if ((!terminalConfirmed && thread.engineState === 'error') || terminalState === 'failed' || terminalState === 'interrupted') {
    const interrupted = terminalState === 'interrupted'
    const terminalSummary = interrupted
      ? `Harness 已确认这一轮停止（${text(snapshot.terminal?.reason, '原因未知')}）。`
      : `Harness 已确认这一轮失败（${text(snapshot.terminal?.reason, '原因未知')}）。`
    const outcome = {
      visible: true,
      state: 'error',
      title: modelVerification
        ? (interrupted ? '模型连接验证已停止' : '模型连接验证未通过')
        : (interrupted ? '这一轮已停止' : '这轮没有完成'),
      summary: modelVerification?.failure?.detail || (terminalConfirmed && recovery?.kind === 'waiting-timeout'
        ? terminalSummary
        : text(thread.engineError, terminalSummary)),
      changes,
      verifications,
      warnings,
      risks: assessment.risks,
      impact: projectedRecovery?.safety || (changes.length
        ? '本轮已经停止，但上面列出的已确认文件改动仍保留在工作区。'
        : '本轮已经停止；Harness 没有确认到文件改动。'),
      nextAction: modelVerification?.failure?.nextAction || projectedRecovery?.nextAction || '先查看轨迹中的失败证据，再决定重试还是修改任务说明。',
      recovery: projectedRecovery,
      recoveryAssessment: assessment.recoveryAssessment,
      workspace,
      modelVerification,
      terminalConfirmed
    }
    return { ...outcome, map: projectOutcomeMap(outcome) }
  }

  const operationCount = tools.length
  const summary = modelVerification?.state === 'passed'
    ? `Harness 确认 ${modelVerification.modelName || modelVerification.model} 完成了一次可归属的真实模型请求。`
    : changes.length
    ? `Harness 确认改动 ${changes.length} 个文件，并记录 ${operationCount} 项工具操作。`
    : operationCount
      ? `Harness 已完成任务，记录 ${operationCount} 项工具操作，没有确认到文件改动。`
      : 'Harness 已完成任务，没有确认到文件改动或工具操作。'

  const outcome = {
    visible: true,
    state: 'success',
    title: modelVerification?.state === 'passed' ? '模型连接验证通过' : '任务已完成',
    summary,
    changes,
    verifications,
    warnings,
    risks: assessment.risks,
    impact: changes.length ? `已确认的改动保存在当前工作区，共 ${changes.length} 个文件。` : '没有确认到工作区文件改动。',
    nextAction: warnings.length ? '先处理“仍需留意”中的未确认事项。' : '这一轮没有需要你立即处理的事项。',
    recovery: null,
    recoveryAssessment: assessment.recoveryAssessment,
    workspace,
    modelVerification
  }
  return { ...outcome, map: projectOutcomeMap(outcome) }
}

module.exports = { projectTaskOutcome, verificationFrom }
