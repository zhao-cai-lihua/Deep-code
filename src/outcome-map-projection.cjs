function compact(values, limit = 3) {
  const items = (values || []).filter(Boolean).map(String)
  if (items.length <= limit) return items
  return [...items.slice(0, limit), `另有 ${items.length - limit} 项`]
}

function verificationState(verifications) {
  if (!verifications.length) return 'unknown'
  if (verifications.some((item) => item.state === 'failed')) return 'error'
  if (verifications.some((item) => item.state !== 'passed')) return 'warning'
  return 'success'
}

function attributionState(value) {
  if (value === 'attributable') return 'success'
  if (value === 'overlap') return 'error'
  if (value === 'separated') return 'warning'
  return 'neutral'
}

// This is a visual projection of the Work Receipt, not another execution truth.
// Every claim must already exist in the Harness-backed outcome passed by the caller.
function projectOutcomeMap(outcome = {}) {
  if (!outcome.visible) return { visible: false, nodes: [], edges: [] }
  const changes = Array.isArray(outcome.changes) ? outcome.changes : []
  const verifications = Array.isArray(outcome.verifications) ? outcome.verifications : []
  const modelVerification = outcome.modelVerification || null
  const warnings = Array.isArray(outcome.warnings) ? outcome.warnings : []
  const attribution = outcome.recoveryAssessment || null
  const nodes = [
    {
      id: 'result', kind: 'result', state: outcome.state === 'success' ? 'success' : 'error', eyebrow: '结果',
      title: outcome.title || '本轮已结束', summary: outcome.summary || 'Harness 没有提供结果摘要。', evidenceTarget: 'technical'
    },
    {
      id: 'changes', kind: 'evidence', state: changes.length ? 'success' : 'neutral', eyebrow: '文件',
      title: changes.length ? `${changes.length} 个确认改动` : '没有确认到改动',
      summary: changes.length ? compact(changes.map((item) => item.path)).join('；') : '不根据回答文字猜测文件变化。', evidenceTarget: 'changes'
    },
    {
      id: 'verification', kind: 'evidence',
      state: modelVerification
        ? (modelVerification.state === 'passed' ? 'success' : modelVerification.state === 'failed' ? 'error' : 'warning')
        : verificationState(verifications),
      eyebrow: modelVerification ? '模型验证' : '验证',
      title: modelVerification
        ? (modelVerification.state === 'passed' ? '真实调用已通过' : modelVerification.state === 'failed' ? '真实调用未通过' : '真实调用已中止')
        : verifications.length ? `${verifications.filter((item) => item.state === 'passed').length}/${verifications.length} 项明确通过` : '没有确认到验证',
      summary: modelVerification
        ? `${modelVerification.modelName || modelVerification.model}${modelVerification.reasoningEffort ? ` · ${modelVerification.reasoningEffort}` : ''}；Harness 请求头与专用验证任务一致。`
        : verifications.length
        ? compact(verifications.map((item) => `${item.label}：${item.state === 'passed' ? '通过' : item.state === 'failed' ? '未通过' : '未确认'}`)).join('；')
        : '完成状态不自动等于测试通过。',
      evidenceTarget: modelVerification ? 'technical' : 'tools'
    }
  ]

  if (attribution) {
    const workspace = outcome.workspace?.available ? outcome.workspace.label : '未记录项目'
    nodes.push({
      id: 'attribution', kind: 'evidence', state: attributionState(attribution.state), eyebrow: '改动归属',
      title: `${workspace} · ${attribution.label}`,
      summary: attribution.detail || '没有足够证据判断本轮文件与原有工作的关系。',
      evidenceTarget: 'technical'
    })
  }

  if (warnings.length) {
    nodes.push({
      id: 'attention', kind: 'attention', state: 'warning', eyebrow: '仍需留意', title: `${warnings.length} 项尚未闭环`,
      summary: compact(warnings, 2).join('；'), evidenceTarget: 'technical'
    })
  }

  nodes.push({
    id: 'next', kind: 'next', state: outcome.state === 'success' && !warnings.length ? 'success' : 'neutral', eyebrow: '下一步',
    title: outcome.state === 'success' && !warnings.length ? '无需立即处理' : '你仍然掌握决定权',
    summary: outcome.nextAction || '查看证据后决定是否继续。', evidenceTarget: outcome.recovery ? 'technical' : 'tools'
  })

  const orderedIds = nodes.map((node) => node.id)
  return {
    visible: true,
    version: 1,
    source: 'harness-and-local-workspace-evidence',
    nodes,
    edges: orderedIds.slice(1).map((id, index) => ({ from: orderedIds[index], to: id })),
    legend: '绿色表示 Harness 已确认；黄色表示仍需核实；灰色表示没有足够证据；红色表示本轮未完成。'
  }
}

module.exports = { projectOutcomeMap }
