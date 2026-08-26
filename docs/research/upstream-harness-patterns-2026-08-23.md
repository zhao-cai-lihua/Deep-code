# 上游 Harness 经验评估：DeepSeek Harness 与 OpenAI Codex

日期：2026-08-23
范围：只核对官方 GitHub 仓库、官方源码与官方文档；不以二手文章作为事实依据。
固定参考点：

- DeepSeek Harness `deepseek-ai/deepseek-harness`：`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`（`master` 在本次核查时的提交）
- OpenAI Codex `openai/codex`：`343074d4207d572809bd8cea15f4be1d09d98e0b`（`main` 在本次核查时的提交）

本报告的工程前提是：Deep Code 是 Harness 之上的桌面产品层。Harness 仍然是执行真相（文件、命令、权限、会话事件和模型执行均以 Harness 为准）；Deep Code 只做桌面生命周期、任务组织、人类可读的投影、模型路由策略和证据呈现，不创建第二套执行状态。

## 结论先行

最值得立即吸收的不是“复制某个 UI”，而是四个边界：

1. 把“新任务”建模为独立的持久 session/thread，而不是把现有会话滚动到末尾。
2. 把实时增量、正式历史、审批/提问和任务计划分成不同事件域；临时草稿不能冒充持久历史。
3. 把模型选择做成可解释的路由策略，先支持显式模型配置和任务级覆盖，再考虑自动调度。
4. 把复杂事实投影成简短的状态、结果摘要和可展开证据；任何 UI 摘要都必须能回到 Harness 的事件或查询结果。

## 1. DeepSeek Harness 的已验证设计

### 1.1 插件树与可替换 seam

官方架构文档明确描述：Cordis 插件提供服务、类型化事件和可撤销 effect；模型适配器、工具注册表、session log、agent loop 都是插件，没有不可替换的“特权核心”。profile 由有序 bundles 与 patch 组成，启动时可以 dump 实际配置树。核心包分别拥有 session、system prompt、tools、agent、agent loop 和 LLM adapter 等 seam。

来源：

- [DeepSeek Harness architecture.md（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/architecture.md)
- [DeepSeek Harness README（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/README.md)

**Deep Code 判断：可直接采用原则，需适配实现。**

- 可直接采用：把 Deep Code 自己的扩展点分成 `Host`、`DSH Adapter`、`Projection`、`Task UI`、`Model Router`，每个 seam 有明确输入/输出。
- 需适配：不要在桌面 app 中复制 Cordis 或把 Deep Code 变成另一个 Harness。Deep Code 应通过官方 API/event stream/SDK 接口连接 Harness；如果某能力需要新增执行行为，应优先做 Harness plugin，而不是在 Renderer 或 Electron 主进程偷偷执行。
- 暂不采用：完整 profile/bundle/patch 编辑器。它对插件开发者有价值，对普通用户会把“完成任务”变成“维护配置树”；MVP 只呈现当前 profile、模型、工作区和权限摘要。

### 1.2 Durable session event 是恢复和 UI 的根

官方文档把 `session/event` 定义为会持久化、可重放的事实；`agent/*` 是实时工作中的观察/拦截事件；能力事件则连接 fs、tools、telemetry 等 seam。官方 turn flow 还区分 turn、step、model request、tool call、assistant chunk、assistant message 和 turn end。文档进一步规定，模型可见的输入必须能从 session log 重建，新的模型可见输入应增加 session event。

来源：

