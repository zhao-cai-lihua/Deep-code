const test = require('node:test')
const assert = require('node:assert/strict')
const { createTaskEvidenceView } = require('../src/renderer/task-evidence-view.cjs')
const { projectTaskRun } = require('../src/run-projection.cjs')
const { FakeDocument, FakeElement, findAll } = require('../test-utils/fake-dom.cjs')
const { taskEvidenceStates } = require('../test-utils/task-evidence-states.cjs')

function element(tag = 'div') {
  return new FakeElement(tag)
}

function createFixture() {
  const document = new FakeDocument()
  const elements = {
    trace: {
      label: element('h3'),
      overview: element('section'),
      overviewTitle: element('h3'),
      overviewSummary: element('p'),
      supportingFacts: element('details'),
      supportingSummary: element('summary'),
      technicalDetails: element('details'),
      permissionFacts: element('ul'),
      changesSection: element('section'),
      changedFiles: element('ul'),
      toolCards: element('div'),
      evidenceContent: element('pre'),
      evidenceRaw: element('pre')
    },
    receipt: {
      outcome: element('section'),
      title: element('h3'),
      badge: element('span'),
      summary: element('p'),
      sections: element('div'),
      map: element('section'),
      mapFlow: element('div'),
      mapLegend: element('p'),
      mapEmpty: element('section')
    },
    guidance: {
      root: element('section'),
      title: element('h3'),
      summary: element('p'),
      actions: element('div')
    }
  }
  const guidanceActions = []
  const evidenceTargets = []
  const view = createTaskEvidenceView({
    document,
    elements,
    formatDuration(value) { return Number.isFinite(value) ? `${value / 1000} 秒` : '' },
    onGuidanceAction(id) { guidanceActions.push(id) },
    onEvidenceTarget(target) { evidenceTargets.push(target) }
  })
  return { view, elements, guidanceActions, evidenceTargets }
}

test('reveals both supporting layers when a receipt links to technical evidence', () => {
  const { view, elements } = createFixture()

  const target = view.revealEvidenceTarget('technical')

  assert.equal(elements.trace.supportingFacts.open, true)
  assert.equal(elements.trace.technicalDetails.open, true)
  assert.equal(target, elements.trace.technicalDetails)
})

test('renders the Run Projection Trace summary without re-deciding lifecycle in the View', () => {
  const { view, elements } = createFixture()

  view.render({
    run: {
      trace: {
        tone: 'warning',
        title: '投影要求核查',
        summary: '1 项操作 · 没有确认到文件改动 · 1 项工具失败。',
        hasChanges: false,
        supportingSummary: '权限、Git 基线与技术证据 · 权限未确认 · 没有任务前基线'
      }
    },
    outcome: { state: 'error', title: '不应由 View 重新裁决' },
    engineState: 'error',
    agent: {
      taskRunSnapshot: { terminal: { state: 'failed' } },
      runDetails: { toolCards: [{ id: 'tool-1', state: 'error', type: 'generic', title: '失败工具' }] }
    }
  })

  assert.equal(elements.trace.overview.dataset.tone, 'warning')
  assert.equal(elements.trace.overviewTitle.textContent, '投影要求核查')
  assert.equal(elements.trace.overviewSummary.textContent, '1 项操作 · 没有确认到文件改动 · 1 项工具失败。')
})

