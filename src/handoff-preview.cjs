const { buildTaskPrompt, projectTaskContract } = require('./task-contract.cjs')

function buildHandoffPreview({ thread }) {
  if (!thread) throw new Error('请先选择一个本地任务。')
  const sections = [{ title: '任务', text: thread.prompt }]
  const contract = projectTaskContract(thread.taskContract)
  if (contract) {
    const outbound = buildTaskPrompt({ request: thread.prompt, contract: thread.taskContract })
    sections.push({
      title: '协作约定（仅首条消息）',
      text: [
        `${contract.label}：${contract.summary}`,
        ...contract.rules.map((rule) => `- ${rule}`),
        '',
        `${contract.boundary} 不会额外调用模型；发送给 Harness 时增加 ${outbound.addedCharacters} 个字符。`
      ].join('\n')
    })
  }
  const text = [
    '# Deep code 任务说明',
    '',
    ...sections.flatMap((section) => [`## ${section.title}`, '', section.text, '']),
    '---',
    '此文本只描述任务；不会授予或改变工具、Shell、网络、MCP、插件、工作区范围或批准策略。'
  ].join('\n').trim()
  return {
    text,
    sections,
    contract,
    excluded: ['工具与批准配置', 'API Key', '会话历史', '工作区文件内容']
  }
}

module.exports = { buildHandoffPreview }
