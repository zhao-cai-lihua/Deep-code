(function exposeTaskJourneyView(root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  if (root) root.DeepCodeTaskJourneyView = api
})(typeof window === 'undefined' ? globalThis : window, function taskJourneyViewFactory() {
  function createTaskJourneyView({ document, elements, onStageAction = () => {} }) {
    const { root, title, summary, stages, boundary } = elements

    function render(journey = {}) {
      const visible = journey?.visible === true
      root.classList.toggle('hidden', !visible)
      stages.replaceChildren()
      if (!visible) return
      root.dataset.tone = String(journey.tone || 'pending')
      title.textContent = String(journey.title || '这次会怎样推进')
      summary.textContent = String(journey.summary || '')
      boundary.textContent = String(journey.evidenceBoundary || '')
      for (const stage of Array.isArray(journey.stages) ? journey.stages : []) {
        const item = document.createElement('li')
        item.dataset.stage = String(stage.id || '')
        item.dataset.state = String(stage.state || 'pending')
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'task-journey-stage-button'
        button.title = `查看${String(stage.label || '这一阶段')}的依据`
        const marker = document.createElement('span')
        marker.className = 'task-journey-marker'
        marker.setAttribute('aria-hidden', 'true')
        const label = document.createElement('strong')
        label.textContent = String(stage.label || '')
        const detail = document.createElement('span')
        detail.className = 'task-journey-detail'
        detail.textContent = String(stage.detail || '')
        button.append(marker, label, detail)
        button.addEventListener('click', () => onStageAction(String(stage.action || '')))
        item.append(button)
        stages.append(item)
      }
    }

    return { render }
  }

  return { createTaskJourneyView }
})
