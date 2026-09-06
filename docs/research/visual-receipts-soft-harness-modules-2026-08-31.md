# Deep Code 可视化工作回执与 Soft Harness 可复用模块评估

> 快照日期：2026-08-31（Asia/Shanghai）
> 证据范围：官方仓库、固定 commit、官方协议与许可证。
> 产品边界：Harness、文件系统、Git 与用户确认的记忆记录仍是事实来源；任何图、时间线、diff 或 telemetry 只能是可重建的只读投影。

## 结论

Deep Code 不需要先建设一个“大而全的 Agent 可视化平台”。最有效的下一步是把现有 Outcome / Evidence / Recovery 变成三个相互连通的证据视图：

1. **只读任务轨迹**：输入、模型、工具、等待用户、文件改变、验证和终态的时间关系。
2. **可信文件 Diff**：明确 before / after 来源，显示实际改变而非模型自述。
3. **带 provenance 的证据图**：工具、文件、测试、依赖与已确认关系之间的因果连接。

推荐组合是：

| 项目 | 决策 | 用途 |
| --- | --- | --- |
| Archify | **BORROW / 可选工件生成；暂不直接采用旧 DSH 插件** | Project Brief、架构 / workflow / lifecycle 的按需解释性 HTML 工件 |
| vis-timeline | **ADOPT** | 只读任务轨迹与耗时回执 |
| Monaco Editor Diff | **ADOPT，但先做体积原型** | 文件改变、before / after 证据 |
| Cytoscape.js | **BORROW → 条件采用** | 项目依赖与证据图；关系记忆需等待正式 schema |
| OpenTelemetry JS | **BORROW 语义，拒绝当前完整运行时** | span 词汇、耗时与失败归因 |
| Mermaid | **REJECT 当前运行时；保留导出方向** | 后期静态说明图，不承担实时状态 |

统一的不变量是：

```text
Harness / Git / 文件系统 / 用户确认记录
                    ↓
             版本化只读投影
                    ↓
       Timeline / Diff / Graph / Receipt
```

关闭并重新打开视图后，如果不能从上游事实重建，它就在形成第二套 execution truth，不能进入 MVP。

## 1. Archify：适合作为解释性工件，不适合作为运行状态

### 1.1 当前许可证、版本与维护状态