- [DeepSeek Harness architecture.md：Events / Turn flow / Session log（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/architecture.md#events)
- [DeepSeek Harness session types（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/core/session/src/types.ts)
- [DeepSeek Harness events schema（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/host/apiproxy/src/api/events.schema.ts)

**Deep Code 判断：可直接采用。**

- “新任务”必须调用 Harness 的新 session/thread 创建路径，拿到新的 id，再打开新的 task view；不能在当前 DOM 上清空/滚动，也不能把多个任务混在同一条会话历史里。
- Deep Code 任务列表只保存 session id、标题投影、时间、工作区和最后状态；正文与事件仍从 Harness durable log/query 投影。
- 当前 Deep Code 的实时 SSE 投影应继续遵守：`assistant/chunk` 只作为未定稿正文草稿，`assistant/message` 才能进入正式回答；`reasoning-delta`、工具参数和系统 context 不进入普通气泡。

### 1.3 扩展点与任务统筹

官方架构把增加目标、后台作业、子 agent、任务工具和同一 session 的目标管理分别放在 `ctx.goals`、`ctx.jobs`、agent provider、tools 和 agent events 上；实验性的 agent teams 有 durable roster、task board 和 mailbox，但仍位于 opt-in 协调 seam，而非 UI 假装出来的第二执行系统。

来源：[DeepSeek Harness architecture.md：Where new behavior goes（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/architecture.md#where-new-behavior-goes)

**Deep Code 判断：需适配；分阶段。**

- MVP 直接采用：每个任务窗口对应一个 Harness session；任务窗口内展示 Harness 的目标/计划投影和当前 step；“新任务”创建新 session。
- 下一阶段：仅当 Harness 提供稳定的 goals/jobs/agent events 时，做“计划、当前步骤、等待用户、已完成”四态投影；任务板必须是事件或查询的 projection。
- 暂不采用：Deep Code 自己启动平行 subagent、自己维护 mailbox 或“规划 agent + 执行 agent”的隐藏循环。否则会出现 UI 认为完成、Harness 仍在运行，或两个系统争夺权限/文件的第二真相。

### 1.4 模型与 provider seam

官方架构把增加模型 provider 定义为在 `ctx.llm` 注册 adapter；官方 Python SDK 的固定版本文档还显示 provider、model、max_tokens、base_url、api_key、cordis 配置和 runtime 生命周期都是显式参数，SDK 可以复用同一个 runtime 和 session，也可以用新 session id 获得独立任务。

来源：

- [DeepSeek Harness architecture.md：LLM adapter / Add a model provider（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/architecture.md#where-new-behavior-goes)
- [DeepSeek Harness Python SDK guide（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/user/guide/python-sdk.md)
- [DeepSeek Harness SDK API（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/python/sdk/src/deepseek_harness/api.py)

**Deep Code 判断：可直接采用接口思想，路由器需适配。**

- 立即做：提供“默认模型 / 当前任务模型 / provider 状态 / 估计成本”四个可见字段；任务创建时固定模型配置快照，避免任务中途无提示地换模型。
- 允许覆盖：高级设置可为某一任务显式指定 provider/model/base URL；密钥只存本机安全存储或用户环境变量，绝不写入任务摘要、日志或 Git。
- 成本策略：默认不自动跨厂商路由，不在用户不知情时消耗第二家 API 配额。先记录每次 turn 的 provider、model、token/usage（若 Harness 提供）和失败原因，再开放“省额度模式”。
- “sol 规划、luna 执行”可以作为未来的显式工作流模板，但必须把每一阶段显示为独立调用、模型、费用和权限，并让所有执行步骤仍进入 Harness session/event。

## 2. OpenAI Codex 的已验证设计

### 2.1 App server protocol：桌面 UI 与 agent 通过稳定协议分离

Codex 仓库把 `app-server-protocol` 单独作为协议层，包含 JSON schema、thread、turn、model、permission、approval 和 notification 类型。固定版本的 v2 schema 有 `ThreadStart`、`ThreadFork`、`ThreadRead`、`TurnStart`、`TurnPlanUpdated`、`TurnCompleted`、`ThreadStatusChanged`、`ThreadTokenUsageUpdated` 等明确边界；`AgentMessageDeltaNotification` 用 threadId/turnId/itemId/delta 标识增量消息。

来源：

- [Codex repository README（固定 commit）](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/README.md)
- [Codex app-server-protocol schema tree（固定 commit）](https://github.com/openai/codex/tree/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/v2)
- [AgentMessageDeltaNotification（固定 commit）](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/v2/AgentMessageDeltaNotification.json)
- [ThreadStartParams / Response（固定 commit）](https://github.com/openai/codex/tree/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/v2)

**Deep Code 判断：可直接采用。**

- `TaskRuntime` 应作为独立模块，把 session/thread id、turn id、状态、增量事件和持久 snapshot 传给 UI。
- 新任务按钮的契约应是 `createTask()`：创建独立 session，注册独立 live subscription，插入任务列表，切换到新任务视图；不是 `scrollToBottom()`，也不是复用当前 session。
- Renderer 只处理人类可读的投影；底层响应 id、审批 id 和协议错误只在主进程/适配器内部流动。

### 2.2 计划、状态、diff、用量是不同的 UI 信息域

Codex v2 协议将 turn plan、turn diff、thread status、token usage、completed notification 分开定义，而不是把它们拼接成一段长文本。这样 UI 能分别表现“正在做什么”“改了什么”“还在不在运行”“用了多少”和“是否结束”。

来源：

- [Codex v2 protocol schemas（固定 commit）](https://github.com/openai/codex/tree/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/v2)
- [TurnPlanUpdatedNotification（固定 commit）](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/v2/TurnPlanUpdatedNotification.json)
- [TurnDiffUpdatedNotification（固定 commit）](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/v2/TurnDiffUpdatedNotification.json)
- [ThreadTokenUsageUpdatedNotification（固定 commit）](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/v2/ThreadTokenUsageUpdatedNotification.json)

**Deep Code 判断：可直接采用信息架构，需由 DSH Adapter 映射。**

MVP 的回答顶部应固定为四层：

1. 结果摘要：完成 / 部分完成 / 失败 / 等待用户。
2. 计划与当前步骤：最多显示当前和下一步，不把完整 agent reasoning 展示给普通用户。
3. 变更摘要：文件新增、修改、删除及测试结果。
4. 可展开证据：命令、权限、原始事件、错误详情和时间线。

如果 Harness 暂无完全对应的 diff/usage 事件，Deep Code 只能标记“暂无可靠数据”，不能从自然语言猜出“改了哪些文件”或“用了多少额度”。

### 2.3 权限和批准必须是结构化请求

Codex 的协议树包含 command execution、file change、apply patch、permissions 和 guardian approval 等结构化请求/响应，而不是让 UI 从模型文字中猜测“是否需要确认”。

来源：

- [Codex approval schemas（固定 commit）](https://github.com/openai/codex/tree/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json)
- [ServerRequest schema（固定 commit）](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/ServerRequest.json)
- [PermissionsRequestApprovalParams（固定 commit）](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/PermissionsRequestApprovalParams.json)

**Deep Code 判断：可直接采用产品原则，绝不绕过 Harness。**

- 把“需要你确认”做成清楚的卡片：动作、目标路径/命令、影响范围、一次性或本任务有效、允许/拒绝。
- 允许用户在详情中查看原始请求，但不要把权限策略术语直接塞进主回答。
- 不要提供一个 UI 开关把 Harness 的批准机制静默改成全权限；改变权限必须经过明确设置并显示当前有效策略。

### 2.4 模型路由与 reroute 是可见协议，不应是隐藏魔法

Codex 固定版本的协议包含 `ModelList`、provider capabilities、model rerouted notification、model verification、service tier 和 upgrade info。这证明成熟客户端把“可用模型”和“模型实际被重路由”作为可观察状态，而不是只在设置页存一串字符串。

来源：

- [Codex model protocol schemas（固定 commit）](https://github.com/openai/codex/tree/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/v2)
- [ModelReroutedNotification（固定 commit）](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/v2/ModelReroutedNotification.json)
- [ModelListResponse（固定 commit）](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/v2/ModelListResponse.json)

**Deep Code 判断：需适配后采用。**

- MVP：实现 `Model Catalog`（provider/model/capability/endpoint health）和任务级固定选择。
- 后续：实现可选路由策略，例如“规划模型 / 执行模型 / 便宜模型 / 复核模型”，但每次切换都写入任务证据并展示费用、隐私和上下文传递边界。
- 暂不采用：模仿 Codex 的服务套餐、账号登录或云端专属模型策略。Deep Code 的本地桌面产品必须先支持用户自己的 API key 和本地/兼容 endpoint，不能把第三方账户假设成前提。

## 3. 适合 Deep Code 的采用清单

### 可直接采用（MVP/P0）

| 能力 | 采用方式 | 真相来源 |
| --- | --- | --- |
| 独立新任务 | 新 session id + 新 live subscription + 新 task view | Harness durable session/event |
| 事件分层 | durable history、live delta、approval/question、projection 分开 | Harness event schema |
| 结果摘要 | 从事件/adapter snapshot 生成固定字段 | Harness event/query；无数据则明确未知 |
| 结构化权限卡 | 显示动作、目标、范围、期限和确认结果 | Harness approval request |
| 任务计划 | 显示当前步骤和完成状态，不显示 reasoning 原文 | Harness goals/agent/plan projection |
| 模型目录 | provider、model、能力、健康状态、任务级快照 | Harness config/provider 状态 |
| 协议适配层 | 主进程统一解析 SSE/JSON-RPC，Renderer 只吃 projection | DSH Adapter |

### 需要适配（P1/P2）

| 能力 | 适配边界 | 先决条件 |
| --- | --- | --- |
| planner/executor 多模型 | 做成显式 workflow，独立 turn 或 session，显示成本和权限 | Harness 支持稳定 provider/model override 与事件记录 |
| jobs/subagents | 只展示 Harness 已创建的作业和子 agent | 事件中有 durable id、状态、取消/恢复契约 |
| fork/分支任务 | 通过 Harness fork 或独立 session，不复制 DOM | Harness 提供可重放边界 |
| token/费用视图 | 只使用 provider usage，不估算为事实 | provider 返回 usage 且字段稳定 |
| glass UI | 使用半透明、低对比层次和减少动画设置 | 不降低正文可读性，不把状态颜色作为唯一信息 |

### 暂不采用（当前阶段）

- 在 Electron 内自建 shell、filesystem、patch 或 approval 执行器。
- 隐藏的自动跨厂商路由，尤其是用户未提供或未同意的 API。
- 自己维护一份“任务完成状态”并覆盖 Harness session。
- 自动显示 reasoning、system-reminder、完整事件 payload 或工具参数。
- 复制 Cordis 全部 plugin/profile 管理作为普通用户功能。
- 为了玻璃效果牺牲对比度、滚动性能、键盘可达性或减少动画支持。

## 4. 多模型工作模式：可做，但先做透明路由

砚星提出“由林决定当前调用哪个模型执行 plan/goal/具体任务”，工程上可行，但不能把它当作无成本的内部实现。模型调度器会引入四类真实成本：

1. **额度成本**：规划、执行、复核可能分别消耗一次或多次模型调用。
2. **上下文成本**：跨 provider 传递工作区内容、计划、错误和文件片段，会增加 token 与隐私暴露面。
3. **一致性成本**：不同模型对工具协议、结构化输出和修改习惯不同，可能制造重复或冲突执行。
4. **审计成本**：用户必须知道哪一个模型提出计划、哪一个模型执行、哪一个模型复核，以及失败时谁拥有最终解释权。

因此建议的最小路线是：

1. 先让用户在设置中添加 provider/model，并为每个模型写能力标签：`plan`、`code`、`review`、`cheap`、`vision`。
2. 创建任务时生成“路由快照”，显示默认模型、工作区、权限和预计会话模式。
3. 默认只调用一个模型；用户选择“多模型工作流”后，显示每个阶段的模型和确认按钮。
4. 每个阶段仍由 Harness 执行或通过 Harness 可追溯地启动；Deep Code 不绕过 Harness 直接改文件。
5. 只有在真实 usage/失败/耗时数据稳定后，才增加自动策略；自动策略必须可关闭、可解释、可回放。

“sol 规划、luna 执行”可以作为这个契约的第一个示例名称，但不是产品内部硬编码的两个特殊角色。

## 5. 成本、隐私、兼容性与许可边界

### 成本

- DeepSeek Harness README 将项目标为 developer preview，并警告会发生兼容性破坏；因此 Deep Code 需要 pin/检测 Harness API 版本，而不能假设 `/api/events.mux` 或 event schema 永久不变。
- 多模型路由会扩大 API 调用数、传输 token 和日志量。UI 必须区分“模型返回的 usage”与“本地估算”。
- 玻璃 UI、流式 Markdown 渲染和长历史会增加 Electron CPU/GPU/内存；长回答应继续采用增量渲染、折叠证据和阅读位置保护。

### 隐私

- API key、base URL、工作区路径、任务正文和事件日志应默认留在本机；不要将它们写进公开任务摘要或 Git。
- 把任务路由到其他厂商前，应单独显示“将哪些上下文发送给哪个 provider”；不能因用户设置了一个 API key 就默认把所有工作区内容转发过去。
- `danger-full-access` 等权限配置应在 UI 中明确显示，并且不得被角色卡、回复模式或 planner 隐式修改。

### 兼容性

- DeepSeek Harness 是 developer preview；连接层必须有健康检查、事件 schema 版本检测、断线重连和降级到 durable snapshot 的路径。
- Codex app-server protocol 的 schema 值得借鉴其命名与分层，但不能把 Codex 协议当作 DeepSeek Harness 的兼容协议；Deep Code 需要自己的 DSH Adapter。

### 许可

- [DeepSeek Harness LICENSE（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/LICENSE)：MIT。第三方依赖另见 [THIRD_PARTY_NOTICES.md](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/THIRD_PARTY_NOTICES.md)。
- [OpenAI Codex LICENSE（固定 commit）](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/LICENSE)：Apache-2.0；注意 [NOTICE](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/NOTICE) 与 third-party 依赖义务。
- Deep Code 自己仍可采用 MIT，但“借鉴架构/协议思想”不等于复制代码；若实际复制 Codex 代码或资产，必须把 Apache-2.0 的版权、许可和 NOTICE 义务带入发布物。
- 上游的名称、图标和品牌不能因为开源许可而直接当作 Deep Code 品牌资产；UI 应使用 Deep Code 自己的图标与名称，并保留必要的“基于/连接 DeepSeek Harness”说明。

## 6. 对当前实现的直接工作项

按优先级，建议 Deep Code 下一轮只做这些：

1. 修复 `New Task`：创建并持久化独立 session，切换到新窗口/视图；增加测试，验证旧任务的消息、滚动位置和 live subscription 不被复用。
2. 增加 `TaskRuntime`/`TaskProjection` 的明确类型：`taskId`、`sessionId`、`workspace`、`modelSnapshot`、`status`、`plan`、`resultSummary`、`evidenceRef`。
3. 将“完成了什么 / 修改了什么 / 测试怎样 / 需要用户做什么”做成结果摘要；没有可靠事件时显示“暂无可验证信息”。
4. 增加模型目录和任务级模型快照，但先不启用自动跨厂商路由。
5. 将玻璃风格作为表面层渐进替换：正文区域高不透明度、页眉低视觉重量、状态具有文字+图标+颜色三重表达，并遵守 `prefers-reduced-motion`。
6. 做一次真实 Harness 版本漂移测试：健康检查失败、事件 schema 未知、SSE 断开、session 重启、历史恢复和权限请求都要回到可解释状态。

## 7. 证据与限制

本报告只对上述两个固定 commit 做事实判断。上游仓库持续变化，尤其 DeepSeek Harness 明确处于 developer preview；下次实施前应重新记录 commit、核对 schema，并把新的差异写入适配器测试。Codex 的协议 schema 是优秀的契约设计参考，但不能证明 Deep Code 可以直接调用 Codex server，也不能证明其 UI 产品实现等同于这些开源 schema。
