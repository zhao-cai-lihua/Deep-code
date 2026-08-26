function textBlocks(content) {
  if (!Array.isArray(content)) return ''
  return content
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('')
    .trim()
}

function imageBlocks(content) {
  if (!Array.isArray(content)) return []
  return content
    .filter((block) => block?.type === 'image' && block.attachment && typeof block.attachment === 'object')
    .map((block) => block.attachment)
    .filter((attachment) => typeof attachment.attachmentId === 'string')
    .map((attachment) => ({
      attachmentId: attachment.attachmentId,
      mediaType: typeof attachment.mediaType === 'string' ? attachment.mediaType : 'image/unknown',
      bytes: Number.isInteger(attachment.bytes) ? attachment.bytes : null,
      width: Number.isInteger(attachment.width) ? attachment.width : null,
      height: Number.isInteger(attachment.height) ? attachment.height : null,
      name: typeof attachment.name === 'string' && attachment.name ? attachment.name : '未命名图片'
    }))
}

function safeJson(value) {
  if (value && typeof value === 'object') return value
  try { return JSON.parse(String(value || '{}')) } catch { return {} }
}

function contextSummary(text, source = {}) {
  const normalized = String(text || '')
  if (/Current DSH file policy:\s*danger-full-access/i.test(normalized)) {
    return { kind: 'permission', key: 'file-policy', label: '文件权限：完全访问', detail: '本轮任务可读写当前电脑上的文件。' }
  }
  if (/Current DSH file policy:\s*workspace-write/i.test(normalized)) {
    return { kind: 'permission', key: 'file-policy', label: '文件权限：仅工作区可写', detail: '本轮任务只能在允许的工作区内写入文件。' }
  }
  if (/Current DSH file policy:\s*read-only/i.test(normalized)) {
    return { kind: 'permission', key: 'file-policy', label: '文件权限：只读', detail: '本轮任务不能修改文件。' }
  }
  if (/Approval prompts are disabled/i.test(normalized)) {
    return { kind: 'permission', key: 'approval-policy', label: '操作审批：已关闭', detail: '需要额外批准的操作会被自动拒绝。' }
  }
  if (/<available_skills>/i.test(normalized)) {
    const count = (normalized.match(/<skill>/gi) || []).length
    return { kind: 'capability', label: `技能目录已载入${count ? `（${count} 项）` : ''}`, detail: '完整目录已收进运行详情，不占用对话正文。' }
  }
  if (source.kind === 'agent-instructions' || /<system-reminder>/i.test(normalized)) {
    return { kind: 'context', label: '项目协作说明已载入', detail: '这些说明提供给 Agent，不是你发送的对话。' }
  }
  const producer = source.plugin || source.kind || 'Harness'
  return { kind: 'context', label: `${producer} 更新了运行上下文`, detail: '完整内容已收进运行详情。' }
}

function toolKind(name) {
  const value = String(name || '').toLowerCase()
  if (/(^|[_.-])(write|edit|patch|replace|create|delete|move|rename)([_.-]|$)/.test(value)) return 'file-change'
  if (/(^|[_.-])(read|glob|grep|search|find|list)([_.-]|$)/.test(value)) return 'read'
  if (/(bash|shell|powershell|pwsh|command|exec)/.test(value)) return 'command'
  if (/(web|fetch|http|browser)/.test(value)) return 'network'
  return 'tool'
}

function presenterKind(presenter, fallback) {
  return ({ diff: 'file-change', terminal: 'command', read: 'read', search: 'read', web: 'network' })[presenter?.card] || fallback
}

function toolLabel(kind, name, args, view) {
  if (view?.title) return String(view.title)
  const path = args.file_path || args.filePath || args.path || args.target || args.filename
  if (kind === 'file-change') return path ? `修改文件：${path}` : `修改文件（${name}）`
  if (kind === 'read') return path ? `查看：${path}` : `读取或搜索（${name}）`
  if (kind === 'command') return `运行命令（${name}）`
  if (kind === 'network') return `访问网络（${name}）`
  return `使用工具：${name || '未命名工具'}`
}

