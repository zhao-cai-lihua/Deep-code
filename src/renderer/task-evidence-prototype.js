// PROTOTYPE ONLY — throw away after deciding the default information hierarchy.
const fixtures = [
  { id: 'changed', title: '完成：修改了文件', subtitle: 'Harness 已给出同轮终态，文件差异和验证都有独立证据。', tone: 'success', result: '任务已完成', resultDetail: '修改 2 个文件，测试命令成功退出。', files: ['src/app.cjs（修改）', 'test/app.test.cjs（修改）'], verification: 'npm test · 通过 · 退出代码 0', warning: '仍建议查看界面效果。', next: '打开修改后的应用进行一次人工检查。', operations: ['读取 4 个文件', '搜索 2 次', '写入 2 个文件', '运行测试 1 次'], terminal: 'completed', git: 'HEAD 4f39c49 · 基线干净' },
  { id: 'unchanged', title: '完成：没有文件改动', subtitle: '任务只是解释项目；完成不应被说成“修改成功”。', tone: 'success', result: '解释已经完成', resultDetail: 'Harness 已正常结束；Deep Code 没有确认到文件改动。', files: [], verification: '没有要求运行测试', warning: '', next: '继续追问，或开始新任务。', operations: ['读取 5 个文件', '搜索 1 次'], terminal: 'completed', git: 'HEAD 4f39c49 · 前后无路径差异' },
  { id: 'unverified', title: '完成：改动尚未验证', subtitle: '文件发生变化，但没有对应的验证退出证据。', tone: 'warning', result: '改动已保存，但尚未验证', resultDetail: 'Harness 已结束并确认 1 个文件变化。', files: ['src/config.cjs（修改）'], verification: '没有确认到验证', warning: '完成状态不等于改动可用。', next: '先运行项目已有的验证命令。', operations: ['读取 2 个文件', '写入 1 个文件'], terminal: 'completed', git: 'HEAD 4f39c49 · 1 个新差异' },
  { id: 'verify-failed', title: '完成：验证失败', subtitle: 'Agent 结束了这一轮，但验证命令以非零状态退出。', tone: 'error', result: '改动未通过验证', resultDetail: '文件已保存；npm test 以退出代码 1 结束。', files: ['src/parser.cjs（修改）', 'test/parser.test.cjs（修改）'], verification: 'npm test · 未通过 · 退出代码 1', warning: '不要把这一轮当成可交付结果。', next: '查看失败测试并修复，或撤回这轮改动。', operations: ['读取 6 个文件', '写入 2 个文件', '运行测试 1 次（失败）'], terminal: 'completed', git: 'HEAD 4f39c49 · 2 个新差异' },
  { id: 'waiting', title: '等待你决定', subtitle: 'Harness 正在等待明确选择；计时期间没有模型持续生成。', tone: 'active', result: '需要你的回答', resultDetail: 'Agent 提出了 2 个问题。', files: [], verification: '尚未进入验证阶段', warning: '五分钟无操作后 Deep Code 会请求停止。', next: '选择一个选项，或输入自己的答案。', operations: ['读取 3 个文件', '等待用户回答'], terminal: 'running', git: 'HEAD 4f39c49 · 尚未比较任务后状态' },
  { id: 'timeout', title: '等待超时：终态未确认', subtitle: 'Deep Code 已请求取消，但尚未看见同一轮终态。', tone: 'warning', result: '停止仍待 Harness 确认', resultDetail: '等待回答超过 5 分钟；取消请求已被接收。', files: [], verification: '尚无终态，不能生成最终回执', warning: 'Deep Code 当前不能证明 Harness 已停止。', next: '重新连接查看最新轨迹；不要直接删除任务记录。', operations: ['等待用户回答', '发送取消请求'], terminal: 'unknown', git: 'HEAD 4f39c49 · 尚未比较任务后状态' },
  { id: 'stopped', title: '已确认停止', subtitle: '同一轮出现 interrupted 终态，和“等待确认”必须明显不同。', tone: 'error', result: '这一轮已停止', resultDetail: 'Harness 已确认 interrupted；没有替你回答问题。', files: [], verification: '验证没有完成', warning: '可能存在停止前已写入的文件，需要检查基线。', next: '查看文件证据，再决定重试或删除任务。', operations: ['读取 3 个文件', '收到取消请求', '终态 interrupted'], terminal: 'interrupted', git: 'HEAD 4f39c49 · 尚待任务后差异确认' },
  { id: 'auth', title: '模型凭据失败', subtitle: '失败属于这次请求，不把 API Key 永久判为无效。', tone: 'error', result: '模型服务拒绝了这次请求', resultDetail: 'Provider 返回 authentication failure；本轮未进入模型生成。', files: [], verification: '模型连接验证未通过', warning: '这只证明当时的请求失败。', next: '前往模型服务检查 Provider 与凭据后再验证。', operations: ['选择模型路线', 'Provider 请求失败'], terminal: 'failed', git: 'HEAD 4f39c49 · 与模型连接无关' },
  { id: 'network', title: '网络失败', subtitle: '网络与认证分开说明，恢复动作也不同。', tone: 'error', result: '没有连接到模型服务', resultDetail: '请求超时；Harness 没有返回模型终态。', files: [], verification: '没有发生模型验证', warning: '不能据此判断凭据是否有效。', next: '检查网络或代理，再重试这一轮。', operations: ['选择模型路线', '网络请求超时'], terminal: 'failed', git: 'HEAD 4f39c49 · 与网络失败无关' },
  { id: 'no-git', title: '非 Git 工作区', subtitle: '仍可工作，但恢复与改动归属证据会更弱。', tone: 'warning', result: '任务已完成', resultDetail: 'Harness 已结束；确认写入 1 个文件。', files: ['调研结果.txt（新建）'], verification: '没有要求运行测试', warning: '没有 Git HEAD，Deep Code 无法提供提交级恢复点。', next: '查看文件；若项目会长期维护，可以之后初始化 Git。', operations: ['搜索 3 次', '写入 1 个文件'], terminal: 'completed', git: '不是 Git 仓库 · 仅记录路径级基线' }
]

