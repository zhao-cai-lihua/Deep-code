# Deep Code 下一阶段产品与架构战略（2026-08-31）

状态：规划草案。本文只确定产品边界、阶段顺序和验收信号，不代表功能已经实现。

## 一句话定位

Deep Code 不是 DeepSeek Harness 的导航页、聊天皮肤或第二个 Agent Loop。它是建立在官方 Harness 之上的本地 Agent 控制台，让不熟悉工程术语的项目所有者能够：

> 接入任意可用模型服务，理解 Agent 正在做什么，作出有后果意识的决定，验证实际结果，并在失败时恢复。

面向同类产品时，Deep Code 不以“模型更多、Agent 更多、自动化更激进”竞争，而以四项可检验体验竞争：

1. **能接入**：从空白电脑到可用 Provider，不要求编辑 YAML 或打开终端。
2. **能理解**：系统上下文、工具、权限、计划和最终回答各归其位，并被翻译成人话。
3. **敢决定**：批准、提问、模型、费用与影响在行动前可见，不以角色或自动路由替用户决定。
4. **能恢复**：停止、重试、换模、回到先前 Turn、修复配置都有明确原因、证据和下一步。

## 先纠正当前 Provider 缺口

当前 Deep Code 的多 API Key 功能只完成了凭据管理：它能发现**已经存在且激活**的 Harness Provider Profile 所声明的 `apiKeyEnv`，再通过 `credentials.describe/set/unset` 显示或写入 Key。它还不能创建 Provider Profile，因此普通用户无法在 Deep Code 中从零添加 OpenAI、Anthropic、GLM、Qwen 或自定义网关。

正确的闭环应复用 Harness 已有配置协议：

```text
llm.providers
  -> 已配置、未配置和自定义 Provider 目录
settings.describe
  -> 设置 namespace、settingsPath、schema、脱敏值和 revision
llm.discoverModels
  -> 使用未保存的 Endpoint / Protocol / Key 探测候选模型
settings.mutate
  -> 以最小 path op 创建或修改 Provider Profile
credentials.set
  -> Key 单向进入 Harness Credentials
llm.models / credentials.describe
  -> 重新读取并确认真实激活状态
可见验证任务
  -> 明示可能消耗少量 token，验证真实模型调用
```

Deep Code 不直接请求厂商模型 API，不自行保存 Key，不直接编辑 Harness YAML，也不自建 Provider 注册表。

### “添加模型服务”向导

入口名称采用普通人能理解的“添加模型服务”，高级区再显示 Provider、Route、Protocol 与 Endpoint。

#### 路线 A：Harness 已知 Provider

1. 从 `llm.providers` 的休眠条目中选择 OpenAI、Anthropic 或其他上游目录项。
2. 从 Provider 所属 `settingsNs/settingsPath` 读取它的真实 schema 和默认值。
3. 用户填写 API Key；Base URL 等高级字段默认折叠。
4. 可调用 `llm.discoverModels` 展示上游实际报告的模型，用户确认要启用的列表。
5. 使用带 `expectedRevision` 的 `settings.mutate` 写入最小 Profile 变更，再通过 `credentials.set` 单向保存 Key。
6. 重新读取 Provider、模型与凭据状态；只有真实 active 且目录可读才显示“已添加”。

#### 路线 B：自定义 OpenAI-compatible 服务

用于 GLM、Qwen、第三方网关、本地服务或 Harness 当前目录尚未内置的厂商。表单至少包含：

- 服务名称；
- 稳定 route id；
- Base URL；
- Harness schema 实际公布的协议选项；
- 可选 API Key；
- `llm.discoverModels` 发现或用户确认的模型列表。

保存顺序与官方语义一致：先创建 Profile，再保存凭据。两者不是一个原子事务，因此如果 Profile 成功、Key 失败，界面必须显示“服务已创建，凭据尚未保存”，并只重试 Key，不能重新创建或谎称全部失败。

#### 路线 C：非 API Key 认证

OAuth、AWS Bedrock、Vertex ADC、Azure 多字段认证和本地无密钥服务不得伪装成 API Key。第一版显示上游提供的配置状态与说明；只有 Harness 暴露稳定授权或设置 seam 后才增加对应向导。

### Provider 生命周期

“添加”不是完成定义。模型服务中心还必须提供：

- 已配置 / 未配置 / 已激活 / 凭据缺失 / 只读来源 / 验证失败；
- 编辑 Endpoint、模型列表和显示名称；
- 更换或清除 Key；
- 删除用户创建的 Profile；
- 删除时先清除由本页面管理的凭据，再 `settings.mutate unset` Profile；两步均可重试；
- 显示 Profile 来源和 Harness namespace，不泄露 Key；
- 创建一个用户可见、可停止、明确计费的真实验证任务。