function filePathFrom(args) {
  const path = args.file_path || args.filePath || args.path || args.target || args.filename
  return typeof path === 'string' && path.trim() ? path.trim() : ''
}

function presenterDetail(presenter) {
  if (!presenter || typeof presenter !== 'object') return ''
  if (presenter.card === 'terminal') {
    const status = Number.isInteger(presenter.exitCode) ? `退出代码 ${presenter.exitCode}` : (presenter.signal ? `由 ${presenter.signal} 终止` : '')
    return [presenter.cwd ? `目录 ${presenter.cwd}` : '', status].filter(Boolean).join(' · ')
  }
  if (presenter.card === 'diff') {
    const paths = (presenter.diffs || []).map((item) => item?.path).filter(Boolean)
    return paths.length ? paths.join('、') : ''
  }
  if (presenter.card === 'read') {
    const paths = [presenter.path, ...(presenter.locations || []).map((item) => item?.path)].filter(Boolean)
    return paths.length ? paths.join('、') : ''
  }
  if (presenter.card === 'search') {
    if (Array.isArray(presenter.files)) return `匹配 ${presenter.files.length} 个文件${presenter.truncated ? '（结果已截断）' : ''}`
    if (Array.isArray(presenter.paths)) return `找到 ${presenter.paths.length} 个路径${presenter.truncated ? '（结果已截断）' : ''}`
  }
  if (presenter.card === 'web') {
    const count = Array.isArray(presenter.sources) ? presenter.sources.length : 0
    return count ? `${count} 个来源` : ''
  }
  return ''
}

function humanFileOperation(name) {
  const value = String(name || '').toLowerCase()
  if (/(delete|remove|unlink)/.test(value)) return '删除'
  if (/(move|rename)/.test(value)) return '移动或重命名'
  if (/(create|write)/.test(value)) return '写入'
  if (/(edit|patch|replace)/.test(value)) return '修改'
  return '文件变更'
}

function latestTurnDuration(events) {
  const starts = new Map()
  let latest = null
  for (const entry of events) {
    const event = entry?.event || {}
    if (event.type === 'turn/start' && Number.isFinite(event.time)) starts.set(event.data?.turn, event.time)
    if (event.type === 'turn/end' && Number.isFinite(event.time)) {
      const start = starts.get(event.data?.turn)
      if (Number.isFinite(start) && event.time >= start) latest = event.time - start
    }
  }
  return latest
}

function latestTurnTerminal(events) {
  const end = [...events].reverse().find((entry) => entry?.event?.type === 'turn/end')?.event
  if (!end) return null
  const raw = typeof end.data?.reason === 'object' ? end.data.reason?.kind : end.data?.reason
  const reason = typeof raw === 'string' && raw ? raw : 'unknown'
  const state = ['complete', 'completed', 'stop'].includes(reason)
    ? 'completed'
    : ['cancelled', 'canceled', 'interrupted', 'aborted'].includes(reason)
      ? 'interrupted'
      : 'failed'
  return {
    state,
    reason,
    ...(Number.isFinite(end.data?.turn) ? { turn: end.data.turn } : {})
  }
}

function normalizedLocations(presenter) {
  return (presenter?.locations || [])
    .filter((item) => item && typeof item.path === 'string')
    .map((item) => ({ path: item.path, ...(Number.isInteger(item.line) ? { line: item.line } : {}) }))
}

