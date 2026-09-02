const HIGH_IMPACT_RULES = [
  {
    id: 'dependencies',
    level: 'high',
    label: '依赖或安装方式发生变化',
    detail: '它可能下载或运行第三方代码，也可能改变安装结果。发布前应核对来源、版本、许可证和锁文件。',
    matches: (path) => /(^|\/)(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb?|requirements[^/]*\.txt|pyproject\.toml|poetry\.lock|cargo\.toml|cargo\.lock|go\.mod|go\.sum)$/i.test(path)
  },
  {
    id: 'automation',
    level: 'high',
    label: '构建、发布或自动化设置发生变化',
    detail: '它可能改变安装包、CI 或发布行为。运行测试并不等于这些外部流程已经安全。',
    matches: (path) => /(^|\/)(\.github\/workflows\/|dockerfile$|compose\.ya?ml$|electron-builder[^/]*\.(json|ya?ml)$|scripts\/.*(?:release|publish|deploy))/i.test(path)
  },
  {
    id: 'permissions',
    level: 'high',
    label: '权限、安全或凭据处理发生变化',
    detail: '它可能影响 Agent 能访问什么。需要检查最小权限、秘密是否会进入日志，以及拒绝路径是否仍然有效。',
    matches: (path) => /(^|\/)(?:permissions?|sandbox|credentials?|secrets?|auth|navigation-policy|safe-child-environment)(?:[./_-]|$)/i.test(path)
  },
  {
    id: 'migration',
    level: 'high',
    label: '数据迁移或持久化结构发生变化',
    detail: '它可能影响已有任务或用户数据。需要说明兼容、备份和失败后的恢复方式。',
    matches: (path) => /(^|\/)(?:migrations?|schema|database|storage|store)(?:[./_-]|$)/i.test(path)
  }
]

function normalizedPath(value) {
  return String(value || '').trim().replaceAll('\\', '/')
}

function unique(values) {
  return [...new Set(values)]
}

function pathMatches(left, right) {
  const a = normalizedPath(left).toLowerCase()
  const b = normalizedPath(right).toLowerCase()
  return a === b || a.endsWith(`/${b}`) || b.endsWith(`/${a}`)
}

function assessRecovery({ baseline, changes, recovery }) {
  if (recovery) {
    return { state: 'available', label: '已有恢复指引', detail: String(recovery.nextAction || '按当前任务的恢复说明继续。') }
  }
  if (!changes.length && baseline?.state === 'dirty') {
    return {
      state: 'unconfirmed', label: '无法确认是否触及原有改动',
      detail: `任务开始前已有 ${Array.isArray(baseline.dirtyPaths) ? baseline.dirtyPaths.length : 0} 个未提交路径，但 Harness 没有确认本轮文件列表，因此无法判断是否触及它们。`
    }
  }
  if (!changes.length) {
    return { state: 'not-needed', label: '没有确认到文件改动', detail: '本轮回执没有需要撤回的已确认工作区文件改动。' }
  }
  if (!baseline || baseline.state === 'unavailable') {
    return {
      state: 'unknown', label: '无法判断改动归属',
      detail: '没有可靠的任务开始前 Git 基线，也没有 Git checkpoint 证据。请不要把文件列表理解为可安全撤回的 checkpoint。'
    }
  }
  if (baseline.state === 'not-git') {
    return {
      state: 'unavailable', label: '这个项目没有 Git 恢复基础',
      detail: '任务开始时这个工作区不是 Git 仓库；Deep Code 能展示 Harness 确认的文件，但不能提供 Git 撤回保证。'
    }
  }
  if (baseline.state === 'clean') {
    return {
      state: 'attributable', label: '本轮文件改动可归因性较高',
      detail: '任务开始前 Git 工作区干净，因此本轮确认文件更容易与已有工作区分；但尚未创建 checkpoint，当前仍不承诺一键撤回。'
    }
  }
  const dirtyPaths = Array.isArray(baseline.dirtyPaths) ? baseline.dirtyPaths : []
  const overlap = unique(changes
    .filter((change) => dirtyPaths.some((path) => pathMatches(change.path, path)))
    .map((change) => change.path))
  if (overlap.length) {
    return {
      state: 'overlap', label: '本轮改动与原有改动发生重叠',
      detail: `任务前已有修改，本轮又触及其中 ${overlap.length} 个路径。Deep Code 不会自动撤回这些文件，以免覆盖你的原有工作。`,
      paths: overlap
    }
  }
  return {
    state: 'separated', label: '本轮文件与原有改动未发现重叠',
    detail: '任务开始前已有其他未提交改动，但 Harness 确认的本轮文件没有与它们重叠；仍未创建 checkpoint，不承诺完整撤回。'
  }
}

function assessWorkReceipt({ changes = [], verifications = [], recovery = null, baseline = null } = {}) {
  const normalizedChanges = changes
    .map((change) => ({ ...change, path: normalizedPath(change?.path), operation: String(change?.operation || '') }))
    .filter((change) => change.path)

  const risks = HIGH_IMPACT_RULES.map((rule) => {
    const paths = unique(normalizedChanges.filter((change) => rule.matches(change.path)).map((change) => change.path))
    return paths.length ? { id: rule.id, level: rule.level, label: rule.label, detail: rule.detail, paths } : null
  }).filter(Boolean)

  const deletedPaths = unique(normalizedChanges
    .filter((change) => /删除|delete|remove/i.test(change.operation))
    .map((change) => change.path))
  if (deletedPaths.length) {
    risks.push({
      id: 'deletions', level: 'high', label: '文件被删除',
      detail: '删除可能是预期清理，也可能丢失功能或用户内容。发布前应确认删除对象和恢复方式。',
      paths: deletedPaths
    })
  }

  if (normalizedChanges.length >= 10) {
    risks.push({
      id: 'large-change', level: 'medium', label: '本轮改动范围较大',
      detail: `Harness 确认改动 ${normalizedChanges.length} 个文件。建议拆阶段或增加一次独立审查。`,
      paths: normalizedChanges.map((change) => change.path)
    })
  }

  const passedVerification = verifications.some((item) => item?.state === 'passed')
  const warnings = []
  if (risks.length && !passedVerification) {
    warnings.push('本轮包含高影响改动，但没有确认到通过的测试、检查或构建证据。')
  }
  if (risks.some((risk) => risk.id === 'dependencies')) {
    warnings.push('依赖文件发生变化；Deep code 尚未确认包来源、许可证、漏洞或安装脚本。')
  }

  const recoveryAssessment = assessRecovery({ baseline, changes: normalizedChanges, recovery })

  return { risks, warnings, recoveryAssessment }
}

module.exports = { assessWorkReceipt }
