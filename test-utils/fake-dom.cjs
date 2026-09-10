class FakeClassList {
  constructor(element) { this.element = element }
  values() { return new Set(String(this.element.className || '').split(/\s+/).filter(Boolean)) }
  write(values) { this.element.className = [...values].join(' ') }
  add(...names) { const values = this.values(); names.forEach((name) => values.add(name)); this.write(values) }
  contains(name) { return this.values().has(name) }
  toggle(name, force) {
    const values = this.values()
    const enabled = force === undefined ? !values.has(name) : Boolean(force)
    if (enabled) values.add(name)
    else values.delete(name)
    this.write(values)
    return enabled
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName || '').toUpperCase()
    this.childNodes = []
    this.parentElement = null
    this.dataset = {}
    this.attributes = new Map()
    this.listeners = new Map()
    this.className = ''
    this._textContent = ''
    this.disabled = false
    this.isConnected = true
    this.classList = new FakeClassList(this)
  }

  get children() { return this.childNodes }
  get textContent() {
    if (!this.childNodes.length) return this._textContent
    return `${this._textContent}${this.childNodes.map((child) => child.textContent).join('')}`
  }
  set textContent(value) {
    this._textContent = String(value ?? '')
    this.childNodes = []
  }

  append(...nodes) {
    for (const node of nodes) {
      node.parentElement = this
      this.childNodes.push(node)
    }
  }

  replaceChildren(...nodes) {
    for (const child of this.childNodes) child.parentElement = null
    this.childNodes = []
    this._textContent = ''
    this.append(...nodes)
  }

  replaceWith(node) {
    if (!this.parentElement) return
    const parent = this.parentElement
    const index = parent.childNodes.indexOf(this)
    if (index < 0) return
    parent.childNodes[index] = node
    node.parentElement = parent
    this.parentElement = null
  }

  setAttribute(name, value) { this.attributes.set(name, String(value)) }
  getAttribute(name) { return this.attributes.get(name) ?? null }
  addEventListener(name, listener) {
    if (!this.listeners.has(name)) this.listeners.set(name, [])
    this.listeners.get(name).push(listener)
  }
  async dispatchEvent(name) {
    for (const listener of this.listeners.get(name) || []) await listener({ currentTarget: this, target: this })
  }
  querySelectorAll(selector) {
    if (selector === 'pre > code') return findAll(this, (node) => node.tagName === 'CODE' && node.parentElement?.tagName === 'PRE')
    return []
  }
}

class FakeDocument {
  createElement(tagName) { return new FakeElement(tagName) }
}

function findAll(root, predicate) {
  const matches = []
  for (const child of root.childNodes || []) {
    if (predicate(child)) matches.push(child)
    matches.push(...findAll(child, predicate))
  }
  return matches
}

module.exports = { FakeDocument, FakeElement, findAll }
