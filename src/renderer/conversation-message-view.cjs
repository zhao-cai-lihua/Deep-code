(function exposeConversationMessageView(root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  if (root) root.DeepCodeConversationMessageView = api
})(typeof window === 'undefined' ? globalThis : window, function conversationMessageViewFactory() {
  function createConversationMessageView({ document, renderMarkdown, copyText, formatImageBytes, schedule = setTimeout }) {
    async function copyWithFeedback(value, button) {
      const original = button.textContent
      button.disabled = true
      try {
        await copyText(value)
        button.textContent = '已复制'
      } catch {
        button.textContent = '复制失败'
      } finally {
        schedule(() => {
          if (!button.isConnected) return
          button.disabled = false
          button.textContent = original
        }, 1400)
      }
    }

    function copyButton(value, label = '复制') {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'copy-button'
      button.textContent = label
      button.addEventListener('click', () => copyWithFeedback(value, button))
      return button
    }

    function appendResponseText(container, source, { copyCode = true } = {}) {
      renderMarkdown(container, source)
      if (!copyCode) return
      for (const code of [...container.querySelectorAll('pre > code')]) {
        const pre = code.parentElement
        const wrapper = document.createElement('div')
        wrapper.className = 'code-block'
        const button = copyButton(code.textContent, '复制代码')
        button.setAttribute('aria-label', '复制这段代码')
        pre.replaceWith(wrapper)
        wrapper.append(pre, button)
      }
    }

    function render(message = {}) {
      const messageRole = String(message.role || 'user')
      const source = String(message.text || '')
      const images = Array.isArray(message.images) ? message.images : []
      const draft = message.draft === true
      const bubble = document.createElement('article')
      bubble.className = `message-bubble ${messageRole}${draft ? ' live-draft' : ''}`
      const heading = document.createElement('div')
      heading.className = 'message-heading'
      const role = document.createElement('strong')
      role.textContent = messageRole === 'assistant'
        ? draft
          ? (message.truncated ? 'Deep code · 生成中（预览已截短）' : 'Deep code · 生成中')
          : 'Deep code'
        : '你'
      heading.append(role)
      if (messageRole === 'assistant' && !draft && source) heading.append(copyButton(source, '复制回答'))
      bubble.append(heading)

      if (source) {
        const text = document.createElement('div')
        text.className = 'message-content'
        appendResponseText(text, source, { copyCode: !draft })
        bubble.append(text)
      }

      if (images.length) {
        const gallery = document.createElement('ul')
        gallery.className = 'message-attachments'
        for (const image of images) {
          const item = document.createElement('li')
          const dimensions = image?.width && image?.height ? ` · ${image.width} × ${image.height}` : ''
          const size = Number.isFinite(image?.bytes) ? ` · ${formatImageBytes(image.bytes)}` : ''
          item.textContent = `图片 · ${String(image?.name || '未命名图片')}${dimensions}${size}`
          gallery.append(item)
        }
        bubble.append(gallery)
      }

      if (draft) {
        bubble.setAttribute('aria-live', 'polite')
        bubble.setAttribute('aria-label', 'Deep code 正在生成尚未定稿的回复')
        const notice = document.createElement('small')
        notice.className = 'live-draft-notice'
        notice.textContent = '尚未定稿；Harness 提交后会由正式任务记录替换。'
        bubble.append(notice)
      }
      return bubble
    }

    return { render }
  }

  return { createConversationMessageView }
})
