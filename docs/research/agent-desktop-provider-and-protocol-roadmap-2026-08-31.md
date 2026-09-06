# Deep Code 下一阶段：多 Provider、Agent 桌面协议与差异化路线

> 调研快照：2026-08-31（Asia/Shanghai）
> 研究范围：DeepSeek Harness、OpenAI Codex、Anthropic Claude Code，以及只对当前产品有直接价值的 MCP / A2A 协议。
> 证据规则：产品事实只引用官方文档、官方仓库固定 commit 或正式协议；本文是架构建议，不把上游实验接口写成稳定承诺。

## 结论

Deep Code 不应继续做“只管理 Harness 中已经存在的 API Key”，也不应转向维护一套跨厂商模型能力数据库。正确的下一步是实现一个 **Provider Provisioning Adapter**：通过 Harness 已经公开的设置、凭据和模型发现 seam，让用户在 Deep Code 内完成“添加 Provider → 写入密钥 → 发现或填写模型 → 选择模型与 effort → 验证一次真实请求”。

Deep Code 的长期定位也不应是“又一个聊天壳”或“比所有模型更懂路由的元 Agent”，而应是：

> **跨模型 Harness 的可解释桌面控制面：让普通用户看懂当前 Provider、模型、费用、权限、进度、文件改动、失败原因和恢复路径，同时始终以 Harness 为执行真相。**

多 Provider 是必须补齐的产品基础，却不是壁垒。真正难复制的部分是持续可靠的：

```text
Harness 事实
  → 版本化协议适配
  → Thread / Turn / Item 级状态隔离
  → 人话进度、Outcome、Evidence、Recovery
  → 用户可见的费用、权限、来源和下一步
```

## 1. 上游快照与许可边界

