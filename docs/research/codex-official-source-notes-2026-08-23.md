# Codex 官方源码与协议核查简报（2026-08-23）

## 范围与证据基线

本简报只核查可用于 Deep Code 产品设计的 Codex 协议事实，不评价 Codex 桌面端未公开的内部实现。证据只来自：

- OpenAI 官方仓库 [`openai/codex`](https://github.com/openai/codex)。
- OpenAI 官方开发者文档 [`developers.openai.com`](https://developers.openai.com/)。

源码基线固定为 `openai/codex` commit [`343074d4207d572809bd8cea15f4be1d09d98e0b`](https://github.com/openai/codex/commit/343074d4207d572809bd8cea15f4be1d09d98e0b)，提交时间为 2026-08-22 05:54:43 UTC。下文所有 GitHub 链接均固定到该 SHA，避免 `main` 后续变化导致证据漂移。

## 结论先行

Codex 对 Deep Code 最有价值的不是视觉模仿，而是一套很清晰的客户端投影边界：

1. **Thread 是长期会话容器，Turn 是一次用户请求及其执行生命周期，Item 是可流式展示的最小活动单元。** UI 不应把这些状态混成一段日志。
2. **Plan、整轮 Diff、逐项工具活动、Token Usage、Approval 都有独立事件或类型。** Deep Code 应从 Harness 的官方事件建立类似投影，而不是从助手自然语言里猜。
3. **图片是显式输入，视频不是 `turn/start` 的原生输入类型。** 静默录屏若要进入 Agent，应在本地抽取少量关键帧，经用户确认后作为图片提交。
4. **Usage 是 token 计量，不是货币账单。** 客户端可以显示输入、缓存输入、缓存写入、输出、推理输出与上下文窗口；若要显示金额，只能在明确 provider、模型与当期费率时标为估算。
5. **模型选择、推理强度、服务档位可在 Turn 级覆盖并成为后续 Turn 的粘性设置；后台发生模型改道时有单独事件。** UI 应同时记录“请求模型”和“实际模型/改道原因”，不能静默伪装成原模型。

## Claim → 官方来源

### 1. Thread / Turn 状态

| Claim | 官方来源 |
|---|---|
| `thread/start` 创建新会话，`thread/resume` 恢复已有会话，`thread/fork` 从历史复制出新的 Thread；`turn/start` 才会向指定 Thread 提交输入并启动一次生成。 | [app-server README：基本生命周期](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#L79-L83) |
| Thread 对象包含独立的 `id`、`sessionId`、`forkedFromId`、可选 `parentThreadId`、`cwd`、`status`、`modelProvider`、创建/更新时间与 Turns；只有特定读取/恢复接口才会填充完整 turns。 | [Thread 协议类型](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs#L196-L269) |
| Turn 对象拥有独立 `id`、`items`、`status`、可选错误、开始/完成时间与耗时；`itemsView` 还会说明 items 是未加载、摘要还是完整历史。 | [Turn 协议类型](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs#L347-L383) |
| 一个 Turn 的标准流式生命周期是 `turn/started` → 多个 `item/*` → `turn/completed`；完整活动清单以 `item/*` 为准，不能只依赖 `turn/completed`。 | [Turn events 与 canonical item stream](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#L1616-L1628) |

**可借鉴：** Deep Code 的所有展开状态、审批、工具卡、耗时和错误都应至少按 `session/thread id + turn id + item id` 定位。任务之间不得复用一个全局 `open/loading/error` 状态。

### 2. Plan

| Claim | 官方来源 |
|---|---|
| Agent 分享或更新计划时，app-server 发送 `turn/plan/updated`，负载含 `threadId`、`turnId`、可选说明和结构化 `plan`。 | [Plan notification 类型](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L423-L431) |
| 每个计划步骤只有 `step` 和 `status`；状态是 `pending`、`inProgress` 或 `completed`。 | [Plan step 类型](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L433-L448) |

**可借鉴：** Deep Code 的“正在做什么”应是一个短小的结构化进度板；原始 reasoning、系统上下文和协议日志应收进可展开的技术详情。若 DSH 事件没有结构化 Plan，则产品应明确标注为 Deep Code 的“解释性概括”，不能冒充 Engine 真状态。

### 3. 工具活动与运行详情

| Claim | 官方来源 |
|---|---|
| Command Item 独立提供 command、cwd、来源、状态、解析后的动作、聚合输出、退出码与耗时。 | [CommandExecution item](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L274-L304) |
| MCP Tool Item 独立提供 server、tool、arguments、状态、只读提示、结果、错误与耗时。 | [McpToolCall item](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L312-L332) |
| Command 状态是 `inProgress`、`completed`、`failed` 或 `declined`；MCP Tool 状态是 `inProgress`、`completed` 或 `failed`。 | [工具状态枚举](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L1003-L1011), [MCP 状态枚举](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L1127-L1143) |
| Item 首次出现时发送 `item/started`，随后可有增量，最终发送 `item/completed`；同一个 `item.id` 用于关联。 | [Item 生命周期](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#L1652-L1655) |

**可借鉴：** 普通用户默认看到“正在读取文件 / 运行检查 / 修改 2 个文件 / 已完成”；命令全文、stdout/stderr、JSON 参数和系统提醒留在展开层。展示信息应来自 Item 字段，而非把原始事件整段吐给用户。

### 4. Diff 与 changed files

| Claim | 官方来源 |
|---|---|
| 每当出现 FileChange item，app-server 会发送 `turn/diff/updated`；其中 `diff` 是该 Turn 当前最新的聚合 unified diff，客户端无需自己拼接每个片段。 | [Turn diff event](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#L1618-L1621), [TurnDiffUpdatedNotification 类型](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L412-L421) |
| FileChange item 包含变更数组与应用状态；每个变更明确给出 `path`、`kind` 和该文件 diff。变更类型是 add、delete 或 update（update 可带移动目标路径）。 | [FileChange item](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L305-L311), [FileUpdateChange 类型](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L1062-L1089) |

**可借鉴：** Deep Code 应同时维护两层：面向新手的 changed-files 清单（新增/修改/删除、是否成功），以及可展开的整轮 unified diff。二者都是 Harness 事件的投影，不应以扫描整个工作区替代 Engine 证据。

### 5. Usage 与 cost

| Claim | 官方来源 |
|---|---|
| `thread/tokenUsage/updated` 以 `threadId + turnId` 定位，负载同时提供 Thread 累计 `total`、最近一次 `last` 与可选模型上下文窗口。 | [ThreadTokenUsage 类型](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L1750-L1780) |
| Usage breakdown 区分 total、input、cached input、cache-write input、output 与 reasoning output tokens。 | [TokenUsageBreakdown 类型](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L1792-L1809) |
| 内部 `rawResponse/completed` 可暴露单次上游 Responses API completion 的精确 usage，但它是 internal-only、可为空，而且不同于累计、估算、持久化并可重放的 Thread Usage。 | [rawResponse/completed 语义](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#L1620-L1624) |
| OpenAI 官方模型页按模型分别公布 input、cached input、output 等费率；模型和费率是动态产品事实，不属于 app-server 的每轮事件。 | [OpenAI 官方模型比较页](https://developers.openai.com/api/docs/models/compare) |

**核查结论：** app-server 协议提供 token usage，未在上述 Turn/Thread Usage 事件中提供一个权威的“本轮货币金额”。Deep Code 可以原样显示 token；金额只能根据实际 provider、实际模型、计费身份、缓存规则与当期费率推算，并明确标为“估算”。如果用户通过订阅、企业额度或第三方 provider 使用，简单的 token × API 单价可能并不等于账单。

### 6. Approvals

| Claim | 官方来源 |
|---|---|
| 需要批准的命令或文件修改由 app-server 向客户端发起 JSON-RPC request；官方 UI 指导要求把审批放在当前活跃 Turn 内联展示。 | [Approvals 概览](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#L1714-L1717) |
| 命令审批请求带 `threadId`、`turnId`、`itemId`，并可带环境、原因、命令、cwd、友好动作、额外权限、规则修订建议与服务端允许展示的决定集合。 | [Command approval request 类型](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L1450-L1509) |
| 命令审批支持本次允许、会话内允许、带 exec policy 修订允许、应用网络策略、拒绝或取消；“拒绝”允许 Turn 继续，“取消”会立即中断 Turn。 | [Command approval decisions](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L58-L80) |
| 文件修改审批也区分本次允许、会话内允许、拒绝和取消。 | [File change approval decisions](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L107-L119) |

**可借鉴：** Deep Code 不应把审批做成全局弹窗或一枚模糊的“允许”按钮。必须说清楚：哪一个任务、哪一次操作、在哪个目录、准备做什么、权限会持续多久，以及拒绝与取消的不同后果。Deep Code 仍应映射 DSH 自己的权限/审批契约，不能把 Codex 的枚举直接冒充成 DSH 能力。

### 7. Attachments / images / 静默录屏

| Claim | 官方来源 |
|---|---|
| `turn/start.input` 是判别联合列表，官方 v2 协议包含 text、image、localImage、audio、localAudio、skill 与 mention；没有 video 类型。 | [UserInput 协议类型](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L292-L325) |
| `image` 接受内联 data URL；远程 HTTP(S) 图片会被拒绝，可改用 data URL 或 `localImage`。 | [Turn inputs 说明](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#L889-L897) |
| 用户消息 Item 会保留输入内容类型，Agent 查看本地图片时还会生成独立的 `imageView` Item。 | [Thread items 说明](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#L1632-L1645) |

**可借鉴：** “静默”应解释为默认无麦克风、无实时上传、无持续模型调用，而不是偷偷录制。可控实现是：用户显式开始 → 本地录制短片 → 本地抽取关键帧 → 预览/删除敏感帧 → 确认后将少量图片交给 Harness。GIF 可作为导出或人类回看格式，但不应成为核心 Agent 输入协议；长视频也应先本地分段、抽帧和去重。

### 8. Model routing

| Claim | 官方来源 |
|---|---|
| `model/list` 返回可用模型及其官方排列的推理强度、模型专长、多 Agent 版本、速度/服务档位、默认服务档位与升级元数据。客户端应保留服务端给出的 reasoning effort 顺序。 | [model/list 说明](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#L240-L243) |
| `turn/start` 可以覆盖 model、service tier、reasoning effort、reasoning summary 与 personality；注释明确这些设置会作用于本 Turn 及后续 Turns。 | [TurnStartParams](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L122-L146) |
| 恢复 Thread 时默认使用最近持久化的 model 与 reasoning effort；显式 model/provider/config 覆盖会关闭这条持久化回退。 | [Resume 模型恢复规则](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#L363-L373) |
| 后端把请求从一个模型改道到另一个模型时会发送 `model/rerouted`，包含 `threadId`、`turnId`、`fromModel`、`toModel` 和原因。 | [model/rerouted 说明](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#L1620-L1625), [ModelReroutedNotification 类型](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2/model.rs#L154-L163) |

**可借鉴：** Deep Code 若走“一个 Agent 调度多个 API/provider”的路线，第一版应是透明、规则驱动的 provider/model selector，而不是让另一个昂贵模型 Agent 再调用一层 Agent：

- 保存用户选择的 provider、model 与工作类型偏好。
- 每个 Turn 允许显式覆盖，但界面要说明覆盖是否会影响后续 Turns。
- 记录 requested model、effective model、provider 和任何 fallback/reroute 原因。
- 路由策略先采用确定性规则（能力、是否支持图片、用户预算档、上下文长度、可用凭据），不要让模型额外思考“该叫哪个模型”而再产生一轮隐藏调用。
- 只有在 Harness 事件能确认 usage 时展示精确 token；没有可靠费率映射时不展示伪精确金额。

这里最后三点是基于上述协议事实给 Deep Code 的产品推论，不是 OpenAI 对第三方产品的要求。

## 建议的 Deep Code 采用顺序

### 现在采用

1. `Task/Session → Run/Turn → Activity/Item` 三层投影与稳定 ID。
2. 独立 Plan 面板，默认只展示当前步骤和已完成数量。
3. 友好工具卡：行为、目标、状态、耗时；原始参数/输出折叠。
4. changed-files 清单 + 可展开整轮 diff。
5. Token usage 分解与上下文占用；金额只做可关闭的估算层。
6. 审批卡绑定当前任务和操作，明确一次/会话/拒绝/取消语义。
7. 图片附件；静默短录屏先本地抽帧，不提交视频流。
8. 确定性 provider/model 路由和实际路由证据。

### 暂缓

1. 直接复制 Codex 的私有桌面端实现或品牌视觉。
2. 把 Codex 协议字段硬套成 DSH 事件，即使 DSH 没有等价事实。
3. 持续实时屏幕观看与后台自动上传。
4. 用另一个模型 Agent 决定所有路由，造成隐藏延迟与双重费用。
5. 在 provider、模型、费率或计费身份不完整时显示“精确金额”。

## 一句话架构边界

Deep Code 可以借鉴 Codex 的**投影结构和交互语义**，但执行真相仍属于 DeepSeek Harness：任何 Plan、Tool、Diff、Usage、Approval、Attachment 和 Routing 面板，都必须能回指 Harness 的实际 Session/Event/Capability；缺少上游事实时，应标为本地解释或不可用，而不是补造第二套运行真相。
