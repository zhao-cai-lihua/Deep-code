function normalizeExternalUrl(value) {
  try {
    const url = new URL(String(value || ''))
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('只支持 http 或 https 网页链接。')
    return url.href
  } catch (error) {
    if (/只支持/.test(error.message)) throw error
    throw new Error('这不是可安全打开的网页链接。')
  }
}

module.exports = { normalizeExternalUrl }