| 上游 | 固定快照 | 状态 / 许可 | 对 Deep Code 的约束 |
| --- | --- | --- | --- |
| DeepSeek Harness | `0a53fb55bea101816fa226bb964ae2bed71c343b`，仓库版本 `0.1.2-alpha.2` | MIT；仍是 alpha / Developer Preview | 可以复用正式设置与凭据 seam，但必须固定兼容版本、做能力探测和 canary，不应把当前字段形状视为永久 ABI。[package.json](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/package.json)；[MIT License](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/LICENSE) |
| OpenAI Codex | `d58d0e5841e0de08e251673db2d5af8cf3a1ad51` | Apache-2.0；许可证不授予 OpenAI 商标权 | 可研究和在遵守 License / NOTICE 的前提下改编代码；不要冒用 Codex / OpenAI 名称或资产。[License](https://github.com/openai/codex/blob/d58d0e5841e0de08e251673db2d5af8cf3a1ad51/LICENSE) |
| Anthropic Claude Code | `f1af9b1f4b1fd4c776135381606edada82ef638e` | 官方公开仓库标明 `All rights reserved`，使用受商业条款约束 | 只能借鉴官方文档公开的产品契约，不把仓库、UI 资产或实现当成可复制的开源代码。[License](https://github.com/anthropics/claude-code/blob/f1af9b1f4b1fd4c776135381606edada82ef638e/LICENSE.md) |

## 2. 用户直接添加其他厂商 API Key：应该接哪一层

### 2.1 Harness 已经有两条正式产品路径

官方模型配置页已经支持：

1. **Add provider**：从已安装 catalog 选择 OpenAI、Anthropic 等 Provider；catalog 提供 endpoint、协议和模型列表，用户提供相应凭据。
2. **Add a custom provider**：为公司网关、自托管服务或 catalog 尚未收录的厂商填写永久 Provider ID、显示名、Base URL、API protocol、凭据和至少一个模型。

Provider ID 一旦保存即是稳定身份，因为请求、Session、默认模型和 credential reference 都会引用它；重命名应新建 Provider，而不是原地改 ID。自定义模型默认只视为文本模型，图片能力必须由配置显式声明，不能靠名字猜测。[官方 Provider 指南（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/docs/user/guide/providers.md)

这意味着 Deep Code 不需要自己发明 GLM、Qwen、Claude、OpenAI 的统一运行时。它只需把 Harness 已有的配置能力完整接出来：

- OpenAI / Anthropic 等出现在安装目录中的 Provider：走 catalog adoption。
- GLM / Qwen 若出现在当前 Harness catalog：同样走 catalog adoption。
- 未进入 catalog、私有网关、自部署服务或 OpenAI-compatible 端点：走 custom provider declaration。
- Azure、Bedrock、Vertex、Codex OAuth 等复杂认证：展示并进入各自的 native authorization flow；不能假装“填一把 API Key”就完成配置。官方指南明确区分了 API Key、AWS 凭据与 Region、ADC Project、Azure `api-version` 和 OAuth。[官方 Provider 指南](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/docs/user/guide/providers.md)

### 2.2 Deep Code 当前缺少的是“配置创建”，不是“凭据写入”

当前实现从 `llm.providers` 和 `settings.describe` 反推出活跃 Profile 的 `apiKeyEnv`，然后调用 `credentials.set / unset`。因此只能管理 **已经存在且已经激活** 的 Provider。

官方 Web UI 采用的完整 Host 操作是：

| 操作 | 用途 | 官方实现证据 |
| --- | --- | --- |
| `llm.listProviders()` | 读取当前已注册、可运行的 Provider | [Models store](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/client/ui-settings-models/src/client/store.ts) |
| `llm.listConfigurableProviders()` | 读取可加入但尚未配置的 catalog Provider，以及各自的 `settingsNs / settingsPath` | [Models store](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/client/ui-settings-models/src/client/store.ts) |
| `settings.describe()` | 读取带 schema、base/user/value layer、revision 的脱敏设置视图 | [Settings Controller](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/api/settings-controller/README.md) |
| `settings.mutate(ns, ops, expectedRevision)` | 用最小 path operations 创建或编辑 Provider；revision 防止另一窗口的并发修改被覆盖 | [Models operations](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/client/ui-settings-models/src/client/operations.ts) |
| `credentials.describe / set / unset` | 只读配置状态、单向写入或清除凭据；不会把 secret 返回给 Renderer | [Settings Controller](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/api/settings-controller/README.md) |
| `llm.discoverModels(settingsNs, request)` | 用表单里尚未保存的 endpoint、protocol 和临时 Key 尝试发现模型 | [Models operations](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/client/ui-settings-models/src/client/operations.ts) |

官方客户端还明确将 Provider 目录、设置 mirror 和 credential descriptor 合并为一个 Snapshot；每次写入后重新读取 Host 事实，而不是在浏览器里维护第二套“已配置”状态。[Models store](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/client/ui-settings-models/src/client/store.ts)

### 2.3 自定义 OpenAI-compatible Provider 的精确写入契约

官方创建卡采用以下最小 Profile：

```json
{
  "displayName": "可选显示名",
  "apiKeyEnv": "MY_GATEWAY_API_KEY",
  "api": "openai-completions",
  "baseURL": "https://gateway.example/v1",
  "models": [{ "id": "model-id" }]
}
```

创建时用一次带 revision fence 的原子设置操作写入：

```text
settings.mutate(
  "llm-pi-ai",
  [{ op: "set", path: ["providers", providerId], value: profile }],
  openedRevision
)
```

Profile 成功后，Key 再通过 `credentials.set(keyRef, literal)` 单向写入。官方代码有意将两者拆开：若 Profile 已提交而 Key 写入失败，重试只能重试 credential，不能用旧 revision 重放整个 Profile。[CustomProviderCard](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/client/ui-settings-models/src/client/CustomProviderCard.tsx)

这给 Deep Code 一个非常具体的 Recovery 要求：

```text
设置未写入
  → 保留全部草稿，说明字段或 revision 冲突

Provider 已创建，但 Key 未写入
  → 明确显示“Provider 已添加，认证尚未完成”
  → 只提供“重试保存 Key / 暂后配置 / 删除未完成 Provider”

模型发现失败
  → 不撤销 Provider 草稿
  → 允许手工输入模型 ID
```

### 2.4 模型发现不是能力识别

自定义 OpenAI-compatible Provider 的“Fetch available models”只是在适配器允许时查询相应模型目录，常见路径是 `GET /models`；端点可以拒绝或根本不实现，因此必须允许手工输入。它也不能发现图片能力、上下文窗口、推理强度或请求兼容性；官方明确要求这些能力由 catalog 或用户配置声明。[Provider 指南：Model catalog、Image input、Request compatibility](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/docs/user/guide/providers.md)

因此：

- Deep Code 可以验证“endpoint 是否返回了模型 ID”，不能声称“已经理解模型能力”。
- 图片支持、reasoning effort 和兼容开关必须来自 Harness schema / catalog，或进入高级配置并明确标成用户声明。
- `supportsDeveloperRole`、`maxTokensField`、`thinkingFormat` 等兼容设置属于具体协议，不能为所有 OpenAI-compatible 服务套同一默认答案。官方配置参考由适配器 schema 生成，Deep Code 应动态读取 schema，而不是复制静态字段表。[Provider 指南：Request compatibility](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/docs/user/guide/providers.md)

### 2.5 推荐的 Provider 向导

第一版不必复制官方 Web UI，而应复用其协议，把普通人的任务路径压缩成五步：

1. **选择服务来源**：官方目录中的 OpenAI / Anthropic / GLM / Qwen 等，或“自定义 OpenAI-compatible 服务”。
2. **配置认证**：根据 Provider 声明显示 API Key、OAuth、AWS、ADC、Azure 或本地无认证；Key 始终 write-only。
3. **确认 Endpoint 与模型**：catalog 直接列出；custom 可尝试发现，失败后手工填写。
4. **选择默认模型和 effort**：只展示 Harness 当前目录实际公布的选项；不默认 Max，不预测模型智力。
5. **显式验证**：说明会产生一次真实模型调用和费用，创建可见验证任务；成功后显示 requested / effective Provider、模型和 effort。

必要的安全与产品约束：

- Renderer 只拿 schema、脱敏 descriptor 和配置状态，不拿旧 Key；secret 只沿 Renderer → Main → Harness 单向通过。
- 不把 Key 放进 Deep Code 配置、任务数据库、日志、诊断包、Shell 环境或错误文案。
- Deep Code 的 DSH Adapter 对 Renderer 暴露语义方法，例如 `listProviderOptions / createProvider / saveCredential / discoverModels`；Renderer 不直接调用原始 RPC。
- 跨 Provider 发送任务前显示目标服务和将发送的工作区范围；“设置了一把 Key”不等于用户同意把所有项目内容发送给该厂商。
- 删除 Provider 前显示受影响的默认模型与旧 Session；官方规定已发过请求的 Session 保留日志中记录的模型，删除默认 Provider 不应被描述成“历史任务已迁移”。[Provider 指南：Select a model](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/docs/user/guide/providers.md)

## 3. 值得采用的 Agent 桌面架构与 UX 趋势

### 3.1 版本匹配的结构化协议，不解析 CLI 文本

Codex app-server 使用 JSON-RPC 2.0 风格双向协议，稳定传输面是 stdio / JSONL；WebSocket 明确仍是实验接口。它允许针对当前二进制运行 `generate-ts` / `generate-json-schema`，并把实验字段隔离在 `--experimental` 后。Deep Code 应采用同样的原则：启动时记录 Harness 版本和 capability，固定已验证 contract fixtures，对缺失功能明确降级，不让 Renderer 猜上游文本。[Codex app-server README（固定 commit）](https://github.com/openai/codex/blob/d58d0e5841e0de08e251673db2d5af8cf3a1ad51/codex-rs/app-server/README.md)

### 3.2 Thread → Turn → Item 是桌面状态的稳定主键

Codex 的公开协议把会话、轮次和消息 / 工具 / 审批项分成 Thread、Turn、Item；进度从 `item/started`、delta 到 `item/completed`，回合以 `turn/completed` 结束，并提供分页的 turn / item 列表。Deep Code 应把 Ask、工具卡、展开状态、计时器、停止按钮和恢复提示全部绑定到 `taskId + turnId + itemId`，而不是绑定全局轮询状态。这直接对应此前出现过的跨任务展开、重复文本、Ask 被刷新和运行结束后仍显示“正在整理回复”。[Codex app-server README](https://github.com/openai/codex/blob/d58d0e5841e0de08e251673db2d5af8cf3a1ad51/codex-rs/app-server/README.md)；[协议类型目录](https://github.com/openai/codex/tree/d58d0e5841e0de08e251673db2d5af8cf3a1ad51/codex-rs/app-server-protocol/src/protocol)

### 3.3 模型和 effort 来自宿主目录，用户显式选择

Codex `model/list` 返回当前构建可用模型与 reasoning effort 等目录事实；Claude Code 也把模型与 effort 分成用户可见选择，并提醒最高 effort 可能收益递减、增加等待和消耗。Deep Code 应继续保留“沿用 Harness 当前设置”与“用户明确选择”，显示请求值和实际值，不恢复自动模型能力评分或偷偷升到 Max。[Codex app-server README](https://github.com/openai/codex/blob/d58d0e5841e0de08e251673db2d5af8cf3a1ad51/codex-rs/app-server/README.md)；[Claude Code model configuration](https://code.claude.com/docs/en/model-config)

### 3.4 审批和 Ask 是可留置实体，不是刷新出来的临时卡片

Codex 的 server request 带 thread / turn / item 身份，响应后有 resolved 通知，最终完成仍以 Item / Turn 终态为准。Deep Code 的 Decision Gate 应保持：当前任务底部内联、一次性提交、解析前可持续编辑、输入活动刷新等待计时、解析后不再接受第二次提交；实时状态更新不能重建整个表单。[Codex app-server README](https://github.com/openai/codex/blob/d58d0e5841e0de08e251673db2d5af8cf3a1ad51/codex-rs/app-server/README.md)

### 3.5 权限必须显示“有效规则与来源”

Claude Code 把权限分为 allow / ask / deny，并由强制权限层而非 `CLAUDE.md` 之类提示文字执行；Hooks 可以在生命周期中增加确定性检查，但不能越过权限边界。Deep Code 应把 Harness 的有效权限翻译成“只读、工作区写入、完全访问”等人话预设，并允许展开查看来源和具体规则，而不是让角色卡或 Soft Harness 改写权限。[Claude Code permissions](https://code.claude.com/docs/en/permissions)；[Claude Code hooks](https://code.claude.com/docs/en/hooks)

### 3.6 Usage 必须标明事实层级

Codex app-server 暴露线程 token usage、账户 usage / rate limits；但具体接口仍有稳定与实验层次。Deep Code 只应显示 Harness 实际提供的数据，并把来源分为：`Provider 实报`、`可解释估算`、`Engine 未提供`。只有 token 没有实际 Provider、模型、费率、缓存规则和计费身份时，不显示人民币金额。[Codex app-server README](https://github.com/openai/codex/blob/d58d0e5841e0de08e251673db2d5af8cf3a1ad51/codex-rs/app-server/README.md)

### 3.7 Skills / MCP / Plugins 控制台比“高星项目市场”更重要

Codex Skills 目录公开 enabled、plugin 来源和展示元数据，并通过 changed 通知要求客户端重新读取；Claude Code 的诊断入口也强调配置来源和有效状态。Deep Code 应把“项目与 Skills”扩展为能力控制台：来源、作用域、启用状态、权限、认证、版本、错误、更新兼容性和卸载 / 回滚状态。GitHub stars 只用于发现，不能证明可安装、可信或兼容。[Codex app-server README](https://github.com/openai/codex/blob/d58d0e5841e0de08e251673db2d5af8cf3a1ad51/codex-rs/app-server/README.md)；[Claude Code configuration diagnostics](https://code.claude.com/docs/en/debug-your-config)；[Claude Code plugin reference](https://code.claude.com/docs/en/plugins-reference)

### 3.8 恢复能力必须声明覆盖范围

Claude Code Checkpoint 可以恢复会话、代码或两者，但官方明确其文件追踪主要覆盖 Write / Edit / NotebookEdit，通过 Bash 修改的文件并不都受保护。Deep Code 只有拿到 Git commit / stash、Harness 官方 checkpoint 或工具级可逆证据时，才能显示“可恢复”；不能把普通 diff 或 Agent 自述包装成完整回滚。[Claude Code checkpointing](https://code.claude.com/docs/en/checkpointing)

## 4. MCP 与 A2A：采用到哪里为止

### MCP：采用连接与权限控制台，不用它替代模型 Provider

MCP 解决的是 Agent 与工具、资源或远程能力之间的互操作，不是 OpenAI / Anthropic / GLM / Qwen 的统一模型调用协议。它对 Deep Code 的直接价值是：

- 展示 MCP Server 来源、transport、连接状态、授权状态与工具清单；
- 对远程 HTTP MCP 按规范处理 OAuth、PKCE、resource audience 和安全 token storage；
- 对 stdio Server 不把完整父进程环境和所有秘密默认传入；
- 每个工具仍经过 Harness 权限和审计，而不是“连接成功即全部批准”。

MCP 的 HTTP 授权规范明确禁止 token passthrough，并要求 token 与目标 resource 绑定；这与 Deep Code 的凭据隔离方向一致。[MCP Authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)

### A2A：暂不作为 MVP 依赖

A2A 面向跨进程 / 跨组织 Agent 的 Agent Card、消息、任务和远程协作；它不会帮助 Deep Code 配置本机模型 Provider，也不会自动解决共同工作区、权限或费用归属。只有未来 Deep Code 真正需要连接独立远程 Agent 服务时再评估。即使采用，Agent Card 也不能携带明文 Key，且必须把远程身份、认证和数据发送范围展示给用户。[A2A v0.3.0 specification](https://a2a-protocol.org/v0.3.0/specification/)

## 5. 不应该追逐的方向

1. **跨厂商模型智力排行榜或自动能力推断器。** Codex 与 Claude Code 都更依赖宿主目录和用户选择；模型名字、营销文案和一次评测不足以成为自动路由事实。
2. **默认多 Agent 规划—执行—复核链。** 它会复制上下文、增加费用与故障面，并使“是谁改了文件”更难解释。等 Harness 有稳定的子 Agent 生命周期、费用和取消事件后，只做显式、可见、可停止的 opt-in 工作流。
3. **LLM 驱动的 Hooks 平台。** Claude Code 区分无模型成本的 command / HTTP hooks 与会产生额外调用的 prompt / agent hooks；后者还包含实验边界。Deep Code 若做 Hook，先做确定性、可审计、本地环境已清洗的规则。[Claude Code hooks](https://code.claude.com/docs/en/hooks)
4. **复制远程插件市场。** Codex 的部分远程插件能力依赖 ChatGPT 后端、计划资格和仍在发展的协议；Deep Code 应先完成本地插件 inventory、验证、安装后生效证明、禁用、卸载与 profile 回滚。[Codex app-server README](https://github.com/openai/codex/blob/d58d0e5841e0de08e251673db2d5af8cf3a1ad51/codex-rs/app-server/README.md)
5. **把 GitHub 高星仓库视为插件。** 必须有受支持 manifest / bundle contract、固定版本、许可证、权限、安装期代码披露和卸载路径。
6. **把官方 Harness Web UI 重新嵌回产品。** Deep Code 应复用协议与状态模型，不退回“打开官方页面才能配置”的通道产品。
7. **绑定上游实验传输或私有字段。** 任何 experimental seam 只进入版本化 Adapter 和 canary，不进入核心产品承诺。

## 6. Deep Code 可以形成的差异化壁垒

### 6.1 Agent Legibility：让执行过程真正可理解

聊天框、主题、玻璃效果、模型下拉框和项目侧栏都能被快速复制。更难的是把数十种上游事件稳定压缩成普通人能回答的六个问题：

1. 现在在做什么？
2. 为什么需要我决定？
3. 使用了哪个 Provider、模型、权限和费用来源？
4. 改了哪些文件，执行了哪些不可逆动作？
5. 结果由什么证据支持，还有什么没有验证？
6. 失败后我最安全的下一步是什么？

这条链路应继续由 Conversation Projection、Run Projection、Outcome、Evidence Drawer 和 Recovery 共同承担，而不是再加一段总结 Prompt。

### 6.2 新手控制面：把配置来源和有效状态翻译成人话

真正的新手友好不只是少放按钮，而是能解释：

- 为什么这个 Provider 没出现；
- Key 已保存为什么仍无法调用；
- 当前 Session 为什么仍使用旧模型；
- 某个 Skill 来自哪里、为什么没有加载；
- 权限规则来自 Harness、项目还是用户设置；
- 哪一步会调用模型、产生费用或把数据发给第三方。

Codex / Claude Code 已证明“来源与状态诊断”是成熟 Agent 产品的基础；Deep Code 的差异化是把这些技术概念翻译给没有工程背景的人，而不是照搬命令面板。

### 6.3 可验证的 Soft Harness

Soft Harness 若要成为壁垒，不能等同于角色卡、人格 Prompt 或更长的系统消息。它应表现为一个可审阅的协作决策层：

- 先判断用户要求的前提、可行性、长期维护成本和最小可靠版本；
- 把握高且行动可逆时直接推进；
- 关键不确定性会改变结果时，只问少量高信息价值问题；
- 不把理解用户的方式兑换成更高权限、更贵模型或更多数据发送；
- 每个长期偏好和协作规则都可查看、修正、过期和删除。

其可量化指标不是“角色风格有多强”，而是需求返工率、恢复成功率、无意义询问率、用户能否复述发生了什么，以及同类任务第二次是否更省步骤。

### 6.4 上游变化吸收能力

Harness 仍是 alpha，Deep Code 若能做到：

- 记录 Engine 版本与 capability fingerprint；
- 对多个已支持版本运行协议 fixtures；
- 每次上游更新先在隔离 DSH_HOME + mock Provider 下做 canary；
- 缺失 seam 时安全降级并用人话解释；
- Provider、Skills、MCP、插件、权限和用量全部通过 Adapter 投影；

那么“能紧跟上游而不把变化成本转嫁给新手”本身就是工程壁垒。

## 7. 推荐实施顺序

### P0：Provider Provisioning 闭环

1. 在 DSH Adapter 中加入 configurable Provider directory、settings schema / revision、settings mutate 和 model discovery。
2. 支持两种创建：catalog Provider adoption、自定义 OpenAI-compatible Provider declaration。
3. 将凭据与 Profile 写入拆开，完整处理 partial success 与 retry。
4. 只显示 schema 声明的认证与协议选项；Key write-only。
5. 保存后刷新 Host Snapshot，再允许用户选择模型 / effort。
6. 真实验证必须创建可见任务，并提前说明会产生调用和费用。

### P1：协议稳健性与成本 / 权限可见

1. 用 task / turn / item 主键统一会话 reducer，消除轮询与 UI 局部状态串联。
2. 建立 Harness version + capability fingerprint 和兼容矩阵。
3. 完成停止、Decision Gate、认证、网络、模型能力、权限、工作区和协议变化的 Recovery 分类。
4. 接入 Harness 实际 usage；没有权威数据时显示“Engine 未提供”。
5. 权限预设显示有效规则、来源和本轮使用事实。

### P2：能力控制台与可恢复扩展

1. 将“项目与 Skills”升级为 Skills / MCP / Plugins inventory。
2. 显示来源、作用域、启用态、认证、权限、版本、错误与兼容状态。
3. 插件安装补齐安装前 profile snapshot、安装后生效证明、禁用、卸载和回滚。
4. GitHub 生态发现继续保持“发现”身份，不与“可安全安装”混淆。

### P3：差异化 Explanation Layer

1. Outcome 增加跨文件影响、依赖变化、验证缺口和可恢复范围。
2. Project Brief 形成“这是什么、结构如何、刚才改变了什么、下一步是什么”的连续知识面，而不是一次性摘要。
3. Soft Harness 只做可推翻的小实验：需求前提审查、少量高信息问题、可审阅协作偏好；不做隐藏画像和人格注入。
4. 用可复现测试和用户理解指标验收，不用“回答更像某个角色”作为成功证据。

## 8. 下一轮设计决策

在写 Provider 代码前，只需确定以下产品边界；技术 seam 已经足够明确：

1. **第一版入口名称**：建议叫“模型服务”，而不是“API Key”，因为其中会包含 OAuth、云凭据和本地服务。
2. **第一版范围**：catalog Provider + 自定义 OpenAI-compatible；Bedrock / Vertex / Azure / Codex OAuth 先显示官方认证说明与状态，不自造通用表单。
3. **默认行为**：添加 Provider 后不自动把现有任务切过去；用户在模型选择器中明确选择，新任务才采用新的默认模型。
4. **验证行为**：不做静默 ping；明确告诉用户“会发送一条最小验证请求并可能产生费用”，然后创建可见验证任务。
5. **隐私提示**：第一次把某工作区发送给新 Provider 时，显示 Provider 名称、Endpoint 和将发送的数据类型，并记住用户对该 Provider 的授权范围。

这五项确定后，Provider Provisioning 可以作为一个边界清楚、无需自动模型能力识别、且能真正让用户使用 OpenAI / Anthropic / GLM / Qwen / 私有网关的垂直闭环实施。
