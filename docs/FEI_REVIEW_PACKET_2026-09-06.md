# Deep Code 给菲的代码与产品审查入口

审查对象：Deep Code v0.6.2  
公开仓库：https://github.com/zhao-cai-lihua/Deep-code  
正式发布源码：`889a57981d7478f24f9e52a02b63eb6625bd8a98`  
发布页：https://github.com/zhao-cai-lihua/Deep-code/releases/tag/v0.6.2  
许可证：MIT

## 请怎样使用这份文档

这不是把整个仓库粘贴成一篇 Markdown。完整源码约有 37 个运行文件和 33 个测试文件；复制粘贴会失去文件边界、版本记录和可运行性，也会很快过期。请以固定 commit 的 GitHub 源码为准，用本页作为审查地图。

审查目标不是证明作者的方案正确，而是寻找以下反证：

1. Deep Code 是否在任何地方绕开或复制了 Harness 的会话、模型、权限、工具与执行状态。
2. 初学者看到的结果、失败原因、恢复建议与工作回执，是否可能比底层证据说得更确定。
3. Provider、模型目录、凭据存在、真实调用成功和当前任务采用路线，是否仍有混淆。
4. 工作区、任务、图片草稿、问题等待和界面展开状态是否真正按任务隔离。
5. 本地记忆是否可能未经确认进入模型提示词，或保存密钥、私密原文及推断人格。
6. 第三方生态安装是否可能绕过 commit 固定、静态检查、二次确认或官方 DSH 安装机制。
7. 现有自动测试是否只是在匹配源码文字，而没有验证真实行为。

## 一句话架构

Deep Code 是官方 DeepSeek Harness 上方的初学者桌面工作台。Harness 是唯一执行真相；Deep Code 负责适配、保存本地任务外壳、把证据翻译成人话，并提供恢复入口。

```text
用户
  ↓
Electron Renderer：任务、对话、模型服务、回执、记忆预览
  ↓  受限 preload IPC
Electron Main：工作区与任务绑定、Engine 生命周期、秘密写入边界
  ↓
DSH Adapter：官方 HTTP / WebSocket / presenter 数据归一化
  ↓
DeepSeek Harness：Session、模型、权限、工具、审批与执行真相
```

禁止出现第二套 Agent Loop、第二套权限判断或从 API Key 内容猜测厂商。若界面解释与 Harness 证据冲突，应以 Harness 为准并显式显示“不确定”。

## 最值得先读的文件

### 1. 信任边界

- `src/dsh-adapter.cjs`：所有 Harness 协议适配的核心入口。重点找是否吞掉错误、猜测状态或泄露运行上下文。
- `src/main.cjs`：Electron 主进程、IPC 和功能编排，目前约 824 行。重点找过宽 IPC、秘密跨 Renderer、并发 Session 串线和领域逻辑堆积。
- `src/preload.cjs`：Renderer 能调用的桌面能力白名单。重点找是否暴露了通用文件、Shell 或任意 RPC。
- `src/runtime-supervisor.cjs` 与 `src/safe-child-environment.cjs`：Engine 启停和子进程环境。重点找秘密继承、重复启动与错误恢复。

### 2. 用户看到的“事实翻译”

- `src/conversation-projection.cjs`：区分用户发言、最终回答、工具证据和运行时注入。
- `src/run-projection.cjs`、`src/task-outcome-projection.cjs`、`src/task-guidance-projection.cjs`：把执行状态转成人话。重点找完成/失败/等待误判。
- `src/work-receipt-policy.cjs` 与 `src/workspace-baseline.cjs`：改动归属、风险和恢复限制。路径级 Git 基线不是 checkpoint，不能承诺自动回滚。
- `src/model-service-projection.cjs` 与 `src/model-verification-receipt.cjs`：模型服务状态和真实调用回执。重点找“有 Key”等同于“可用”的错误。

### 3. 本地产品状态

- `src/workbench-store.cjs`：任务与工作区的持久化边界。
- `src/dsh-live-session.cjs`：短暂实时事件和 Decision Gate；断线后不应冒充持久事实。
- `src/image-draft-store.cjs`：图片草稿的任务隔离和失败恢复。
- `src/memory-candidate-store.cjs` 与 `src/memory-retrieval.cjs`：候选、确认、拒绝、检索和预览。目前记忆不得自动进入 Harness prompt。

