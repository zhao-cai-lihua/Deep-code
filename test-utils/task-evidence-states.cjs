function details({ terminal, cards = [], changes = [] } = {}) {
  return {
    terminal: terminal ? { state: terminal, reason: terminal } : undefined,
    activities: cards.map((card) => ({ id: card.id })),
    permissionFacts: [],
    changedFiles: changes,
    runtimeContext: [],
    toolCards: cards
  }
}

function thread({ engineState = 'ready', terminal, cards, changes, outcome, baseline } = {}) {
  return {
    engineState,
    workspacePath: 'C:\\work\\fixture',
    baseline,
    outcome,
    agent: {
      taskRunSnapshot: terminal ? { terminal: { state: terminal } } : {},
      runDetails: details({ terminal, cards, changes })
    }
  }
}

const doneCard = { id: 'read-1', type: 'read', state: 'done', title: '读取文件', path: 'README.md', lines: [] }
const change = { path: 'README.md', operation: '修改', confirmed: true }

const taskEvidenceStates = [
  {
    id: 'completed-with-change', expectedTone: 'success', expectedTitle: '这一轮已结束', changesHidden: false,
    thread: thread({ terminal: 'completed', cards: [doneCard], changes: [change], outcome: { state: 'success', warnings: [], risks: [], verifications: [{ state: 'passed' }] }, baseline: { state: 'clean', head: 'abc', dirtyPaths: [] } })
  },
  {
    id: 'completed-no-change', expectedTone: 'success', expectedTitle: '这一轮已结束', changesHidden: true,
    thread: thread({ terminal: 'completed', cards: [doneCard], outcome: { state: 'success', warnings: [], risks: [], verifications: [] }, baseline: { state: 'clean', head: 'abc', dirtyPaths: [] } })
  },
  {
    id: 'changed-unverified', expectedTone: 'warning', expectedTitle: '这一轮已结束，仍需核查', changesHidden: false,
    thread: thread({ terminal: 'completed', cards: [doneCard], changes: [change], outcome: { state: 'success', warnings: ['改动尚未验证。'], risks: [], verifications: [] }, baseline: { state: 'clean', head: 'abc', dirtyPaths: [] } })
  },
  {
    id: 'verification-failed', expectedTone: 'error', expectedTitle: '验证未通过', changesHidden: false,
    thread: thread({ terminal: 'completed', cards: [{ id: 'test-1', type: 'terminal', state: 'error', title: 'npm test', command: 'npm test', exitCode: 1, verificationIntent: true }], changes: [change], outcome: { state: 'success', warnings: ['验证失败。'], risks: [], verifications: [{ state: 'failed' }] }, baseline: { state: 'clean', head: 'abc', dirtyPaths: [] } })
  },
  {
    id: 'waiting-user', expectedTone: 'active', expectedTitle: '这一轮仍在运行', changesHidden: true,
    thread: thread({ engineState: 'running', cards: [doneCard] })
  },
  {
    id: 'timeout-unconfirmed', expectedTone: 'warning', expectedTitle: '停止仍待 Harness 确认', changesHidden: true,
    thread: thread({ engineState: 'unknown', cards: [doneCard], outcome: { state: 'pending', title: '停止仍待 Harness 确认', warnings: [], risks: [], verifications: [] } })
  },
  {
    id: 'stopped-confirmed', expectedTone: 'error', expectedTitle: '这一轮已停止', changesHidden: true,
    thread: thread({ engineState: 'error', terminal: 'interrupted', cards: [doneCard], outcome: { state: 'error', title: '这一轮已停止', warnings: [], risks: [], verifications: [] } })
  },
  {
    id: 'credential-failure', expectedTone: 'error', expectedTitle: '模型连接验证未通过', changesHidden: true,
    thread: thread({ engineState: 'error', terminal: 'failed', outcome: { state: 'error', title: '模型连接验证未通过', warnings: [], risks: [], verifications: [] } })
  },
  {
    id: 'network-failure', expectedTone: 'error', expectedTitle: '这轮没有完成', changesHidden: true,
    thread: thread({ engineState: 'error', terminal: 'failed', outcome: { state: 'error', title: '这轮没有完成', warnings: [], risks: [], verifications: [] } })
  },
  {
    id: 'no-git-workspace', expectedTone: 'warning', expectedTitle: '这一轮已结束，仍需核查', changesHidden: false,
    thread: thread({ terminal: 'completed', cards: [doneCard], changes: [change], outcome: { state: 'success', warnings: ['没有 Git 恢复基础。'], risks: [], verifications: [] }, baseline: { state: 'not-git', dirtyPaths: [] } })
  }
]

module.exports = { taskEvidenceStates }