## Deep Code 的差异化核心：四问闭环

行业通用功能会迅速同质化。聊天、主题、模型下拉框、MCP、Skills、插件列表和多 Agent 都是必要能力，但不能成为唯一卖点。Deep Code 的产品内核应围绕每一轮 Agent 工作的四个问题：

### 1. 开始前：它准备做什么？

- 当前工作区与范围；
- 当前实际 Provider / Model / Effort；
- Harness 权限和审批模式的人话解释；
- 上游 Plan 存在时，展示预计改动、命令、外部影响和待决定项；
- 无上游结构化 Plan 时明确说“尚无可验证的影响预览”，不从模型散文猜。

### 2. 运行中：现在发生了什么？

- 一条紧凑时间轴区分排队、模型生成、工具执行、等待用户和结果整理；
- Conversation 只显示人的消息、最终回答、Decision Gate 和重要失败；
- Think、Skill、Glob、Read、Shell、Web 等公开过程摘要收进一个可展开的过程行；
- 不声称展示私有思维链；
- 停止按钮始终可达，等待用户时输入稳定且不消耗模型 token。

### 3. 结束后：实际完成了什么？

每一轮生成一张“工作收据”，只依据 Harness 事实：

- 文件与依赖改动；
- 测试、检查、构建及明确退出状态；
- 未验证或证据不足的部分；
- 权限与外部副作用；
- 实际模型、推理强度、用量和来源；
- 可展开的原始证据入口。

对“审查另一个本地项目”这类任务，工作收据升级为项目所有者可以行动的审查视图：问题严重度、证据位置、用户影响、推荐处理、仍需项目所有者决定的事项，以及明确的“本轮没有修改文件”。

### 4. 失败后：怎样安全回来？

- 认证、网络、限流、模型能力、权限、工作区、Engine 版本和协议不匹配使用统一错误分类；
- 每张错误卡固定回答“发生什么、为什么、怎么修、能否重试、技术证据”；
- 对接 Harness 的 Session / Turn fork 或恢复 seam 时提供“回到这一轮之前”；
- 不自造文件快照或第二个 git 真相；
- 重试区分重连、重发、换模、补凭据和恢复问题，不把所有失败都做成同一个按钮。

这四问是 Projection Kernel 的稳定产品合同。以后上游换模型、加 MCP、加多 Agent 或改变事件格式，用户心智模型仍然不变。

## 建议架构

```text
Electron Product Shell
  |-- Workspace / Task navigation
  |-- Provider & Ecosystem control centers
  |-- Conversation + right inspector
  |
DSH Adapter (versioned anti-corruption layer)
  |-- capability negotiation
  |-- settings / credentials / models
  |-- session / turn / item / attachment
  |-- approvals / questions / permissions
  |-- usage / timing / terminal evidence
  |
Projection Kernel (local, deterministic, zero model calls)
  |-- Conversation Projection
  |-- Plan / Impact Projection
  |-- Run / Timeline Projection
  |-- Outcome / Work Receipt Projection
  |-- Recovery Projection
  `-- Usage / Cost-source Projection
  |
Interaction Contracts
  |-- Decision Gate
  |-- stop / retry / reconnect
  |-- checkpoint / fork
  `-- visible validation task
  |
Official DeepSeek Harness Engine
  `-- sole execution, permission, model, tool and session truth