function toolCardFromActivity(activity) {
  const call = activity.presenter || {}
  const result = activity.resultPresenter || {}
  const presenter = result.card ? result : call
  const card = {
    id: activity.callId,
    type: presenter.card || call.card || 'generic',
    state: activity.state,
    title: activity.label,
    detail: activity.detail,
    durationMs: Number.isFinite(activity.completedTime) && Number.isFinite(activity.time)
      ? Math.max(0, activity.completedTime - activity.time)
      : null,
    locations: normalizedLocations(call)
  }

  if (card.type === 'terminal') {
    return {
      ...card,
      command: String(call.title || activity.label || ''),
      description: typeof call.description === 'string' ? call.description : '',
      cwd: typeof call.cwd === 'string' ? call.cwd : '',
      output: typeof result.output === 'string' ? result.output : '',
      exitCode: Number.isInteger(result.exitCode) ? result.exitCode : null,
      signal: typeof result.signal === 'string' ? result.signal : ''
    }
  }
  if (card.type === 'diff') {
    const diffs = Array.isArray(result.diffs) ? result.diffs : (Array.isArray(call.diffs) ? call.diffs : [])
    return {
      ...card,
      diffs: diffs.filter((item) => item && typeof item.path === 'string').map((item) => ({
        path: item.path,
        oldText: typeof item.oldText === 'string' ? item.oldText : null,
        newText: typeof item.newText === 'string' ? item.newText : ''
      }))
    }
  }
  if (card.type === 'read') {
    return {
      ...card,
      path: typeof result.path === 'string' ? result.path : '',
      offset: Number.isInteger(result.offset) ? result.offset : null,
      totalLines: Number.isInteger(result.totalLines) ? result.totalLines : null,
      lang: typeof result.lang === 'string' ? result.lang : '',
      lines: (result.lines || []).filter((item) => item && Number.isInteger(item.number) && typeof item.text === 'string')
        .map((item) => ({ number: item.number, text: item.text }))
    }
  }
  if (card.type === 'search') {
    return {
      ...card,
      shape: result.shape === 'matches' ? 'matches' : 'paths',
      files: (result.files || []).filter((item) => item && typeof item.path === 'string').map((item) => ({
        path: item.path,
        matches: (item.matches || []).filter((match) => match && Number.isInteger(match.lineNumber) && typeof match.line === 'string')
          .map((match) => ({ lineNumber: match.lineNumber, line: match.line }))
      })),
      paths: (result.paths || []).filter((item) => typeof item === 'string'),
      truncated: result.truncated === true,
      total: Number.isInteger(result.total) ? result.total : null
    }
  }
  if (card.type === 'web') {
    return {
      ...card,
      kind: result.kind === 'fetch' ? 'fetch' : 'search',
      sources: (result.sources || []).filter((item) => item && typeof item.url === 'string').map((item) => ({
        url: item.url,
        title: typeof item.title === 'string' ? item.title : '',
        snippet: typeof item.snippet === 'string' ? item.snippet : '',
        publishedAt: typeof item.publishedAt === 'string' ? item.publishedAt : ''
      })),
      answer: typeof result.answer === 'string' ? result.answer : '',
      url: typeof result.url === 'string' ? result.url : '',
      statusCode: Number.isInteger(result.statusCode) ? result.statusCode : null,
      truncated: result.truncated === true
    }
  }
  return {
    ...card,
    kind: typeof call.kind === 'string' ? call.kind : 'other',
    rawInput: call.rawInput === undefined ? null : call.rawInput,
    content: Array.isArray(result.content) ? result.content : (Array.isArray(call.content) ? call.content : [])
  }
}

