const KIND_LABELS = {
  'user-persona': 'User Persona',
  'agent-character': 'Agent Character',
  'interaction-style': 'Interaction Style'
}

function buildHandoffPreview({ thread, cards, active }) {
  if (!thread) throw new Error('请先选择一个本地任务。')
  const activeIds = new Set([active?.userPersonaId, active?.agentCharacterId, active?.interactionStyleId].filter(Boolean))
  const selectedCards = cards.filter((card) => activeIds.has(card.id))
  const sections = [
    { title: '任务', text: thread.prompt },
    ...selectedCards.map((card) => ({ title: `${KIND_LABELS[card.kind]} · ${card.name}`, text: card.modelText }))
  ]
  const text = [
    '# Deep code 新会话交接预览',
    '',
    ...sections.flatMap((section) => [`## ${section.title}`, '', section.text, '']),
    '---',
    '此交接文本只描述任务与协作方式；不会授予或改变工具、Shell、网络、MCP、插件、工作区范围或批准策略。'
  ].join('\n').trim()
  return {
    text,
    sections,
    excluded: ['本地说明', '工具与批准配置', 'API Key', '会话历史', '工作区文件内容']
  }
}

module.exports = { buildHandoffPreview }
