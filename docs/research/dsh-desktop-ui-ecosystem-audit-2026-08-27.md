# DSH Desktop UI 来源、可借鉴边界与 Deep Code 生态路径审计

日期：2026-08-27
结论状态：固定提交的一手源码审计；涉及上游 Developer Preview 的兼容结论需在实施前复核。

## 一句话结论

截图中的“对话 / 轨迹”页签、顶部时间线、Turn / Step / Tool 账本和大部分回复界面是 **DeepSeek Harness 官方 Web Client** 的能力；`anywhere-labs/dsh-desktop` 主要提供 Electron 桌面宿主、窗口 frame、材质、托盘、更新、启动恢复和市场集成，并只对官方 Trajectory 包做了少量中文补丁。Deep Code 最值得借鉴的不是复制这套皮肤，而是：**同一份官方 Session 事件同时投影为安静的对话和可审计的轨迹**。Deep Code 不必改名；要进入 DSH 插件生态，应另做一个真实、极薄的 companion bundle，而不是把整个 Electron 应用冒充插件。

## 1. 审计对象与版本证据

### 1.1 这台电脑上的安装包

- 安装目录：`E:\D\DSH Desktop`
- 可执行文件：`E:\D\DSH Desktop\DSH Desktop.exe`
- Windows 文件元数据：`ProductName = DSH Desktop`，`FileVersion = 2.0.3`，`ProductVersion = 2.0.3.0`。
- `E:\D\DSH Desktop\resources\app-update.yml` 记录 `owner: anywhere-labs`、`repo: deepseek-harness-desktop`；该旧 URL 当前会重定向到 `anywhere-labs/dsh-desktop`。
- `E:\D` 本身**不是 Git checkout**，不能提供 remote/commit 证据；它只能证明本机安装了哪个构建。

### 1.2 为本次审计固定的源码

