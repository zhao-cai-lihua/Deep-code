# Deep Code 自适应模型与推理强度路由计划（2026-08-27）

> **ARCHIVED / NOT SHIPPED** — 2026-08-30 的产品审查与实测发现，自动路由会把规划/审查类任务长期推到 V4 Pro + Max，费用不透明，并要求 Deep Code 维护第二套模型能力真相。当前产品已退役任务角色推断与自动 effort 提升，只保留 Harness 目录、用户明确选择以及 requested/effective 证据。本文仅作为被否决方案的设计史。

## 结论

Deep Code 可以增加“自动选择模型与推理强度”，但第一版必须是**本地、可解释、零额外模型调用的路由策略**，并通过 DeepSeek Harness 的正式 Session 模型选择接口生效。它不是一个隐藏的路由 Agent，也不能把任务发送给多个模型竞赛后再挑答案。

路由属于当前任务的临时执行状态。它不能写入 Character、Relationship Runtime 或 Soft Harness 的慢层状态，也不能因用户的情绪、亲密程度或角色偏好偷偷提高花费。

## 2026-08-28 已实现的第一纵切片

- 发送框把工作方式与模型分开：`Auto / Goal / Plan / Build / Verify` 描述任务阶段；旁边的模型入口提供自动或精确自选 provider/model/effort。
- `Model Router` 是无 I/O 的确定性模块：从任务文本、用户策略和 Session 目录选择角色路线，不调用分类模型。
- 自动模式识别规划/审查/诊断信号时偏向目录里的规划模型与其最强已公布 effort；识别明确实现动作时偏向高效执行模型与其最强已公布 effort；Goal 使用均衡路线。
- 模型名只作为同一模块内的兼容提示（例如 Sol/Pro、Terra/Balanced、Luna/Flash）；若官方目录没有明确匹配项，保持当前模型，不猜测不存在的路线。
- 图片仍走单独的官方视觉模型能力门，不会被文本路由器降级后丢图。
- 选择理由保存在任务状态提示中；侧栏同时显示 Harness Session 最终报告的模型与 effort。

这里实现的是**每一轮发送前的角色路由**，不是同一轮里偷偷连续调用“规划模型→执行模型→验收模型”。真正的三阶段工作流会增加至少两次模型调用，还需要阶段产物、停止/恢复、预算和 Harness 原生编排 Seam；在这些都可见、可中止之前，不作为默认自动模式发布。

## 上游可用契约

固定审查的 DeepSeek Harness 源码已经提供：

- `session.models`：返回当前 Session 可用的 provider/model 目录，以及每个模型由 adapter 声明的推理强度名称、说明和默认值；
- `session.selectModel`：提交完整的 provider、model 与可选 `reasoningEffort`；
- Host 在下一次 prompt 装配边界采用该选择，已经运行的 step 不被中途换模；
- 只有真实请求采用该路由后，选择才随请求头成为持久事实；
- 打开菜单和选择模型本身不向 prompt 添加内容，也不调用模型。

来源：[DSH model selection README（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/client/ui-model-selection/README.md)。

因此 Deep Code 应适配现有 RPC，而不是直接改 Provider 配置文件，也不应自行发模型 HTTP 请求。

## 用户看到的控制

发送框只显示一个紧凑入口：

```text
自动 · 平衡
```

工作方式提供五种阶段：

1. **Auto**：从用户自然语言推断当前阶段。
2. **Goal**：澄清目标、成功标准和范围，使用均衡路线。
3. **Plan**：规划、架构和风险分析，偏向规划模型。
4. **Build**：按既定方向实现，偏向执行模型。
5. **Verify**：测试、审查和验收，偏向规划/验证路线。

相邻的模型入口提供“自动”或精确 provider/model/effort 自选；两者不再混为同一组选项。

“自动”永远不能伪装成一个具体模型。发送前和运行中都显示实际映射，例如：

```text
自动 · 平衡
将使用 DeepSeek-V4-Flash · high
原因：包含图片，且任务要求修改并验证项目。
```

## 第一版路由器：确定性、无隐藏调用

第一版只使用本地已知事实，不询问另一个模型：

- 是否包含图片，以及哪些模型声明支持图片；
- 用户显式选择的任务模式：解释、计划、实现、调试、研究；
- 当前任务是否已经发生工具失败、模型能力错误或上下文压力；
- 是否涉及真实文件写入、构建、测试、权限或外部副作用；
- 当前 provider/model 是否仍然 routable；
- 用户的质量/平衡/节省偏好；
- 已确认的同类任务评测结果（后续才接入）。

初始规则建议：

