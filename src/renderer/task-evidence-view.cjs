(function exposeTaskEvidenceView(root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  if (root) root.DeepCodeTaskEvidenceView = api
})(typeof window === 'undefined' ? globalThis : window, function taskEvidenceViewFactory() {
  const OUTCOME_BADGES = Object.freeze({ success: '已完成', pending: '等待确认', error: '需要处理' })
  const TOOL_KINDS = Object.freeze({ terminal: '命令', diff: '文件', read: '读取', search: '搜索', web: '网页', generic: '工具' })

  function array(value) {
    return Array.isArray(value) ? value : []
  }

  function createTaskEvidenceView({
    document,
    elements,
    formatDuration,
    onGuidanceAction = () => {},
    onEvidenceTarget = () => {}
  }) {
    const { trace, receipt, guidance } = elements

    function replaceFactList(container, items, emptyCopy, copy) {
      container.replaceChildren()
      for (const item of array(items).length ? items : [null]) {
        const row = document.createElement('li')
        row.textContent = item ? copy(item) : emptyCopy
        if (!item) row.className = 'fact-empty'
        container.append(row)
      }
    }

    function appendPre(container, text, className = '') {
      const pre = document.createElement('pre')
      if (className) pre.className = className
      pre.textContent = String(text || '')
      container.append(pre)
    }

    function toolCardState(card) {
      if (card.state === 'error') return '失败'
      if (card.state === 'working') return '进行中'
      return '已完成'
    }

    function renderDiffCard(body, card) {
      const diffs = array(card.diffs)
      if (!diffs.length) {
        body.textContent = 'Harness 没有提供可显示的差异。'
        return
      }
      for (const diff of diffs) {
        const file = document.createElement('details')
        file.className = 'diff-file'
        file.open = diffs.length === 1
        const label = document.createElement('summary')
        label.textContent = String(diff.path || '未提供路径')
        const panes = document.createElement('div')
        panes.className = 'diff-panes'
        const before = document.createElement('section')
        const after = document.createElement('section')
        const beforeLabel = document.createElement('strong')
        const afterLabel = document.createElement('strong')
        beforeLabel.textContent = diff.oldText === null ? '此前内容未提供' : '修改前'
        afterLabel.textContent = diff.oldText === null ? '新内容' : '修改后'
        before.append(beforeLabel)
        after.append(afterLabel)
        appendPre(before, diff.oldText === null ? '（新建文件或 Harness 未提供修改前内容）' : diff.oldText, 'diff-before')
        appendPre(after, diff.newText, 'diff-after')
        panes.append(before, after)
        file.append(label, panes)
        body.append(file)
      }
    }

    function renderTerminalCard(body, card) {
      const meta = document.createElement('p')
      meta.className = 'tool-card-meta'
      meta.textContent = [
        card.cwd ? `目录：${card.cwd}` : '',
        Number.isInteger(card.exitCode) ? `退出代码：${card.exitCode}` : '',
        card.signal ? `信号：${card.signal}` : ''
      ].filter(Boolean).join(' · ') || 'Harness 没有提供工作目录或退出状态。'
      body.append(meta)
      appendPre(body, card.output || '（命令没有返回可显示的输出）', 'terminal-output')
    }

    function renderReadCard(body, card) {
      const meta = document.createElement('p')
      meta.className = 'tool-card-meta'
      meta.textContent = `${card.path || '未提供路径'}${Number.isInteger(card.totalLines) ? ` · 文件共 ${card.totalLines} 行` : ''}${card.lang ? ` · ${card.lang}` : ''}`
      body.append(meta)
      const lines = document.createElement('div')
      lines.className = 'read-lines'
      for (const line of array(card.lines)) {
        const number = document.createElement('span')
        const text = document.createElement('code')
        number.textContent = String(line.number)
        text.textContent = String(line.text || '')
        lines.append(number, text)
      }
      if (!array(card.lines).length) lines.textContent = 'Harness 没有返回可显示的文本行。'
      body.append(lines)
    }

    function renderSearchCard(body, card) {
      const meta = document.createElement('p')
      meta.className = 'tool-card-meta'
      meta.textContent = `${Number.isInteger(card.total) ? `共找到 ${card.total} 项` : '搜索结果'}${card.truncated ? ' · 当前只显示部分结果' : ''}`
      body.append(meta)
      if (card.shape === 'matches') {
        for (const file of array(card.files)) {
          const group = document.createElement('details')
          group.className = 'search-group'
          const label = document.createElement('summary')
          label.textContent = `${file.path} · ${array(file.matches).length} 处`
          const matches = document.createElement('div')
          matches.className = 'read-lines'
          for (const match of array(file.matches)) {
            const number = document.createElement('span')
            const line = document.createElement('code')
            number.textContent = String(match.lineNumber)
            line.textContent = String(match.line || '')
            matches.append(number, line)
          }
          group.append(label, matches)
          body.append(group)
        }
      } else {
        const paths = document.createElement('ul')
        paths.className = 'tool-path-list'
        for (const path of array(card.paths)) {
          const item = document.createElement('li')
          item.textContent = String(path)
          paths.append(item)
        }
        body.append(paths)
      }
    }

    function renderWebCard(body, card) {
      const meta = document.createElement('p')
      meta.className = 'tool-card-meta'
      meta.textContent = card.kind === 'fetch'
        ? `${Number.isInteger(card.statusCode) ? `HTTP ${card.statusCode}` : '网页读取'}${card.truncated ? ' · 内容已截断' : ''}`
        : `${array(card.sources).length} 个来源${card.truncated ? ' · 来源列表已截断' : ''}`
      body.append(meta)
      if (card.answer) {
        const answer = document.createElement('p')
        answer.textContent = card.answer
        body.append(answer)
      }
      if (card.kind === 'fetch' && card.url) {
        const link = document.createElement('a')
        link.href = card.url
        link.textContent = card.url
        body.append(link)
      }
      for (const source of array(card.sources)) {
        const sourceNode = document.createElement('article')
        sourceNode.className = 'web-source'
        const link = document.createElement('a')
        link.href = source.url
        link.textContent = source.title || source.url
        sourceNode.append(link)
        if (source.snippet) {
          const snippet = document.createElement('p')
          snippet.textContent = source.snippet
          sourceNode.append(snippet)
        }
        body.append(sourceNode)
      }
    }

    function renderGenericCard(body, card) {
      if (array(card.locations).length) {
        const locations = document.createElement('ul')
        locations.className = 'tool-path-list'
        for (const location of card.locations) {
          const item = document.createElement('li')
          item.textContent = `${location.path}${location.line ? `:${location.line}` : ''}`
          locations.append(item)
        }
        body.append(locations)
      }
      if (card.rawInput !== null && card.rawInput !== undefined) {
        appendPre(body, typeof card.rawInput === 'string' ? card.rawInput : JSON.stringify(card.rawInput, null, 2))
      }
      const content = array(card.content).filter((item) => item?.type === 'text').map((item) => item.text).join('')
      if (content) appendPre(body, content)
      if (!body.childNodes.length) body.textContent = 'Harness 没有提供更详细的展示信息。'
    }

    function renderToolCard(card = {}) {
      const node = document.createElement('details')
      node.className = 'tool-card'
      node.dataset.card = String(card.type || 'generic')
      node.dataset.cardId = String(card.id || '')
      node.dataset.state = String(card.state || 'done')
      node.open = card.state === 'error'
      const summary = document.createElement('summary')
      const kind = document.createElement('span')
      kind.className = 'tool-card-kind'
      kind.textContent = TOOL_KINDS[card.type] || '工具'
      const title = document.createElement('strong')
      title.textContent = String(card.title || '未命名操作')
      const status = document.createElement('span')
      status.className = 'tool-card-status'
      status.textContent = `${toolCardState(card)}${Number.isFinite(card.durationMs) ? ` · ${formatDuration(card.durationMs)}` : ''}`
      summary.append(kind, title, status)
      const body = document.createElement('div')
      body.className = 'tool-card-body'
      if (card.type === 'diff') renderDiffCard(body, card)
      else if (card.type === 'terminal') renderTerminalCard(body, card)
      else if (card.type === 'read') renderReadCard(body, card)
      else if (card.type === 'search') renderSearchCard(body, card)
      else if (card.type === 'web') renderWebCard(body, card)
      else renderGenericCard(body, card)
      node.append(summary, body)
      return node
    }

    function renderToolCards(cards) {
      trace.toolCards.replaceChildren()
      if (!array(cards).length) {
        const empty = document.createElement('p')
        empty.className = 'fact-empty'
        empty.textContent = '没有工具操作。'
        trace.toolCards.append(empty)
        return
      }
      trace.toolCards.append(...cards.map(renderToolCard))
    }

    function renderRunDetails(thread = {}) {
      const details = thread.agent?.runDetails || {}
      const duration = formatDuration(details.durationMs)
      const changedCount = array(details.changedFiles).length
      const activityCount = array(details.activities).length
      const labelParts = ['运行详情']
      if (duration) labelParts.push(`用时 ${duration}`)
      if (changedCount) labelParts.push(`改动 ${changedCount} 个文件`)
      else if (activityCount) labelParts.push(`${activityCount} 项操作`)
      trace.label.textContent = labelParts.join(' · ')
      replaceFactList(trace.permissionFacts, details.permissionFacts, 'Harness 没有提供可确认的权限快照。', (item) => `${item.label}。${item.detail}`)
      replaceFactList(trace.changedFiles, details.changedFiles, '没有确认到文件改动。', (item) => `${item.path}（${item.operation}）`)
      renderToolCards(details.toolCards)

      const evidence = array(thread.agent?.evidence)
      const context = array(details.runtimeContext)
      const sections = []
      const rawSections = []
      if (thread.baseline) {
        const baseline = thread.baseline
        const head = baseline.head ? String(baseline.head).slice(0, 12) : '此工作区没有可用的 Git HEAD（与模型连接无关）'
        const dirtyCount = array(baseline.dirtyPaths).length
        sections.push(`任务开始前的本地 Git 基线\n\n项目：${thread.workspacePath || baseline.workspacePath || '未记录'}\n记录时间：${baseline.capturedAt || '未记录'}\n状态：${baseline.message || baseline.state}\nHEAD：${head}\n任务前已有未提交路径：${dirtyCount} 个\n\n这份基线只记录路径级状态，不包含文件正文，也不是可撤回 checkpoint。`)
      }
      if (context.length) {
        sections.push(`运行上下文摘要（不作为你的发言显示）\n\n${context.map((item) => `• ${item.label}。${item.detail}`).join('\n')}`)
        rawSections.push(`Harness 原始运行上下文\n\n${context.map((item) => `[${item.source?.plugin || item.source?.kind || 'Harness'}] ${item.raw}`).join('\n\n')}`)
      }
      if (evidence.length) rawSections.push(`Harness 原始技术证据\n\n${evidence.map((item) => `${item.type}\n${JSON.stringify(item.detail, null, 2)}`).join('\n\n')}`)
      trace.evidenceContent.textContent = sections.join('\n\n---\n\n') || '还没有技术记录。'
      trace.evidenceRaw.textContent = rawSections.join('\n\n---\n\n') || '还没有原始记录。'
    }

    function appendOutcomeSection(title, items, className = '') {
      if (!array(items).length) return
      const section = document.createElement('section')
      const heading = document.createElement('h4')
      heading.textContent = title
      const list = document.createElement('ul')
      if (className) list.className = className
      for (const value of items) {
        const item = document.createElement('li')
        item.textContent = String(value)
        list.append(item)
      }
      section.append(heading, list)
      receipt.sections.append(section)
    }

    function renderOutcomeMap(map) {
      const nodes = array(map?.nodes)
      const visible = Boolean(map?.visible && nodes.length)
      receipt.map.classList.toggle('hidden', !visible)
      receipt.mapEmpty.classList.toggle('hidden', visible)
      receipt.mapFlow.replaceChildren()
      receipt.mapLegend.textContent = visible ? String(map.legend || '') : ''
      if (!visible) return
      const edgeTargets = new Set(array(map.edges).map((edge) => edge.to))
      for (const node of nodes) {
        const card = document.createElement('button')
        card.type = 'button'
        card.className = 'outcome-map-node'
        card.dataset.state = String(node.state || 'unknown')
        card.dataset.kind = String(node.kind || 'unknown')
        if (edgeTargets.has(node.id)) card.classList.add('has-incoming-edge')
        const eyebrow = document.createElement('span')
        eyebrow.className = 'outcome-map-node-eyebrow'
        eyebrow.textContent = String(node.eyebrow || '')
        const title = document.createElement('strong')
        title.textContent = String(node.title || '')
        const summary = document.createElement('span')
        summary.className = 'outcome-map-node-summary'
        summary.textContent = String(node.summary || '')
        const action = document.createElement('span')
        action.className = 'outcome-map-node-action'
        action.textContent = '查看证据 →'
        card.append(eyebrow, title, summary, action)
        card.addEventListener('click', () => onEvidenceTarget(String(node.evidenceTarget || 'root')))
        receipt.mapFlow.append(card)
      }
    }

    function renderTaskOutcome(thread = {}) {
      const outcome = thread.outcome
      receipt.outcome.classList.toggle('hidden', !outcome?.visible)
      renderOutcomeMap(outcome?.map)
      receipt.sections.replaceChildren()
      if (!outcome?.visible) return
      receipt.outcome.dataset.state = String(outcome.state || 'error')
      receipt.title.textContent = String(outcome.title || '')
      receipt.badge.textContent = OUTCOME_BADGES[outcome.state] || '需要处理'
      receipt.summary.textContent = String(outcome.summary || '')
      const modelVerification = outcome.modelVerification
      appendOutcomeSection('模型验证回执', modelVerification ? [
        `${modelVerification.state === 'passed' ? '通过' : modelVerification.state === 'failed' ? '未通过' : '已中止'} · ${modelVerification.modelName || modelVerification.model}${modelVerification.reasoningEffort ? ` · ${modelVerification.reasoningEffort}` : ''}；路线证据：Harness 请求头；终态：${modelVerification.terminalReason || modelVerification.state}`
      ] : [])
      appendOutcomeSection('确认的文件改动', array(outcome.changes).map((item) => `${item.operation} · ${item.path}`))
      const verificationLabel = (state) => state === 'passed' ? '通过' : state === 'failed' ? '未通过' : '未确认'
      appendOutcomeSection('明确的验证', array(outcome.verifications).map((item) => `${verificationLabel(item.state)} · ${item.label}（${item.detail}）`), 'outcome-verifications')
      appendOutcomeSection('需要你留意的高影响改动', array(outcome.risks).map((item) => `${item.label}：${item.detail}`), 'outcome-risks')
      appendOutcomeSection('仍需留意', outcome.warnings, 'outcome-warnings')
      appendOutcomeSection('任务与改动归属', outcome.recoveryAssessment ? [`${outcome.workspace?.label || '未记录项目'}：${outcome.recoveryAssessment.label}。${outcome.recoveryAssessment.detail}`] : [])
      appendOutcomeSection('这会影响什么', outcome.impact ? [outcome.impact] : [])
      appendOutcomeSection('接下来只需做什么', outcome.nextAction ? [outcome.nextAction] : [])
    }

    function renderTaskGuidance(thread = {}) {
      const nextGuidance = thread.guidance
      guidance.root.classList.toggle('hidden', !nextGuidance?.visible)
      guidance.actions.replaceChildren()
      if (!nextGuidance?.visible) return
      guidance.root.dataset.tone = String(nextGuidance.tone || 'review')
      guidance.title.textContent = String(nextGuidance.title || '')
      guidance.summary.textContent = String(nextGuidance.summary || '')
      for (const [index, next] of array(nextGuidance.actions).entries()) {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = index === 0 ? 'primary-button' : 'quiet-button'
        button.textContent = String(next.label || '')
        button.title = String(next.detail || '')
        button.addEventListener('click', () => onGuidanceAction(String(next.id || '')))
        guidance.actions.append(button)
      }
    }

    function render(thread = {}) {
      renderRunDetails(thread)
      renderTaskOutcome(thread)
      renderTaskGuidance(thread)
    }

    return { render }
  }

  return { createTaskEvidenceView }
})
