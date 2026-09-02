const VERIFICATION_COMMAND = /(?:^|\s|[\\/])(test|tests|testing|check|checks|lint|typecheck|type-check|build|verify|verification|pytest|vitest|jest|mocha|eslint|tsc|cargo test|go test|dotnet test)(?:\s|$|[:./-])/i
const { projectOutcomeMap } = require('./outcome-map-projection.cjs')
const { assessWorkReceipt } = require('./work-receipt-policy.cjs')

function text(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function verificationFrom(card) {
  if (card?.type !== 'terminal') return null
  const label = text(card.command, text(card.title, '验证命令'))
  if (!VERIFICATION_COMMAND.test(label)) return null
  const exitCode = Number.isInteger(card.exitCode) ? card.exitCode : null
  const failed = card.state === 'error' || (exitCode !== null && exitCode !== 0)
  const passed = card.state === 'done' && exitCode === 0
  return {
    label,
    state: failed ? 'failed' : passed ? 'passed' : 'unknown',
    detail: exitCode === null ? (failed ? '命令失败' : 'Harness 没有提供可确认的退出代码') : `退出代码 ${exitCode}`
  }
}

function projectTaskOutcome(thread = {}) {
  const terminal = thread.engineState === 'ready' || thread.engineState === 'error'
  if (!terminal) return { visible: false }

  const details = thread.agent?.runDetails || {}
  const changes = (details.changedFiles || [])
    .filter((item) => item && text(item.path))
    .map((item) => ({ path: text(item.path), operation: text(item.operation, '文件变更') }))
  const tools = Array.isArray(details.toolCards) ? details.toolCards : []
  const verifications = tools.map(verificationFrom).filter(Boolean)
  const failedTools = tools.filter((card) => card?.state === 'error').length
  const warnings = []
  const terminalState = details.terminal?.state
  const recovery = thread.recovery && typeof thread.recovery === 'object' ? thread.recovery : null
  const assessment = assessWorkReceipt({ changes, verifications, recovery })

  if (changes.length && !verifications.length) {
    warnings.push('Harness 记录了文件改动，但没有看到明确的测试、检查或构建命令。完成状态不等于已经验证。')
  }
  if (failedTools) warnings.push(`有 ${failedTools} 项工具操作失败；可在运行详情中查看原始证据。`)
  if (verifications.some((item) => item.state === 'unknown')) warnings.push('检测到验证命令，但 Harness 没有提供足以确认通过的终态。')
  warnings.push(...assessment.warnings)

  if (thread.engineState === 'error' || terminalState === 'failed' || terminalState === 'interrupted') {
    const interrupted = terminalState === 'interrupted'
    const outcome = {
      visible: true,
      state: 'error',
      title: interrupted ? '这一轮已停止' : '这轮没有完成',
      summary: text(thread.engineError, interrupted
        ? `Harness 报告这一轮已停止（${text(details.terminal?.reason, '原因未知')}）。`
        : `Harness 报告这一轮失败（${text(details.terminal?.reason, '原因未知')}）。`),
      changes,
      verifications,
      warnings,
      risks: assessment.risks,
      impact: recovery?.safety || (changes.length
        ? '本轮已经停止，但上面列出的已确认文件改动仍保留在工作区。'
        : '本轮已经停止；Harness 没有确认到文件改动。'),
      nextAction: recovery?.nextAction || '先查看轨迹中的失败证据，再决定重试还是修改任务说明。',
      recovery,
      recoveryAssessment: assessment.recoveryAssessment
    }
    return { ...outcome, map: projectOutcomeMap(outcome) }
  }

  const operationCount = tools.length
  const summary = changes.length
    ? `Harness 确认改动 ${changes.length} 个文件，并记录 ${operationCount} 项工具操作。`
    : operationCount
      ? `Harness 已完成任务，记录 ${operationCount} 项工具操作，没有确认到文件改动。`
      : 'Harness 已完成任务，没有确认到文件改动或工具操作。'

  const outcome = {
    visible: true,
    state: 'success',
    title: '任务已完成',
    summary,
    changes,
    verifications,
    warnings,
    risks: assessment.risks,
    impact: changes.length ? `已确认的改动保存在当前工作区，共 ${changes.length} 个文件。` : '没有确认到工作区文件改动。',
    nextAction: warnings.length ? '先处理“仍需留意”中的未确认事项。' : '这一轮没有需要你立即处理的事项。',
    recovery: null,
    recoveryAssessment: assessment.recoveryAssessment
  }
  return { ...outcome, map: projectOutcomeMap(outcome) }
}

module.exports = { projectTaskOutcome, verificationFrom }
