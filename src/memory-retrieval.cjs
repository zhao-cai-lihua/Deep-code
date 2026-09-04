function boundedQuery(value) {
  const query = String(value || '').normalize('NFKC').trim().toLowerCase()
  if (!query) throw new Error('请先描述准备开始的任务。')
  if (query.length > 2000) throw new Error('任务描述过长，请缩短到 2000 字以内。')
  return query
}

function terms(value) {
  const normalized = String(value || '').normalize('NFKC').toLowerCase()
  const result = new Set(normalized.match(/[a-z0-9][a-z0-9_-]{1,}/g) || [])
  for (const sequence of normalized.match(/[\p{Script=Han}]{2,}/gu) || []) {
    if (sequence.length <= 6) result.add(sequence)
    for (let index = 0; index < sequence.length - 1; index += 1) result.add(sequence.slice(index, index + 2))
  }
  return result
}

function overlap(queryTerms, value) {
  return [...terms(value)].filter((term) => queryTerms.has(term))
}

function scopeEligible(scope, projectPath) {
  return scope === 'global' || (projectPath && scope === `project:${projectPath}`)
}

function previewMemoryRetrieval({ records, query, projectPath = '', limit = 5 }) {
  const normalizedQuery = boundedQuery(query)
  const queryTerms = terms(normalizedQuery)
  const safeLimit = Math.max(1, Math.min(8, Number(limit) || 5))
  const matches = []
  for (const record of Array.isArray(records) ? records : []) {
    if (record?.status !== 'confirmed' || !scopeEligible(record.scope, String(projectPath || ''))) continue
    const titleTerms = overlap(queryTerms, record.title)
    const contentTerms = overlap(queryTerms, record.content)
    const reasonTerms = overlap(queryTerms, record.reason)
    const matchedTerms = [...new Set([...titleTerms, ...contentTerms, ...reasonTerms])]
    const exactTitle = String(record.title || '').length >= 2 && normalizedQuery.includes(String(record.title).normalize('NFKC').toLowerCase())
    const score = titleTerms.length * 5 + contentTerms.length * 3 + reasonTerms.length + (exactTitle ? 8 : 0)
    if (score <= 0) continue
    const scopeReason = record.scope === 'global' ? '适用于所有项目' : '适用于当前项目'
    matches.push({
      id: record.id,
      title: record.title,
      kind: record.kind,
      scope: record.scope,
      content: record.content,
      limits: record.limits,
      score,
      matchedTerms: matchedTerms.slice(0, 6),
      reasons: [scopeReason, matchedTerms.length ? `与任务描述共同出现：${matchedTerms.slice(0, 6).join('、')}` : '标题与任务描述一致'],
      estimatedCharacters: [record.title, record.content, record.limits].join('\n').length
    })
  }
  matches.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'zh-CN'))
  const selected = matches.slice(0, safeLimit)
  return {
    query: String(query).trim(),
    matches: selected,
    consideredCount: (Array.isArray(records) ? records : []).filter((record) => record?.status === 'confirmed').length,
    eligibleCount: (Array.isArray(records) ? records : []).filter((record) => record?.status === 'confirmed' && scopeEligible(record.scope, String(projectPath || ''))).length,
    estimatedCharacters: selected.reduce((sum, item) => sum + item.estimatedCharacters, 0),
    modelCalled: false,
    promptChanged: false
  }
}

function composeMemoryContext({ records, query, projectPath = '', selectedIds, maxCharacters = 3000 }) {
  const requested = new Set((Array.isArray(selectedIds) ? selectedIds : []).map(String).slice(0, 8))
  const preview = previewMemoryRetrieval({ records, query, projectPath, limit: 8 })
  const eligible = preview.matches.filter((match) => requested.has(match.id))
  const safeMaximum = Math.max(500, Math.min(6000, Number(maxCharacters) || 3000))
  const included = []
  const omitted = []
  let text = ''
  for (const match of eligible) {
    const scope = match.scope === 'global' ? '所有项目' : '当前项目'
    const block = `### ${match.title}\n适用范围：${scope}\n记住：${match.content}\n例外：${match.limits}`
    const next = text ? `${text}\n\n${block}` : `## Deep Code 已确认记忆（用户本次选择）\n\n${block}`
    if (next.length > safeMaximum) {
      omitted.push({ id: match.id, title: match.title, reason: `超过 ${safeMaximum} 字符上限` })
      continue
    }
    text = next
    included.push({ id: match.id, title: match.title, scope: match.scope })
  }
  return {
    text,
    included,
    omitted,
    characterCount: text.length,
    requestedCount: requested.size,
    modelCalled: false,
    promptChanged: false,
    readyToApply: included.length > 0 && omitted.length === 0
  }
}

module.exports = { composeMemoryContext, previewMemoryRetrieval }
