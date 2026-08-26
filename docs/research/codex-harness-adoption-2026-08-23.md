# Codex Harness / App Server 对 Deep Code 的采用边界

日期：2026-08-23
范围：只读核查 OpenAI 官方文档与 `openai/codex` 官方源码，并与 Deep Code 当前代码和既有研究对照；不把 Codex 协议当成 DeepSeek Harness 协议，不建议在 Electron 内另造执行状态。
固定源码参考点：`openai/codex` `main` = `343074d4207d572809bd8cea15f4be1d09d98e0b`（本次以 `git ls-remote` 核实；该提交时间为 2026-08-22 05:54:43 UTC）。

主要一手入口：

- [官方 Codex App Server 文档](https://developers.openai.com/codex/app-server/)
- [固定 commit 的 app-server README](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md)
- [固定 commit 的 app-server v2 protocol](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/src/protocol/v2.rs)
- [固定 commit 的 v2 JSON schemas](https://github.com/openai/codex/tree/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/v2)
- [官方 Codex Configuration Reference](https://developers.openai.com/codex/config-reference/)
- [官方 Codex Security 文档](https://developers.openai.com/codex/security/)
- [官方 Codex Models 文档](https://developers.openai.com/codex/models/)

## 结论

Deep Code 最值得借鉴的不是 Codex 的一组像素，也不是把 Codex 再包进 Harness，而是它的**客户端投影契约**：Engine 把 thread、turn、item、approval、diff、usage、model 等事实分开发布，桌面端只把这些结构化事实重新组织为人能看懂的界面。官方将 app-server定位为支撑丰富客户端的开放接口，并把认证、会话历史、审批和流式事件作为深度集成的核心能力；这正好验证了 Deep Code 当前“Engine 是执行真相、DSH Adapter 是协议翻译层、Renderer 只读 projection”的方向。[来源：Codex App Server 文档](https://developers.openai.com/codex/app-server/)

因此建议继续做 Deep Code 原先的产品，而不是做“多 Agent 指挥台”：

> 一个普通人只需描述目的，Deep Code 就能在一个任务页面中显示当前进度、需要决定的事项、实际改动、验证结果、模型与消耗；长技术证据默认折叠，但每一项解释都能追溯到 Harness 的正式事件。

Codex 提供的是成熟的**信息分区样本**；Deep Code 必须用 DSH Adapter 映射 DeepSeek Harness 的 durable history、mux stream、presenter、approval/question 和 provider catalog。字段不存在时显示“Engine 未提供”，绝不根据 Agent 的自然语言猜测成功、改动、权限或费用。

## 当前 Deep Code 已经具备的地基

只读检查当前仓库后，已有能力包括：

- `Workbench Task -> Harness sessionId` 的一对一绑定，新任务不复用旧 Session。
- `session.history`/`session.list` 作为 durable snapshot，`events.mux` 只承载暂态 live activity、draft、queue 和待答 Decision Gate。
- `assistant/chunk` 只作为未定稿文本，`assistant/message` 才进入正式回答。
- Harness presenter 已被投影为 diff、terminal、read、search、web Tool Card；已能汇总已确认的 changed files、工具结果、耗时与权限上下文。
- 审批、结构化问题和 plan review 经 DSH Live Session 映射，wire id 不进入 Renderer。
- `llm.providers`、`llm.models` 与凭据存在状态已经形成只读 Model Connection Snapshot。

当前明显缺口是：没有一个稳定的 **Turn Summary/Outcome** 结构；普通界面没有独立的 plan 状态；没有 token/usage 事实；没有任务级“实际模型/路由变化”事实；附件尚未进入 DSH Adapter。也就是说，证据已经不少，但仍主要藏在 Run Details 中，用户很难一眼回答“现在做到哪、改了什么、花了多少、还要我做什么”。

## 逐项采用判断

### 1. Thread / Turn / Item：直接借鉴分层，不能复制协议

Codex 明确把 Thread 定义为多轮对话容器、Turn 定义为一次用户到 Agent 的执行、Item 定义为该 Turn 中持久化的用户输入与 Agent 输出；新的客户端用 `thread/start`、`thread/resume`、`thread/fork`、`turn/start` 和 `turn/interrupt` 驱动生命周期。Turn 从 `turn/started` 到 `turn/completed`，其中 Item 遵循 `item/started -> delta -> item/completed`，并以 threadId/turnId/itemId 关联。[来源：固定 commit 的 Core Primitives 与 Lifecycle](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#core-primitives)

**可直接借鉴的思想**

- Task 是用户可见容器，Engine Session 是持久执行容器，Turn 是一次运行，Tool Card/Answer/Plan 是 Turn 内不同项目。
- live delta 不进入 durable transcript；终态消息替换草稿。
- 所有暂态 UI 必须按 Task/Session 隔离，这与已经修复的展开状态串联问题属于同一原则。

**需适配 DSH Adapter**

- DSH 现有 `session.create/prompt/history/list/cancel` 与 `turn/start`、`turn/end` 可以形成 `TaskRunSnapshot`，但不能把 Codex 的 `threadId/turnId/itemId` 字段名硬塞给 Harness。
- Deep Code 当前只为活动任务维护一条 `DshLiveSession`；以后若做多任务后台状态，应增加按 sessionId 管理的订阅器，而不是在 Renderer 轮询每张卡片。

**现在不做**

- Codex 的 fork、archive、section、project 数据库和分页历史是成熟期能力。DSH 没有对应 durable 契约前，不在本地复制 Session 历史伪造“分支任务”。

### 2. Plan：采用独立信息域，不展示/推断思维链

Codex 把计划作为独立事件 `turn/plan/updated`，每一步只有 `step` 和 `pending | inProgress | completed`，并可带简短 explanation；它与 reasoning item、agent message 和 turn status 是不同的协议域。[来源：固定 commit 的 Turn events](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#turn-events)、[TurnPlanUpdated schema](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/v2/TurnPlanUpdatedNotification.json)

**可直接借鉴的思想**

- “计划”只表达承诺与进度，不是 private reasoning。
- 普通界面默认只显示当前一步、已完成数量和是否等待用户；完整步骤可展开。
- 计划变化与最终回答分开，不让长回复承担进度 UI 的职责。

**需适配 DSH Adapter**

- 当前 DSH Live Session 能识别 plan-review 问题，但这不等同于持续 plan stream。
- 只有 Harness 的正式 goals/plan/query/event 能生成步骤状态；若只有一张 plan-review 卡，就只显示“有一份计划等待审阅”，不能把回答里的编号列表解析成计划。

**现在不做**

- 不提示模型为了 UI 强制输出一份 JSON 计划；那会消耗额外 token，也会制造第二套不可靠状态。
- 不展示 reasoning delta 或 system-reminder 作为“Thinking”。Deep Code 应展示活动事实和简短状态，不展示隐私推理。

### 3. Tool Activity：采用 item 生命周期和终态权威

Codex 将 commandExecution、fileChange、MCP call、web search 等建模为不同的 ThreadItem；命令项包含 cwd、status、聚合输出、exitCode 和 duration，文件项包含 path、kind、diff 与 status。流式 output delta 用于现场反馈，但最终 `item/completed` 才是权威结果。[来源：固定 commit 的 ThreadItem 与 Items](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#items)

**可直接借鉴的思想**

- 一张工具卡有稳定 id 和 `working/completed/failed/declined` 生命周期。
- 主界面显示人话标题、目标、状态和耗时；命令全文、stdout/stderr、原始 presenter 留在证据层。
- 工具能力提示与执行结果分开：例如“可写”不代表“真的写了”。

**需适配 DSH Adapter**

- 继续优先信任 DSH 的 `{for, view}` official presenter；tool-name regex 只作降级。
- 把当前活动和 durable Tool Card 用 callId/seq 对齐，避免 live 中一条“工具返回”与历史中另一张具体卡并列成两次操作。

**现在不做**

- 不把普通 shell 输出直接塞进回答气泡；不让 Renderer 解析命令并自行判定风险或成功。

### 4. Diff / Changed Files：采用聚合快照思想，DSH presenter 仍是真相

Codex 在每次 FileChange 后发布 `turn/diff/updated`，其中 diff 是该 Turn 当前完整的统一 diff 快照，客户端无需自行拼接片段；单个 fileChange item 仍带 path、kind、diff 和最终 status。[来源：固定 commit 的 Turn diff event](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#turn-events)、[TurnDiffUpdated schema](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/v2/TurnDiffUpdatedNotification.json)

**可直接借鉴的思想**

- “本轮改了什么”是一等结果，不是技术日志尾注。
- 文件数、增加/修改/删除与测试结果应出现在回答旁边；完整 diff 再展开。
- 只统计最终成功的 file change；失败或 declined 保留在活动中但不算已完成改动。

**需适配 DSH Adapter**

- 当前 `conversation-projection.cjs` 已从成功的 official diff presenter 生成 changedFiles，这是正确起点。
- DSH 若没有 turn-level consolidated diff，就按 presenter 卡展示每次真实 diff，不能通过读取 Git working tree 替代 Harness 事实；工作区可能在 Turn 外还有用户改动。

**现在不做**

- 不用 `git diff` 反推“Agent 改动”；它无法可靠归因，非 Git 工作区也不可用。

### 5. Usage / Cost：采用事实和估算分离，先显示 token 再谈钱

Codex 把 usage 与消息、plan、diff 分开，通过 `thread/tokenUsage/updated` 报告当前 Turn 与累计 token breakdown；字段包括 input、cached input、output、reasoning output、total 以及可空的 context window。恢复持久 Thread 时也可重放已持久 usage。[来源：固定 commit 的 app-server usage 说明](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#turn-events)、[ThreadTokenUsageUpdated schema](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/v2/ThreadTokenUsageUpdatedNotification.json)

**可直接借鉴的思想**

- 显示“本轮”和“本任务累计”，而不是只显示余额焦虑。
- provider 返回的 usage 是事实；货币金额是按 provider/model/计费表计算的估算，必须标注时间和币种。
- 启动 Engine、读取目录和查看本地历史与模型调用分开记账。

**需适配 DSH Adapter**

- 先调查 DSH durable events/provider response 是否稳定带 usage，再增加 `usage: {source, last, total, contextWindow}`。
- DSH 没给 usage 时显示“当前 Engine 未提供用量”，不能按字数粗估成事实。

**现在不做**

- 不抓各厂商网页余额，不把多个 provider 的 token 简单相加成一个“额度百分比”；不同模型、缓存与计价不可直接比较。

### 6. Approvals：采用结构化 Decision Gate，继续让 Harness 决定

Codex 的命令和文件修改批准都是服务端请求：客户端先获得 proposed command/file change，再收到 requestApproval，返回 accept/acceptForSession/decline/cancel 等结构化决定，最后等待 item/completed 成为执行结果。服务端还会发送 resolved 清理悬挂请求。[来源：固定 commit 的 Approvals](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#approvals)、[官方 Codex Security 文档](https://developers.openai.com/codex/security/)

**可直接借鉴的思想**

- 决策卡要说明动作、目标、影响、持续范围和可选决定。
- approval requested、client response、resolved、item completed 是四个阶段；“已允许”不等于“已执行成功”。
- UI 只展示服务端实际提供的 decisions；安全默认值不能由角色卡或模型文本改写。

**需适配 DSH Adapter**

- 当前 Deep Code 已实现一次性允许/拒绝，方向正确；下一步可把 DSH 实际提供的命令、路径、reason 和 scope 投影得更具体。
- 若 DSH 没提供 session-level grant，就不能仿造“本任务一直允许”。

**现在不做**

- 不移植 Codex 的 permission profile/auto-review/guardian 机制；那是另一执行器的政策系统。

### 7. Attachments / Images：借鉴输入体验，实际传输必须走 DSH attachment

Codex `turn/start` 的用户输入是多模态列表，可包含 text、inline image、localImage、audio、localAudio；远程 HTTP 图片不被直接接受。模型目录还通过 input modalities 宣告 text/image/audio 能力。[来源：固定 commit 的 turn input 文档](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#start-a-turn)、[ModelList schema](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/v2/ModelListResponse.json)

**可直接借鉴的思想**

- 附件是用户消息的一部分，有本地预览、删除、发送确认、模型能力检查和失败状态。
- 本地路径/数据不应被 Renderer 当成远程 URL 自动加载；发给模型前必须显式确认。
- 图片能力属于模型目录，不应靠模型名猜测。

**需适配 DSH Adapter**

- Deep Code 应使用 DSH 的 durable attachment 创建/引用契约，把附件 id 作为 `session.prompt` content block 发送；不能把 Codex 的 `localImage` wire shape 传给 DSH。[来源：固定 commit 的 DeepSeek Harness attachment subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/subsystems/attachment.md)
- 截图和无声短录屏抽帧可复用同一图片附件管线；GIF 可作为本地抽帧来源，但不应作为普通用户首选输入。

**现在不做**

- 不做持续实时屏幕流、不把长视频或 GIF 原样塞进每轮上下文、不默认录音。当前应先完成静默短录屏 -> 本地抽关键帧 -> 用户确认 -> 图片附件。

### 8. Model Routing：采用透明路由记录，不采用隐藏多 Agent

Codex 的 `model/list` 把模型、reasoning efforts、service tiers 和能力作为目录；Turn 可以显式覆盖 model 等配置，`model/rerouted` 会报告 fromModel、toModel 和 reason。官方模型文档也把模型选择视为质量、速度和用量之间的显式取舍。[来源：固定 commit 的 model/list 与 model/rerouted](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server/README.md#api-overview)、[ModelRerouted schema](https://github.com/openai/codex/blob/343074d4207d572809bd8cea15f4be1d09d98e0b/codex-rs/app-server-protocol/schema/json/v2/ModelReroutedNotification.json)、[官方 Codex Models 文档](https://developers.openai.com/codex/models/)

**可直接借鉴的思想**

- 任务创建时记录“请求模型”；运行记录中显示“实际模型”；发生 fallback/reroute 时说明原因。
- 一个 Agent 可以通过统一 provider adapter 使用不同 API，但一次 Turn 默认只有一个明确模型。
- 自动路由必须可关闭、可解释、可审计；先积累真实 usage/耗时/失败数据，再决定自动策略。

**需适配 DSH Adapter**

- 当前只读 Model Connection Snapshot 已有 provider/model 目录；下一步需要 DSH 官方的 prompt 级 model override 和实际 provider/model 事件，才能做任务级选择。
- 若 DSH 只支持 profile 级默认模型，Deep Code 应展示该限制，不能绕过 Harness 直接调用第二家 API 修改文件。

**现在不做**

- 不采用“规划 Agent + 执行 Agent + 复核 Agent”默认链。每多一个 Agent 通常意味着额外模型调用、上下文复制、权限协调和失败面；用户已经明确偏向一个 Agent 调度多个 API，Deep Code 应先做单执行真相下的透明 provider/model 路由。
- 不照搬 Codex 特有的登录、套餐、service tier 或 safety reroute 产品语义。

## 最多三个下一实现切片

### 切片 1（P0，可独立验收）：Turn Outcome Strip

在每个最终回答旁放一条默认可见、最多两行的“本轮结果”，只使用现有 DSH 事实：

- 状态：处理中 / 等待你 / 已完成 / 已停止 / 失败 / 状态未知。
- 耗时：有正式 turn start/end 才显示。
- 改动：成功变更的文件数量，点击进入现有 diff Tool Card。
- 工具：成功/失败数量。
- 下一动作：若有 Decision Gate 显示“需要你回答/批准”；否则不编造。

验收标准：给定固定 Harness event fixtures，projection 产生确定的结构；任务 A/B 完全隔离；失败工具不计入成功；没有可靠字段时显示未知而不是猜测；Renderer 不读取 raw wire shape。该切片无需上游新 API、无需模型调用、无需 UI 大改，可单独完成和回归。

### 切片 2（P0/P1）：图片附件与静默问题录制

先做文件选择/剪贴板图片 -> 本地预览 -> DSH durable attachment -> 当前消息发送；再在同一管线上增加最长约 30 秒的静默录屏、本地抽关键帧和逐帧确认。发送前检查模型图像能力；不支持时在本地阻止并解释。GIF 只作为可选的“抽帧来源”，不成为主按钮。

验收标准：未点击发送不进入 Harness；切换任务附件草稿不串；不支持视觉的模型不会收到图片；删除草稿后无残留引用；视频本体不上传，只有用户确认的帧进入附件列表。

### 切片 3（P1，先探测再实现）：Execution Contract 与真实 Usage

为每个 Task/Turn 投影一个只读执行契约：workspace、请求 provider/model、实际 provider/model、权限摘要、usage source；若 Harness 有稳定 usage 则展示本轮/累计 token，若无则明确“Engine 未提供”。路由 MVP 只允许用户显式选择一个 provider/model；自动路由等有真实数据后再做。

验收标准：任务中途发生实际模型变化时有可审计记录；没有 provider usage 时不显示金额；Engine 启动和只读目录检查保持零模型调用；任何模型选择仍经 Harness 正式 seam。

## 现在明确不进入路线图的 Codex 能力

- 默认多 Agent、子 Agent 树、mailbox 和协作工具 UI。
- Codex app-server 作为第二 Engine，或 Deep Code 同时直连 Codex 与 DSH 并让两者都能写工作区。
- reasoning 原文、system reminder 或全量协议 payload 的常驻展示。
- 从 Git working tree、回答文本或进程日志反推执行真相。
- 持续屏幕监控、默认麦克风、长视频原样上传。
- 未经用户确认的跨厂商自动路由与隐藏 API 花费。

## 最终产品判断

Deep Code 原先最有价值的设想仍然成立：它不是“官方 Harness 的入口”，而是 Harness 之上的普通人产品。Codex 证明，一款成熟 agent 客户端的核心不是聊天框，而是把执行拆成可恢复的任务、可理解的当前状态、结构化的决定、可核验的改动和透明的消耗。

短期最成熟的路径不是增加更多 Agent，而是先把已有 DSH 事实抬到用户看得见的位置：**回答负责解释，Outcome Strip 负责结论，Decision Gate 负责选择，Tool Card 负责操作，Evidence Drawer 负责审计，DSH Adapter 负责兼容，Harness 负责执行。**