test('renders projected trace facts and every supported tool card without inferring new evidence', () => {
  const { view, elements } = createFixture()
  const thread = {
    workspacePath: 'C:\\work\\demo',
    baseline: {
      state: 'clean', message: '工作区基线已记录。', head: '1234567890abcdef',
      capturedAt: '2026-09-10T00:00:00.000Z', dirtyPaths: []
    },
    agent: {
      evidence: [{ type: 'tool/call', detail: { title: 'read README' } }],
      runDetails: {
        durationMs: 2000,
        activities: [{ id: 'activity-1' }],
        permissionFacts: [{ label: '权限预设：workspace-write', detail: '来自 Harness 结构化事件。' }],
        changedFiles: [{ path: 'README.md', operation: '修改' }],
        runtimeContext: [{ label: '当前策略', detail: '只读摘要', raw: '<system-reminder>full access</system-reminder>', source: { plugin: 'runtime' } }],
        toolCards: [
          { id: 'terminal-1', type: 'terminal', state: 'done', title: '运行测试', durationMs: 1200, cwd: 'C:\\work\\demo', exitCode: 0, output: 'ok' },
          { id: 'diff-1', type: 'diff', state: 'done', title: '修改文件', diffs: [{ path: 'README.md', oldText: 'old', newText: 'new' }] },
          { id: 'read-1', type: 'read', state: 'done', title: '读取文件', path: 'README.md', totalLines: 1, lang: 'md', lines: [{ number: 1, text: '# Demo' }] },
          { id: 'search-1', type: 'search', state: 'done', title: '查找文字', shape: 'matches', total: 1, files: [{ path: 'README.md', matches: [{ lineNumber: 1, line: '# Demo' }] }] },
          { id: 'web-1', type: 'web', state: 'done', title: '读取网页', kind: 'fetch', statusCode: 200, url: 'https://example.com' },
          { id: 'generic-1', type: 'generic', state: 'error', title: '其他工具', locations: [{ path: 'src/app.js', line: 2 }], rawInput: { safe: true }, content: [{ type: 'text', text: '失败详情' }] }
        ]
      }
    }
  }
  thread.run = projectTaskRun(thread)
  view.render(thread)

  assert.equal(elements.trace.label.textContent, '运行详情 · 用时 2 秒 · 改动 1 个文件')
  assert.equal(elements.trace.overview.dataset.tone, 'unknown')
  assert.equal(elements.trace.overviewTitle.textContent, '终态尚未确认')
  assert.equal(elements.trace.overviewSummary.textContent, '6 项操作 · 1 个确认文件改动 · 1 项工具失败。')
  assert.equal(elements.trace.changesSection.classList.contains('hidden'), false)
  assert.equal(elements.trace.supportingSummary.textContent, '权限、Git 基线与技术证据 · 1 项权限事实 · 已记录任务前基线')
  assert.match(elements.trace.permissionFacts.textContent, /权限预设：workspace-write.*来自 Harness 结构化事件/)
  assert.match(elements.trace.changedFiles.textContent, /README\.md（修改）/)
  const cards = findAll(elements.trace.toolCards, (node) => node.tagName === 'DETAILS' && node.className === 'tool-card')
  assert.equal(cards.length, 6)
  assert.deepEqual(cards.map((card) => card.dataset.card), ['terminal', 'diff', 'read', 'search', 'web', 'generic'])
  assert.equal(cards.every((card) => card.open === false), true)
  assert.match(elements.trace.toolCards.textContent, /退出代码：0/)
  assert.match(elements.trace.toolCards.textContent, /修改前old修改后new/)
  assert.match(elements.trace.toolCards.textContent, /文件共 1 行/)
  assert.match(elements.trace.toolCards.textContent, /README\.md · 1 处/)
  assert.match(elements.trace.toolCards.textContent, /HTTP 200/)
  assert.match(elements.trace.toolCards.textContent, /src\/app\.js:2/)
  assert.match(elements.trace.evidenceContent.textContent, /任务开始前的本地 Git 基线/)
  assert.match(elements.trace.evidenceContent.textContent, /HEAD：1234567890ab/)
  assert.match(elements.trace.evidenceContent.textContent, /运行上下文摘要（不作为你的发言显示）/)
  assert.match(elements.trace.evidenceRaw.textContent, /Harness 原始运行上下文/)
  assert.match(elements.trace.evidenceRaw.textContent, /<system-reminder>full access<\/system-reminder>/)
  assert.match(elements.trace.evidenceRaw.textContent, /Harness 原始技术证据/)
  assert.equal(findAll(elements.trace.permissionFacts, (node) => node.tagName === 'LI').length, 1)
})

test('renders an existing outcome projection and delegates map and guidance actions without executing them', async () => {
  const { view, elements, guidanceActions, evidenceTargets } = createFixture()
  view.render({
    outcome: {
      visible: true,
      state: 'success',
      title: '任务已完成',
      summary: 'Harness 已完成任务。',
      modelVerification: { state: 'passed', modelName: 'GLM-5', reasoningEffort: 'high', terminalReason: 'completed' },
      changes: [{ operation: '修改', path: 'README.md' }],
      verifications: [{ state: 'passed', label: 'npm test', detail: '退出代码 0' }],
      risks: [{ label: '依赖配置', detail: '需要人工复核' }],
      warnings: ['完成状态不等于已经验证全部行为。'],
      recoveryAssessment: { label: '可归属', detail: '不是撤回点' },
      workspace: { label: 'demo' },
      impact: '改动保存在工作区。',
      nextAction: '先查看风险。',
      map: {
        visible: true,
        legend: '绿色表示 Harness 已确认。',
        nodes: [{ id: 'changes', kind: 'changes', state: 'confirmed', eyebrow: '文件', title: '修改 1 个文件', summary: 'README.md', evidenceTarget: 'changes' }],
        edges: [{ from: 'result', to: 'changes' }]
      }
    },
    guidance: {
      visible: true,
      tone: 'review',
      title: '任务完成了，但还有事项需要确认',
      summary: '先查看风险。',
      actions: [
        { id: 'open-receipt', label: '查看完整回执', detail: '查看文件与验证。' },
        { id: 'new-task', label: '开始新任务', detail: '不会删除当前任务。' }
      ]
    }
  })

  assert.equal(elements.receipt.outcome.classList.contains('hidden'), false)
  assert.equal(elements.receipt.outcome.dataset.state, 'success')
  assert.equal(elements.receipt.badge.textContent, '已完成')
  assert.match(elements.receipt.sections.textContent, /模型验证回执通过 · GLM-5 · high/)
  assert.match(elements.receipt.sections.textContent, /确认的文件改动修改 · README\.md/)
  assert.match(elements.receipt.sections.textContent, /明确的验证通过 · npm test（退出代码 0）/)
  assert.match(elements.receipt.sections.textContent, /任务与改动归属demo：可归属。不是撤回点/)
  assert.equal(elements.receipt.map.classList.contains('hidden'), false)
  assert.equal(elements.receipt.mapEmpty.classList.contains('hidden'), true)
  assert.equal(elements.receipt.mapLegend.textContent, '绿色表示 Harness 已确认。')
  const mapButton = findAll(elements.receipt.mapFlow, (node) => node.tagName === 'BUTTON')[0]
  assert.equal(mapButton.classList.contains('has-incoming-edge'), true)
  await mapButton.dispatchEvent('click')
  assert.deepEqual(evidenceTargets, ['changes'])

  assert.equal(elements.guidance.root.dataset.tone, 'review')
  const actionButtons = findAll(elements.guidance.actions, (node) => node.tagName === 'BUTTON')
  assert.deepEqual(actionButtons.map((button) => button.textContent), ['查看完整回执', '开始新任务'])
  assert.deepEqual(actionButtons.map((button) => button.className), ['primary-button', 'quiet-button'])
  await actionButtons[0].dispatchEvent('click')
  await actionButtons[1].dispatchEvent('click')
  assert.deepEqual(guidanceActions, ['open-receipt', 'new-task'])
})

