# Archify：作为 Developer Preview 人类产品化的解释层评估

> 调研日期：2026-08-16
> 上游仓库：[`tt-a1i/archify`](https://github.com/tt-a1i/archify)
> 审计固定点：`main` @ [`cffdd42eed0ebf013aa070378d94facdd3d56b10`](https://github.com/tt-a1i/archify/tree/cffdd42eed0ebf013aa070378d94facdd3d56b10)（本次读取时 HEAD）
> 范围：只读调研；仅使用上游仓库 README、源码/契约文件、LICENSE 与 GitHub 页面的一手材料。

## 结论先行

**有用，但它不是把 Developer Preview 直接翻译成“人类产品”的完整方案。**

Archify 是一个给 coding agent 使用的“技术地图生成与验证”Skill：把**系统描述、代码仓库，或人工给出的拓扑**压缩为可交互的架构、流程、时序、数据流或生命周期图。它非常适合放在：

```text
Developer Preview / 代码与运行事实
  → Archify：有边界的技术解释物、评审和演示材料
  → 另行设计：目标用户任务流、状态、权限、错误恢复、领域语言与产品 UI
```

因此，如果“翻译成人类产品”指的是让非开发者也能完成真实任务，它**只能承担中间的解释层**，不能代替产品层；如果目标用户是开发者、技术负责人或评审者，它已是相当可实操的交付工具。[README：定位与产物](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/README.md#L11-L17)；[PRODUCT：目标用户](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/PRODUCT.md#L8-L11)

## 它实际做什么

| 项目 | 上游定义与可用性 |
|---|---|
| 输入 | 系统描述、代码仓库；Skill 也支持自然语言和粘贴的 Mermaid 拓扑作为创作材料。它不是自动 Mermaid 转换器。[​SKILL](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/archify/SKILL.md#L2-L27) |
| 中间表示 | Agent 创建小型、带类型的 JSON IR；可保留以供定向迭代。[​README](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/README.md#L286-L303) |
| 产物 | 单个自包含 HTML 技术地图，并能导出 PNG、SVG、WebM 和分享卡；有 architecture / workflow / sequence / data flow / lifecycle 五类图。[​README](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/README.md#L11-L17) |
| 阅读体验 | 搜索、聚焦、上下游已编写 reach、路径、角色对比、引导故事、展示、主题和导出；所有关系应复用已编写的节点/连线，而非临时编造。[​README](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/README.md#L326-L341) |
| 生成闭环 | Agent 生成 JSON → 确定性校验 → 可选本机预览 → 原子交付 → 在保留结构的前提下迭代。[​README](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/README.md#L296-L315) |

最短的普通安装/调用路径是：

```bash
npx skills add tt-a1i/archify -g
# 然后向支持的 agent 提问：
Use archify to map this repository's runtime architecture.
```

也可以用零依赖 Node CLI 做 `doctor`、`guide`、`validate`、`preview` 和 `deliver`。[​README：安装与 CLI](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/README.md#L231-L260) [​README：CLI 例子](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/README.md#L304-L315)

## 为什么它能帮助 Preview 产品化

它替产品团队解决的不是“让用户操作系统”，而是开发工具常缺失的三件事：

1. **把内部结构压缩为单条可讲述的主线。** 复杂度留在节点卡和可按需展开的关系里，演示者不必把代码树或日志直接交给人看。
2. **把图的说法绑定到可检查的输入。** 它的契约要求先检查入口、运行边界、存储、传输和部署；不能只因文件相邻或命名相似就声称存在因果关系。需要时，架构节点可链接到固定公开 commit 的文件与行范围。[​authoring contract](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/archify/references/authoring-contract.md#L119-L121) [​README：源码证据](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/README.md#L286-L294)
3. **把“这次改了什么”做成审阅物。** Architecture Delta 比较两个已经验证的快照，列出 added / removed / changed / moved / rerouted；这对把 preview 的行为边界讲清楚很实用。[​README](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/README.md#L14-L17)

我会把它用于 Deep code 的 **Project Brief / Evidence Drawer 的辅助生成**：先从 Engine/仓库事实得到一张简洁、可验证的图，再由 Deep code 自己把它翻译为“用户现在能做什么、下一步是什么、失败如何恢复”。不要让 Archify 成为第二个执行真相，也不要把它产生的技术图直接当成新手界面。

## 它没有解决的部分

- **不会自动理解一切。** 校验保障的是 JSON、布局、路由等交付契约；它不证明图就是完整的运行时事实。交付契约明确说自动检查不能证明视觉质量，仍需浏览器人工检查。[​delivery contract](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/archify/references/delivery-contract.md#L42-L55)
- **不会产生面向任务的产品交互。** 没有用户旅程、状态机、真实权限控制、表单、领域操作、错误修复和可访问性决策；这些恰是把 developer preview 变成可用产品时最难也最关键的层。
- **它有明确非目标。** 自动 Mermaid 解析、通用自动布局、托管分享、WYSIWYG 编辑都不在当前范围。[​README：scope](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/README.md#L352-L361)
- **Delta 不能被夸大成风险/上线判定。** 上游 changelog 明确不让 Delta 声称 blast radius、mergeability 或 live-infrastructure verification。[​CHANGELOG](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/CHANGELOG.md#L23-L29)

## 安全、隐私与 Preview 适配

`preview` 是显式的桌面创作模式：只监听 `127.0.0.1`、只看指定 JSON、失败时保留上一次已验证产物、以 Ctrl-C 停止；生成出的 HTML 不需要这个服务。交付契约还要求不把服务器状态、路径或错误写入 HTML/导出物。[​README](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/README.md#L304-L315) [​delivery contract](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/archify/references/delivery-contract.md#L5-L9)

但这**不能泛化为端到端隐私保证**：生成阶段由宿主 Agent/模型读取仓库，代码是否上传、保留多久、工具拥有什么权限，仍由宿主和模型连接决定。README 所称的 “No telemetry” 只写给特定 DeepSeek Harness 社区集成，不能外推到 Codex、Cursor、Claude Code 或其他安装方式。[​README：宿主与 DSH 边界](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/README.md#L343-L351)

对 DeepSeek Harness 尤其要谨慎：该集成被明确标为 community integration、非官方 DeepSeek 产品，并依赖 developer-preview 版本与 Node 版本约束。因此它适合做可撤销、可验证的试验性解释层，不能承担 Deep code 的核心权限、会话或状态真相。[​README：DSH 集成](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/README.md#L343-L351)

## 维护、许可与采纳建议

- 上游在本次固定点 README 中自称稳定版本为 `v2.14.0`，changelog 标注日期为 2026-08-11；仓库首页本次读取显示 145 commits、11 个 issues、2 个 PR。它有活跃维护迹象，但没有看到 SLA 或独立安全审计承诺。[​README](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/README.md#L20-L23) [​CHANGELOG](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/CHANGELOG.md#L1-L10)
- 代码许可为 MIT；复用或分发其代码/实质部分须保留许可与版权声明。[​LICENSE](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/LICENSE)

**建议的最小试验（值得做）：** 选 Deep code 一个已知的、低敏感项目，不接入生产状态；让 Archify 生成 8–12 个核心部件的 runtime architecture 图，并把每个节点分为“已验证事实 / 产品解释 / 未知”。请一位不熟悉代码的目标用户完成三件事：说明系统的主路径、找出一个风险/边界、说出下一步操作。若他们只觉得“好看”却不能回答这些问题，说明需要改的是 Deep code 的任务语言与交互，不是继续给图加特效。

## 一手来源索引

- [仓库 README（固定 commit）](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/README.md)
- [Skill 执行契约（固定 commit）](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/archify/SKILL.md)
- [写图时的证据契约（固定 commit）](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/archify/references/authoring-contract.md)
- [交付与验证契约（固定 commit）](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/archify/references/delivery-contract.md)
- [产品定位（固定 commit）](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/PRODUCT.md)
- [变更记录（固定 commit）](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/CHANGELOG.md)
- [MIT 许可证（固定 commit）](https://github.com/tt-a1i/archify/blob/cffdd42eed0ebf013aa070378d94facdd3d56b10/LICENSE)
