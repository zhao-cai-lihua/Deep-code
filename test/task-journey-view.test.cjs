const test = require('node:test')
const assert = require('node:assert/strict')
const { createTaskJourneyView } = require('../src/renderer/task-journey-view.cjs')
const { FakeDocument, FakeElement, findAll } = require('../test-utils/fake-dom.cjs')

function fixture() {
  const elements = {
    root: new FakeElement('section'),
    title: new FakeElement('h3'),
    summary: new FakeElement('p'),
    stages: new FakeElement('ol'),
    boundary: new FakeElement('p')
  }
  const calls = []
  return {
    elements,
    calls,
    view: createTaskJourneyView({ document: new FakeDocument(), elements, onStageAction(id) { calls.push(id) } })
  }
}

test('renders only the supplied Task Journey projection', () => {
  const { view, elements } = fixture()
  view.render({
    visible: true,
    tone: 'active',
    title: '这次会怎样推进',
    summary: '目标已经接收，正在执行。',
    evidenceBoundary: '路线只翻译 Harness 结构化事实。',
    stages: [
      { id: 'align', label: '对齐目标', state: 'complete', detail: '已接收。', action: 'task-brief' },
      { id: 'act', label: '推进任务', state: 'current', detail: '正在运行。', action: 'trace' },
      { id: 'verify', label: '核验结果', state: 'pending', detail: '尚未开始。', action: 'trace' },
      { id: 'deliver', label: '交付回执', state: 'pending', detail: '尚未开始。', action: 'receipt' }
    ]
  })

  assert.equal(elements.root.classList.contains('hidden'), false)
  assert.equal(elements.root.dataset.tone, 'active')
  assert.equal(elements.title.textContent, '这次会怎样推进')
  assert.equal(elements.summary.textContent, '目标已经接收，正在执行。')
  assert.equal(elements.boundary.textContent, '路线只翻译 Harness 结构化事实。')
  const stages = findAll(elements.stages, (node) => node.tagName === 'LI')
  assert.equal(stages.length, 4)
  assert.deepEqual(stages.map((stage) => stage.dataset.state), ['complete', 'current', 'pending', 'pending'])
  assert.match(elements.stages.textContent, /对齐目标已接收。推进任务正在运行。/)
})

test('delegates stage navigation without owning workbench actions', async () => {
  const { view, elements, calls } = fixture()
  view.render({
    visible: true,
    stages: [{ id: 'deliver', label: '交付回执', state: 'complete', detail: '已生成。', action: 'receipt' }]
  })

  const button = findAll(elements.stages, (node) => node.tagName === 'BUTTON')[0]
  await button.dispatchEvent('click')
  assert.deepEqual(calls, ['receipt'])
})

test('clears and hides the route when the projection is absent', () => {
  const { view, elements } = fixture()
  elements.stages.append(new FakeElement('li'))

  view.render({ visible: false })

  assert.equal(elements.root.classList.contains('hidden'), true)
  assert.equal(elements.stages.childNodes.length, 0)
})