```

产品模板（审查项目、解释项目、修复 Bug、部署应用）只生成用户可见的任务草稿和验收结构，不切换模型、不提升权限、不注入隐藏长期人格。

## 行业能力的采用边界

### 应采用

1. **App-server / protocol-first**：把桌面 UI 与 Agent Loop 分开，以结构化 thread/turn/item 事件驱动投影。
2. **Provider 与模型可插拔**：通过 Harness Adapter 与 settings schema 接入，不在 Deep Code 维护厂商 SDK 集合。
3. **结构化 Plan、Approval、Diff、Usage、Checkpoint**：只有上游事实存在时展示。
4. **Skills / MCP / Plugin 控制台**：区分说明包、外部服务和可执行 Bundle，并展示来源、权限、作用域与真实激活状态。
5. **后台任务与多会话**：先提供清楚的状态、停止和恢复；不默认并发多个高成本 Agent。
6. **多模态附件**：保持草稿原子性、模型能力错误和可恢复重发。
7. **能力协商与版本矩阵**：按 Engine 实际支持的 RPC/事件启用界面，不按版本字符串臆测全部能力。

### 暂不采用

1. 自动识别“最强模型”并替用户切换；
2. 默认的规划模型 -> 执行模型 -> 验收模型多次调用；
3. 为展示热闹而做多 Agent 团队图；
4. 自建 Agent Loop、权限、审批或文件快照；
5. 以角色卡或亲密程度改变工具与费用策略；
6. 未知价格、token、上下文占用和完成度的估算数字；
7. 仅凭 GitHub 星数的一键安装；
8. 为追热点直接复制某个竞品的 UI 与协议私有细节。

## 紧跟行业而不被行业拖着跑

建立一条 Upstream Radar，而不是不断人工浏览新闻：

1. **固定基线**：每个 Deep Code Release 记录 supported Harness tag、tested commit、RPC capability snapshot 和降级行为。
2. **最新 canary**：定期拉取官方 Harness 最新 tag/commit，运行只读协议契约测试；失败只生成报告，不自动升级用户 Runtime。
3. **能力清单**：按 Provider settings、usage、permissions、checkpoint、MCP、Skills、attachments 等 seam 记录 `supported / provisional / unavailable`。
4. **竞品观察**：只读 Codex、Claude Code 等官方 changelog、协议或源码；每项变化先回答“它解决了用户哪一类困难”和“DSH 是否已有事实 seam”。
5. **采用闸门**：只有同时满足真实用户问题、上游事实、可恢复交互、自动测试和维护成本可承受，才进入产品。

## 实施顺序

### M0：先把能处理密钥的应用变得可信

- 清洗第三方插件安装和设置辅助子进程的环境变量；
- 收紧 Electron 导航与 preload 注入目标；
- 固定自动安装到已验证 Harness tag/commit；
- 保存当前累计工作为可回滚提交；
- Release 增加 SHA-256 和版本一致性检查。

验收：没有 Key 泄漏到第三方构建进程；App 只加载自身页面；全量测试和 Windows 包通过。

### M1：模型服务中心

- 接入未激活 Provider、settings namespace/schema/revision；
- 已知 Provider 添加向导；
- 自定义 OpenAI-compatible 向导；
- `llm.discoverModels` 模型发现；
- Profile + Credential 部分成功恢复；
- 编辑、删除、验证闭环。

验收：用户不打开终端或 YAML，可以添加一个目录内 Provider和一个自定义兼容端点；App 重启后仍由 Harness 报告真实可用。

### M2：可理解的项目控制

- 顶部上下文栏：工作区、实际模型、权限、Engine；
- 一轮一个过程折叠行；
- 右侧检查器承载当前运行、结果、证据、恢复和用量；
- 项目审查 / 项目解释模板；
- 工作收据和结构化审查视图。

验收：非程序员能回答“Agent 在做什么、改了什么、验证了吗、我下一步该决定什么”。

### M3：恢复优先

- 统一错误分类与恢复中心；
- Harness fork/resume/checkpoint 可用性对齐；
- 权限预设的人话映射；
- 真实 usage 与耗时阶段；
- 增量渲染和长会话性能基线。

验收：常见失败不需要打开终端；恢复动作不重复发送或丢失用户输入；费用未知时明确未知。

### M4：生态与持续兼容

- 已安装 Skills / MCP / Plugin 分栏；
- 安装、禁用、卸载、升级、重启验证和回滚；
- supported + latest-canary Harness 契约矩阵；
- 兼容性报告与可选择升级；
- 仅在上述闭环稳定后考虑多会话后台监控。

验收：上游更新不会静默破坏新手工作流；生态操作有来源、权限、作用域和恢复点。

### M5：最小 Soft Harness 实验

只在工程控制闭环成熟后，做可开关、可测量、零权限提升的互动认识论实验：竞争解释、一个高信息价值问题、待审阅记忆更新。默认不增加额外模型调用；没有可见体验优势就删除。

## 北极星指标

不使用“功能数量”作为进度。每个版本至少测量：

- 空白电脑到首个成功任务的时间；
- 添加一个模型服务需要的步骤和失败恢复率；
- 用户能否正确说出当前工作区、模型和权限；
- 每轮“有证据完成 / 明确未验证 / 可恢复失败”的覆盖率；
- Decision Gate 输入丢失率与超时误取消率；
- 失败后无需终端即可恢复的比例；
- 上游新版本发布到 canary 结果的时间；
- Deep Code 自身新增的隐藏模型调用数，目标默认始终为零。

## 当前决策

下一版本不继续增加角色、自动路由或多 Agent。先完成 M0，然后实现 M1 的完整模型服务中心。M2 的“工作收据 + 项目审查视图”是第一项真正面向差异化的产品能力；它以猫箱审查作为真实验收项目，但不把猫箱的私有内容写入公开仓库或固定模板。
