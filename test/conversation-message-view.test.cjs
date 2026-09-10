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
