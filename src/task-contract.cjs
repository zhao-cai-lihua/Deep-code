const { createHash } = require('node:crypto')

const CONTRACT_VERSION = 1
const CONTRACT_KIND = 'evidence-first'
const CONTRACT_LABEL = '可核验推进'
const CONTRACT_SUMMARY = '关键歧义才暂停询问；能安全推进就直接行动。'
const CONTRACT_RULES = Object.freeze([
  '只在缺少关键前提、且不同选择会实质改变结果或风险时，提出尽量少的问题并等待用户决定。',
  '能够安全推进时直接行动；保留已有工作，不静默扩大任务范围，也不把推断写成事实。',
  '交付时区分已确认与未确认，说明实际验证过什么，以及失败或回退时用户可以怎样恢复。'
])
const CONTRACT_BOUNDARY = '这是协作方法，不会改变 Harness 的模型、工具、权限、工作区或批准策略，也不代表任务已经完成。'

function createTaskContract() {
  return { version: CONTRACT_VERSION, kind: CONTRACT_KIND, attachedTo: 'initial-prompt' }
}

function normalizeTaskContract(raw) {
  return raw?.version === CONTRACT_VERSION
    && raw?.kind === CONTRACT_KIND
    && raw?.attachedTo === 'initial-prompt'
    ? createTaskContract()
    : null
}

function projectTaskContract(raw) {
  const contract = normalizeTaskContract(raw)
  if (!contract) return null
  return {
    ...contract,
    label: CONTRACT_LABEL,
    summary: CONTRACT_SUMMARY,
    rules: [...CONTRACT_RULES],
    boundary: CONTRACT_BOUNDARY
  }
}

function requestHash(request) {
  return createHash('sha256').update(request, 'utf8').digest('hex')
}

function contractBody() {
  return [
    'Deep Code 公开附加了以下一次性协作约定：',
    ...CONTRACT_RULES.map((rule, index) => `${index + 1}. ${rule}`),
    CONTRACT_BOUNDARY
  ].join('\n')
}

function plainResult(request) {
  return { text: request, request, attached: false, contract: null, addedCharacters: 0 }
}

function buildTaskPrompt({ request, contract }) {
  const source = String(request || '')
  const projected = projectTaskContract(contract)
  if (!source.trim() || !projected) return plainResult(source)
  const suffix = [
    '',
    '',
    `<deep-code-task-contract version="${CONTRACT_VERSION}" kind="${CONTRACT_KIND}" request-sha256="${requestHash(source)}">`,
    contractBody(),
    '</deep-code-task-contract>'
  ].join('\n')
  const text = `${source}${suffix}`
  return { text, request: source, attached: true, contract: projected, addedCharacters: suffix.length }
}

function parseTaskPrompt(value) {
  const text = String(value || '')
  const marker = `\n\n<deep-code-task-contract version="${CONTRACT_VERSION}" kind="${CONTRACT_KIND}" request-sha256="`
  const markerIndex = text.lastIndexOf(marker)
  if (markerIndex < 0 || !text.endsWith('\n</deep-code-task-contract>')) return plainResult(text)
  const request = text.slice(0, markerIndex)
  const suffix = text.slice(markerIndex + 2)
  const match = suffix.match(/^<deep-code-task-contract version="1" kind="evidence-first" request-sha256="([a-f0-9]{64})">\n([\s\S]*)\n<\/deep-code-task-contract>$/)
  if (!match || match[1] !== requestHash(request) || match[2] !== contractBody()) return plainResult(text)
  return {
    text,
    request,
    attached: true,
    contract: projectTaskContract(createTaskContract()),
    addedCharacters: text.length - request.length
  }
}

module.exports = {
  createTaskContract,
  normalizeTaskContract,
  projectTaskContract,
  buildTaskPrompt,
  parseTaskPrompt
}
