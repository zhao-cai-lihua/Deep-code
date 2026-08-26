const test = require('node:test')
const assert = require('node:assert/strict')
const markdownIt = require('markdown-it')
const { createMarkdownRuntime } = require('../src/renderer/markdown-runtime.js')

test('renders structured Markdown while escaping model-authored HTML', () => {
  const runtime = createMarkdownRuntime(markdownIt)
  const html = runtime.render('# 标题\n\n**重点**与`code`\n\n> 引用\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n<script>alert(1)</script>')
  assert.match(html, /<h1>标题<\/h1>/)
  assert.match(html, /<strong>重点<\/strong>/)
  assert.match(html, /<code>code<\/code>/)
  assert.match(html, /<blockquote>/)
  assert.match(html, /<table>/)
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /&lt;script&gt;/)
})

test('never turns Markdown images into network-loading elements', () => {
  const runtime = createMarkdownRuntime(markdownIt)
  const html = runtime.render('![设计参考](https://tracker.invalid/pixel.png)')
  assert.doesNotMatch(html, /<img|src=/)
  assert.match(html, /图片：设计参考/)
})

test('markdown-it rejects executable link protocols and adds link isolation', () => {
  const runtime = createMarkdownRuntime(markdownIt)
  const hostile = runtime.render('[危险](javascript:alert(1))')
  const safe = runtime.render('[文档](https://example.com/docs)')
  assert.doesNotMatch(hostile, /href=/)
  assert.match(safe, /href="https:\/\/example\.com\/docs"/)
  assert.match(safe, /rel="noreferrer noopener"/)
})
