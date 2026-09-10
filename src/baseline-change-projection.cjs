function pathsOf(baseline) {
  return new Set(Array.isArray(baseline?.dirtyPaths) ? baseline.dirtyPaths.map(String) : [])
}

function projectConfirmedBaselineChanges(before, after) {
  if (!before || !after || !['clean', 'dirty'].includes(before.state) || !['clean', 'dirty'].includes(after.state)) return []
  if (before.repoRoot && after.repoRoot && before.repoRoot !== after.repoRoot) return []
  const oldPaths = pathsOf(before)
  return [...pathsOf(after)]
    .filter((path) => !oldPaths.has(path))
    .map((path) => ({ path, operation: 'Git 基线检测到变化', confirmed: true, source: 'workspace-baseline' }))
}

module.exports = { projectConfirmedBaselineChanges }