test('clears stale receipt and guidance content when the projected task has no terminal outcome', () => {
  const { view, elements } = createFixture()
  elements.receipt.sections.textContent = '旧回执'
  elements.guidance.actions.textContent = '旧动作'

  view.render({ agent: { runDetails: {} } })

  assert.equal(elements.receipt.outcome.classList.contains('hidden'), true)
  assert.equal(elements.receipt.map.classList.contains('hidden'), true)
  assert.equal(elements.receipt.mapEmpty.classList.contains('hidden'), false)
  assert.equal(elements.receipt.sections.textContent, '')
  assert.equal(elements.guidance.root.classList.contains('hidden'), true)
  assert.equal(elements.guidance.actions.textContent, '')
  assert.equal(elements.trace.permissionFacts.textContent, 'Harness 没有提供可确认的权限快照。')
  assert.equal(elements.trace.changedFiles.textContent, '没有确认到文件改动。')
  assert.equal(elements.trace.changesSection.classList.contains('hidden'), true)
  assert.equal(elements.trace.overview.dataset.tone, 'unknown')
  assert.equal(elements.trace.overviewTitle.textContent, '等待 Harness 事件')
  assert.equal(elements.trace.supportingSummary.textContent, '权限、Git 基线与技术证据 · 权限未确认 · 没有任务前基线')
  assert.equal(elements.trace.toolCards.textContent, '没有工具操作。')
  assert.equal(elements.trace.evidenceContent.textContent, '还没有技术记录。')
  assert.equal(elements.trace.evidenceRaw.textContent, '还没有原始记录。')
})

test('keeps pending and failed outcome labels distinct from completion', () => {
  const { view, elements } = createFixture()
  const outcome = {
    visible: true,
    state: 'pending',
    title: '停止仍待 Harness 确认',
    summary: '尚无匹配终态。',
    changes: [], verifications: [], warnings: [], risks: [], map: { visible: false, nodes: [] }
  }
  view.render({ outcome })
  assert.equal(elements.receipt.badge.textContent, '等待确认')

  view.render({ outcome: { ...outcome, state: 'error', title: '这一轮已停止' } })
  assert.equal(elements.receipt.badge.textContent, '需要处理')
  assert.notEqual(elements.receipt.badge.textContent, '已完成')
})

test('keeps ten zero-token task states visually distinct while technical evidence stays compact', () => {
  assert.equal(taskEvidenceStates.length, 10)
  for (const fixture of taskEvidenceStates) {
    const { view, elements } = createFixture()
    view.render(fixture.thread)
    assert.equal(elements.trace.overview.dataset.tone, fixture.expectedTone, fixture.id)
    assert.equal(elements.trace.overviewTitle.textContent, fixture.expectedTitle, fixture.id)
    assert.equal(elements.trace.changesSection.classList.contains('hidden'), fixture.changesHidden, fixture.id)
    assert.match(elements.trace.overviewSummary.textContent, /项操作|没有工具操作/, fixture.id)
    assert.match(elements.trace.supportingSummary.textContent, /权限.*Git 基线.*技术证据/, fixture.id)
    const cards = findAll(elements.trace.toolCards, (node) => node.tagName === 'DETAILS' && node.className === 'tool-card')
    assert.equal(cards.every((card) => card.open === false), true, fixture.id)
  }
})
