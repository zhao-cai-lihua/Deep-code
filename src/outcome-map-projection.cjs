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

// This is a visual projection of the Work Receipt, not another execution truth.
// Every claim must already exist in the Harness-backed outcome passed by the caller.
function projectOutcomeMap(outcome = {}) {
  if (!outcome.visible) return { visible: false, nodes: [], edges: [] }
  const changes = Array.isArray(outcome.changes) ? outcome.changes : []
  const verifications = Array.isArray(outcome.verifications) ? outcome.verifications : []
  const warnings = Array.isArray(outcome.warnings) ? outcome.warnings : []
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
      id: 'verification', kind: 'evidence', state: verificationState(verifications), eyebrow: '验证',
      title: verifications.length ? `${verifications.filter((item) => item.state === 'passed').length}/${verifications.length} 项明确通过` : '没有确认到验证',
      summary: verifications.length
        ? compact(verifications.map((item) => `${item.label}：${item.state === 'passed' ? '通过' : item.state === 'failed' ? '未通过' : '未确认'}`)).join('；')
        : '完成状态不自动等于测试通过。',
      evidenceTarget: 'tools'
    }
  ]

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
    source: 'harness-work-receipt',
    nodes,
    edges: orderedIds.slice(1).map((id, index) => ({ from: orderedIds[index], to: id })),
    legend: '绿色表示 Harness 已确认；黄色表示仍需核实；灰色表示没有足够证据；红色表示本轮未完成。'
  }
}

module.exports = { projectOutcomeMap }
