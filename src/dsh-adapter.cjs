const { randomUUID } = require('node:crypto')
const { projectConversation, textBlocks } = require('./conversation-projection.cjs')

const PROVIDER_CREDENTIAL_REFS = Object.freeze({
  'deepseek-official': 'DEEPSEEK_API_KEY'
})
const DEEPSEEK_CREDENTIAL_REF = PROVIDER_CREDENTIAL_REFS['deepseek-official']
const OFFICIAL_VISION_MODEL = Object.freeze({
  provider: 'deepseek-official',
  model: 'deepseek-v4-flash-vision-exp'
})

function safeCredentialError(error, value) {
  const raw = String(error?.message || 'Engine 拒绝了凭据写入。')
  const message = value ? raw.split(value).join('[已隐藏]') : raw
  return new Error(`API Key 没有保存：${message}`)
}

function humanizeHistory(page) {
  return projectConversation(page)
}

function connectionCopy(state, { providerNames = [], modelCount = 0 } = {}) {
  const names = providerNames.join('、') || '本机模型服务'
  return ({
    ready: {
      title: '模型已准备好',
      message: `${names} 已配置，共发现 ${modelCount} 个可用模型。Deep code 不会读取或显示密钥内容。`
    },
    'needs-credential': {
      title: '还需要配置 API Key',
      message: `${names} 的模型目录已载入，但 API Key 尚未配置，因此任务暂时不能调用模型。`
    },
    unavailable: {
      title: '没有可用的模型服务',
      message: 'Engine 已启动，但没有发现已激活的模型提供方。'
    },
    partial: {
      title: '模型状态未完全确认',
      message: `${names} 已被发现，但模型目录、凭据状态或部分提供方仍有异常。可以重试检查或查看脱敏诊断。`
    }
  })[state]
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
      const rawMessage = error.message || error.code || 'Engine 返回了未知错误。'
      const message = error.code === 'MODEL_DOES_NOT_SUPPORT_IMAGES' || /does not support image input/i.test(rawMessage)
        ? '当前模型不支持图片。图片仍保留在输入框中；请移除图片后发送文字，或切换到支持图片的模型。'
        : rawMessage
      const failure = new Error(message)
      failure.code = error.code || ''
      throw failure
    }
    return body.result.value
  }

  async createSession({ baseUrl, cwd, sessionId }) {
    if (!cwd) throw new Error('请先选择或创建一个工作区。')
    return this.rpc(baseUrl, 'session.create', { cwd, ...(sessionId ? { sessionId } : {}) })
  }

  prompt({ baseUrl, sessionId, text, images = [] }) {
    const message = String(text || '').trim()
    const imageParts = images.filter((item) => item?.type === 'image' && typeof item.data === 'string' && typeof item.mediaType === 'string')
      .map((item) => ({
        type: 'image',
        mediaType: item.mediaType,
        data: item.data,
        ...(typeof item.name === 'string' && item.name ? { name: item.name } : {})
      }))
    if (!message && !imageParts.length) throw new Error('任务内容不能为空。')
    return this.rpc(baseUrl, 'session.prompt', {
      sessionId,
      mode: 'queue',
      content: [...(message ? [{ type: 'text', text: message }] : []), ...imageParts]
    })
  }

  async selectOfficialVisionModel({ baseUrl, sessionId }) {
    if (!sessionId) throw new Error('图片任务缺少 Engine Session。')
    const directory = await this.rpc(baseUrl, 'session.models', { sessionId })
    if (directory?.current?.provider === OFFICIAL_VISION_MODEL.provider
      && directory?.current?.model === OFFICIAL_VISION_MODEL.model) {
      return { selected: directory.current, changed: false }
    }
    const group = (directory?.groups || []).find((item) => item?.id === OFFICIAL_VISION_MODEL.provider)
    const available = (group?.models || []).some((item) => item?.id === OFFICIAL_VISION_MODEL.model)
    if (!available) {
      throw new Error('当前 Engine 没有发现官方图片模型 DeepSeek-V4-Flash-Vision-Exp。请先更新 Engine，再重新发送；图片仍保留在输入框中。')
    }
    const result = await this.rpc(baseUrl, 'session.selectModel', {
      sessionId,
      provider: OFFICIAL_VISION_MODEL.provider,
      model: OFFICIAL_VISION_MODEL.model
    })
    return { selected: result.selected || OFFICIAL_VISION_MODEL, changed: true }
  }

  listSkills({ baseUrl, sessionId }) {
    if (!sessionId) throw new Error('请先打开一个已经连接 Engine 的任务。')
    return this.rpc(baseUrl, 'skill.list', { sessionId })
  }

  async snapshot({ baseUrl, sessionId }) {
    const [page, list, modelDirectory] = await Promise.all([
      this.rpc(baseUrl, 'session.history', { sessionId, maxMessages: 80 }),
      this.rpc(baseUrl, 'session.list', {}),
      this.rpc(baseUrl, 'session.models', { sessionId }).catch((error) => ({ error: error.message }))
    ])
    const summary = list.items?.find((item) => item.sessionId === sessionId)
    const current = modelDirectory?.current
    const group = (modelDirectory?.groups || []).find((item) => item?.id === current?.provider)
    const catalogModel = (group?.models || []).find((item) => item?.id === current?.model)
    const model = current?.provider && current?.model
      ? {
          available: true,
          provider: String(current.provider),
          id: String(current.model),
          name: String(catalogModel?.name || current.model)
        }
      : {
          available: false,
          ...(modelDirectory?.error ? { error: String(modelDirectory.error) } : {})
        }
    return { ...humanizeHistory(page), running: Boolean(summary?.running), model }
  }

  async connectionSnapshot({ baseUrl }) {
    const [providerResult, modelResult] = await Promise.all([
      this.rpc(baseUrl, 'llm.providers', {}),
      this.rpc(baseUrl, 'llm.models', {})
    ])
    const active = (providerResult?.providers || []).filter((provider) => provider?.active)
    const groups = modelResult?.groups || []
    const refs = [...new Set(active.map((provider) => PROVIDER_CREDENTIAL_REFS[provider.provider]).filter(Boolean))]
    let credentialStates = {}
    const failures = (modelResult?.failures || []).map((failure) => ({
      provider: String(failure?.provider || 'unknown'),
      message: String(failure?.message || failure?.error || '模型提供方返回了未知错误。')
    }))

    if (refs.length) {
      try {
        credentialStates = (await this.rpc(baseUrl, 'credentials.describe', { refs }))?.credentials || {}
      } catch (error) {
        failures.push({ provider: 'credentials', message: error.message })
      }
    }

    const activeProviders = active.map((provider) => {
      const group = groups.find((item) => item?.id === provider.provider)
      const models = (group?.models || []).map((model) => ({
        id: String(model.id || ''),
        name: String(model.name || model.id || '未命名模型'),
        reasoning: model.reasoning || null
      }))
      const ref = PROVIDER_CREDENTIAL_REFS[provider.provider]
      const described = ref ? credentialStates[ref] : null
      return {
        id: String(provider.provider || ''),
        name: String(provider.displayName || group?.name || provider.provider || '未命名提供方'),
        modelCount: models.length,
        models,
        credential: ref ? {
          ref,
          configured: typeof described?.configured === 'boolean' ? described.configured : null,
          ...(described?.source ? { source: String(described.source) } : {}),
          ...(typeof described?.writable === 'boolean' ? { writable: described.writable } : {})
        } : null
      }
    })
    const modelCount = activeProviders.reduce((total, provider) => total + provider.modelCount, 0)
    const deepSeekCredential = activeProviders.find((provider) => provider.id === 'deepseek-official')?.credential
    const knownCredentials = activeProviders.map((provider) => provider.credential).filter(Boolean)
    const missingCredential = knownCredentials.some((credential) => credential.configured === false)
    const unknownCredential = activeProviders.some((provider) => !provider.credential || provider.credential.configured === null)
    let state = 'ready'
    if (!activeProviders.length) state = 'unavailable'
    else if (missingCredential) state = 'needs-credential'
    else if (!modelCount || unknownCredential || failures.length) state = 'partial'
    const copy = connectionCopy(state, {
      providerNames: activeProviders.map((provider) => provider.name),
      modelCount
    })
    return {
      state,
      ...copy,
      modelCount,
      activeProviders,
      dormantProviderCount: Math.max(0, (providerResult?.providers || []).length - activeProviders.length),
      failures,
      credentialManagement: {
        supported: typeof deepSeekCredential?.configured === 'boolean',
        writable: deepSeekCredential?.writable === true,
        configured: deepSeekCredential?.configured === true,
        ...(deepSeekCredential?.source ? { source: deepSeekCredential.source } : {})
      },
      evidence: {
        activeProviderIds: activeProviders.map((provider) => provider.id),
        modelGroupIds: groups.map((group) => String(group?.id || '')).filter(Boolean),
        credentialRefsChecked: refs
      }
    }
  }

  async saveDeepSeekCredential({ baseUrl, value }) {
    const secret = String(value || '')
    if (!secret) throw new Error('API Key 不能为空。')
    if (secret !== secret.trim()) throw new Error('API Key 首尾不能包含空格。请检查复制内容。')
    if (/\s/.test(secret)) throw new Error('API Key 中不能包含空格或换行。请检查复制内容。')
    if (secret.length > 8192) throw new Error('API Key 长度异常，请检查复制内容。')
    try {
      await this.rpc(baseUrl, 'credentials.set', { ref: DEEPSEEK_CREDENTIAL_REF, value: secret })
      return { saved: true }
    } catch (error) {
      throw safeCredentialError(error, secret)
    }
  }

  async clearDeepSeekCredential({ baseUrl }) {
    try {
      await this.rpc(baseUrl, 'credentials.unset', { ref: DEEPSEEK_CREDENTIAL_REF })
      return { cleared: true }
    } catch (error) {
      throw safeCredentialError(error)
    }
  }

  cancel({ baseUrl, sessionId }) {
    return this.rpc(baseUrl, 'session.cancel', { sessionId })
  }
}

module.exports = { DshAdapter, humanizeHistory, textBlocks, connectionCopy, safeCredentialError, OFFICIAL_VISION_MODEL }
