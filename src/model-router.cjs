function modelsOf(directory) {
  return (directory?.groups || []).flatMap((group) => (group?.models || []).map((model) => ({
    provider: String(group?.id || ''),
    providerName: String(group?.name || group?.id || ''),
    ...model,
    id: String(model?.id || ''),
    name: String(model?.name || model?.id || '')
  }))).filter((model) => model.provider && model.id)
}

function exactCurrent(directory, models) {
  const found = models.find((model) => model.provider === directory?.current?.provider && model.id === directory?.current?.model)
  if (found) return found
  const provider = String(directory?.current?.provider || '')
  const id = String(directory?.current?.model || '')
  return provider && id ? { provider, id, name: id, description: '', reasoning: null, unadvertised: true } : undefined
}

function selectionOf(model, effort) {
  return {
    provider: model.provider,
    model: model.id,
    ...(effort ? { reasoningEffort: String(effort) } : {})
  }
}

function manualRoute(models, manualSelection) {
  const provider = String(manualSelection?.provider || '')
  const modelId = String(manualSelection?.model || '')
  const model = models.find((item) => item.provider === provider && item.id === modelId)
  if (!model) throw new Error('Harness 当前目录没有公布你选择的模型，请重新打开模型列表。')
  const requestedEffort = String(manualSelection?.reasoningEffort || '')
  const advertisedEfforts = model.reasoning?.efforts || []
  if (requestedEffort && !advertisedEfforts.some((item) => String(item?.id || '') === requestedEffort)) {
    throw new Error(`这个模型没有公布推理强度“${requestedEffort}”，请重新选择。`)
  }
  return {
    source: 'user',
    selection: selectionOf(model, requestedEffort || undefined),
    modelName: model.name,
    effortName: requestedEffort
      ? String(advertisedEfforts.find((item) => item.id === requestedEffort)?.name || requestedEffort)
      : '',
    explanation: '你明确选择了这个模型与推理强度，Deep code 不做自动替换。'
  }
}

/**
 * Resolve only an explicit user selection. Without one, preserve the model and
 * effort already owned by the Harness session. This intentionally performs no
 * task-role inference and maintains no second model-capability truth.
 */
function chooseModelRoute({ directory, manualSelection = null }) {
  if (directory?.routable === false) throw new Error('当前 Session 没有可用的模型选择。')
  const models = modelsOf(directory)
  const current = exactCurrent(directory, models)
  if (!current) throw new Error('Harness 没有报告当前模型；Deep code 不会猜测替代模型。')
  if (manualSelection) return manualRoute(models, manualSelection)
  return {
    source: 'harness-default',
    selection: null,
    current: selectionOf(current, directory.current?.reasoningEffort || undefined),
    modelName: current.name,
    effortName: String(directory.current?.reasoningEffort || ''),
    explanation: '你没有指定模型，Deep code 沿用 Harness 当前模型与推理强度。'
  }
}

module.exports = { chooseModelRoute }