| 对象 | 本地只读审计 checkout | Git remote | 固定 commit |
| --- | --- | --- | --- |
| DSH Desktop | `E:\Temp\lenovo\dsh-desktop-source-audit-20260827\repo` | `https://github.com/anywhere-labs/dsh-desktop.git` | [`681ba66091fc5b1e827650137f69b3ee4c435922`](https://github.com/anywhere-labs/dsh-desktop/commit/681ba66091fc5b1e827650137f69b3ee4c435922) |
| DSH Desktop 固定的官方 Harness | `E:\Temp\lenovo\deepseek-harness-upstream-audit-b150a55` | `https://github.com/deepseek-ai/deepseek-harness.git` | [`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`](https://github.com/deepseek-ai/deepseek-harness/commit/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e) |
| DSH 1024Store 目录 | `E:\Temp\lenovo\dsh-1024store-audit-20260827` | `https://github.com/imsai-sh/awesome-deepseek-harness-plugins.git` | [`7d29c006405670a7c7b3089f7654ee4bf7370bdc`](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/commit/7d29c006405670a7c7b3089f7654ee4bf7370bdc) |

DSH Desktop 根目录的 `upstream.json` 和 gitlink 都把官方 Harness 固定为 `b150a551...`、版本 `0.1.1-rc.2`；这是判断“作者自建还是复用上游”的关键可复核边界。[固定上游清单](https://github.com/anywhere-labs/dsh-desktop/blob/681ba66091fc5b1e827650137f69b3ee4c435922/upstream.json) / [Git submodule 配置](https://github.com/anywhere-labs/dsh-desktop/blob/681ba66091fc5b1e827650137f69b3ee4c435922/.gitmodules)

## 2. 截图里的 UI 究竟是谁做的

### 2.1 明确来自 DeepSeek Harness 官方的部分

以下部分不是 `anywhere-labs` 的原创桌面 UI：

1. **“对话 / 轨迹”两个页签。** 官方 `ui-trajectory` 插件直接把 `id: 'trajectory'`、`order: 10` 的视图注册进 `conversation.view` slot；卸载插件时页签也随 effect 移除。[官方注册源码](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/client/ui-trajectory/src/client/index.ts#L22-L64)
2. **轨迹页顶端的彩色时间线。** 官方组件文件的定义就是 `Chrome-Network-style overview timeline`；它从 record 的 `startedAt`、`timeSeconds` 以及 assistant 的 step start / first token / completed time 计算 duration、TTFT 和 decoding。[官方 `TrajectoryTimeline.tsx`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/client/ui-trajectory/src/client/TrajectoryTimeline.tsx#L1-L127)
3. **“耗时 / 轮次 / 调用 / 搜索”工具栏及其折叠逻辑。** 官方 `TrajectoryToolbar` 定义 recorded duration、equal-width、Turn 折叠、Call 折叠和搜索。[官方 `TrajectoryToolbar.tsx`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/client/ui-trajectory/src/client/TrajectoryToolbar.tsx#L1-L127)
4. **Turn / Step / User / Assistant / Tool / Subtool 的账本。** 官方包 README 明确把它定义为 turn-aware event ledger，并说明 selection、timeline navigation、folding、search、token usage、duration inspector、虚拟滚动和历史分页。[官方 Trajectory README](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/client/ui-trajectory/README.md#L1-L17)
5. **对话页的回复流、Think 折叠、工具呈现、回到底部与悬浮输入框。** `ui-conversation` 官方包注册 user、assistant-step、command、compaction、retry、turn error 等 Chat Node renderer；Think 使用独立 `ReasoningRow` disclosure，而不是把推理文本做成普通回复卡。[官方 renderer 注册](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/client/ui-conversation/src/client/chat/register-node-renderers.ts#L11-L50) / [官方 `ReasoningRow`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/client/ui-conversation/src/client/chat/ReasoningRow.tsx#L20-L64)

官方的架构证据也与 UI 源码一致：Session 是 append-only typed event log，是交互历史的 single source of truth；消息、Chat 和 Trajectory 都是从同一日志派生，而不是桌面作者另造一套轨迹数据。[官方 Session subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/subsystems/session.md#L1-L25)

因此，截图中的时间线不是根据 DOM 或日志文字“猜”出来的装饰图。官方 Trajectory 在没有真实 duration 时也明确留空，不给运行中的记录制造假耗时。[官方已知限制](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/client/ui-trajectory/README.md#L15-L17)

### 2.2 `anywhere-labs/dsh-desktop` 自己做的部分

`dsh-desktop` 的原创/自建价值主要在桌面宿主层：

- Electron 窗口和原生 36 CSS 像素 desktop frame；
- Windows/macOS 原生窗口按钮、拖动区、托盘、通知、更新、诊断、启动和恢复；
- Acrylic / Mica 等系统材质与三种窗口组合模式；
- 原生目录选择桥、文件夹拖入和已打包 Engine/profile 管理；
- DSH Community Market 及 Desktop service。

项目自己的兼容模式文档明确说：Desktop frame 属于该插件，但“完整官方页面从它下方开始”；client module 不替换官方 layout/sidebar/conversation。在扩展和增强模式中，它也继续渲染官方 sidebar、conversation 与 details slot occupant。[DSH Desktop 桌面模式说明](https://github.com/anywhere-labs/dsh-desktop/blob/681ba66091fc5b1e827650137f69b3ee4c435922/dsh-plugin-desktop/README.zh.md#L52-L84)

DSH Desktop 根 README 同样自述：它把官方本地 Web UI、Host 和插件系统集成进桌面，核心 agent、模型、工具、会话、Web UI 和插件生态来自上游；桌面项目负责封装、启动停止恢复、窗口托盘和安装包。[项目边界声明](https://github.com/anywhere-labs/dsh-desktop/blob/681ba66091fc5b1e827650137f69b3ee4c435922/README.md#L32-L32) / [职责清单](https://github.com/anywhere-labs/dsh-desktop/blob/681ba66091fc5b1e827650137f69b3ee4c435922/README.md#L143-L159)

### 2.3 它对 Trajectory 做了什么修改

DSH Desktop 确实 patch 了 `@deepseek-ai/dsh-client-ui-trajectory@0.1.1-rc.2`，但该 patch 不是重写时间线：

- 把官方仍为英文的 Duration / Turns / Calls 等 toolbar 文案翻译成简体中文；
- 增加 “Thinking / 思考” 的本地化 label；
- 把硬编码 `Thinking` 改为通过当前 locale 查 label。

证据见 [`patches/dsh-client-ui-trajectory@0.1.1-rc.2.patch`](https://github.com/anywhere-labs/dsh-desktop/blob/681ba66091fc5b1e827650137f69b3ee4c435922/patches/dsh-client-ui-trajectory%400.1.1-rc.2.patch) 以及检查这些 marker 同时存在于 patch 与安装产物的 [`package.spec.ts`](https://github.com/anywhere-labs/dsh-desktop/blob/681ba66091fc5b1e827650137f69b3ee4c435922/dsh-plugin-desktop/tests/package.spec.ts#L401-L425)。

结论可以简化为：**外层桌面 frame 是作者做的；截图里最吸引人的对话/轨迹信息架构主要是官方 Harness 做的；作者补了桌面集成和少量本地化。**

## 3. Deep Code 可以安全借鉴什么

### 3.1 建议直接采用的产品与架构原则

1. **一个事实源，两个阅读面。** 普通用户默认只看连续对话；审计需求切换到 Trajectory。两者必须来自相同 Session event window，不维护第二份“工具历史”。这与 Deep Code 现有 `DshAdapter -> Conversation Projection / Run Projection` 边界一致。
2. **工具调用不切碎回答。** 对话页把 Skill、Think、Glob、Read、Search 等压成一行 disclosure；最终答复仍是一段连续正文。完整调用链交给单独的轨迹页，而不是在正文中堆大卡片。
3. **正在运行与历史审计分离。** “正在发生什么”只保留当前 active/waiting 项；完成后清空瞬态提示，已完成事实进入 Outcome / Trajectory。
4. **轨迹是高级入口，不是首页仪表盘。** 默认不向新手同时展示结果卡、实时卡、Run Details、Current Run 和全部 Tool Cards。首页只保留当前需要理解或决定的一个层级。
5. **阅读位置属于每个任务。** 官方 Chat 保存 session-scoped scroll position，只有读者仍贴近底部时才随新内容滚动；切换视图后恢复位置。Deep Code 已有部分 task-scoped UI state，应继续按这个契约收束。
6. **不知道就留空。** 官方 Trajectory 不给 in-flight 记录编造 duration；Deep Code 对 token、费用、模型、测试和文件改动也应只展示上游证据。

### 3.2 不建议照搬的部分

- 不要 fork 整套官方 Web Client，再在 Deep Code 内长期维护第二套 React/Cordis runtime。Harness 仍是 Developer Preview，完整 UI 依赖很多内部 package 和 slot contract，升级成本会吞掉产品开发。
- 不要照着截图重新实现一个“看起来像官方”的假 Trajectory。如果 Deep Code 当前 Adapter 尚未完整保留每个事件的 timing、usage、Turn/Step 归属，就先提供“查看官方轨迹”或渐进接入官方 projection；缺数据时不能画等价图。
- 不要把 `dsh-desktop` 的“万物皆插件”当作 Deep Code 当前必须复制的架构。它已经把桌面壳做成真正的 `dsh.bundle`，且携带完整 upstream runtime；Deep Code 目前是外部 execution client，二者维护成本和信任面不同。
- 不要把插件市场安装与“生态发现”混在一起。发现可以只读；安装 npm/GitHub bundle 会运行第三方代码，必须另有来源、版本、权限、构建脚本和回滚门。

### 3.3 许可证边界

DeepSeek Harness 与 DSH Desktop 在上述固定提交均为 MIT；官方 `ui-trajectory` 和 `ui-conversation` 的 package manifest 也标记 MIT。[Harness LICENSE](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/LICENSE) / [DSH Desktop LICENSE](https://github.com/anywhere-labs/dsh-desktop/blob/681ba66091fc5b1e827650137f69b3ee4c435922/LICENSE)

这允许使用、修改和分发代码，但若 Deep Code 复制“substantial portions”，必须保留相应 copyright 与 permission notice。MIT 也不授予 DeepSeek 商标、图标和官方背书；所以更稳妥的路径是借鉴信息架构、自己实现视觉，或通过正式 DSH client/plugin seam 复用官方包，而不是无署名复制组件和品牌素材。

## 4. Deep Code 如何进入 DSH 生态

### 4.1 名字不需要改

官方品牌规范允许在描述中如实写 `built on DeepSeek Harness` 或 `compatible with DeepSeek Harness`；若项目名要体现关联，建议使用缩写 `DSH`，同时避免把完整 `DeepSeek Harness` 商标直接放进项目名，也不要使用会让人误认为官方背书的品牌素材。[官方 Brand Guidelines](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/BRAND_GUIDELINES.md#L5-L12)

因此建议保留：

> **Deep Code — a local desktop workbench built on DeepSeek Harness**
> Independent community project; not affiliated with or endorsed by DeepSeek.

`Deep Code` 比 `DeepSeek Harness Desktop` 更安全，也更能保留“面向普通人的解释层”定位。无需为了被收录而改名成带完整官方商标的名字。

### 4.2 官方可发现入口：真实插件 + `dsh-plugin` Topic

DeepSeek Harness 官方 CONTRIBUTING 当前建议社区创建插件，并给 GitHub 项目关联 `dsh-plugin` topic 以便发现。[官方生态参与说明](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/CONTRIBUTING.md#L10-L19)

但 Deep Code 当前整个 Electron 应用不是 DSH bundle。直接给仓库打 `dsh-plugin` topic 或提交插件市场，会造成名实不符。建议在同一仓库新增一个真实的极薄 companion bundle，例如：

```text
packages/dsh-deep-code-bridge/
  package.json
  cordis.patch.yml
  lib/...
```

它只做必要的 DSH 侧连接/入口/只读投影，不复制 Agent Loop，不改变权限。官方发布契约要求 npm package 在 `package.json` 声明非空 `dsh.bundle.patch`；没有该声明只是普通依赖，不会被激活。[官方插件打包与安装](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/user/develop/basic/publish.md#L9-L16)

### 4.3 进入 1024Store 的实际条件

1024Store 是社区目录，不是 DeepSeek 官方市场。固定提交的收录规则要求：

- 每个插件在 `catalog/plugins/` 中有一个 JSON；
- manifest 有非空 `dsh.bundle.patch`，引用的 patch 文件已提交；
- GitHub 仓库添加 `dsh-plugin` topic；
- 中英文描述都必须事实、客观、具体，不写夸大宣传；
- 新增 PR 只改一个插件 JSON；
- 子目录插件 ID 可用 `owner/repository/sub/dir`，manifest 必须正好位于该子目录；
- 目录门禁不会安装、构建、运行或安全审计插件；npm 未发布时只能 browse-only，发布后才出现安装能力。

一手来源：[`awesome-deepseek-harness-plugins/CONTRIBUTING.md`](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/7d29c006405670a7c7b3089f7654ee4bf7370bdc/CONTRIBUTING.md#L1-L55)

建议将来使用的目录 ID：

```text
zhao-cai-lihua/Deep-code/packages/dsh-deep-code-bridge
```

完成真实 bundle、固定兼容版本、运行验证、npm 预构建发布和安全说明后，再提交 1024Store。现在不应只为了曝光创建空壳插件。

### 4.4 分阶段生态路线

1. **现在：** 保留独立 Deep Code 桌面产品；README 补清楚支持的 DSH version/commit、独立社区身份和 release compatibility。
2. **近期：** 做 `dsh-deep-code-bridge` 最薄 bundle，只暴露 Deep Code 真正需要且上游没有的入口/只读说明能力。
3. **验证后：** 加 `dsh-plugin` topic，发布带预构建 `lib/` 的 npm package，避免用户 Git 安装时临时构建。
4. **收录：** 按 1024Store 子目录规则提交单个 JSON；同时可向 DSH Desktop 友情链接发 issue，但这属于该社区项目的收录，不等于官方背书。
5. **长期：** 每次发布记录 `supportedHarnessVersion`、`testedCommit`、protocol probe 和降级行为；上游不兼容时明确失败，不静默猜协议。

## 5. Soft Harness / “解释人话”有没有竞争力

### 5.1 有价值，而且方向与官方 UI 不重复

官方 DSH 已经很擅长告诉开发者：发生了哪些 Turn、Step、Tool，耗时多少，模型和 token 是什么。它不等于帮助非程序员回答：

- 这件事是否真的完成？
- 哪些是已确认事实，哪些只是 Agent 判断？
- 改了什么，会影响我什么？
- 测试过没有；失败后下一步按哪个按钮？
- 我现在必须决定什么，什么可以先不懂？

Deep Code 的潜在差异点正是把这些问题变成 **可追溯的人类结果与恢复路径**。现有代码已经有真实地基：

- `src/conversation-projection.cjs` 将 runtime context 与用户消息分开，并规范化 diff/terminal/read/search/web evidence；
- `src/task-outcome-projection.cjs` 只根据 changed files、terminal exit code、tool failure 与 turn terminal state生成结果，不信任模型自称“完成”；
- `src/project-explainer.cjs` 要求项目说明区分“已确认 / 推断”并列证据；
- `src/run-projection.cjs` 在上游没有 token/费用时明确显示未知；
- `docs/design/SOFT_HARNESS_SKILL.md` 把 Soft Harness 限定为 Hard Harness 内的可审阅判断、竞争解释、Robust Move 和可恢复共同选择权，而不是权限扩张。

这组组合——**任务事实、人话解释、反证、恢复、用户可纠正的长期协作**——比单纯桌面封装更有产品识别度。

### 5.2 但现在还不足以作为“已完成竞争壁垒”宣传

当前实现仍是早期切片：

1. `Project Brief` 主要是一段固定 prompt，还不是可复用、带 schema 的 Project Brief projection。
2. Outcome 目前能确认文件、工具和部分 test/check/build 命令，但还没有完整的“目标是否满足 / 验收条件 / 风险 / 恢复动作 / 用户决定”结构化闭环。
3. UI 同时呈现任务结果、正在发生什么、Run Details、Current Run 和 Tool Cards，信息层级发生重复；这正是截图红圈显得拥挤的原因。
4. Tool Cards 已经规范化，但默认展示仍会把答复切成 CLI 风格碎片；应让对话是主阅读面，Trajectory/Evidence 是第二阅读面。
5. `SOFT_HARNESS_SKILL.md` 自己已明确标记：关系动力层仍是可检验设计阶段。当前没有 competing interpretations store、Interaction Proposal、待审阅记忆或否决/衰减机制，不能把文档当成已运行功能。
6. 新手恢复仍缺一套明确 contract：每个失败应该给出“发生了什么、没有损坏什么、用户只需做的一步、完成后如何继续”。

因此竞争力判断是：**方向独特，工程地基可信，体验尚未收束。** Deep Code 不应与官方比“谁显示更多工具细节”；它应比官方多做一步，把同一证据压缩成用户可以放心行动的结果，并随时允许展开官方级轨迹复核。

### 5.3 关于角色卡和 token

当前角色卡不会被发送给 Agent。`src/main.cjs` 只在 `workbench:handoff-preview` 中读取卡片并生成预览；真实 `workbench:send` 路径没有把卡片拼进 prompt。Renderer 也明确标注 `NOT APPLIED`。所以当前版本不会因为每轮注入角色卡产生模型 token 开销。

但是它仍占据导航、设置、代码、测试和用户注意力，而且没有造成可感知的回复变化。若当前产品目标是先完成“好用的普通人 Agent 工具”，从主导航移除甚至删除这套实验是合理的；至少不应继续作为 Deep Code 的当前差异化卖点。Soft Harness 也不等同于角色卡：删除未生效角色 UI，不会删除“事实/推断/恢复/共同选择权”的产品方向。

## 6. 本次建议的产品收束

### P0：先让主任务页安静下来

- 主区只保留连续对话、单一当前状态、等待决定和输入框。
- 工具、Think、Skill、Glob 等显示为一行 disclosure；完成后不再每项占一块卡。
- 将“结果 / 当前运行 / 运行详情 / 证据”收束成一个左侧或独立页签入口，按当前任务保存展开状态和滚动位置。
- 新建工作区、Projects、Skills 归入左侧工作区树；它们不是顶级产品页面。
- 增加“对话 / 轨迹”双视图，但轨迹必须接真实 Session event 投影；在接齐之前可先只做统一 Evidence ledger，不画伪 timeline。

### P1：把人话解释从文案升级成 contract

每轮结束生成一个可追溯 Outcome：

```text
目标：用户想完成什么
结论：完成 / 未完成 / 已停止 / 需要决定
已确认：文件、命令、退出码、Harness terminal state
未确认：没运行的验证、缺失 usage、无法证明的模型判断
影响：用户会看到什么变化
下一步：用户只需做的一件事，或无需做任何事
证据：可展开到官方 Tool / Turn / Event
```

这比“再加一个绿色任务完成大卡”更符合 Soft Harness 的真实产品价值。

### P2：生态进入，而不是生态伪装

- 保留 `Deep Code` 名字；
- 写清独立社区项目和支持版本；
- 做真实 `dsh-deep-code-bridge` 后才打 `dsh-plugin` topic 和提交 1024Store；
- bridge 只补 Deep Code 需要的 seam，不复制 Harness Agent Loop、permission system 或完整 Web UI。

## 7. 最终判断表

| 问题 | 结论 |
| --- | --- |
| 页眉是作者做的吗？ | 外层 Electron desktop frame、窗口按钮/材质/托盘是作者做的；官方 Web 页面自己的 header/sidebar/conversation 不是。 |
| “对话 / 轨迹”是作者做的吗？ | 不是，来自官方 `@deepseek-ai/dsh-client-ui-trajectory` 注册到 `conversation.view` 的 tab。 |
| 顶部彩色轨迹、耗时/轮次/调用是作者做的吗？ | 时间线和折叠/搜索逻辑来自官方；作者的 patch 主要补简体中文和 Thinking label。 |
| Deep Code 可以抄吗？ | MIT 允许有条件复用；复制 substantial code 要保留 notices。更推荐借鉴投影/信息架构或走官方 seam，不 fork 全套 UI。 |
| Deep Code 要改名吗？ | 不需要。保留 `Deep Code`，用副标题说明 built on DSH，并声明非官方。 |
| 现在能提交 1024Store 吗？ | 整个 Electron app 不能名实相符地作为插件提交。先做真实 companion bundle。 |
| Soft Harness 有竞争力吗？ | 方向有：事实、解释、反证、恢复和共同选择权；当前只有工程可理解层，尚未形成完整运行闭环。 |
| 角色卡现在耗 token 吗？ | 不耗；当前只保存/预览，不进入真实 send prompt。它的主要成本是 UI、维护和认知负担。 |

## 8. 来源清单

### DeepSeek Harness 官方

- [DeepSeek Harness 固定提交 `b150a551...`](https://github.com/deepseek-ai/deepseek-harness/tree/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e)
- [Trajectory package README](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/client/ui-trajectory/README.md)
- [Trajectory tab registration](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/client/ui-trajectory/src/client/index.ts)
- [Trajectory timeline](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/client/ui-trajectory/src/client/TrajectoryTimeline.tsx)
- [Session subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/subsystems/session.md)
- [Plugin publish contract](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/user/develop/basic/publish.md)
- [Community contribution guidance](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/CONTRIBUTING.md)
- [Brand Guidelines](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/BRAND_GUIDELINES.md)

### DSH Desktop 项目自身

- [DSH Desktop 固定提交 `681ba660...`](https://github.com/anywhere-labs/dsh-desktop/tree/681ba66091fc5b1e827650137f69b3ee4c435922)
- [项目 README 与上游/桌面职责说明](https://github.com/anywhere-labs/dsh-desktop/blob/681ba66091fc5b1e827650137f69b3ee4c435922/README.md)
- [Desktop 模式与官方 UI 保留边界](https://github.com/anywhere-labs/dsh-desktop/blob/681ba66091fc5b1e827650137f69b3ee4c435922/dsh-plugin-desktop/README.zh.md)
- [Trajectory 中文 patch](https://github.com/anywhere-labs/dsh-desktop/blob/681ba66091fc5b1e827650137f69b3ee4c435922/patches/dsh-client-ui-trajectory%400.1.1-rc.2.patch)
- [固定上游版本清单](https://github.com/anywhere-labs/dsh-desktop/blob/681ba66091fc5b1e827650137f69b3ee4c435922/upstream.json)
- [MIT License](https://github.com/anywhere-labs/dsh-desktop/blob/681ba66091fc5b1e827650137f69b3ee4c435922/LICENSE)

### 1024Store 社区目录

- [固定提交 `7d29c006...` 的贡献规范](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/7d29c006405670a7c7b3089f7654ee4bf7370bdc/CONTRIBUTING.md)
