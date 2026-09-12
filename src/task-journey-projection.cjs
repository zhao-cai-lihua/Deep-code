const { projectTaskContract } = require('./task-contract.cjs')

function list(value) {
  return Array.isArray(value) ? value : []
}

function contractConfirmedInHistory(thread, contract) {
  const messages = list(thread.agent?.messages)
  return messages.some((message) => message?.role === 'user'
    && message.taskContract?.kind === contract.kind
    && Number(message.taskContract?.version) === contract.version)
}

function projectTaskJourney(thread = {}) {
  const contract = projectTaskContract(thread.taskContract)
  if (!contract || contract.version < 2) return { visible: false }

  const runState = String(thread.run?.state || 'draft')
  const outcome = thread.outcome || { visible: false }
  const contractConfirmed = contractConfirmedInHistory(thread, contract)
  const requestAdmitted = thread.admission?.accepted === true
  const verifications = list(outcome.verifications)
  const passed = verifications.filter((item) => item?.state === 'passed').length
  const failed = verifications.filter((item) => item?.state === 'failed').length
  const unknown = verifications.filter((item) => item?.state === 'unknown').length
  const warnings = list(outcome.warnings)
  const risks = list(outcome.risks)
  const hasUncertainty = warnings.length + risks.length + failed + unknown > 0

  const align = contractConfirmed
    ? { id: 'align', label: '对齐目标', state: 'complete', detail: 'Harness 已接收带有公开协作协议的任务。', action: 'task-brief' }
    : requestAdmitted
      ? { id: 'align', label: '对齐目标', state: 'current', detail: 'Harness 已接收首条请求，正在等待事件历史确认协作协议。', action: 'task-brief' }
    : thread.engineState === 'error'
      ? { id: 'align', label: '对齐目标', state: 'attention', detail: '任务已保存在本机，但尚未确认送达 Harness。', action: 'task-brief' }
      : { id: 'align', label: '对齐目标', state: 'pending', detail: '准备随首条消息交付目标与协作方式。', action: 'task-brief' }

  const act = runState === 'queued'
    ? { id: 'act', label: '推进任务', state: 'current', detail: 'Harness 已接收，正在等待这一轮开始。', action: 'trace' }
    : runState === 'running'
      ? { id: 'act', label: '推进任务', state: 'current', detail: 'Harness 正在执行这一轮。', action: 'trace' }
      : runState === 'waiting'
        ? { id: 'act', label: '推进任务', state: 'attention', detail: 'Harness 正在等待你的决定，不会替你选择。', action: 'trace' }
        : runState === 'completed'
          ? { id: 'act', label: '推进任务', state: 'complete', detail: 'Harness 已提供这一轮的完成终态。', action: 'trace' }
          : runState === 'failed' || runState === 'interrupted'
            ? { id: 'act', label: '推进任务', state: 'attention', detail: runState === 'interrupted' ? 'Harness 已确认这一轮停止。' : 'Harness 已确认这一轮失败。', action: 'trace' }
            : { id: 'act', label: '推进任务', state: 'pending', detail: '尚无足够的 Harness 事件确认执行进度。', action: 'trace' }

  let verify = { id: 'verify', label: '核验结果', state: 'pending', detail: '等待任务产生可核验的结果。', action: 'trace' }
  if (outcome.visible) {
    if (failed) verify = { id: 'verify', label: '核验结果', state: 'attention', detail: `${failed} 项明确验证未通过。`, action: 'trace' }
    else if (unknown) verify = { id: 'verify', label: '核验结果', state: 'attention', detail: `${unknown} 项验证缺少足够终态证据。`, action: 'trace' }
    else if (passed) verify = { id: 'verify', label: '核验结果', state: 'complete', detail: `${passed} 项明确验证通过。`, action: 'trace' }
    else if (list(outcome.changes).length) verify = { id: 'verify', label: '核验结果', state: 'attention', detail: '确认到文件改动，但没有明确验证通过证据。', action: 'trace' }
    else if (outcome.state === 'success') verify = { id: 'verify', label: '核验结果', state: 'complete', detail: '没有确认到文件改动；核验以 Harness 终态和回执为限。', action: 'trace' }
    else verify = { id: 'verify', label: '核验结果', state: 'attention', detail: '任务未正常完成，核验证据仍不完整。', action: 'trace' }
  }

  const deliver = !outcome.visible
    ? { id: 'deliver', label: '交付回执', state: 'pending', detail: '终态出现后才会生成工作回执。', action: 'receipt' }
    : outcome.state === 'success' && !hasUncertainty
      ? { id: 'deliver', label: '交付回执', state: 'complete', detail: '工作回执已经生成，没有待处理提醒。', action: 'receipt' }
      : { id: 'deliver', label: '交付回执', state: 'attention', detail: outcome.state === 'success'
          ? '工作回执已经生成，但仍有需要留意的事项。'
          : '恢复说明和下一步已经写入工作回执。', action: 'receipt' }

  const stages = [align, act, verify, deliver]
  const tone = deliver.state === 'complete'
    ? 'complete'
    : stages.some((stage) => stage.state === 'attention')
      ? 'attention'
      : act.state === 'current'
        ? 'active'
        : 'pending'
  const summary = tone === 'complete'
    ? '这轮已经交付，可以在“回执”查看结论和证据。'
    : outcome.visible && outcome.state === 'success'
      ? '这轮已经交付，但回执仍有未确认项需要你留意。'
      : runState === 'waiting'
        ? '执行已暂停，正在等待你的决定。'
        : runState === 'failed' || runState === 'interrupted' || outcome.state === 'error'
          ? '这轮没有正常完成，恢复信息已经保留。'
          : act.state === 'current'
            ? '目标已经接收，Harness 正在推进；有关键决定时才会暂停。'
            : '任务路线已经建立，正在等待可确认的 Harness 事件。'

  return {
    visible: true,
    version: 1,
    tone,
    title: '这次会怎样推进',
    summary,
    stages,
    evidenceBoundary: '路线只翻译 Harness 结构化事实与现有工作回执；它不授予权限，也不自行判断任务完成。'
  }
}

module.exports = { projectTaskJourney }
