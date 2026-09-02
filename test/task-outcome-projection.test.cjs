const test = require('node:test')
const assert = require('node:assert/strict')

const { projectTaskOutcome } = require('../src/task-outcome-projection.cjs')

test('summarizes confirmed changes and explicit verification without guessing from answer text', () => {
  const outcome = projectTaskOutcome({
    engineState: 'ready',
    agent: {
      messages: [{ role: 'assistant', text: 'Everything is probably perfect.' }],
      runDetails: {
        changedFiles: [
          { path: 'src/app.js', operation: '修改' },
          { path: 'test/app.test.js', operation: '写入' }
        ],
        toolCards: [
          { id: '1', type: 'terminal', state: 'done', command: 'npm test', title: 'npm test', exitCode: 0 },
          { id: '2', type: 'read', state: 'done', title: '读取配置' }
        ]
      }
    }
  })

  assert.equal(outcome.state, 'success')
  assert.equal(outcome.title, '任务已完成')
  assert.match(outcome.summary, /确认改动 2 个文件/)
  assert.deepEqual(outcome.changes.map((item) => item.path), ['src/app.js', 'test/app.test.js'])
  assert.deepEqual(outcome.verifications, [{ label: 'npm test', state: 'passed', detail: '退出代码 0' }])
  assert.deepEqual(outcome.warnings, [])
  assert.deepEqual(outcome.risks, [])
  assert.equal(outcome.recoveryAssessment.state, 'unknown')
  assert.equal(outcome.map.source, 'harness-work-receipt')
  assert.deepEqual(outcome.map.nodes.map((node) => node.id), ['result', 'changes', 'verification', 'next'])
  assert.match(outcome.map.nodes.find((node) => node.id === 'changes').title, /2 个确认改动/)
})

test('makes missing verification visible when files changed', () => {
  const outcome = projectTaskOutcome({
    engineState: 'ready',
    agent: { runDetails: { changedFiles: [{ path: 'src/app.js', operation: '修改' }], toolCards: [] } }
  })

  assert.deepEqual(outcome.verifications, [])
  assert.match(outcome.warnings[0], /没有看到明确的测试、检查或构建命令/)
  assert.equal(outcome.map.nodes.find((node) => node.id === 'attention').state, 'warning')
})

test('reports failed verification and task failure as recorded facts', () => {
  const outcome = projectTaskOutcome({
    engineState: 'error',
    engineError: 'Engine 返回退出代码 1。',
    agent: {
      runDetails: {
        changedFiles: [],
        toolCards: [{ id: '1', type: 'terminal', state: 'error', command: 'pnpm lint', title: 'pnpm lint', exitCode: 1 }]
      }
    }
  })

  assert.equal(outcome.state, 'error')
  assert.equal(outcome.title, '这轮没有完成')
  assert.match(outcome.summary, /退出代码 1/)
  assert.deepEqual(outcome.verifications, [{ label: 'pnpm lint', state: 'failed', detail: '退出代码 1' }])
})

test('stays hidden while a task is not terminal', () => {
  assert.equal(projectTaskOutcome({ engineState: 'running' }).visible, false)
  assert.equal(projectTaskOutcome({ engineState: 'draft' }).visible, false)
})

test('never reports a failed or interrupted Harness terminal reason as success', () => {
  for (const state of ['failed', 'interrupted']) {
    const outcome = projectTaskOutcome({
      engineState: 'ready',
      agent: { runDetails: { terminal: { state, reason: state }, toolCards: [], changedFiles: [] } }
    })
    assert.equal(outcome.state, 'error')
    assert.match(outcome.title, /没有完成|已停止/)
  }
})

test('a verification without an explicit successful exit code stays unknown', () => {
  const outcome = projectTaskOutcome({
    engineState: 'ready',
    agent: { runDetails: { toolCards: [{ type: 'terminal', state: 'done', command: 'npm test', exitCode: null }], changedFiles: [] } }
  })
  assert.equal(outcome.verifications[0].state, 'unknown')
  assert.match(outcome.warnings.join(' '), /没有提供足以确认通过的终态/)
})

test('turns a user-wait timeout into an honest recovery path', () => {
  const outcome = projectTaskOutcome({
    engineState: 'error',
    engineError: '这一轮因等待你的回答超过 5 分钟而停止。',
    recovery: {
      kind: 'waiting-timeout',
      cause: 'Harness 正在等待你的回答；5 分钟内没有收到回答。',
      safety: '没有替你选择任何答案。',
      nextAction: '重新连接任务后再回答。'
    },
    agent: { runDetails: { toolCards: [], changedFiles: [] } }
  })
  assert.equal(outcome.recovery.kind, 'waiting-timeout')
  assert.match(outcome.impact, /没有替你选择/)
  assert.equal(outcome.nextAction, '重新连接任务后再回答。')
  assert.equal(outcome.recoveryAssessment.state, 'available')
})

test('makes high-impact files visible even when ordinary tests pass', () => {
  const outcome = projectTaskOutcome({
    engineState: 'ready',
    agent: {
      runDetails: {
        changedFiles: [
          { path: 'package.json', operation: '修改' },
          { path: '.github/workflows/release.yml', operation: '修改' }
        ],
        toolCards: [{ type: 'terminal', state: 'done', command: 'npm test', exitCode: 0 }]
      }
    }
  })
  assert.deepEqual(outcome.risks.map((risk) => risk.id), ['dependencies', 'automation'])
  assert.match(outcome.warnings.join(' '), /许可证/)
})
