const test = require('node:test')
const assert = require('node:assert/strict')
const { createConversationMessageView } = require('../src/renderer/conversation-message-view.cjs')
const { FakeDocument, findAll } = require('../test-utils/fake-dom.cjs')

function createFixture({ markdownWithCode = false, copyRejects = false } = {}) {
  const document = new FakeDocument()
  const copies = []
  const schedules = []
  const markdownCalls = []
  const view = createConversationMessageView({
    document,
    renderMarkdown(container, source) {
      markdownCalls.push(source)
      const paragraph = document.createElement('p')
      paragraph.textContent = source
      container.append(paragraph)
      if (markdownWithCode) {
        const pre = document.createElement('pre')
        const code = document.createElement('code')
        code.textContent = 'npm test'
        pre.append(code)
        container.append(pre)
      }
    },
    async copyText(value) {
      copies.push(value)
      if (copyRejects) throw new Error('clipboard unavailable')
    },
    formatImageBytes(bytes) { return `${bytes} bytes` },
    schedule(callback, delay) { schedules.push({ callback, delay }) }
  })
  return { view, copies, schedules, markdownCalls }
}

test('renders a final assistant answer with inert markdown, copy actions, and image metadata', async () => {
  const { view, copies, schedules, markdownCalls } = createFixture({ markdownWithCode: true })
  const bubble = view.render({
    role: 'assistant',
    text: '完成了。',
    images: [{ name: 'result.png', width: 640, height: 480, bytes: 12 }]
  })

  assert.equal(bubble.className, 'message-bubble assistant')
  assert.deepEqual(markdownCalls, ['完成了。'])
  assert.match(bubble.textContent, /Deep code/)
  assert.match(bubble.textContent, /图片 · result\.png · 640 × 480 · 12 bytes/)
  const buttons = findAll(bubble, (node) => node.tagName === 'BUTTON')
  assert.deepEqual(buttons.map((button) => button.textContent), ['复制回答', '复制代码'])

  await buttons[0].dispatchEvent('click')
  await buttons[1].dispatchEvent('click')
  assert.deepEqual(copies, ['完成了。', 'npm test'])
  assert.deepEqual(schedules.map((item) => item.delay), [1400, 1400])
  assert.equal(buttons[0].textContent, '已复制')
  schedules[0].callback()
  assert.equal(buttons[0].textContent, '复制回答')
})

test('renders an ephemeral truncated draft without exposing copy actions', () => {
  const { view, markdownCalls } = createFixture({ markdownWithCode: true })
  const bubble = view.render({ role: 'assistant', text: '正在写', draft: true, truncated: true })

  assert.match(bubble.className, /live-draft/)
  assert.equal(bubble.getAttribute('aria-live'), 'polite')
  assert.equal(bubble.getAttribute('aria-label'), 'Deep code 正在生成尚未定稿的回复')
  assert.match(bubble.textContent, /Deep code · 生成中（预览已截短）/)
  assert.match(bubble.textContent, /尚未定稿；Harness 提交后会由正式任务记录替换/)
  assert.equal(findAll(bubble, (node) => node.tagName === 'BUTTON').length, 0)
  assert.deepEqual(markdownCalls, ['正在写'])
})

test('keeps user messages distinct and reports clipboard failure without throwing', async () => {
  const { view, schedules } = createFixture({ copyRejects: true })
  const user = view.render({ role: 'user', text: '请检查。' })
  assert.match(user.textContent, /^你/)
  assert.equal(findAll(user, (node) => node.tagName === 'BUTTON').length, 0)

  const assistant = view.render({ role: 'assistant', text: '看过了。' })
  const copy = findAll(assistant, (node) => node.tagName === 'BUTTON')[0]
  await copy.dispatchEvent('click')
  assert.equal(copy.textContent, '复制失败')
  schedules[0].callback()
  assert.equal(copy.textContent, '复制回答')
})

test('renders the one-time task contract as a compact user-visible disclosure', () => {
  const { view } = createFixture()
  const user = view.render({
    role: 'user',
    text: '修复问题。',
    taskContract: {
      kind: 'evidence-first',
      label: '可核验推进',
      summary: '关键歧义才暂停询问；能安全推进就直接行动。',
      rules: ['保留已有工作。', '区分已确认与未确认。'],
      addedCharacters: 218
    }
  })

  const details = findAll(user, (node) => node.tagName === 'DETAILS')
  assert.equal(details.length, 1)
  assert.match(details[0].textContent, /协作路线 · 可核验推进/)
  assert.match(details[0].textContent, /仅首条消息增加 218 个字符/)
  assert.match(details[0].textContent, /保留已有工作/)
})

test('groups the guided contract into start, progress, and delivery instead of one long list', () => {
  const { view } = createFixture()
  const user = view.render({
    role: 'user',
    text: '做一个可验证的小改动。',
    taskContract: {
      kind: 'evidence-first',
      version: 2,
      label: '清晰推进',
      summary: '开始先对齐，过程中少打扰，结束给出可核验回执。',
      sections: [
        { label: '开始', rules: ['先说明理解。'] },
        { label: '推进', rules: ['只汇报阶段变化。'] },
        { label: '交付', rules: ['先给结果。'] }
      ],
      addedCharacters: 622
    }
  })

  const details = findAll(user, (node) => node.tagName === 'DETAILS')[0]
  const sections = findAll(details, (node) => node.tagName === 'SECTION')
  assert.equal(sections.length, 3)
  assert.match(details.textContent, /协作路线 · 清晰推进/)
  assert.match(details.textContent, /开始先说明理解。推进只汇报阶段变化。交付先给结果。/)
})
