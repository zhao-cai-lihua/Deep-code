const { randomUUID } = require('node:crypto')

function textBlocks(content) {
  if (!Array.isArray(content)) return ''
  return content
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('')
    .trim()
}

function humanizeHistory(page) {
  const messages = []
  const evidence = []
  for (const entry of page?.events || []) {
    const event = entry?.event || {}
    const data = event.data || {}
    if (event.type === 'user/message') {
      const text = textBlocks(data.content || data.message?.content)
      if (text) messages.push({ role: 'user', text, seq: event.seq })
      continue
    }
    if (event.type === 'assistant/message') {
      const text = textBlocks(data.message?.content)
      if (text) messages.push({ role: 'assistant', text, seq: event.seq })
      continue
    }
    if (event.type === 'tool/call' || event.type === 'tool/result' || event.type === 'tool/error') {
      evidence.push({ type: event.type, seq: event.seq, detail: entry.view || data })
    }
  }
  return { messages, evidence, hasMore: Boolean(page?.hasMore) }
}

class DshAdapter {
  constructor({ fetchImpl = globalThis.fetch } = {}) {
    if (typeof fetchImpl !== 'function') throw new Error('当前环境不支持本地 Engine 连接。')
    this.fetchImpl = fetchImpl
  }

  async rpc(baseUrl, method, payload = {}) {
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(String(baseUrl || ''))) {
      throw new Error('Deep code 只连接本机 127.0.0.1 Engine。')
    }
    const response = await this.fetchImpl(`${baseUrl}/api/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request',
        rpcId: `deep-code-${randomUUID()}`,
        method,
        payload
      })
    })
    if (!response.ok) throw new Error(`Engine 请求失败（HTTP ${response.status}）。`)
    const body = await response.json()
    if (!body?.result?.ok) {
      const error = body?.result?.error || {}
      throw new Error(error.message || error.code || 'Engine 返回了未知错误。')
    }
    return body.result.value
  }

  async createSession({ baseUrl, cwd }) {
    if (!cwd) throw new Error('请先选择或创建一个工作区。')
    return this.rpc(baseUrl, 'session.create', { cwd })
  }

  prompt({ baseUrl, sessionId, text }) {
    const content = String(text || '').trim()
    if (!content) throw new Error('任务内容不能为空。')
    return this.rpc(baseUrl, 'session.prompt', {
      sessionId,
      mode: 'queue',
      content: [{ type: 'text', text: content }]
    })
  }

  async snapshot({ baseUrl, sessionId }) {
    const [page, list] = await Promise.all([
      this.rpc(baseUrl, 'session.history', { sessionId, maxMessages: 80 }),
      this.rpc(baseUrl, 'session.list', {})
    ])
    const summary = list.items?.find((item) => item.sessionId === sessionId)
    return { ...humanizeHistory(page), running: Boolean(summary?.running) }
  }

  cancel({ baseUrl, sessionId }) {
    return this.rpc(baseUrl, 'session.cancel', { sessionId })
  }
}

module.exports = { DshAdapter, humanizeHistory, textBlocks }
