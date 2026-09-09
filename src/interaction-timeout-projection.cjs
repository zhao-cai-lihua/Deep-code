function projectInteractionTimeout({ interactionCount = 1, cancelAccepted = false } = {}) {
  const countLabel = Number(interactionCount) > 1 ? `${Number(interactionCount)} 项问题` : '问题'
  return {
    engine: {
      state: 'unknown',
      error: cancelAccepted
        ? `等待你的回答超过 5 分钟；停止请求已发送，但 Harness 尚未确认这一轮已停止。Deep code 没有替你回答${countLabel}。`
        : `等待你的回答超过 5 分钟，而且 Harness 没有确认收到停止请求。Deep code 没有替你回答${countLabel}。`,
      notice: '等待用户超时；执行状态尚待 Harness 事件确认。'
    },
    recovery: {
      kind: 'waiting-timeout',
      cause: `Harness 等待你处理${countLabel}超过 5 分钟。`,
      safety: cancelAccepted
        ? '已向 Harness 发送停止请求，并且没有替你选择任何答案；请求被接收不等于已经停止。'
        : '没有替你选择任何答案；Deep code 无法确认 Harness 是否仍在执行。',
      nextAction: '重新连接任务并查看最新轨迹；若原问题仍在等待，可以继续回答，否则把答案作为一条新消息发送。'
    }
  }
}

module.exports = { projectInteractionTimeout }
