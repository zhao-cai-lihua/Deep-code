# Model Capability Registry（2026-08-28）

> **ARCHIVED / REMOVED** — 2026-08-30 决定不在 Deep Code 中维护跨厂商模型能力评分。对应运行时代码与自动路由入口已移除；模型、Provider 与 reasoning effort 以 Harness 当前目录和用户明确选择为准。本文仅保留为设计取舍记录。

## 结论

Deep Code 把“用户正在做什么”和“用哪个模型做”拆成两个正交控制：

```text
工作方式：Auto / Goal / Plan / Build / Verify
模型路线：自动，或明确自选 provider / model / effort
```

工作方式描述任务阶段，不是模型名，也不直接增加模型调用。模型路线只从 Harness 当前公布的目录中选择。自选其他 provider 是用户对下一条消息流向的明确决定；自动路线不得静默跨 provider。

## 为什么不能只看名字猜优势

一个模型 ID 只能稳定证明“怎样向 Provider 请求它”，不能完整证明价格、视觉、上下文、工具能力、推理档位或在 Deep Code 任务上的质量。自建网关还可能把任意 ID 映射到另一套部署。Deep Code 因此按以下可信顺序合并能力：

1. Harness / Provider Adapter 公布的硬能力，例如 routable、effort 列表和默认 effort；
2. 用户或组织对精确 `provider + model` 的显式覆盖；
3. Deep Code 固定版本维护的已知模型家族档案；
4. Provider 提供的名称和描述，只作为低置信提示；
5. Deep Code 自己的代表性任务评测，后续加入并保留样本、版本和日期。

未知模型仍出现在自选列表中，但自动模式不会因为“名字听起来厉害”就跨过去。GLM、Qwen 等模型应先由对应 Harness LLM Adapter 公布目录；若其目录没有角色元数据，用户可以自选，未来再通过本地能力档案声明用途。

## 当前 Module 与 Seam

- `Model Capability Registry` Module：输入一个目录模型和可选覆盖，返回角色分数、来源和置信度；没有 I/O。
- `Model Router` Module：输入任务阶段、Prompt、Session 目录和可选自选值，返回一个请求路线和人话解释。
- `DSH Model Adapter`：位于官方 `session.models` / `session.selectModel` Seam，负责真实读取、提交和错误。
- Renderer：只显示列表和用户选择，不识别厂商模型名，也不调用 Harness 原始 RPC。

Deletion test：若删除 Capability Registry，OpenAI、DeepSeek、Anthropic 和未来用户覆盖的识别规则会重新散落进 Router、主进程、设置页和测试；因此它具有实际 Depth 与 Locality。

## 向 GLM / Qwen / Claude 扩展

1. 安装或启用能在 Harness 中注册该 Provider 的 LLM Adapter。
2. `llm.models` / `session.models` 出现真实模型行和可用 effort 后，模型立即进入自选列表。
3. 若 Adapter 提供角色/模态元数据，Capability Registry 优先采用。
4. 若没有元数据，用户可在未来的“模型档案”面板为精确模型标记：规划、执行、验收、视觉、低延迟、费用等级；未知项默认不参与自动切换。
5. 用固定任务矩阵记录成功率、验证完整度、延迟、token 与实际费用；只有达到阈值的模型档案才能成为默认推荐。

## 可借鉴而不照抄的成熟做法

OpenAI 官方模型指导明确区分旗舰能力、均衡和高吞吐模型，同时要求在代表性任务上比较 reasoning effort，不能假设越高越好。Deep Code 借鉴“明确模型家族契约 + 评测”，但不把 OpenAI 家族含义套到其他厂商。[OpenAI Model guidance](https://developers.openai.com/api/docs/guides/latest-model)

Claude Code 的模型选择器允许模型别名、精确模型 ID、effort 控制和自定义模型行；对网关/自定义部署，它允许显式声明 `_SUPPORTED_CAPABILITIES`，因为仅靠 Provider 特有 ID 经常无法可靠识别功能。Deep Code 借鉴“自选列表 + 显式能力声明 + 未知则降级”，但真实选项仍由 Harness 提供。[Claude Code Model configuration](https://code.claude.com/docs/en/model-config)

## 尚未完成

- 精确模型档案的用户编辑与导入导出；
- 模态、上下文窗口、价格和工具能力的统一 Schema；
- 每一轮 requested/effective route 的持久证据；
- 基于真实用量的预算和路由评测；
- 显式的 Plan → Build → Verify 多阶段编排。
