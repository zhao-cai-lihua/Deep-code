# Codex app-server 对 Deep Code 的可采用架构

日期：2026-08-26
研究范围：只使用 OpenAI 官方一手来源——`openai/codex` 官方仓库、仓库文档与 OpenAI 官方文档；不依据第三方逆向文章推断 Codex 桌面端私有实现。
固定源码基线：[`openai/codex@f5420174dafba153913a3e697f89002c338dfd7e`](https://github.com/openai/codex/commit/f5420174dafba153913a3e697f89002c338dfd7e)，提交时间 2026-08-26 10:39:05 UTC，提交说明为 `Include originating item IDs in MCP request metadata (#40866)`。

## 结论

**有帮助，而且非常契合 Deep Code；但应借鉴 app-server 的“客户端协议与状态投影结构”，不应把 Codex app-server 嵌入 Deep Code，也不应把它的字段原样冒充 DeepSeek Harness 的能力。**

OpenAI 官方把 app-server 定义为支撑丰富客户端的接口，用于深度集成认证、会话历史、审批和流式 Agent 事件；自动化或 CI 则建议使用 SDK。这证明 Deep Code 作为桌面产品需要一条稳定的“Engine → typed adapter → UI projection”边界，而不只是把 Engine 网页放进 Electron。[来源：OpenAI 官方 Codex App Server 文档](https://learn.chatgpt.com/docs/app-server)

对 Deep Code 最有价值的原则是：

> Harness 负责执行事实；DSH Adapter 把不稳定的上游协议翻译成 Deep Code 自有的稳定事件；投影层把稳定事件还原为用户能理解、能恢复、能审计的任务界面。

这与当前产品方向相符，但现状还少了一步：`dsh-live-session.cjs` 同时在做 wire 解析、活动文案和短期状态保存，导致“开始处理”“正在整理回复”在 Turn 结束后仍被当作活动展示。Codex 的做法说明，这类提示必须有明确的 `turnId/itemId` 和终态，不是无限保留的日志。

## 1. app-server 是什么，不是什么

app-server 是 Codex Core 与富客户端之间的双向 RPC 边界。默认 transport 是 stdio JSONL；协议近似 JSON-RPC 2.0，但 wire 上省略 `"jsonrpc":"2.0"`。它也提供 WebSocket，但官方 README 明确将普通 `ws://IP:PORT` listener 标为 experimental / unsupported，不建议生产依赖。请求入口、处理和输出之间使用有界队列；过载时返回 `-32001 Server overloaded; retry later.`，要求客户端指数退避并加入 jitter。[来源：固定 commit 的 app-server README，Protocol 与 Backpressure](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server/README.md#L20-L59)

源码中可以看到四层职责：

1. `lib.rs` 把 transport processor loop 与可能很慢的 outbound writer loop 分开，并用有界 channel 连接。[来源：`app-server/src/lib.rs`](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server/src/lib.rs#L161-L176)
2. `message_processor.rs` 完成握手检查和 RPC method dispatch，把 Thread、Turn、Model、Skills、Config、MCP 等请求分给专门 processor，而不是让一个总处理器解析所有业务。[来源：`message_processor.rs`](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server/src/message_processor.rs#L135-L169)
3. `thread_state.rs` 保存已加载 Thread 的运行投影、当前 Turn、待处理请求和持久历史恢复中间态。[来源：`thread_state.rs`](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server/src/thread_state.rs#L102-L150)
4. `bespoke_event_handling.rs` 把 Codex Core 的 `EventMsg` 转成 app-server 的 typed notification 和 server-initiated request；审批、Turn 终态和 Item 终态都从这里归一化。[来源：`bespoke_event_handling.rs`](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server/src/bespoke_event_handling.rs#L143-L206)

因此 app-server **不是**另一个 Agent、不是提示词框架、也不是 UI 状态的唯一存储。它是执行核心之上的稳定协议面与投影层。

## 2. 协议骨架：Thread、Turn、Item

官方把交互拆成三个顶层实体：

- Thread：一段可持久化、可恢复的会话。
- Turn：一次从用户输入到 Agent 完成或失败的运行。
- Item：Turn 内可独立流式展示和最终确认的输入或输出，例如用户消息、回复、reasoning summary、命令、文件修改和工具调用。

标准生命周期是：连接先 `initialize` / `initialized`；随后 `thread/start` 或 `thread/resume`；用户输入走 `turn/start`；运行中连续收到 `turn/started`、`item/started`、delta、`item/completed`；最后必须收到 `turn/completed`，其状态是 completed、interrupted 或 failed。[来源：固定 commit 的 Core Primitives 与 Lifecycle](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server/README.md#L66-L87)

app-server 还可以为当前运行实例生成与该版本精确匹配的 TypeScript 或 JSON Schema。稳定 schema 默认排除 experimental surface；客户端只有在 initialize 时明确 opt in 才能调用实验字段和方法。[来源：Schema generation](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server/README.md#L57-L64)、[Experimental API opt-in](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server/README.md#L2642-L2695)

### 对 Deep Code 的 seam

Deep Code 不应直接复制 `Thread/Turn/Item` wire schema，但应形成等价的本地 IR：

```text
WorkbenchTask
  taskId
  harnessSessionId
  runs[]

TaskRun
  runId              // 优先来自 DSH turn id；无正式 id 时由 adapter 生成并标明 local
  status             // queued | running | waiting | completed | interrupted | failed | unknown
  startedAt
  completedAt
  items[]

RunItem
  itemId             // tool callId / message seq / approval wire id 的稳定归一化
  kind               // user-message | answer | status | tool | file-change | approval | question
  status             // pending | running | completed | failed | declined
  source              // durable-history | live-event | local-explanation
  evidenceRef
```

具体代码边界建议：

- `src/dsh-adapter.cjs`：只负责正式 RPC、版本/能力探测和 DSH payload → Deep Code IR，不产出 Renderer 文案。
- `src/dsh-live-session.cjs`：变成按 `sessionId + runId + itemId` 驱动的 reducer；不再把“最近六条活动”当作无生命周期数组。
- `src/conversation-projection.cjs`：从 durable history 重建同一份 IR，并与 live reducer 用稳定 id 合并。
- `src/workbench-store.cjs`：只持久化 Task 与 Harness Session 引用、用户本地偏好和必要恢复游标，不复制 Harness 会话全文作为第二执行真相。
- `src/main.cjs`：只做 Electron IPC 编排，不再直接决定 activity 的含义。

## 3. 事件与状态投影：当前残留活动问题的直接答案

Codex 的 Turn 事件有严格收束：

- `turn/started` 创建一个 `inProgress` Turn。
- 每个 Item 必须遵循 `item/started → 0..n delta → item/completed`。
- `item/completed` 是该操作的权威结果。
- `turn/completed` 是该轮的权威终态；完整 Item 列表仍来自 `item/*`，而不是只依赖终态通知。
- plan 和 diff 分别有 `turn/plan/updated` 与 `turn/diff/updated`，不混入一般活动文案。[来源：Turn events 与 Item lifecycle](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server/README.md#L1678-L1728)

### Deep Code 应如何改

当前 `dsh-live-session.cjs` 把 DSH 的：

- `turn/start` 映射成“开始处理这一轮任务”；
- `assistant/message` 映射成“正在整理回复”；
- `turn/end` 只追加一个完成 activity。

问题在于前两项仍留在 `activities` 数组，Renderer 只看到它们最初的 `working`，不知道它们已经被同一个 Turn 的 `turn/end` 收束。

P0 修正应采用 reducer，而不是简单计时后隐藏：

1. `turn/start(runId)`：建立当前 Run，显示一个概括状态“正在处理”。
2. `assistant/message`：这是 durable/final message 事实，不应创建新的永久 working activity；它最多把 Run 的阶段改成 `finalizing`。
3. `tool/call(callId)`：创建稳定 Tool Item。
4. `tool/result/error(callId)`：更新同一 Item 到 completed/failed。
5. `turn/end(runId)`：把 Run 设为 completed/failed/interrupted；清空所有无独立实体的 transient phase，只保留已经完成的 Tool/File/Approval evidence。
6. durable snapshot 显示该 Session 已空闲时，即使 live 丢失了 `turn/end`，也执行 reconciliation，把尚未闭合的纯状态提示降级为“上次活动”，不能继续显示“正在”。

这也解释了产品文案应该怎样分层：

- “正在发生什么”：只显示当前仍然 active/waiting 的项目。
- “本轮完成了什么”：显示 terminal Tool/File/Approval/Outcome。
- “运行详情”：保存历史证据。
- `assistant/message`：只进入回复，不再复制成活动日志。

## 4. 会话恢复：durable snapshot 与 live notification 分工

Codex 的恢复不是重放一段不可靠 UI 状态。客户端保存 thread id，通过 `thread/resume` 重新订阅运行实例；若只想读取历史则用 `thread/read`，无需加载执行 Session。对大型持久 Thread，官方已弃用一次性完整 hydration，建议 `excludeTurns: true` 后用 `thread/turns/list`、`thread/items/list` 和 opaque cursor 分页；新事件继续走 live notification。[来源：Start or resume a thread](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server/README.md#L304-L424)、[Read/list history](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server/README.md#L579-L608)

Codex 还区分已加载 Thread 的 `idle | active | systemError` 和未加载的 `notLoaded`；`thread/status/changed` 是状态变化通知，而不是让客户端从最后一条聊天文字推断是否仍在运行。[来源：Track thread status changes](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server/README.md#L534-L560)

### 对 Deep Code 的 seam

- `session.history` / `session.list` 是恢复与最终事实；`events.mux` 是低延迟增量。
- 每次打开任务：先画本地骨架，再请求 durable snapshot，最后订阅 live mux。
- live event 只覆盖相同 stable id 的 Item；不能无条件 append。
- WebSocket 重连后先做一次 snapshot reconciliation，再接受新 event seq。
- Workbench 只保存 `taskId ↔ sessionId`、UI 展开状态和未发送草稿；不要保存“正在整理回复”作为可跨启动恢复的事实。

## 5. 附件与图片

Codex 的 `turn/start.input` 是判别联合列表，包含 text、image、localImage、audio、localAudio、skill 和 mention。`image` 使用 URL 字段，`localImage` 使用本地 path；它们在协议上属于用户消息内容，而不是输入框旁边的独立临时状态。[来源：`UserInput` 类型](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L378-L411)、[`userMessage` Item 说明](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server/README.md#L1694-L1704)

对 Deep Code 的可采用原则是：

- Composer 中是 attachment draft。
- 发送请求被 Harness 接受后，draft 才变成用户消息中的 attachment reference 并从 Composer 移除。
- durable history 读回的图片引用才是“已经发送”的证据。
- 模型视觉能力来自 Harness 的 model catalog/capability，不从模型名字猜。

不可采用的是 Codex 的 `image/localImage` wire shape；Deep Code 必须继续使用 DeepSeek Harness 的 durable attachment 与 `session.prompt` 正式契约。

## 6. 审批与等待用户

app-server 不把审批当作普通日志。命令和文件修改都采用 server-initiated JSON-RPC request，负载携带 `threadId + turnId + itemId`；客户端答复决定后，还会收到 `serverRequest/resolved` 清理 pending card，最后由 `item/completed` 给出实际执行终态。官方明确要求 UI 在 active Turn 内联显示审批。[来源：Approvals](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server/README.md#L1785-L1814)

这给 Deep Code 两个硬约束：

1. “用户允许了”与“操作成功了”是两个状态；允许后必须等待 Harness 的 tool/result 或终态事件。
2. `turn/end`、取消、连接断开或 server resolved 都必须清理待处理 Decision Gate，不能让旧任务的批准卡漂到新任务。

不可采用 Codex 的 decision 枚举、permission profile 或 Guardian/auto-review 语义；这些属于 Codex 执行器。Deep Code 只能展示 DSH 实际提供的一次性/会话级范围，并在缺失时明确写“Engine 未提供”。

## 7. Model 与 Skills 的边界

### Model

`model/list` 是服务端能力目录，包含模型、服务端排序的 reasoning efforts、service tiers 和其他模型元数据；客户端应保留服务端顺序。运行中若发生后端路由变化，Codex 另发 `model/rerouted`，不把它藏成普通回复。[来源：API Overview 的 `model/list`](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server/README.md#L245-L247)、[Model protocol](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server-protocol/src/protocol/v2/model.rs#L147-L163)

Deep Code 因此应记录三个分离字段：`requestedModel`、`effectiveModel`、`routingReason`。图片自动切换到 DSH vision model 可以存在，但必须在任务 Outcome/运行详情中透明显示；这不是角色卡或 Soft Harness 能悄悄决定的权限。

### Skills

Codex 推荐在文本中的 `$skill-name` 之外，同时提交显式 `skill` input item（name + path），避免模型再次搜索技能而增加延迟。`skills/list` 可以按 cwd 查询、强制刷新缓存；本地文件变化触发 `skills/changed`，客户端收到后重新 list。[来源：Skills](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server/README.md#L1953-L2025)、[`SkillsList` types](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/codex-rs/app-server-protocol/src/protocol/v2/plugin.rs#L20-L39)

对 Deep Code 的可采用边界：

- 项目/Session 建立后再向 Harness 查询 Skills，避免 `session not attached`。
- Skills 控制台显示来源、路径、启用状态、错误与刷新状态；不能只有一段错误字符串。
- 用户选择的 Skill 应成为显式任务输入/执行配置；如果 DSH 只支持文本触发，则 Adapter 标记 `activationSource: text-marker`，不能假装是结构化注入。
- Soft Harness Skill 属于协作方法层：它可以规定如何理解、解释、验证与恢复，却不能改模型、工具、沙箱和批准策略。执行边界仍由 Harness 负责。

## 8. 采用与不采用清单

| app-server 经验 | Deep Code 判断 | 落点 |
|---|---|---|
| Thread / Turn / Item 分层 | 采用概念，不复制 wire schema | `dsh-adapter` 输出稳定 IR |
| started / delta / completed 生命周期 | 立即采用 | 修复残留“正在整理回复” |
| durable history + live notification 合并 | 立即采用 | `conversation-projection` + live reducer |
| server status 是显式事实 | 采用 | Session snapshot 决定 idle/running |
| plan、diff、usage 独立事件域 | 上游有事实才采用 | 缺失时标记 unavailable，不解析回复猜测 |
| server-initiated approvals | 采用交互结构 | 仍使用 DSH interaction wire id |
| 多模态 input item | 采用 UX 语义 | 传输继续走 DSH durable attachment |
| model/list 与 reroute 透明化 | 采用 | requested/effective/reason |
| Skills list/cache/invalidation | 采用 | 项目级 Skills 控制台 |
| 版本匹配 schema generation | 借鉴 | 为每个受支持 DSH 版本保存 fixture/contract tests |
| stdio 作为生产 transport | 暂不硬切 | 先稳定现有 DSH HTTP + mux WebSocket；以后由官方能力决定 |
| Codex experimental WebSocket listener | 不采用 | 官方自己也标记 unsupported |
| Codex auth、ChatGPT plan、rate-limit API | 不采用 | Deep Code 面向 DSH provider credentials |
| Codex permission profile / Guardian | 不采用 | 不制造第二个安全系统 |
| Codex app-server 二进制作为第二 Engine | 不采用 | 会出现两个执行真相和两套历史 |
| 复制 Codex App 私有 UI | 不可证实也不需要 | 只参考开源协议表达出的交互语义 |

## 9. 对 Deep Code MVP 的具体切片

### P0：Run/Item reducer 与终态收束

- 为每个 task/session 保存独立 active run。
- `turn/start` 替换旧 active phase，不 append 多条永久 working 文案。
- `assistant/message` 进入回复，并只更新 phase；不创建历史 activity。
- `turn/end` 清除 transient phase，将已完成工具移入 Outcome/Evidence。
- snapshot 显示 idle 时强制 reconciliation。
- 测试同一 Session 多 Turn、事件重复、漏收 turn/end 后重连、Task A/B 隔离。

这应直接解决用户当前看到的“回复结束后仍在持续运行”。

### P0：启动产品边界

app-server 把服务器与富客户端分离，并不要求启动时呼出一个官方 Web UI。Deep Code 启动 Harness 时应使用只提供 RPC/事件服务的正式 headless 入口；如果 DSH 当前 `web` 命令强制打开浏览器，则 Supervisor 应优先寻找官方的 `--no-open`、headless/server 参数，只有官方没有该能力时才做受版本保护的环境/参数适配，不能通过启动后粗暴关闭用户浏览器补救。

### P1：版本化协议适配

- 对已验证 DSH tag 固定 RPC/schema/event fixtures。
- Adapter 根据 capability fingerprint 选择 handler，不在 Renderer 写版本判断。
- 上游 canary 运行：create/resume、prompt、image、mux、tool lifecycle、approval、skills、cancel。
- 未验证版本仍允许只读探测，但风险功能降级并给出可回退说明。

### P1：Outcome 与 Evidence

把 Codex 的 Item 终态思想翻译成人话：

- 本轮完成/失败/停止；
- 实际模型与是否发生自动切换；
- 运行过的工具与终态；
- 真实 changed files/diff；
- 等待用户的决定；
- Harness 未提供的 usage/权限事实明确写未知。

## 10. License、维护与稳定性

仓库根 LICENSE 是 Apache License 2.0。[来源：固定 commit 的 LICENSE](https://github.com/openai/codex/blob/f5420174dafba153913a3e697f89002c338dfd7e/LICENSE)

对 MIT License 的 Deep Code：

- **借鉴接口思想、状态机和交互模式**不等于复制源码，可以继续保持 Deep Code 的 MIT License。
- 若复制或改编 Apache-2.0 源码，相关文件/分发必须保留 Apache 2.0 版权、许可和 NOTICE 义务；不能把上游代码简单改头后宣称纯 MIT。最稳妥的是 clean-room 重写本地 IR/reducer，只引用公开协议事实。

维护状态在本次核查时非常活跃：固定基线本身就是 2026-08-26 当日的 app-server 相关提交；官方 Release 页面显示 2026-08-24 的稳定 `0.149.1`，同时 8 月 24–26 日连续发布多个 `0.150.0-alpha` 预发布版本。[来源：官方 Releases](https://github.com/openai/codex/releases)、[app-server commit history](https://github.com/openai/codex/commits/main/codex-rs/app-server/)

这同时意味着两件事：项目不是无人维护；协议也在快速演进。Deep Code 应固定研究 commit、只采用 stable surface，并把 experimental 能力隔离在 capability flag 后，不能跟着 `main` 字段逐日重写产品。

## 最终判断

Codex app-server 对 Deep Code 最重要的启示不是“我们也造一个庞大 server”，而是：**中间层的成熟度，取决于它能否让 UI 只处理稳定、可终止、可恢复、可追溯的产品事实。**

Deep Code 当前已有正确地基：DSH Adapter、durable conversation projection、live mux、Workbench Task、Outcome 和 Evidence。下一步应把它们收束为统一 Run/Item IR。完成这一步后，Codex 的舒适度不再只是视觉模仿，而会体现在：任务结束就真的结束、旧任务可恢复、附件属于消息、审批不会漂移、模型切换透明、硬核日志默认退到证据层。

这也是 Deep Code 与 Codex 可以相似、又不需要成为 Codex 的地方：Codex 的协议在服务专业 coding agent；Deep Code 可以用同样严谨的状态边界，把 DeepSeek Harness 翻译成普通人愿意使用的桌面产品。
