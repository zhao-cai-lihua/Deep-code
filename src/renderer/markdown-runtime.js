(function exposeMarkdownRuntime(root, createMarkdownRuntime) {
  if (typeof module === 'object' && module.exports) {
    module.exports = { createMarkdownRuntime }
  } else {
    root.deepCodeMarkdown = createMarkdownRuntime(root.markdownit)
  }
})(typeof globalThis === 'object' ? globalThis : this, function createMarkdownRuntime(markdownItFactory) {
  if (typeof markdownItFactory !== 'function') {
    return {
      available: false,
      renderInto(container, source) {
        container.replaceChildren()
        container.textContent = String(source || '')
      }
    }
  }

  const markdown = markdownItFactory({
    html: false,
    linkify: false,
    breaks: false,
    typographer: false
  })

  // Model-provided image URLs must not create ambient network requests. Keep
  // the authored alt text visible until Deep code has an explicit attachment flow.
  markdown.renderer.rules.image = (tokens, index) => {
    const alt = markdown.utils.escapeHtml(tokens[index].content || '未命名图片')
    return `<span class="markdown-image-placeholder">[图片：${alt}]</span>`
  }

  const originalLinkOpen = markdown.renderer.rules.link_open
    || ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options))
  markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
    tokens[index].attrSet('rel', 'noreferrer noopener')
    return originalLinkOpen(tokens, index, options, env, self)
  }

  return {
    available: true,
    render(source) {
      return markdown.render(String(source || ''))
    },
    renderInto(container, source) {
      container.innerHTML = markdown.render(String(source || ''))
    }
  }
})