const variants = [
  { id: 'A', name: '结论优先 · 回执卡' },
  { id: 'B', name: '对话连续 · 一行轨迹' },
  { id: 'C', name: '证据账本 · 分层核查' }
]

const root = document.querySelector('#variant-root')
const fixtureTitle = document.querySelector('#fixture-title')
const fixtureSubtitle = document.querySelector('#fixture-subtitle')
const fixtureState = document.querySelector('#fixture-state')
const fixtureChoice = document.querySelector('#fixture-choice')
const fixtureList = document.querySelector('#fixture-list')
const variantLabel = document.querySelector('#variant-label')
let fixtureId = new URLSearchParams(location.search).get('fixture') || fixtures[0].id
let variantId = new URLSearchParams(location.search).get('variant') || variants[0].id

function el(tag, className = '', text = '') {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

function card(title, detail, tone = '') {
  const node = el('section', 'prototype-card')
  if (tone) node.dataset.tone = tone
  node.append(el('h3', '', title), el('p', '', detail || '没有可确认的内容。'))
  return node
}

function actionRow(fixture) {
  const actions = el('div', 'prototype-actions')
  actions.append(el('button', 'prototype-action', fixture.tone === 'error' ? '查看怎样恢复' : fixture.tone === 'active' ? '回答问题' : '继续下一步'))
  actions.append(el('button', 'prototype-action secondary', '查看完整证据'))
  return actions
}

function disclosure(fixture, label = '查看工具、权限与原始上下文') {
  const details = el('details', 'prototype-disclosure')
  details.append(el('summary', '', `${label} · ${fixture.operations.length} 项操作`))
  const list = el('ul')
  for (const item of fixture.operations) list.append(el('li', '', item))
  list.append(el('li', '', `终态：${fixture.terminal}`), el('li', '', `基线：${fixture.git}`))
  details.append(list)
  return details
}

function variantA(fixture) {
  const fragment = document.createDocumentFragment()
  const hero = el('div', 'variant-a-hero')
  const result = card(fixture.result, fixture.resultDetail, fixture.tone)
  result.prepend(el('p', 'prototype-kicker', '这一轮的结果'))
  result.append(actionRow(fixture))
  hero.append(result, card('接下来只做这一件事', fixture.next, fixture.tone === 'success' ? '' : fixture.tone))
  const facts = el('div', 'variant-a-facts')
  facts.append(card('文件', fixture.files.length ? fixture.files.join('；') : '没有确认到文件改动'), card('验证', fixture.verification), card('仍需留意', fixture.warning || '没有额外提醒'))
  fragment.append(hero, facts, disclosure(fixture))
  return fragment
}

function variantB(fixture) {
  const stream = el('div', 'variant-b-stream')
  const user = el('section', 'variant-b-message')
  user.append(el('p', 'prototype-kicker', '你'), el('p', 'prototype-copy', '请帮我完成这个任务，并在结束后告诉我留下了什么。'))
  const events = el('section', 'variant-b-message')
  events.append(el('p', 'prototype-kicker', 'DEEP CODE · 运行摘要'))
  for (const [index, operation] of fixture.operations.entries()) {
    const row = el('div', 'variant-b-event')
    const dot = el('span', 'prototype-fixture-dot'); dot.dataset.tone = index === fixture.operations.length - 1 ? fixture.tone : 'success'
    row.append(dot, el('strong', '', operation), el('span', '', index === fixture.operations.length - 1 ? fixture.terminal : '已完成'))
    events.append(row)
  }
  events.append(disclosure(fixture, '展开全部轨迹'))
  const reply = el('section', 'variant-b-message')
  reply.append(el('p', 'prototype-kicker', 'DEEP CODE'), el('h2', 'prototype-lead', fixture.result), el('p', 'prototype-copy', fixture.resultDetail))
  const receipt = card(`回执 · ${fixture.files.length} 个文件 · ${fixture.verification.split(' · ')[0]}`, fixture.next, fixture.tone)
  receipt.classList.add('variant-b-receipt'); receipt.append(actionRow(fixture))
  stream.append(user, events, reply, receipt)
  return stream
}

function variantC(fixture) {
  const ledger = el('div', 'variant-c-ledger')
  const rail = el('nav', 'variant-c-rail')
  for (const [index, label] of ['结果', '文件', '验证', '风险', '技术证据'].entries()) {
    const button = el('button', `variant-c-step${index === 0 ? ' is-active' : ''}`)
    const dot = el('span', 'prototype-fixture-dot'); dot.dataset.tone = index === 0 ? fixture.tone : (index === 3 && fixture.warning ? 'warning' : 'success')
    button.append(dot, el('span', '', label)); rail.append(button)
  }
  const detail = el('section', 'variant-c-detail')
  const header = card(fixture.result, fixture.resultDetail, fixture.tone); header.append(actionRow(fixture)); detail.append(header)
  const rows = [
    ['文件事实', fixture.files.length ? fixture.files.join('；') : '没有确认到文件改动', '来自官方 diff 或任务前后基线。'],
    ['验证事实', fixture.verification, '只描述结构化退出证据，不根据命令文字猜测。'],
    ['风险与恢复', fixture.warning || '没有额外提醒', fixture.next],
    ['证据边界', fixture.git, `Harness 终态：${fixture.terminal}`]
  ]
  for (const [label, title, copy] of rows) {
    const row = el('div', 'variant-c-row'); const body = el('div'); body.append(el('strong', '', title), el('p', '', copy)); row.append(el('span', '', label), body); detail.append(row)
  }
  detail.append(disclosure(fixture))
  ledger.append(rail, detail)
  return ledger
}

function updateUrl() {
  const url = new URL(location.href)
  url.searchParams.set('variant', variantId)
  url.searchParams.set('fixture', fixtureId)
  history.replaceState(null, '', url)
}

function render() {
  const fixture = fixtures.find((item) => item.id === fixtureId) || fixtures[0]
  const variant = variants.find((item) => item.id === variantId) || variants[0]
  fixtureTitle.textContent = fixture.title
  fixtureSubtitle.textContent = fixture.subtitle
  fixtureState.textContent = JSON.stringify(fixture, null, 2)
  variantLabel.textContent = `${variant.id} — ${variant.name}`
  root.replaceChildren(variant.id === 'B' ? variantB(fixture) : variant.id === 'C' ? variantC(fixture) : variantA(fixture))
  fixtureChoice.value = fixture.id
  for (const button of fixtureList.querySelectorAll('button')) button.classList.toggle('is-active', button.dataset.fixture === fixture.id)
  updateUrl()
}

for (const fixture of fixtures) {
  const option = el('option', '', fixture.title); option.value = fixture.id; fixtureChoice.append(option)
  const button = el('button', 'prototype-fixture-button'); button.type = 'button'; button.dataset.fixture = fixture.id
  const dot = el('span', 'prototype-fixture-dot'); dot.dataset.tone = fixture.tone
  button.append(dot, el('span', '', fixture.title)); button.addEventListener('click', () => { fixtureId = fixture.id; render() }); fixtureList.append(button)
}
fixtureChoice.addEventListener('change', () => { fixtureId = fixtureChoice.value; render() })

function moveVariant(delta) {
  const index = variants.findIndex((item) => item.id === variantId)
  variantId = variants[(index + delta + variants.length) % variants.length].id
  render()
}
document.querySelector('#previous-variant').addEventListener('click', () => moveVariant(-1))
document.querySelector('#next-variant').addEventListener('click', () => moveVariant(1))
document.addEventListener('keydown', (event) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName) || event.target?.isContentEditable) return
  if (event.key === 'ArrowLeft') moveVariant(-1)
  if (event.key === 'ArrowRight') moveVariant(1)
})
render()
