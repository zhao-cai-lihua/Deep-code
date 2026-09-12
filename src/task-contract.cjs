const { createHash } = require('node:crypto')

const CONTRACT_KIND = 'evidence-first'
const CURRENT_CONTRACT_VERSION = 2
const CONTRACT_BOUNDARY = '这是协作方法，不会改变 Harness 的模型、工具、权限、工作区或批准策略，也不代表任务已经完成；Session、执行状态和证据仍以 Harness 为准。'

const CONTRACT_DEFINITIONS = Object.freeze({
  1: Object.freeze({
    label: '可核验推进',
    summary: '关键歧义才暂停询问；能安全推进就直接行动。',
    heading: 'Deep Code 公开附加了以下一次性协作约定：',
    sections: Object.freeze([
      Object.freeze({ label: '协作约定', rules: Object.freeze([
        '只在缺少关键前提、且不同选择会实质改变结果或风险时，提出尽量少的问题并等待用户决定。',
        '能够安全推进时直接行动；保留已有工作，不静默扩大任务范围，也不把推断写成事实。',
        '交付时区分已确认与未确认，说明实际验证过什么，以及失败或回退时用户可以怎样恢复。'
      ]) })
    ]),
    boundary: '这是协作方法，不会改变 Harness 的模型、工具、权限、工作区或批准策略，也不代表任务已经完成。'
  }),
  2: Object.freeze({
    label: '清晰推进',
    summary: '开始先对齐，过程中少打扰，结束给出可核验回执。',
    heading: 'Deep Code 公开附加了以下一次性工作协议：',
    sections: Object.freeze([
      Object.freeze({ label: '开始', rules: Object.freeze([
        '首条可见回复先写“我理解的任务”，用一至三点复述目标、边界和完成标准；简单任务用一句话即可，然后直接行动，不等待重复确认。',
        '只有缺少关键前提且不同选择会实质改变结果或风险时才暂停；提出尽量少的问题，给出二至三个可执行选项并标明建议。'
      ]) }),
      Object.freeze({ label: '推进', rules: Object.freeze([
        '能够安全推进时直接行动，保留已有工作，不静默扩大范围，不把推断写成事实，也不以修改权限或批准策略来绕过阻碍。',
        '只在有意义的阶段变化、需要决定或遇到阻碍时用普通话更新；不要把系统提示、原始思维链或逐条工具日志当作面向用户的回复。'
      ]) }),
      Object.freeze({ label: '交付', rules: Object.freeze([
        '最终回复先给结果，再分别说明实际改动、实际验证、仍未确认和下一步；没有结构化或独立证据时，明确写“尚未确认”。',
        '若任务失败或停止，说明已知原因、可能保留的影响，以及用户可以怎样安全恢复或重试。'
      ]) })
    ]),
    boundary: CONTRACT_BOUNDARY
  })
})

function createTaskContract() {
  return { version: CURRENT_CONTRACT_VERSION, kind: CONTRACT_KIND, attachedTo: 'initial-prompt' }
}

function normalizeTaskContract(raw) {
  const version = Number(raw?.version)
  return CONTRACT_DEFINITIONS[version]
    && raw?.kind === CONTRACT_KIND
    && raw?.attachedTo === 'initial-prompt'
    ? { version, kind: CONTRACT_KIND, attachedTo: 'initial-prompt' }
    : null
}

function projectTaskContract(raw) {
  const contract = normalizeTaskContract(raw)
  if (!contract) return null
  const definition = CONTRACT_DEFINITIONS[contract.version]
  const sections = definition.sections.map((section) => ({ label: section.label, rules: [...section.rules] }))
  return {
    ...contract,
    label: definition.label,
    summary: definition.summary,
    sections,
    rules: sections.flatMap((section) => section.rules),
    boundary: definition.boundary
  }
}

function requestHash(request) {
  return createHash('sha256').update(request, 'utf8').digest('hex')
}

function contractBody(version) {
  const definition = CONTRACT_DEFINITIONS[version]
  if (!definition) return ''
  let index = 0
  return [
    definition.heading,
    ...definition.sections.flatMap((section) => section.rules.map((rule) => `${++index}. ${rule}`)),
    definition.boundary
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
    `<deep-code-task-contract version="${projected.version}" kind="${CONTRACT_KIND}" request-sha256="${requestHash(source)}">`,
    contractBody(projected.version),
    '</deep-code-task-contract>'
  ].join('\n')
  const text = `${source}${suffix}`
  return { text, request: source, attached: true, contract: projected, addedCharacters: suffix.length }
}

function parseTaskPrompt(value) {
  const text = String(value || '')
  const marker = '\n\n<deep-code-task-contract version="'
  const markerIndex = text.lastIndexOf(marker)
  if (markerIndex < 0 || !text.endsWith('\n</deep-code-task-contract>')) return plainResult(text)
  const request = text.slice(0, markerIndex)
  const suffix = text.slice(markerIndex + 2)
  const match = suffix.match(/^<deep-code-task-contract version="(\d+)" kind="evidence-first" request-sha256="([a-f0-9]{64})">\n([\s\S]*)\n<\/deep-code-task-contract>$/)
  const version = Number(match?.[1])
  const contract = normalizeTaskContract({ version, kind: CONTRACT_KIND, attachedTo: 'initial-prompt' })
  if (!match || !contract || match[2] !== requestHash(request) || match[3] !== contractBody(version)) return plainResult(text)
  return {
    text,
    request,
    attached: true,
    contract: projectTaskContract(contract),
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