| 任务事实 | 路由倾向 |
| --- | --- |
| 简短解释、格式化、分类、只读查看 | 低延迟模型 + low/medium |
| 普通实现、测试、局部调试 | 平衡模型 + medium/high |
| 架构、安全、复杂故障、多约束修改 | 高能力模型 + high/xhigh（只取 adapter 公布值） |
| 图片输入 | 只在声明视觉能力的模型中选择 |
| 上一轮明确是模型能力不支持 | 选择兼容模型，并记录回退原因 |
| 需要跨 provider | 不自动执行，先取得一次明确授权 |

规则只能从 Harness 实际公布的 effort 列表里选择，不能假设每家模型都有 `low/high/max`。

## 不做隐藏分类器的原因

如果为了选择模型先调用一个模型分类，普通用户的一条消息会变成至少两次模型请求：

```text
分类调用 → 正式调用
```

这会增加首 token 延迟、输入 token、失败点和隐私传播面。此前审查的第三方 DSH routing suite 也记录过错误集成导致每条消息多一次 API 请求、出现约 2 倍调用数的问题。第一版必须保持：

> 路由决策本身新增模型调用数为零。

未来只有在真实评测证明本地路由明显不足，而且用户明确开启时，才可试验小模型分类器；其调用必须作为独立用量事件显示。

## 路由证据

每一轮保存一条只读路由记录：

```json
{
  "policy": "balanced-auto",
  "requested": { "provider": "...", "model": "...", "reasoningEffort": "..." },
  "effective": { "provider": "...", "model": "...", "reasoningEffort": "..." },
  "reasons": ["vision-required", "code-change", "verification-required"],
  "fallback": null,
  "source": "local-policy-v1"
}
```

`effective` 只能来自 Harness 的请求头/Session 事实，不能因为 Deep Code 请求了某模型就声称已经采用。若上游没有确认，则显示“请求路线，尚未确认”。

## 回退规则

- 同一 provider 内、同一模态能力的不可用回退，可以按用户已选策略执行并明确记录。
- 跨 provider 会把内容发给新的服务，必须事先授权，不能静默回退。
- 图像任务不得回退到文本模型后把图片悄悄丢掉。
- 认证、余额、地区、内容策略或权限错误不得被包装成“模型不够聪明”。
- 最多一次自动回退；仍失败就进入 Recovery，不循环烧额度。

## 与 Relationship Runtime / Soft Harness 的边界

模型路线属于极快变化层：

```text
Character Core / Relationship Runtime（慢）
    不得修改 provider、model、effort 或费用策略

Task Routing State（快）
    只服务当前任务和当前 Turn

Ephemeral Context（极快）
    当前消息、工具结果、图片
```

关系状态可以帮助决定“怎样解释给用户”，不能决定“因为用户焦虑所以偷偷调用更贵模型”。用户关于花费和 provider 的选择权高于角色行为。

## 怎样验证它真的更好

先建立一组代表性任务矩阵：

- 简短解释；
- 新手项目说明；
- 局部代码修改；
- 复杂 bug；
- 图片问题；
- 研究与来源核查；
- 失败恢复。

对固定输入比较手动基线与自动路线：

- 完成率与一次通过率；
- 用户是否需要重述；
- 验证是否充分；
- 实际模型与 effort；
- input / cached input / output / reasoning token（上游可用时）；
- 首 token、工具、总耗时；
- 回退与重试次数；
- 估算费用（有可靠费率时）。

只有质量不下降、总用量或等待确实下降，某条规则才升级为默认。一个漂亮的理论能解释旧任务，不足以成为路由规则；它还必须在未见任务上作出可失败、可验证的预测。

## 实施顺序

1. ~~适配 `session.models` 与 `session.selectModel`。~~ 已完成。
2. ~~加入 Auto/Goal/Plan/Build/Verify 工作方式，并在发送前覆盖。~~ 已完成第一版。
3. ~~增加精确 Model/Effort 二级选择器并显示 Session 实际 effort。~~ 已完成。
4. 投影 requested/effective route 的逐轮证据，并加入可编辑的模型能力档案。
4. 增加一次回退与 Recovery，不做循环尝试。
5. 接入真实 usage 和延迟数据，运行任务矩阵。
6. 评测稳定后才允许自动策略成为默认；否则保留为 Beta。

## OpenAI/Codex 侧可借鉴的原则

OpenAI 官方模型指导把模型和 reasoning effort 视为质量、延迟和成本之间需要通过代表性任务评测的选择，而不是“越高越好”。其当前指导建议以 balanced 设置为基线，只在评测证明有收益时提高 effort；高 effort 和 Pro 类模式会增加延迟与 token 使用。[OpenAI Model guidance](https://developers.openai.com/api/docs/guides/latest-model)

Deep Code 借鉴的是这种“能力目录 + 显式 effort + 评测驱动”的协议思想，不复制 OpenAI 模型名称或价格映射；实际可选项始终来自当前 DeepSeek Harness 及用户已配置的 provider。
