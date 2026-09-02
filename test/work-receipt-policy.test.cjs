const test = require('node:test')
const assert = require('node:assert/strict')

const { assessWorkReceipt } = require('../src/work-receipt-policy.cjs')

test('translates dependency and workflow changes into human high-impact risks', () => {
  const assessment = assessWorkReceipt({
    changes: [
      { path: 'package.json', operation: '修改' },
      { path: '.github\\workflows\\release.yml', operation: '修改' }
    ],
    verifications: [{ state: 'passed', label: 'npm test' }]
  })

  assert.deepEqual(assessment.risks.map((risk) => risk.id), ['dependencies', 'automation'])
  assert.match(assessment.risks[0].label, /依赖/)
  assert.match(assessment.warnings.join(' '), /许可证/)
})

test('never claims a changed workspace is recoverable without checkpoint evidence', () => {
  const assessment = assessWorkReceipt({ changes: [{ path: 'src/app.cjs', operation: '修改' }] })
  assert.equal(assessment.recoveryAssessment.state, 'unknown')
  assert.match(assessment.recoveryAssessment.detail, /没有 Git checkpoint 证据/)
})

test('shows explicit recovery guidance without inventing broader rollback coverage', () => {
  const assessment = assessWorkReceipt({
    changes: [{ path: 'src/app.cjs', operation: '修改' }],
    recovery: { nextAction: '重新连接后继续当前任务。' }
  })
  assert.deepEqual(assessment.recoveryAssessment, {
    state: 'available', label: '已有恢复指引', detail: '重新连接后继续当前任务。'
  })
})

test('raises review scope when a turn changes many files', () => {
  const assessment = assessWorkReceipt({
    changes: Array.from({ length: 10 }, (_, index) => ({ path: `src/file-${index}.cjs`, operation: '修改' })),
    verifications: [{ state: 'passed', label: 'npm test' }]
  })
  assert.ok(assessment.risks.some((risk) => risk.id === 'large-change'))
})