### 4. 当前最大的代码债务

- `src/renderer/shell.js` 约 2,213 行，承担页面渲染、对话、模型服务、弹窗和大量事件处理，是最明显的修改冲突与回归热点。
- `src/main.cjs` 仍承担过多编排。拆分时必须保持 IPC 与 Harness 权威边界，不应以“重构”为名另建状态真相。
- 一部分 `test/renderer-contract.test.cjs` 是静态源码契约测试。它们适合守住危险调用和结构边界，但不能替代真实 Electron 交互测试。v0.6.1 发布曾因一条 LF-only 正则在 Windows CRLF checkout 下假失败；v0.6.2 已修复，并在 PR 阶段运行 Windows 测试。

建议下一次改动只抽离 Model Services 的 Renderer 状态机，并增加可执行 DOM/交互测试；不要同时重写视觉样式、模型路由和记忆注入。

## Soft Harness：真实完成度

已经实现的部分：运行事实的人话投影、失败分类与下一步、任务级工作回执、模型路线归属、问题等待、受控生态安装、可审阅但未注入的本地记忆。

尚未形成完整壁垒的部分：需求前提审查、少量高信息问题、可推翻的计划、面向非程序员的阶段目标、跨任务但经用户确认的偏好应用，以及可量化的“少走弯路/更容易恢复”。因此请不要把当前版本评价为 Soft Harness 已完成。

相关设计证据：

- `docs/design/SOFT_HARNESS_SKILL.md`
- `docs/research/SOFT_HARNESS_EVIDENCE_REVIEW_2026-08-31.md`
- `docs/research/AI_CODING_AGENT_ERROR_GUARDRAILS_2026-09-02.md`
- `docs/research/agent-desktop-provider-and-protocol-roadmap-2026-08-31.md`
- `docs/development/MODEL_ROUTING_POLICY.md`

原角色卡实验已从产品和运行桥移除。保留的方向被拆成 Style、Instructions、Skills 和逐条确认的 Memory；它们不能修改模型、权限或工具。长期拟人体验仍是研究方向，不是 v0.6.2 功能承诺。

## 如何复现与验证

Windows 环境安装 Git、Node.js 24 和 pnpm 11.19.0 后：

```powershell
git clone https://github.com/zhao-cai-lihua/Deep-code.git
Set-Location Deep-code
git checkout 889a57981d7478f24f9e52a02b63eb6625bd8a98
pnpm install --frozen-lockfile
pnpm test
pnpm start
```

v0.6.2 的 GitHub Windows 发布工作流记录为 `34036307913`：197 项测试通过后才构建 Setup 与便携版。自动测试不能证明真实 Provider 一定可用，也不能代替人工检查 Windows 焦点、文件选择、Engine 安装和真实模型调用。

进行真实调用前，请使用测试工作区和低额度 Key。不要把 API Key、私人对话、用户本地任务数据或未经授权的第三方材料提交到 issue、PR 或审查文档。

## 希望菲最终给出的审查结果

请按严重度列出问题，并为每项附：文件与行号、可复现路径、实际证据、用户影响、建议的最小修复。建议分为：

- P0：秘密泄露、越权执行、数据破坏、权限或执行真相被伪造。
- P1：任务串线、错误模型归属、虚假完成/恢复承诺、核心流程不可用。
- P2：可理解性、可访问性、性能、维护性和测试覆盖不足。
- 设计分歧：事实没有错，但产品取舍可讨论；请明确它不是已复现缺陷。

也请单独回答三个问题：当前最值得保留的产品壁垒是什么；最应该删除或延后的功能是什么；若只允许做一个两周内可验收的改进，应选择什么以及怎样验收。

## 当前作者判断

v0.6.2 已经是能用的早期桌面工作台，但不是 Codex 等成熟产品的同等替代品。它最有价值的不是“功能数量”，而是把 Harness 事实、风险和恢复路径翻译给非程序员。最大风险是 Renderer 编排继续膨胀，以及解释层在未来悄悄变成第二套真相。审查若能推翻这两个判断，会比泛泛列出更多功能更有价值。
