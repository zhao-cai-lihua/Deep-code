const ACTION_LABELS = Object.freeze({
  'retry-task': ['重试这一轮', '重新连接并再次执行；只有点击后才可能调用模型。'],
  'open-model-services': ['检查模型服务', '查看对应 Provider、凭据和最近一次真实验证。'],
  'choose-model': ['换一个可用模型', '重新打开 Harness 当前公布的模型列表。'],
  'open-settings': ['检查 Engine', '打开运行时与故障恢复，不会调用模型。'],
  'open-trace': ['查看失败证据', '打开 Harness 轨迹，定位没有完成的环节。'],
  'open-receipt': ['查看完整回执', '查看文件、验证、风险与归属证据。'],
  'new-task': ['开始新任务', '回到空白工作台；不会删除当前任务。']
})

function action(id) {
  const copy = ACTION_LABELS[id]
  if (!copy) throw new Error(`未知任务指引动作：${id}`)
  return { id, label: copy[0], detail: copy[1] }
}

function uniqueActions(ids) {
  return [...new Set(ids)].map(action)
}

function failureKind(thread, outcome) {
  return outcome?.modelVerification?.failure?.kind
    || thread?.agent?.runDetails?.terminal?.failure?.kind
    || ''
}

function projectTaskGuidance(thread = {}) {
  const outcome = thread.outcome
  if (!outcome?.visible) return { visible: false, actions: [] }

  const kind = failureKind(thread, outcome)
  const recoveryKind = outcome.recovery?.kind || ''
  let title = outcome.state === 'success' ? '这一轮已经收好' : outcome.state === 'pending' ? '先确认这一轮的实际状态' : '先把这一轮恢复好'
  let summary = outcome.nextAction || '查看证据后再决定是否继续。'
  let ids = []

  if (outcome.modelVerification?.state === 'passed') {
    title = '模型已经完成真实验证'
    summary = '验证回执已经保存。你可以回到模型服务查看历史记录，或直接开始工作。'
    ids = ['new-task', 'open-model-services', 'open-receipt']
  } else if (kind === 'authentication' || kind === 'quota') {
    title = kind === 'authentication' ? '模型服务没有接受凭据' : '模型账户暂时没有可用额度'
    ids = ['open-model-services', 'open-trace']
  } else if (kind === 'model-unavailable') {
    title = '当前模型路线不可用'
    ids = ['choose-model', 'open-model-services', 'open-trace']
  } else if (kind === 'rate-limit' || kind === 'network') {
    title = kind === 'rate-limit' ? '模型服务正在限流' : '模型服务连接中断'
    ids = ['retry-task', 'open-model-services', 'open-trace']
  } else if (recoveryKind === 'waiting-timeout') {
    title = outcome.terminalConfirmed ? '这一轮已经确认停止' : '停止仍待 Harness 确认'
    ids = ['retry-task', 'open-trace']
  } else if (recoveryKind === 'launch-failed') {
    title = '任务没有完成启动'
    ids = ['open-settings', 'choose-model', 'open-trace']
  } else if (outcome.state === 'error') {
    ids = ['open-trace', 'retry-task']
  } else if ((outcome.warnings || []).length || (outcome.risks || []).length) {
    title = '任务完成了，但还有事项需要确认'
    ids = ['open-receipt', 'open-trace', 'new-task']
  } else {
    ids = ['new-task', 'open-receipt']
  }

  return {
    visible: true,
    tone: outcome.state === 'success' && !(outcome.warnings || []).length ? 'success' : outcome.state === 'error' ? 'attention' : 'review',
    title,
    summary,
    actions: uniqueActions(ids)
  }
}

module.exports = { projectTaskGuidance }