- 官方仓库：[tt-a1i/archify](https://github.com/tt-a1i/archify)
- 固定 commit：[`5de7275fe87a66a19d52a4d9b0b3a4f2a5a90115`](https://github.com/tt-a1i/archify/tree/5de7275fe87a66a19d52a4d9b0b3a4f2a5a90115)，提交时间 2026-08-30。
- 固定源码中的 Skill 版本：`2.16`；Node.js `>=18`。
- 许可证：MIT，版权同时保留 Archify 与其 MIT 上游 Cocoon AI 的声明。[固定 LICENSE](https://github.com/tt-a1i/archify/blob/5de7275fe87a66a19d52a4d9b0b3a4f2a5a90115/LICENSE)
- Skill package 的 renderer 运行时使用已提交的 standalone validators；AJV、parse5、saxes 和 simple-icons 是开发依赖，而不是生成工件时必须动态下载的运行时依赖。[固定 package.json](https://github.com/tt-a1i/archify/blob/5de7275fe87a66a19d52a4d9b0b3a4f2a5a90115/archify/package.json)

### 1.2 集成方式

Archify 不是一个实时 React / Electron 组件库。它是一套 Agent Skill + typed JSON IR + 校验器 + renderer，输出自包含 HTML 及可选 PNG / SVG / WebM 等工件。五种 IR 是：architecture、workflow、sequence、dataflow、lifecycle；每一种都先做 schema 和布局检查。[固定 Skill](https://github.com/tt-a1i/archify/blob/5de7275fe87a66a19d52a4d9b0b3a4f2a5a90115/archify/SKILL.md)；[IR schema 说明](https://github.com/tt-a1i/archify/blob/5de7275fe87a66a19d52a4d9b0b3a4f2a5a90115/archify/schemas/README.md)

它对 Deep Code 最合适的用法是：

- 用户明确请求“解释这个项目结构 / 工作流 / 生命周期”时，生成一次可审阅工件；
- 将 Project Brief 中经过证据确认的结构投影为 typed IR；
- 把 JSON spec、HTML、校验 receipt、固定 commit 和来源文件一起保留；
- 从 Deep Code 打开该本地工件，并能返回 Evidence Drawer 中的原始来源。

### 1.3 输出边界

Archify 的 schema 和 validation 能证明：

- IR 形状、引用、稳定 ID 与几何检查通过；
- 可选的 repository evidence 能与指定 GitHub repo、完整 commit、blob 和行范围匹配；
- delivery 命令确实产出了与已冻结 spec 对应的 HTML，并给出摘要。

它不能证明：

- 图完整描述了实际运行时；
- 组件、部署 owner、权限或数据流由代码自动发现；
- Agent 没有遗漏关键节点或错误解释关系；
- 通过 schema / layout 检查等于系统正确运行。

官方 schema 文档也明确说明 engineering profile 只校验“作者写入的 IR”，不发现基础设施、不推断 owner，也不证明图等于 live environment。[IR schema：Visual quality and engineering truth](https://github.com/tt-a1i/archify/blob/5de7275fe87a66a19d52a4d9b0b3a4f2a5a90115/archify/schemas/README.md)

因此 Archify 工件必须标成：

```text
解释性视图
来源：哪些文件 / commit / Harness events
未知：哪些关系没有证据
校验：IR 与布局检查，不是运行时验证
```

### 1.4 DSH 插件边界

官方仓库中的社区包 `@tt-a1i/archify-dsh@0.1.0` 是 Skill-only bundle，不注册新工具、Web 客户端、telemetry、network、credentials、background service 或 install hooks；生成物仍是普通 workspace 文件。[固定 DSH integration README](https://github.com/tt-a1i/archify/blob/5de7275fe87a66a19d52a4d9b0b3a4f2a5a90115/integrations/deepseek-harness/README.md)

但该包只承诺实验兼容 `@deepseek-ai/dsh@0.1.0-rc.6`，而本轮核查的 Harness 已是 `0.1.2-alpha.2`。它不能因为 package manifest 合法就直接视为当前兼容。Deep Code 应：

- 暂不把旧 `0.1.0` 包放进默认安装路径；
- 若要采用，先在当前固定 Harness 版本上重做 canary、bundle load、Skill discovery、生成与卸载验证；
- 优先把 Archify 作为可选 Skill / 外部工件，而非 Deep Code 实时 UI 依赖。

### 1.5 供应链成本与决策

- **优点**：MIT；renderer 输出自包含；standalone validator 降低运行期 npm 依赖；DHS integration 没有安装脚本与秘密处理。
- **成本**：Skill 会调用 Node 和本地文件；完整视觉检查依赖可用 Chrome / Chromium；一般 Skill 有一次更新检查逻辑，而固定 DSH `0.1.0` snapshot 明确排除了该 notifier；旧 DSH compatibility 需要重新验证。
- **风险**：模型生成的结构图具有很强视觉权威感，容易让推断看起来像事实。

**决策：BORROW。** 采用 typed IR、receipt、稳定 ID、来源链接与 fail-closed validation 思想；将 Archify 保留为 opt-in 工件生成器。当前不把其旧 DSH 插件当作默认依赖，也不把 HTML viewer 作为实时任务状态层。

## 2. Codex app-server：哪些数据可以形成可视化回执

固定参考版本：OpenAI Codex [`d58d0e5841e0de08e251673db2d5af8cf3a1ad51`](https://github.com/openai/codex/tree/d58d0e5841e0de08e251673db2d5af8cf3a1ad51)，Apache-2.0。[app-server README](https://github.com/openai/codex/blob/d58d0e5841e0de08e251673db2d5af8cf3a1ad51/codex-rs/app-server/README.md)

Deep Code 不应复制 Codex 状态，而应借鉴它如何把执行事实分成可组合的实体。

### 2.1 可直接借鉴的数据契约

| 数据 | Codex 公开形状 | 可视化用途 | Deep Code 边界 |
| --- | --- | --- | --- |
| Turn lifecycle | `turn/started`；`turn/completed` 的状态为 completed / interrupted / failed | 一轮的主轨道、终态、停止原因 | 必须用 Harness 对应终态；不能由最后一条文字推断 |
| Item lifecycle | `item/started` → deltas → `item/completed` | 工具、回答、文件、审批的独立轨迹条目 | 每个条目以 task / turn / item ID 隔离 |
| Command execution | command、cwd、status、aggregatedOutput、exitCode、durationMs | 命令摘要、耗时、成功 / 失败、展开日志 | 显示值可能已经过上游脱敏；不可当作可再次执行的 argv |
| File change | `changes[{path, kind, diff}]` 与 status | 文件列表、单文件 diff、改动状态 | completed 才是终态；模型说“已修改”不构成证据 |
| Turn diff | `turn/diff/updated {threadId, turnId, diff}`，为该轮聚合 unified diff snapshot | “本轮改了什么”总览 | 读取最新快照，无需在客户端拼多个 patch；若 Harness 无等价事件则不能仿造 |
| Structured plan | `turn/plan/updated {turnId, explanation?, plan[{step,status}]}` | 计划 checklist、进度条 | 使用宿主状态；plan item delta 仍是 experimental，不进入持久产品契约 |
| Review | `review/start` + entered / exited review mode；最终 review 是一段 plain text | 独立审查轮、开始 / 完成标记、原文 review card | 不能把 plain text 强行解析成权威的 severity / finding graph |
| Usage | `thread/tokenUsage/updated`；turn 终态；可选 raw response usage | 本轮 / 累计 token、上下文占用、用量来源 | raw event 为内部实验且不累计 / 不持久；金额仍需 Provider 事实 |
| Approval / Ask | 带 thread / turn / item / request ID；resolved 后 item completed | 轨迹中的等待区间、决定和最终结果 | 表单必须留置；resolved / terminal 事件才结束等待 |

上述形状均来自固定 app-server README 中的 Turn events、Items、Approvals、Review 和 Usage 章节。[固定 app-server README](https://github.com/openai/codex/blob/d58d0e5841e0de08e251673db2d5af8cf3a1ad51/codex-rs/app-server/README.md)

### 2.2 推荐的工作回执结构

```text
Task
 ├─ Turn 1 ─ user input
 │   ├─ model wait
 │   ├─ tool: read
 │   ├─ tool: command (exit 0, 2.1 s)
 │   ├─ file change (2 files)
 │   ├─ approval wait (43 s, user accepted)
 │   └─ turn completed
 └─ Turn 2 ─ verify
     ├─ tests (1 failed)
     └─ turn failed / recovery available
```

主对话只显示人话里程碑；轨迹视图可展开原始工具和 diff；Outcome 引用对应 event IDs。这样“正在发生什么”与“技术证据”不再把答复切成 CLI 碎片。

### 2.3 不应可视化成产品事实的数据

- **Raw chain of thought / reasoning content**：不进入普通 UI；最多使用上游明确提供的可公开 reasoning summary，并默认折叠。
- **模型生成的计划文字**：只有宿主提供结构化 plan status 时才画进度；不要从自然语言中的“第一步、第二步”推断状态。
- **auto-approval review**：固定 README 明确标为 unstable / temporary，当前不绑定 UI 契约。
- **`item/fileChange/patchUpdated`**：受 feature flag 控制，只适合预览；最终仍以 completed fileChange / 文件系统 / Git 为准。
- **plain-text review finding**：作为可读审查结果，不冒充结构化缺陷数据库。
- **rawResponse usage**：内部、实验、不可持久恢复；不能替代线程累计用量。

## 3. vis-timeline：任务轨迹

- 官方仓库：[visjs/vis-timeline](https://github.com/visjs/vis-timeline)
- 固定 commit：[`67b24bb2b80bf5fef510476b2897e0a3e32f3f63`](https://github.com/visjs/vis-timeline/tree/67b24bb2b80bf5fef510476b2897e0a3e32f3f63)
- 快照稳定版：`8.5.4`；2026-08 仍有稳定发布与维护。[Releases](https://github.com/visjs/vis-timeline/releases)
- 许可证：`Apache-2.0 OR MIT`，Deep Code 可选择 MIT 并保留相应 notices。[固定 package.json](https://github.com/visjs/vis-timeline/blob/67b24bb2b80bf5fef510476b2897e0a3e32f3f63/package.json)

### 采用方式

vis-timeline 提供不依赖 React 的浏览器构建，适合当前 Electron Renderer。规范化事件可以映射为：

```js
{
  id: harnessEventId,
  group: "input" | "model" | "tool" | "approval" | "result",
  start,
  end,
  content,
  className
}
```

第一版用途：

- 顶端紧凑轨迹；
- Input / Model / Tools / Approval / Result 分组；
- 点击打开现有 Evidence Drawer；
- 显示排队、模型等待、工具执行、等待用户与 Recovery 的真实区间；
- 不把每一条工具调用铺进主对话。

### 边界和供应链成本

- 必须显式 `editable: false`，禁用新增、删除、拖动和换组；官方组件本身支持编辑，配置失误会让用户“移动事实”。[官方 Timeline 文档](https://github.com/visjs/vis-timeline/blob/67b24bb2b80bf5fef510476b2897e0a3e32f3f63/docs/timeline/index.html)
- npm 包产物较大；没有声明运行时 dependencies，但 standalone bundle 仍可能显著增加 Electron 包体，必须固定版本、使用本地资源并测量打包增量。
- 不使用运行时 CDN 或 `latest`。
- 每项保存上游 event ID；重载后从 Harness 历史重建；条目存在与否不能决定 Task 终态。

**决策：ADOPT。** 这是最小、最接近当前产品缺口的可视化模块。

## 4. Monaco Editor Diff：文件改变证据

- 官方仓库：[microsoft/monaco-editor](https://github.com/microsoft/monaco-editor)
- 固定 commit：[`d620ca0c03d24a51c05ae4dca8a9d5923a4aeb9c`](https://github.com/microsoft/monaco-editor/tree/d620ca0c03d24a51c05ae4dca8a9d5923a4aeb9c)
- 快照稳定版：`0.56.0`；2026-07 发布，固定 commit 时间为 2026-08-27。[Changelog](https://github.com/microsoft/monaco-editor/blob/d620ca0c03d24a51c05ae4dca8a9d5923a4aeb9c/CHANGELOG.md)
- 许可证：MIT。[固定 LICENSE](https://github.com/microsoft/monaco-editor/blob/d620ca0c03d24a51c05ae4dca8a9d5923a4aeb9c/LICENSE)

### 采用方式

使用 `monaco.editor.createDiffEditor()`，仅在 Evidence Drawer 或“改动”页懒加载：

```text
Harness file-change event
       ↓
可信 before：Git blob / 明确预写入 snapshot / Harness 正式 before
可信 after：当前文件系统重新读取
       ↓
read-only original + modified models
```

### 边界和供应链成本

- 包体、worker、CSS、字体和语言资源成本高；先做只包含 editor core + diff + 少量常用语言的 ESM bundle 原型。
- 官方 AMD 构建已走向 deprecated；当前 Deep Code 没有 bundler，不能把旧 AMD loader 作为长期集成方式。[官方 README](https://github.com/microsoft/monaco-editor/blob/d620ca0c03d24a51c05ae4dca8a9d5923a4aeb9c/README.md)
- 固定版本包含自己的 Markdown / sanitization 依赖面；不要在 Deep Code 中形成第二条回答 Markdown 渲染链。
- 默认 `readOnly: true`。若未来允许编辑，保存必须是显式新动作，写入后从文件系统重新读取确认。
- 只有“工具写过这个路径”而没有 before 内容时，不能生成伪造 diff；应显示“文件已发生改变，但 Engine 未提供可验证 before”。

**决策：ADOPT，但晚于 timeline。** 先验证 Electron 最终包体增量与 worker 路径。

## 5. Cytoscape.js：项目图与关系记忆图

- 官方仓库：[cytoscape/cytoscape.js](https://github.com/cytoscape/cytoscape.js)
- 固定 commit：[`fd3595bbf0eaac76ef2a6984a29e85703c239703`](https://github.com/cytoscape/cytoscape.js/tree/fd3595bbf0eaac76ef2a6984a29e85703c239703)
- 快照稳定版：`3.34.2`，2026-08-25 发布。[Releases](https://github.com/cytoscape/cytoscape.js/releases)
- 许可证：MIT。[固定 LICENSE](https://github.com/cytoscape/cytoscape.js/blob/fd3595bbf0eaac76ef2a6984a29e85703c239703/LICENSE)

### 采用方式

Cytoscape.js 是原生 JS / ESM / UMD 图模型和 renderer，不要求 React，核心包无运行时 dependencies。它适合两个严格隔离的视图：

1. **项目 / 证据图**：入口、目录、依赖、工具、文件改变、测试和失败结果。
2. **关系记忆图**：只有用户确认并可撤回的偏好、事件、修复方式与协作规则。

项目图每个 node / edge 必须携带：

```text
provenance
source event / file / commit
fact | inference
validity / expiry
```

### 边界和供应链成本

- 固定稳定 npm 版本，不跟随官方默认 `unstable` 分支 HEAD。
- 第一版使用 core 内置 layout；不先引入 ELK、fcose 等额外布局扩展。
- 图坐标是 UI 状态，不具有语义。
- 推断关系使用明显不同样式，不能自动持久化。
- Cytoscape graph model 不能成为关系记忆数据库；正式记忆仍是用户可查看、修改、拒绝、过期和删除的结构化记录。
- “关系强度 0.8”之类模型自产数字不是关系事实。

**决策：BORROW → 条件采用。** 项目 / 证据图可以较早采用；关系记忆图必须等 Soft Harness 有正式、用户可控的 memory schema 后再启用。

## 6. OpenTelemetry JS：只借语义

- 官方仓库：[open-telemetry/opentelemetry-js](https://github.com/open-telemetry/opentelemetry-js)
- 固定 commit：[`f41805e769ba10fb6dae72a4b7a5a3dc67cca82e`](https://github.com/open-telemetry/opentelemetry-js/tree/f41805e769ba10fb6dae72a4b7a5a3dc67cca82e)
- 快照稳定版：`2.10.0`；固定 commit 时间为 2026-08-31。
- 许可证：Apache-2.0。[固定 LICENSE](https://github.com/open-telemetry/opentelemetry-js/blob/f41805e769ba10fb6dae72a4b7a5a3dc67cca82e/LICENSE)

OpenTelemetry 不是 UI 库。当前最有价值的是借用 span 词汇：

```text
session span
  └─ turn span
      ├─ model span
      ├─ tool span
      ├─ approval_wait span
      └─ recovery span
```

Deep Code 先实现一个纯派生层：

```ts
type DerivedSpan = {
  eventIds: string[]
  parentId?: string
  kind: "turn" | "model" | "tool" | "approval_wait" | "recovery"
  startedAt: number
  endedAt?: number
  status: "running" | "ok" | "error" | "aborted"
}
```

这些对象每次从 Harness events 派生，不持久化为 Session 状态机。

### 边界和供应链成本

- 完整 SDK、auto-instrumentation、exporter 与 Collector 会增加依赖、启动逻辑、环境变量、远程网络、认证、数据保留与隐私成本。
- Electron Main / Renderer 的 context propagation 也会扩大复杂度。
- 官方说明浏览器 client instrumentation 仍有实验边界；当前不应自动 patch Electron / Node 模块。[官方 README](https://github.com/open-telemetry/opentelemetry-js/blob/f41805e769ba10fb6dae72a4b7a5a3dc67cca82e/README.md)
- Telemetry 可能丢失、延迟或被抽样：span 结束不能判定 Harness Task 完成，缺少 span 也不能判定工具没运行。

**决策：BORROW。** 当前不安装完整 SDK，只借 span / status / duration / attribute 语义统一本地回执。

## 7. Mermaid：暂不进入运行时

- 官方仓库：[mermaid-js/mermaid](https://github.com/mermaid-js/mermaid)
- 固定 commit：[`a8bff7b01acf24b080ecce973b940373eea79aac`](https://github.com/mermaid-js/mermaid/tree/a8bff7b01acf24b080ecce973b940373eea79aac)
- 快照 npm 版本：`11.17.2`；2026-08 仍有维护。
- 许可证：MIT。[固定 LICENSE](https://github.com/mermaid-js/mermaid/blob/a8bff7b01acf24b080ecce973b940373eea79aac/LICENSE)

Mermaid 适合 Project Brief 中经过确认的 flowchart、sequence 或 state diagram 导出，但不适合实时任务轨迹、交互 diff 或关系记忆数据库。

拒绝当前运行时采用的原因：

- npm 包和直接依赖面较大，包含 D3、Cytoscape、布局、数学与 Markdown / sanitizer 等重复能力；
- 模型生成 Mermaid 文本后渲染出来，会把不完整推断包装成很有权威感的图；
- Deep Code 若已经采用 Cytoscape 和 Archify，再引入 Mermaid 会形成第三套图语义与 renderer；
- 若未来采用，必须固定版本、使用 strict / sandbox、安全禁用任意 HTML、链接与点击脚本，并把图标为“解释性视图”。[官方安全配置说明](https://github.com/mermaid-js/mermaid/blob/a8bff7b01acf24b080ecce973b940373eea79aac/packages/mermaid/src/docs/config/usage.md)

**决策：REJECT 当前运行时。** 保留为独立、按需、受限的报告导出能力。

## 8. Soft Harness 的可复用边界

上述项目没有一个可以直接提供 Deep Code 想要的 Soft Harness。它们只能提供表现层或可观察性词汇：

- vis-timeline 展示选择与结果的时间关系；
- Monaco 展示实际文件证据；
- Cytoscape 展示已确认事实和带来源的推断；
- OpenTelemetry 词汇帮助描述耗时、父子关系与失败；
- Archify 把经过审阅的结构变成可分享工件。

Soft Harness 自身仍需要 Deep Code 的小型、可审阅 schema：

```text
claim
scope
supporting evidence
counter evidence
alternative explanations
confidence band
expiry
provenance
user review state
```

图形库不得改变这些记录，也不得把布局、点击、停留时长或 Agent 推断写成长期关系事实。关系记忆可视化的准入条件应是：

1. 每条记录可查看、修改、拒绝、过期和删除；
2. 事实与推断在数据结构和视觉上都分开；
3. 用户确认前不跨任务持久化；
4. 关系记录不授予工具、Shell、联网、发布或更贵模型权限；
5. Reality、用户和 Agent 都能用新证据推翻旧解释。

## 9. 推荐落地顺序

### 第一阶段：只读轨迹原型

- 引入固定版 vis-timeline；
- 只输入 DSH Adapter 已规范化的一个 Task 的事件；
- 禁用全部编辑；
- 点击定位 Evidence Drawer；
- 重启后从历史重建；
- 验证 Electron 安装包增量、长任务性能与键盘可访问性。

### 第二阶段：可信 Diff 原型

- 构建 Monaco 最小 ESM diff bundle；
- 懒加载、只读；
- before / after 必须标注来源；
- 不能取得可信 before 时明确降级；
- 验证 worker、CSS、字体和最终包体。

### 第三阶段：Project / Evidence Graph

- 固定 Cytoscape 稳定版；
- 先做工具 → 文件 → 测试 → Outcome 图；
- 每条边带 provenance；
- 推断边不持久化；
- 暂不开放关系记忆图。

### 第四阶段：按需 Archify 工件

- 不默认安装旧 DSH integration；
- 针对当前 Harness 做独立 compatibility canary；
- 只在用户明确请求项目 / 工作流可视化时生成；
- 交付 spec、HTML、validation receipt 和来源清单；
- 工件标明它是解释性视图而非 live runtime truth。

### 第五阶段：关系记忆小实验

- 先完成用户可控的 memory schema 与审阅界面；
- 再使用 Cytoscape 投影；
- 不以图的“丰富程度”验收，而以纠错、遗忘、证据追溯和减少返工验收。

这条顺序让 Deep Code 的可视化服务于核心壁垒：用户能沿着“发生了什么 → 为什么 → 改了什么 → 花了多久 → 有何证据 → 如何恢复”连续理解一次 Agent 工作，而不是为产品再建一套漂亮但不可靠的状态系统。
