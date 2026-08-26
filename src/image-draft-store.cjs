const { randomUUID } = require('node:crypto')
const { basename, extname } = require('node:path')

const MEDIA_TYPES = Object.freeze({
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
})

function scope(value) {
  const normalized = String(value || '').trim()
  if (!normalized) throw new Error('附件草稿缺少任务范围。')
  return normalized
}

function bytesLabel(bytes) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function publicDraft(item, scopeId) {
  return {
    id: item.id,
    name: item.name,
    mediaType: item.mediaType,
    bytes: item.bytes,
    width: item.width,
    height: item.height,
    previewUrl: `deep-code-image://draft/${encodeURIComponent(scopeId)}/${encodeURIComponent(item.id)}`
  }
}

class ImageDraftStore {
  constructor({
    readFile,
    inspectImage,
    createId = randomUUID,
    maxImageBytes = 5 * 1024 * 1024,
    maxImagesPerScope = 6,
    maxScopeBytes = 20 * 1024 * 1024
  } = {}) {
    if (typeof readFile !== 'function' || typeof inspectImage !== 'function') throw new Error('图片草稿存储缺少文件读取或图片检查能力。')
    this.readFile = readFile
    this.inspectImage = inspectImage
    this.createId = createId
    this.maxImageBytes = maxImageBytes
    this.maxImagesPerScope = maxImagesPerScope
    this.maxScopeBytes = maxScopeBytes
    this.scopes = new Map()
  }

  entries(scopeId) {
    return this.scopes.get(scope(scopeId)) || []
  }

  list(scopeId) {
    const key = scope(scopeId)
    return this.entries(key).map((item) => publicDraft(item, key))
  }

  preview(scopeId, id) {
    const item = this.entries(scopeId).find((candidate) => candidate.id === String(id || ''))
    return item ? { mediaType: item.mediaType, data: Buffer.from(item.data) } : null
  }

  async addFiles(scopeId, paths) {
    const key = scope(scopeId)
    const existing = this.entries(key)
    const selected = [...new Set((paths || []).map(String).filter(Boolean))]
    if (!selected.length) return this.list(key)
    if (existing.length + selected.length > this.maxImagesPerScope) {
      throw new Error(`每条消息最多添加 ${this.maxImagesPerScope} 张图片。`)
    }

    const prepared = []
    for (const path of selected) {
      const mediaType = MEDIA_TYPES[extname(path).toLowerCase()]
      if (!mediaType) throw new Error('只支持 PNG、JPEG、WebP 或 GIF 图片。')
      const data = Buffer.from(await this.readFile(path))
      if (!data.length) throw new Error(`图片“${basename(path)}”是空文件。`)
      if (data.length > this.maxImageBytes) {
        throw new Error(`图片“${basename(path)}”超过 ${bytesLabel(this.maxImageBytes)} 的本地上限。`)
      }
      const dimensions = await this.inspectImage(data, mediaType)
      if (!Number.isInteger(dimensions?.width) || !Number.isInteger(dimensions?.height) || dimensions.width < 1 || dimensions.height < 1) {
        throw new Error(`无法识别图片“${basename(path)}”。文件可能损坏或扩展名不正确。`)
      }
      prepared.push({
        id: String(this.createId()),
        name: basename(path),
        mediaType,
        data,
        bytes: data.length,
        width: dimensions.width,
        height: dimensions.height
      })
    }

    const totalBytes = [...existing, ...prepared].reduce((sum, item) => sum + item.bytes, 0)
    if (totalBytes > this.maxScopeBytes) throw new Error(`当前消息的图片合计超过 ${bytesLabel(this.maxScopeBytes)}。`)
    this.scopes.set(key, [...existing, ...prepared])
    return this.list(key)
  }

  resolve(scopeId, ids) {
    const selected = new Set((ids || []).map(String))
    return this.entries(scopeId)
      .filter((item) => selected.has(item.id))
      .map((item) => ({
        type: 'image',
        mediaType: item.mediaType,
        data: item.data.toString('base64'),
        name: item.name
      }))
  }

  remove(scopeId, id) {
    const key = scope(scopeId)
    this.scopes.set(key, this.entries(key).filter((item) => item.id !== String(id || '')))
    return this.list(key)
  }

  clear(scopeId, ids) {
    const key = scope(scopeId)
    if (!ids) {
      this.scopes.delete(key)
      return []
    }
    const removed = new Set(ids.map(String))
    this.scopes.set(key, this.entries(key).filter((item) => !removed.has(item.id)))
    return this.list(key)
  }

  moveScope(fromScope, toScope) {
    const from = scope(fromScope)
    const to = scope(toScope)
    if (from === to) return this.list(to)
    const moving = this.entries(from)
    const target = this.entries(to)
    if (target.length + moving.length > this.maxImagesPerScope) throw new Error('目标任务的图片草稿数量超过上限。')
    if ([...target, ...moving].reduce((sum, item) => sum + item.bytes, 0) > this.maxScopeBytes) throw new Error('目标任务的图片草稿大小超过上限。')
    this.scopes.set(to, [...target, ...moving])
    this.scopes.delete(from)
    return this.list(to)
  }
}

module.exports = { ImageDraftStore, MEDIA_TYPES, bytesLabel }
