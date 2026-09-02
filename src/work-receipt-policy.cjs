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

function assessWorkReceipt({ changes = [], verifications = [], recovery = null } = {}) {
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

  const recoveryAssessment = recovery
    ? {
        state: 'available',
        label: '已有恢复指引',
        detail: String(recovery.nextAction || '按当前任务的恢复说明继续。')
      }
    : normalizedChanges.length
      ? {
          state: 'unknown',
          label: '尚未确认一键撤回点',
          detail: 'Harness 确认了文件改动，但当前回执没有 Git checkpoint 证据。请不要把“有文件列表”理解为“所有操作都可撤回”。'
        }
      : {
          state: 'not-needed',
          label: '没有确认到文件改动',
          detail: '本轮回执没有需要撤回的已确认工作区文件改动。'
        }

  return { risks, warnings, recoveryAssessment }
}

module.exports = { assessWorkReceipt }