function projectConversation(page) {
  const events = page?.events || []
  let latestTurnStartIndex = -1
  for (let index = 0; index < events.length; index += 1) {
    if (events[index]?.event?.type === 'turn/start') latestTurnStartIndex = index
  }
  const latestTurnEvents = latestTurnStartIndex >= 0 ? events.slice(latestTurnStartIndex) : events
  const messages = []
  const evidence = []
  const runtimeContext = []
  const activities = []
  const changedFiles = []
  const permissionFacts = []
  const calls = new Map()

  let eventIndex = -1
  for (const entry of events) {
    eventIndex += 1
    const event = entry?.event || {}
    const data = event.data || {}
    if (event.type === 'user/message') {
      const message = data.message || data
      const text = textBlocks(message.content)
      const images = imageBlocks(message.content)
      const source = message.source || {}
      const isHuman = source.kind === 'user' || (!source.kind && !/^\s*<system-reminder>/i.test(text))
      if ((text || images.length) && isHuman) messages.push({ role: 'user', text, seq: event.seq, time: event.time, ...(images.length ? { images } : {}) })
      else if (text) {
        const summary = contextSummary(text, source)
        runtimeContext.push({ seq: event.seq, time: event.time, source, raw: text, ...summary })
        if (summary.kind === 'permission') {
          const previous = permissionFacts.findIndex((item) => item.key === summary.key)
          if (previous >= 0) permissionFacts.splice(previous, 1, summary)
          else permissionFacts.push(summary)
        }
      }
      continue
    }
    if (event.type === 'assistant/message') {
      const content = data.message?.content
      const text = textBlocks(content)
      const images = imageBlocks(content)
      if (text || images.length) messages.push({ role: 'assistant', text, seq: event.seq, time: event.time, ...(images.length ? { images } : {}) })
      continue
    }
    if (event.type === 'tool/call') {
      if (latestTurnStartIndex >= 0 && eventIndex < latestTurnStartIndex) continue
      const args = safeJson(data.arguments)
      const presenter = entry.view?.view || entry.view
      const kind = presenterKind(presenter, toolKind(data.name))
      const activity = {
        callId: String(data.callId || event.seq), seq: event.seq, time: event.time,
        name: String(data.name || ''), kind, state: 'working',
        label: toolLabel(kind, data.name, args, presenter),
        detail: presenterDetail(presenter),
        presenter: presenter || null,
        args
      }
      calls.set(activity.callId, activity)
      activities.push(activity)
      evidence.push({ type: event.type, seq: event.seq, detail: entry.view || data })
      continue
    }
    if (event.type === 'tool/result' || event.type === 'tool/error') {
      if (latestTurnStartIndex >= 0 && eventIndex < latestTurnStartIndex) continue
      const callId = String(data.message?.source?.callId || data.callId || '')
      const call = calls.get(callId)
      if (call) {
        const presenter = entry.view?.view || entry.view
        const resultBlock = data.message?.content?.[0]
        call.state = event.type === 'tool/error' || data.error || resultBlock?.isError === true ? 'error' : 'done'
        call.resultSeq = event.seq
        call.completedTime = event.time
        call.resultPresenter = presenter || null
        if (presenter?.title) call.label = String(presenter.title)
        call.detail = presenterDetail(presenter) || call.detail
        if (call.kind === 'file-change' && call.state === 'done') {
          const presenterPaths = (presenter?.diffs || call.presenter?.diffs || [])
            .map((diff) => diff?.path).filter((path) => typeof path === 'string' && path.trim())
          const paths = presenterPaths.length ? presenterPaths : [filePathFrom(call.args)].filter(Boolean)
          for (const path of paths) {
            if (!changedFiles.some((item) => item.path === path)) {
              changedFiles.push({ path, operation: humanFileOperation(call.name), seq: event.seq })
            }
          }
        }
      }
      evidence.push({ type: event.type, seq: event.seq, detail: entry.view || data })
    }
  }

  return {
    messages,
    runDetails: {
      durationMs: latestTurnDuration(latestTurnEvents),
      terminal: latestTurnTerminal(latestTurnEvents),
      permissionFacts,
      changedFiles,
      activities,
      toolCards: activities.map(toolCardFromActivity),
      runtimeContext
    },
    evidence,
    hasMore: Boolean(page?.hasMore)
  }
}

module.exports = { projectConversation, textBlocks, imageBlocks, contextSummary, toolKind, presenterKind, presenterDetail, humanFileOperation, toolCardFromActivity, latestTurnTerminal }
