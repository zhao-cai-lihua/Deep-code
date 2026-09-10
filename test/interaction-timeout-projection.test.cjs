const test = require('node:test')
const assert = require('node:assert/strict')
const { projectInteractionTimeout } = require('../src/interaction-timeout-projection.cjs')

test('an accepted cancel request does not claim that the turn already stopped', () => {
  const result = projectInteractionTimeout({ interactionCount: 2, cancelAccepted: true })
  assert.equal(result.engine.state, 'unknown')
  assert.match(result.engine.error, /停止请求.*已发送.*尚未确认/)
  assert.match(result.recovery.cause, /等待.*2 项问题.*超过 5 分钟/)
  assert.match(result.recovery.safety, /接收不等于已经停止/)
  assert.doesNotMatch(result.engine.error, /本轮已停止/)
})

test('a rejected or unavailable cancel keeps both the wait and execution state explicit', () => {
  const result = projectInteractionTimeout({ interactionCount: 1, cancelAccepted: false })
  assert.equal(result.engine.state, 'unknown')
  assert.match(result.engine.error, /没有确认收到停止请求/)
  assert.match(result.recovery.safety, /没有替你选择.*无法确认 Harness 是否仍在执行/)
})
