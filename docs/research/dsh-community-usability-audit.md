# DeepSeek Harness 社区体验报告核查与 Deep code 产品化建议

> 核查日期：2026-08-16
> 社区材料：[《DeepSeek Harness 开源第一天我就上手了——和 Claude Code 的差距比想象中大》](https://juejin.cn/post/7673810995882672128)，kyriewen，2026-08-14。
> 官方基线：`deepseek-ai/deepseek-harness` `master`，提交 [`47f943859bef60e4160492346772ded9b24f765a`](https://github.com/deepseek-ai/deepseek-harness/tree/47f943859bef60e4160492346772ded9b24f765a)。核查时本地 checkout 与远端 `master` 指向同一提交。
> 证据口径：文章只用于记录社区体验与待验证主张；当前事实以固定提交的官方源码和官方文档为准。

## 结论摘要

这篇文章最有价值的不是它给出的配置片段，而是它准确指出了产品定位差异：DeepSeek Harness 当前是快速变化的开发者预览和可组装运行时，不是面向普通用户打磨完成的桌面编码助手。官方 README 仍明确承诺会有破坏性变更，[见 README 第 7–11 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md#L7-L11)。这为 Deep code 的产品机会提供了可靠依据。

但文章中若干“速查表”和代码片段已经过时或只是说明性伪代码，不能直接搬进 Deep code：

- 当前源码要求 Node.js `^22.19.0 || >=24.0.0`，不是文章所写的 Node.js 18+，[见 package.json 第 7–10 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/package.json#L7-L10)。
- 当前标准模式和 PTC 模式已经直接装载 `skill-filesystem` 与 `tool-skill`；“Web 默认关闭 Skills，必须写 patch 才会生效”不再成立，[见标准模式第 78–87 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/config/agent-presets/standard/agent.cordis.yml#L78-L87)。
- PTC 的方向是真的，但当前真实接口是生成的 Code Mode SDK 与 `run_code`，工具调用形态是 `await tools.<name>(args)`；文章中的 `dsh.compose([...])` 不是当前官方示例或 API，[见官方工具开发指南第 61–67 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/cookbook/adding-a-tool.md#L61-L67)。
- Provider 配置已演进为模型设置页、只写凭据和 `llm-pi-ai.providers` 映射；文章中的 `providers: [{ name, kind, base_url, model, api_key_env }]` 不应作为当前教程，[见模型配置指南](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/guide/providers.md#L5-L29)。
- Python SDK 的“安装后不需要系统 Node.js”目前属实，但官方支持范围是 Linux x64、Linux arm64 与 macOS 14+ arm64；内置示例明确不支持 Windows agent，[见 Python SDK 指南第 7–13 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/guide/python-sdk.md#L7-L13)及[第 98–104 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/guide/python-sdk.md#L98-L104)。

对 Deep code 最重要的当前事实是：`<system-reminder>`、`Current runtime context`、权限快照和 `<available_skills>` 是模型可见的运行上下文，不是 assistant 最终答复，也不是应当混入聊天正文的“思考”。官方 Web 客户端已经通过带来源的 context 节点将它们默认折叠；Deep code 应复用同一语义，而不应靠修改系统提示词或简单删除字符串来掩盖它们。

同时，官方 Harness 已经通过 session history 和实时事件提供结构化的工具 presenter：终端、diff、文件位置、read、search 与 web 卡片。Deep code 无需从 `bash`、`write`、`read` 等名字猜测发生了什么；它可以直接把官方渲染意图翻译成“运行了什么命令、改了哪些文件、是否成功、差异是什么”。这是目前最值得优先落地的产品化 seam。

## 状态分类

本文使用四种标签：

- **confirmed-current**：当前官方固定提交直接支持该主张。
- **outdated**：文章描述过某个早期状态或旧接口，但当前官方状态不同。
- **anecdotal**：单次体验、耗时、效果比较或未来判断，无法由当前源码保证。
- **Deep code actionable**：不要求修改官方 Harness，Deep code 可以在桌面产品层解决或显著改善。

## 逐条核查

| 社区主张或体验 | 状态 | 当前官方事实 | Deep code 应对 |
|---|---|---|---|
| `npx @deepseek-ai/dsh web` 可以快速启动 | **confirmed-current**；“30 秒”属 **anecdotal** | 官方 README 仍以这条命令启动默认 `127.0.0.1:3080` Web UI，[证据](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md#L13-L24)。下载时间受网络、npm 缓存和 native 依赖影响，不是产品保证。 | 首次向导检测 Node、Git、pnpm、构建状态与网络；显示阶段进度和可恢复错误，不承诺固定秒数。桌面发布版最终应尽量把这些前置依赖移出用户心智。 |
| 前置要求为 Node.js 18+ | **outdated / incorrect-current** | 当前根包 engine 是 `^22.19.0 || >=24.0.0`，[证据](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/package.json#L7-L10)。 | 自动检测必须校验真实 semver，而不只是“找到 node.exe”。不满足时展示所需版本与当前版本；教程不要写 Node 18。 |
| Web 默认关闭 Skills，必须用 patch 打开 | **outdated** | 当前标准模式直接装载 `skill-filesystem` 与 `tool-skill`，[证据](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/config/agent-presets/standard/agent.cordis.yml#L78-L87)；PTC 模式亦然，[证据](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/config/agent-presets/code/agent.cordis.yml#L85-L94)。`skill-badge` 等单个 provider 是否启用是另一件事。 | 不生成文章中的 Skills patch。读取当前 preset / catalog 的真实能力并显示“可用、未发现、被 preset 排除、加载失败”。角色卡也不应冒充 skill 已启用。 |
| 启动前必须人工检查并杀掉占用 3080 的进程 | **partly-current**；手工 kill 建议不安全 | 3080 是默认端口，但官方支持 `--port`，[证据](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/README.md#L18-L27)。官方没有把“任意占用者都 kill 掉”作为安全约定。 | Engine supervisor 先判断端口对应的是 Deep code 自己启动的 Harness、外部 Harness 还是未知进程。只终止自己拥有的子进程；未知占用者应建议换端口并解释，不自动杀。 |
| DSH 是 Web UI，不是终端原生产品 | **confirmed-current but incomplete** | 默认入门路径是 Web UI；同时官方还有 headless profile、ACP/JSON-RPC 与 Python SDK。官方架构将 Web UI 和 headless 明确作为不同 bundle，[证据](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/architecture.md#L21-L28)。 | Deep code 采用桌面壳是合理产品层，不是“把网页藏起来”。应直接消费官方 API/event seam，避免嵌入官方 WebView 作为主产品。 |
| 有标准、PTC、极简、创造四种模式 | **confirmed-current** | 当前 shipped preset 正是标准、PTC、极简、创造；标准模式官方描述包括文件编辑、Shell、检索、Skills、计划、目标、子代理和工作流，[标准 preset](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/config/agent-presets/standard/preset.yml)，[PTC preset](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/config/agent-presets/code/preset.yml)，[极简 composition](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/config/agent-presets/minimal/agent.cordis.yml)，[创造 preset](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/config/agent-presets/cordis/preset.yml)。 | 初期不要把四种工程 preset 原名都放给新手。默认使用标准模式；将 PTC/极简/创造放入“高级模式”，并用结果导向文案解释适用场景和风险。 |
| PTC 用 TypeScript 确定性组合多步工具调用 | **confirmed-current concept**；文章代码 **outdated / illustrative** | 官方 PTC 描述确为 Code Mode SDK；当前工具通过 `run_code` 与 `await tools.<name>(args)` 调用，且子调用重新进入正常工具流水线，[证据](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/cookbook/adding-a-tool.md#L61-L67)。未找到文章所写的 `dsh.compose` API。 | Deep code 可以把一次 `run_code` 展开成多个子操作，但应保持“一个程序的子步骤”分组；不要在教程里复制文章伪代码。 |
| 一切皆插件，agent loop 也可替换 | **confirmed-current** | 官方架构明确说模型适配器、工具注册表、会话日志和 agent loop 都是插件，可由配置替换，[证据](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/architecture.md#L7-L14)。 | Deep code 应保持 Adapter seam，不把某个内部事件或 YAML 结构散落到 Renderer。插件开发留给高级层，普通任务页只展示能力和影响。 |
| 每个工具都经过 Hook → 审批 → 权限 → 沙箱 → 超时 | **partly-current / oversimplified** | 规范流水线是 `tools/pre-execute` → monotonic guards → `tools/execute` wrappers → `tools/post-execute` → finalize → `tools/result`，[证据](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/tools.md#L168-L176)。`ask` 才进入一次性审批；沙箱属于执行后端或消费方，不是每个工具必经的独立通用阶段；timeout 由工具声明并由 wrapper 执行。 | UI 不应固定画一条虚假的六阶段进度条。只展示实际到达的事件、真实 policy 快照、审批和结果；缺少证据时写“未提供”，不写“已通过”。 |
| 可以写 ESLint 前置 Hook 检查写文件参数 | **confirmed-current capability**；文章类名和事件代码 **illustrative** | 官方确实建议用 `tools/pre-execute` 做 allow/deny/ask policy，并提供 guard、execute、post-execute、result 等扩展点，[证据](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/cookbook/adding-a-tool.md#L57-L60)。文章中的 `ctx.before('tool/file-write', ...)` 不是当前官方插件教程接口。 | 作为未来“团队规则插件”场景保留，不进入新手主路径。教程必须链接官方 basic/plugin 文档并以当前接口重写。 |
| 可以切换近 40 家模型商 | **confirmed-current direction**；精确数字版本相关 | 当前官方提供安装目录 Provider、自定义 Provider、OpenAI compatible discovery 和多种原生认证；官方文档没有将“40”作为稳定 API 保证，[证据](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/guide/providers.md#L15-L29)。 | 从 `llm.providers` / `llm.models` 动态显示，不在界面硬编码“40 家”。对每个 Provider 分开显示“已安装、已配置、发现模型失败、认证方式不支持”。 |
| 在 `settings.yaml` 写文章中的 providers 数组即可配置 Claude/OpenAI | **outdated / incorrect-current** | 当前直接配置属于 `llm-pi-ai.providers` 映射；凭据由引用管理，模型页只写保存密钥。Bedrock、Vertex、Azure、Codex 还分别需要 AWS、ADC、`api-version`、OAuth，不能统一当 API Key，[证据](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/guide/providers.md#L9-L29)。 | Deep code 模型向导按 Provider 的真实认证能力生成表单。不要承诺“一把 API Key 配所有模型”；凭据保持只写，不回显、不进入日志。 |
| DSH 写完 React 组件不会自发 typecheck 或启动页面，而 Claude Code 会 | **anecdotal** | 这是作者各跑一次任务的观察。标准 preset 提供 Shell、文件、计划和工作流，但没有“每次写完都必须运行 tsc 和 dev server”的稳定产品约定；模型可能自行验证，也可能不验证。 | Deep code 不应把单次行为宣传为确定差距。可以做“验证证据”模块：列出实际运行过的测试/类型检查/构建、结果和未验证项；只有看到对应工具结果才显示已验证。以后可提供用户显式选择的“完成前检查”工作流。 |
| Python SDK 安装后无需 Node.js | **confirmed-current with platform limitation** | wheel 携带 runtime，目标机无需系统 Node；但官方快速指南只列 Linux x64/arm64 与 macOS arm64，示例不支持 Windows agent，[证据](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/guide/python-sdk.md#L7-L27)及[第 98–104 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/guide/python-sdk.md#L98-L104)。 | Windows 桌面版不能把 Python SDK 当免 Node 的当前替代部署路线。继续使用官方 npm/source runtime，或等待官方 Windows runtime artifact；界面应明确区分“官方支持”与实验性路径。 |
| DSH 自我纠错“基础”，成熟产品更深 | **anecdotal but product-relevant** | 当前没有一项源码级指标可以把整体成熟度定量为“基础”。官方自己仍标 developer preview，并为 retry、guards、compaction、goals、todos、subagents 提供多个机制。 | 把“Agent 做完了什么”变成证据，而不是宣称聪明或成熟：任务目标、操作时间线、测试结果、文件差异、错误恢复、仍未完成事项。 |

## 用户报告的四个重点问题

### 1. 长回复与屏幕溢出

“回复很长”主要是模型输出与前端排版问题，不宜通过偷偷改写 Harness system prompt 解决。官方 Harness 的模型输出长度、Markdown 结构和任务复杂度都会影响答案；单次长答不表示协议异常。

Deep code 应做的是保留完整答案，同时提供稳定阅读容器：

1. 对话正文有合理最大宽度和段落间距，代码块、表格和长路径在自身容器内横向滚动，不把整页撑宽。
2. Markdown 渲染至少正确支持标题、列表、嵌套列表、代码块、行内代码、链接、引用、表格和安全的换行；当前手写逐行解析器只能覆盖其中一小部分，复杂回复会丢失层级和可读性。
3. 最终答复和运行证据彻底分开。用户可以得到长而完整的最终答复，但不应先穿过几屏运行上下文。
4. 可以在长答顶部生成纯前端的章节目录或折叠长代码块，但不应二次调用模型改写用户已经收到的答案，除非用户明确选择“生成简版”。
5. 不使用固定高度把正文截断，也不默认只显示前 N 字；可读性不等于隐藏交付内容。

这是需要现在做的 UI，但属于**信息架构与排版基础**，不是先做品牌视觉、图标和大规模皮肤系统。品牌级 UI 研究可以稍后；聊天正文、运行详情、工具卡、diff 与审批的层级现在就会决定底层功能能否被理解。

### 2. `<system-reminder>`、runtime context 和 skills 目录暴露

用户看到的以下文本来自当前官方 runtime context 机制：

```text
Current runtime context. This snapshot supersedes earlier runtime-context snapshots.
Current DSH file policy: danger-full-access...
Approval prompts are disabled in this session...
<available_skills>...</available_skills>
```

官方源码明确生成 runtime context 标题，[system-prompt 第 239 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/core/system-prompt/src/index.ts#L239)；sandbox policy 提供三种文件权限快照，[sandbox-policy 第 39–46 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/sandbox/sandbox-policy/src/index.ts#L39-L46)；approval policy 在 `never` 时提供用户看到的原句，[user-approval 第 100 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/interaction/user-approval/src/index.ts#L100)；Skills 插件生成 `<available_skills>`，[tool-skill 第 257–268 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/skill/tool-skill/src/index.ts#L257-L268)。

这些内容有三个不同概念，不能统称为 thinking：

- **运行上下文**：给模型的当前权限、环境、工作区和能力事实。
- **工具活动与结果**：模型调用了什么、执行结果如何、是否改变文件。
- **模型 analysis**：内部推理流；Deep code 不应展示或持久化为用户可见说明。

当前官方 Web UI 的处理方式已经给出可靠范式：context message 进入独立的“上下文注入”行，`open` 初始为 `false`，[ContextInjectionRow 第 22–35 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/client/ui-conversation/src/client/chat/ContextInjectionRow.tsx#L22-L35)。其 snapshot body 又会利用 source 中的命名 sections 拆开显示，不把整段文本当一个墙，[ContextBody 第 350–410 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/client/ui-conversation/src/client/chat/ContextBody.tsx#L350-L410)。

因此 Deep code 的正确方案是：

1. 以 `user/message.source`、`source.form` 和 `source.sections` 为第一真源，将非用户来源的消息从聊天正文移入默认折叠的“运行详情”。
2. 运行详情摘要只显示普通人需要知道的事实，例如“完全文件访问”“审批关闭：需要批准的操作会自动拒绝”“已载入 4 个 Skills”。
3. 完整原文留在第二层“技术详情”中，可访问、可复制，但默认关闭。
4. 不把这一区域叫“思考”。可以采用“运行详情 · 用时 2 分 14 秒”的一行 disclosure，展开后分成权限、文件改动、操作、上下文与技术证据。
5. 字符串检测只作为旧日志或未知 source 的兼容回退；当前官方事件应按 source 元数据解析。仅按 `<system-reminder>` 正则分类会在协议改变、文本本地化或用户真的输入同名标签时误判。

### 3. 权限、工具与文件改动没有“说人话”

官方 Harness 已经提供比工具名更可靠的产品数据。工具定义可返回下列 presenter render intents：

- `generic`：标题、类别、原始输入、正文、文件位置；
- `terminal`：命令标题、描述、工作目录、输出、退出码与 signal；
- `diff`：文件路径、旧文本、新文本或已应用 hunks；
- `read`：路径、行号范围、总行数、语言和内容；
- `search`：按文件分组的匹配或路径列表，并标记是否截断；
- `web`：搜索来源或 fetch URL、状态码和截断状态。

固定定义见[工具 subsystem 第 461–464 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/tools.md#L461-L464)。Host API 会对调用执行 `presentCall`、对结果执行 `presentResult`，[api-proxy 第 754–775 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/host/apiproxy/src/api-proxy.ts#L754-L775)，并把它们作为 session history / event 的可选 `view` 返回；wire 形态是：

```ts
{
  event: { type: 'tool/call' | 'tool/result', ... },
  view?: {
    for: 'call' | 'result',
    view: { card: 'generic' | 'terminal' | 'diff' | 'read' | 'search' | 'web', ... }
  }
}
```

对应 schema 见[sessions.schema.ts 第 195–205 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/host/apiproxy/src/api/sessions.schema.ts#L195-L205)和[events.schema.ts 第 40–46 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/host/apiproxy/src/api/events.schema.ts#L40-L46)。

这带来一个具体实现约束：Deep code 必须读取 `entry.view.view`，不能假设标题直接在 `entry.view.title`。在本报告核查时，Deep code 的新 conversation projection 测试使用了扁平 `view: { title: ... }` fixture；如果不补官方 wrapper 形态，真实 Harness 的 presenter 标题、locations 与 diff 会被漏掉，然后 UI 又退回从工具名猜测。这应作为当前切片的阻塞测试修复。

建议的展示层级：

- 折叠行：`运行详情 · 用时 2 分 14 秒 · 改动 3 个文件`。
- 权限：只显示最新有效 snapshot，并说明实际含义；旧 snapshot 标记为已被替代。
- 操作：使用 presenter title，例如“读取 package.json”“运行 npm test”，配状态与用时。
- 文件改动：以 result diff 为权威；调用了 `write` 但失败时绝不计为已改动。
- 命令：显示命令、工作目录、退出码；stdout/stderr 默认折叠。
- 搜索与读取：显示范围和截断状态，避免用户把局部结果当完整结果。
- 未提供 presenter 的第三方工具：再退回安全的通用工具卡，并明确“Harness 未提供更详细说明”。

### 4. Windows、安装、模型配置与会话

#### Windows 与安装

- npm/Web 主路径当前支持 Windows 标准 preset：Windows 装载 `tool-pwsh` 而不是 bash，[标准 preset 第 42–51 行](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/config/agent-presets/standard/agent.cordis.yml#L42-L51)。
- 源码构建要求严格 Node 版本、pnpm 和完整 build；对普通用户仍属高门槛。
- Python SDK 目前不是 Windows 桌面版替代路线。
- Deep code 应把 Harness checkout、npm 发布包与未来官方 artifact 视为可替换 runtime provider；不要让 Renderer 依赖 checkout 文件布局。
- 自动安装要显示精确阶段：依赖检查、clone/download、install、build、profile 初始化、Engine ready；失败后能从上次安全阶段重试。

#### 模型配置

- 官方模型页已经实行密钥只写、UI 永不收到明文密钥，[证据](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/guide/providers.md#L5-L14)。Deep code 应继续只使用 Credentials seam。
- “已保存凭据”不等于“真实模型调用成功”。模型目录、凭据来源、Provider 认证和真实请求应分别呈现。
- 自定义 OpenAI compatible Provider 需要 provider id、base URL、协议、凭据和至少一个模型；获取模型列表只支持相应协议并可能被端点拒绝。
- 不能把“模型数量”当健康度；应显示活动 Provider、各自模型数、认证状态和失败原因。

#### 工作区与会话

- 官方 CLI 以启动目录作为默认文件系统位置，但新的 Web UI 在用户添加并选择 workspace 前不会选择 workspace，[证据](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/guide/index.md#L5-L15)。Deep code 选择“先创建安全工作区，再允许任务”是合理的新手保护。
- 已发送请求的 session 会保留日志中记录的模型；切换默认模型不会偷偷改变旧会话，[证据](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/guide/providers.md#L82-L88)。Deep code 应在旧任务上显示“此任务仍使用 X”，并提供显式“用新模型开始新任务”。
- Python/JSON-RPC 文档明确区分新 session id 和复用 id：复用会延续对话与持久 shell 状态，[证据](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/guide/python-sdk.md#L98-L100)。Deep code 的本地 task id 与 Harness session id 必须保持一对一、可恢复且不可混用。
- 恢复会话时，应先读取完整或分页 history 建立快照，再接实时 mux；不能只靠连接后的新事件，否则会漏掉早期权限与文件操作。

## 对 Deep code 的优先级建议

### P0：本轮立即做

1. **会话投影按官方 source/form 分流**：最终回答留在 conversation；runtime context 默认折叠；`assistant/analysis` 永不进入用户可见正文。
2. **修正 presenter wrapper 兼容**：同时覆盖 history 与 mux 的 `{ for, view }` 形态，补协议真实 fixture 测试。
3. **使用 presenter 生成工具卡**：优先消费 `title`、`card`、`locations`、`diffs`、`cwd`、`exitCode`、`truncated`；只在 presenter 缺失时从工具名回退。
4. **运行详情人类化**：一行摘要；权限、文件改动、操作三块默认可读；原始 context/JSON 放第二层技术 disclosure。
5. **长回复阅读基础**：采用成熟、安全的 Markdown renderer 或完整 Markdown AST；限制内容宽度，不限制完整内容；代码、表格和长路径局部滚动。
6. **验证证据**：只有实际看到 test/build/typecheck/tool result 才写“已验证”；失败或未运行要明确区分。

### P1：好用的编码 Agent 基线

1. 文件改动面板支持 inline diff、按文件折叠、成功/失败/仅尝试区分。
2. 命令卡显示 cwd、退出码、耗时和折叠输出；危险命令在 Decision Gate 中先给影响翻译。
3. 任务完成摘要从真实事件派生：完成事项、改动文件、运行验证、未完成与错误；不是再调用模型编一份总结。
4. 会话恢复、分页 history、断线重连和 stale gate fail-closed 的完整人工验收。
5. 安装与 Runtime compatibility matrix：Node 版本、checkout commit、Engine API 可用性、Windows PowerShell provider、端口归属。

### P2：角色卡差异化

角色卡的当前价值感不强，不能靠增加描述文本解决。它需要一条可观察的受控链路：

```text
用户选择卡组
→ 预览最终注入内容
→ 仅对新会话生效
→ session 记录使用的卡版本/摘要
→ 回复中可验证地体现语言、关系称呼、解释深度或交互节奏
→ 永不改变权限、工具、审批或 sandbox
```

在 P0/P1 没有稳定之前，角色卡会被运行噪声、长文本和弱工具反馈淹没；用户无法分辨“角色卡没有生效”还是“界面没有呈现效果”。因此先完成好用的 Agent 工作台是正确顺序。后续做角色卡时，应提供显式的 A/B 预览或新会话试答，而不是在后台悄悄混入大段 persona。

## 不应采纳的方案

- 不通过要求模型“不要输出 system-reminder”解决 UI 投影错误；那些内容本来就是给模型的事实。
- 不把 runtime context、tool logs 与 chain-of-thought 混成一个“Thinking”区；三者隐私和真实性不同。
- 不用工具名正则作为文件改动权威；必须等成功 result，并优先消费 diff presenter。
- 不自动 kill 任意占用 3080 的进程。
- 不硬编码 Provider 数量、模型列表、Skills 默认状态或文章里的旧 YAML。
- 不在 Windows 桌面版宣传当前 Python SDK 为免 Node 部署方案。
- 不把一次任务是否自发运行 `tsc` 当作 Harness 固定能力或固定缺陷。
- 不为了“回复更短”静默截断最终答复，或让角色卡暗中改变审批与工具权限。

## 可验收的最小场景

下一次桌面 QA 至少应覆盖以下无敏感临时工作区场景：

1. 提问一个纯解释问题：聊天正文只显示用户问题与 assistant 最终回答；runtime context 收进默认关闭的运行详情。
2. 让 Agent 读取一个文件：操作卡采用官方 read presenter 标题和路径；不计入文件改动。
3. 让 Agent 新建一个无害文本文件：result 成功后出现文件改动和 diff；调用失败时不出现“已改动”。
4. 运行一个成功命令和一个失败命令：分别显示 cwd、退出码与状态，输出默认折叠。
5. 触发一次审批：用户看到工具、理由、一次性允许与拒绝；拒绝后不产生文件改动。
6. 切换 permission preset：只把最新 runtime snapshot 作为当前权限；旧 snapshot 保留在技术证据但标明已失效。
7. 关闭/重开 Deep code：恢复同一任务时先载入 history，再接实时事件，不重复最终回答或操作。
8. 在窄窗口显示一篇长 Markdown 回复：页面不横向溢出，代码块/表格局部滚动，运行详情仍能访问。

完成这些场景后，Deep code 才真正把“developer preview 翻译成人类界面”：不是隐藏 Harness 的能力，而是利用 Harness 已经提供的 provenance、presenter、permission 与 session 事实，建立普通人能读懂、能信任、能控制的桌面产品。
