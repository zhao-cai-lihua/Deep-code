# Soft Harness 一手来源研究卷宗：风格、指令、技能与可审阅记忆

> 调研快照：2026-08-31（Asia/Shanghai）
> 目标：为 Deep Code 的 Soft Harness 建立可验证、可撤回、不会越权的工程边界。
> 证据规则：工程事实只引用官方文档、正式规范或官方仓库固定 commit；研究论文只支持研究假设；“河床”“专属 Agent”“关系成长”等只作为产品隐喻，不作为模型状态或授权事实。

## 结论

Deep Code 不应把“角色卡”继续扩大成一个混合了人格、项目规则、技能、记忆、模型选择和权限的总开关。上游共同证明的成熟方向恰好相反：把不同职责分开，并让来源和作用域可见。

```text
Harness 权限与执行策略       硬约束；Soft Harness 永远不能修改
        ↓
Project Instructions         用户/团队明确拥有的规则
        ↓
Skills                       按需加载的可复用做事方法
        ↓
Response Style               只改变表达方式和解释深度
        ↓
Reviewed Memory              可查看、可反证、可过期、可撤回的辅助召回
        ↓
Session History              当前任务的对话记录，不冒充长期记忆
```

因此，原“角色卡”最值得保留的部分应改名为 **回复风格**；“长期相处感”则不靠每轮注入整张角色卡，而靠一个默认本地、用户可审阅的记忆账本。项目规则让 Agent 可靠，Skill 让它会做事，Memory 让它少重复，Style 让它好相处；四者不能再混成一张卡。

MVP 可以做到 **不增加独立模型调用**：只允许用户显式“记住此项”，或让当前任务在正常回复中提交候选记忆；用本地结构化筛选和关键词检索；用户确认后才进入长期记忆。自动提取、嵌入检索、后台整合属于以后可选且必须单列费用的能力，不是 Soft Harness 成立的前提。

## 1. 证据等级与产品措辞

| 等级 | 本文含义 | 可用于什么 | 不可宣称什么 |
| --- | --- | --- | --- |
| **可验证工程事实** | 上游公开契约、固定源码或协议明确存在的行为 | 设计接口、兼容层、费用和安全边界 | 不可外推为模型心理或用户关系事实 |
| **研究假设** | 论文框架或尚待 Deep Code 实测的产品假设 | 建立原型、A/B 测试、失败判据 | 不可写成“已经证明更懂用户” |
| **产品隐喻** | 帮助普通用户理解的叙事，如河床、共同成长 | UI 命名、引导、回顾 | 不可驱动权限、风险判断或隐藏画像 |

下文中的 `ADOPT` 表示可进入产品契约，`BORROW` 表示只借设计或先做受控原型，`REJECT` 表示不应进入当前 Deep Code。

## 2. OpenAI：公开契约支持“分层”，不支持一张万能人格卡

### 2.1 Codex customization 的职责分离

OpenAI 的公开文档把 `AGENTS.md`、Memories、Skills、MCP 和 subagents 作为互补机制：`AGENTS.md` 承担持久项目指导，Memories 带回先前工作的有用上下文，Skills 承担可复用工作流，MCP 连接外部系统。官方建议 `AGENTS.md` 保持小而稳定；global 文件可放个人沟通偏好，repo 文件放团队和代码库规则，并按离当前目录更近者优先。[Codex customization overview](https://learn.chatgpt.com/docs/customization/overview)；[`AGENTS.md` discovery and precedence](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

Codex Skills 采用 Agent Skills 开放格式。启动时只把 skill 的 `name` 与 `description` 放入目录，命中后才加载完整 `SKILL.md`；官方还提供 `allow_implicit_invocation: false` 禁止隐式触发。这个设计的价值不是“人格”，而是以渐进披露控制上下文成本和误触发。[Build skills](https://learn.chatgpt.com/docs/build-skills)

**判断：ADOPT。** Deep Code 应照此拆分 Project Instructions、Skills 和 Response Style，并显示每一层的来源、作用域与优先级。Style 不得改变工具、Shell、批准策略、Provider、model 或 effort。

### 2.2 Codex local memories 与 Session 不是同一件事

Codex local memories 与 ChatGPT Web memory 分开，并允许分别控制“使用已有记忆”和“允许本任务贡献未来记忆”。官方把团队硬规则放在 `AGENTS.md`，而不是让 memory 成为唯一规则；本地 memory 虽有脱敏步骤，分享前仍要求人工复核，还可排除含 MCP、Web 或 tool-search 外部内容的任务进入记忆。[Codex memories](https://learn.chatgpt.com/docs/customization/memories)

固定源码进一步说明其目标是稳定偏好、失败护栏和 repo map，而不是 secrets、原始大输出或一次性印象；读取契约要求当前环境覆盖过期记忆，写入则经过 consolidation。[memory read contract，Codex `1c1e17782aeb51a5a253997067fa887a9d593cc9`](https://github.com/openai/codex/blob/1c1e17782aeb51a5a253997067fa887a9d593cc9/codex-rs/ext/memories/templates/memories/read_path.md)；[consolidation contract，同一 commit](https://github.com/openai/codex/blob/1c1e17782aeb51a5a253997067fa887a9d593cc9/codex-rs/ext/memories/write/templates/memories/consolidation.md)

OpenAI Agents SDK 的 Session 只是会话历史：后续 run 会重送历史，因此会增加输入 token。其 Sandbox Agent Memory 才是提炼式长期记忆，而且官方明确标为 **Beta**；生成流程包含 conversation extraction 和 consolidation 两个模型阶段，然后用小摘要加按需检索做渐进披露。[Agents SDK sessions](https://openai.github.io/openai-agents-js/guides/sessions/)；[Agent Memory Beta](https://openai.github.io/openai-agents-python/sandbox/memory/)

**成本事实：** 读取已有 memory 主要增加输入上下文 token；Codex/Agents 的后台生成与整合可以产生额外模型调用、token 和额度消耗。不能把“后台整理”包装成免费本地功能。

**判断：BORROW。** 借其读写分离开关、来源记录、渐进披露、过期记忆服从当前事实和按 Agent 隔离；MVP 不直接复制两阶段自动 consolidation，先做显式候选和用户确认。

### 2.3 Codex personality 是表达选择，不是关系记忆

Codex `app-server` 的 Thread 配置公开了 `friendly`、`pragmatic`、`none` 等 personality 选择，但它是启动/恢复 Thread 时的响应方式配置，不是自动学习的关系状态，也不是权限层。[Codex app-server protocol types，固定 commit `d58d0e5841e0de08e251673db2d5af8cf3a1ad51`](https://github.com/openai/codex/blob/d58d0e5841e0de08e251673db2d5af8cf3a1ad51/codex-rs/app-server-protocol/src/protocol/v2.rs)

**判断：ADOPT 其边界，BORROW 其 UI。** Deep Code 可以提供“简洁 / 解释型 / 亲切 / 自定义”列表，但必须明确它只控制措辞、结构和解释密度。

### 2.4 许可与稳定性

Codex 仓库为 Apache-2.0，固定研究快照为 `1c1e17782aeb51a5a253997067fa887a9d593cc9`；许可证不授予商标权。[Codex license](https://github.com/openai/codex/blob/1c1e17782aeb51a5a253997067fa887a9d593cc9/LICENSE) `AGENTS.md` 与 Skills 是正式公开契约；local memories 是 opt-in、仍在演进的能力；Agents SDK Sandbox Agent Memory 明确为 Beta。Deep Code 应兼容概念而不是耦合其内部文件形状。

## 3. Anthropic Claude Code：instructions、auto memory、skills 与 output style 各有边界

### 3.1 `CLAUDE.md` 和 auto memory

Anthropic 明确区分两类持久上下文：`CLAUDE.md` 由用户编写，存放 instructions/rules；auto memory 由 Claude 写入，记录 learnings 和 patterns。两者都只是给模型的 context，不是强制配置；真正要阻止动作应使用 `PreToolUse` hook。[Claude Code memory](https://code.claude.com/docs/en/memory)

Auto memory 自 Claude Code v2.1.59 起默认启用，可通过 `/memory`、`autoMemoryEnabled` 或环境变量关闭；按 repo 隔离、worktree 共享并保存在本机。启动只读取 `MEMORY.md` 前 200 行或 25KB，topic files 由普通文件工具按需读取；用户可以直接检查、编辑和删除。它不会随普通 transcript retention 自动清除，而会持续到用户或 Claude 修改/删除。[Claude Code memory](https://code.claude.com/docs/en/memory)

官方没有承诺 auto memory 每次写入都会另起一个后台提取模型，因此不能声称它必然有 OpenAI 两阶段流程同样的额外调用。但它在当前 Agent 循环中使用普通文件工具读写，工具步骤、读回内容和注入摘要都会增加步骤或 token。过大的 `CLAUDE.md` 也会消耗更多 context 并降低遵循度。[Context windows](https://code.claude.com/docs/en/context-window)

**判断：ADOPT。** 借其本地、项目隔离、有限索引、主题文件、可直接编辑删除；但 Deep Code 的自动写入默认应关闭，写入时提供 receipt 和来源，不采用“Agent 可静默改写用户画像”的默认值。

### 3.2 Skills

Claude Code Skills 同样使用渐进披露：描述先进入上下文，完整正文只在使用时加载。Subagent 则有独立 input/output token，不应与普通 Skill 的成本混为一谈。[Claude Code skills](https://code.claude.com/docs/en/skills)

**判断：ADOPT。** Soft Harness 的协作方法、解释模板和复盘步骤应尽量放入按需 Skill，而不是每轮放进角色卡；同时显示“这次使用了哪个 Skill、为何触发、正文占用了多少上下文”。

### 3.3 Output styles 是最接近“角色卡”的正式机制，但风险也最清楚

Claude Code Output Styles 改变响应方式而不改变模型知识，并会直接修改 system prompt。额外说明会增加输入 token；Explanatory、Learning 等风格通常也增加输出 token。自定义 style 默认可能移除内置软件工程指令，除非设置 `keep-coding-instructions: true`；插件还可强制 style 覆盖用户选择。[Claude Code output styles](https://code.claude.com/docs/en/output-styles)

**判断：BORROW UI，REJECT 危险语义。** Deep Code 的 Style 必须叠加在工程指令之上，不能替换它；插件或角色模板不能强制覆盖用户选择。上游命令面曾随版本变化，因此只抽象“用户选择的 response style”，不硬耦合具体命令。

### 3.4 许可与稳定性

Claude Code 官方公开仓库当前为 `All rights reserved`，不可把仓库实现或 UI 当成可复制开源代码；本文只借鉴其官方文档公开契约。[Claude Code license，固定 commit `f1af9b1f4b1fd4c776135381606edada82ef638e`](https://github.com/anthropics/claude-code/blob/f1af9b1f4b1fd4c776135381606edada82ef638e/LICENSE.md) `CLAUDE.md`、Skills、Output Styles 和 auto memory 均有正式文档，但最低版本和命令面快速变化，Deep Code 必须做能力探测和自己的稳定抽象。

## 4. DeepSeek Harness：已经具备组合 seam，但没有“内置人格记忆”

研究快照固定为 DeepSeek Harness `0a53fb55bea101816fa226bb964ae2bed71c343b`、版本 `0.1.2-alpha.2`、MIT；仍处在 alpha / Developer Preview，文件与事件形状不能视为永久 ABI。[package version](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/package.json)；[license](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/LICENSE)

### 4.1 Persona

`dsh-persona` 在 agent preset 作用域注册 `deployment:persona` system-prompt section。`text` 是必填字段；默认 `complete: false`、`includeRuntimeContext: true`。Persona 文本在该 Agent 的每次请求中占 token，但稳定前缀可以利用 KV cache。[Persona preset README](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/preset/persona/README.md)

尤其危险的是，`complete: true` 可使 persona 成为唯一 system prompt，而 `includeRuntimeContext: false` 会压掉包括 sandbox、approval 和 delegation 在内的 runtime context。这个能力适合上游高级配置，却绝不应被 Deep Code 的普通“回复风格”界面暴露。

**判断：REJECT 当前整卡注入；BORROW 最小 persona seam。** Deep Code 只能生成很短的表达风格片段，并锁定 `complete: false`、`includeRuntimeContext: true`。任何角色卡都不得触碰这两个安全边界。

### 4.2 Agent presets

每个 Session 由一个 preset 目录及 `agent.cordis.yml` 组合 tools、prompt sections 和 Skills；默认值可按 deployment/user 设置。Session 一旦已产生消息或工具调用，composition 即固定，不能当作对话中途热切换的装饰。Preset 与它引用的插件一样有权，官方要求把它视为与 Shell 相同的信任边界。[Agent presets README](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/preset/agent-presets/README.md)

**判断：ADOPT 为高级 Agent 配置，不并入 Style。** Deep Code 可以把 preset 暴露为“工作能力配置”，但安装、权限与来源必须独立审核；不能把换头像或角色名等同于换 preset。

### 4.3 Agent instructions

Harness 会读取用户级 `$DSH_HOME/AGENTS.md`，并沿项目路径加载 `AGENTS.md` / `CLAUDE.md`；先给出有来源的 durable user-role baseline，结构化文件系统触碰后再补充新增、修改或删除。默认 spine 上限为 65536 bytes，广域文件先丢弃、最具体文件最后截断；该过程不使用模型总结。[Agent instructions README](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/context/agent-instructions/README.md)

**成本事实：** baseline 留在历史中直到 compaction，变更会增加有界消息，因此有上下文 token 成本，但没有独立总结模型调用。Instructions 也不能覆盖 system、developer 或直接用户指令。

**判断：ADOPT。** Deep Code 的 Project Instructions 编辑器应显示文件来源、作用域、字节/token 预算和覆盖关系；用户的长期风格若确实稳定，可用极短 global instruction，但不把推断的关系画像偷偷写进去。

### 4.4 Skills

Harness 的 Skills 是分层 provider registry；模型在 Session 开始时只看到名称和描述组成的 durable `<system-reminder>`，正文按需 `get()`，且不缓存。浏览器目录可展示用户可调用元数据。[Skills subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/docs/subsystems/skills.md)

**成本事实：** 目录描述占有界 prompt token，正文只在调用时产生额外上下文；这比每轮注入全部“合作方法”更省。

**判断：ADOPT。** 长篇协作流程、苏格拉底式提问、复盘、证据检查应做成 Skills；只有极短而稳定的表达偏好进入 Style。

### 4.5 Memory

Harness 当前没有随产品交付的内置记忆服务器。官方指南通过 `dsh-mcp-client` 接入外部 memory server；Harness 负责启动 stdio 或连接 HTTP 并暴露工具，但不会替用户下载服务器、初始化数据库、选择 embedding/LLM、创建账户、迁移数据或监管独立 HTTP 服务。[MCP memory guide](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/docs/user/guide/mcp-memory.md)

官方测试参考包括 local heuristic Memorix、MCP Reference Memory 和 Engram。Reference Memory 是本地 JSONL 知识图谱与 substring search，不使用 embedding 或单独 LLM，但 memory 的搜索、读取、写入仍是主模型的工具调用，会消耗本轮工具选择、参数和返回内容 token。其他第三方 Provider 可能另收 embedding、模型和托管费用。

**判断：ADOPT MCP 作为可选扩展边界，REJECT 把任意 memory server 默认打包为人格真相。** MVP 的可审阅记忆应由 Deep Code 本地拥有；第三方 memory 接入必须展示网络目的地、数据类型、费用和删除能力。

## 5. 可借鉴的开源模块与研究框架

### 5.1 MCP Reference Memory：轻量原型，不是最终记忆引擎

| 项目 | 固定快照与许可 | 可验证边界 | 决策 |
| --- | --- | --- | --- |
| MCP Reference Memory Server | `modelcontextprotocol/servers` commit `a6cdbf4deac97aac5c9b76bd12d38eace78dac01`；代码 MIT，文档 CC-BY-4.0 | 实体、关系、原子 observation 的本地知识图谱；支持创建、删除、读取、搜索和打开节点；不使用 LLM/embedding | **ADOPT 作为本地协议样例；REJECT 作为正式长期记忆实现** |

来源：[reference memory source](https://github.com/modelcontextprotocol/servers/tree/a6cdbf4deac97aac5c9b76bd12d38eace78dac01/src/memory)；[repository license](https://github.com/modelcontextprotocol/servers/blob/a6cdbf4deac97aac5c9b76bd12d38eace78dac01/LICENSE)

它的供应链和模型成本都低，适合证明 Deep Code 能以 MCP 方式接入本地记忆；但它没有 observation 级的来源证据、时间有效性、矛盾解释、expiry、自动 forgetting 或权限硬化，substring search 也不足以承担大规模召回。可借它的 CRUD 和图关系，不应把它直接包装成“懂你的长期大脑”。

### 5.2 Graphiti：借双时间与失效，不引入重运行时

| 项目 | 固定快照与许可 | 可验证边界 | 决策 |
| --- | --- | --- | --- |
| Zep Graphiti | `8b61fce9f003cc3a05e246f6201f8b782dfe6546`；Apache-2.0 | 以 episodes 保存原始来源；实体和事实带双时间有效性；新事实可使旧事实失效而非删除；支持 semantic、BM25 与 graph 混合检索 | **BORROW schema；REJECT MVP runtime dependency** |

来源：[Graphiti README](https://github.com/getzep/graphiti/blob/8b61fce9f003cc3a05e246f6201f8b782dfe6546/README.md)；[Apache-2.0 license](https://github.com/getzep/graphiti/blob/8b61fce9f003cc3a05e246f6201f8b782dfe6546/LICENSE)

Graphiti 需要 Python、图数据库，并默认依赖 LLM 与 embedding；入库管线会进行多次模型/嵌入调用，官方也提醒可能出现 rate limit。它把关系或私人资料交给所配置 Provider，隐私面和供应链成本明显高于 Deep Code 当前 MVP。

值得借的是：`source episode → fact → valid_at / invalid_at → superseded_by`。这使“用户后来改了偏好”可以保留历史来源而不让旧偏好继续生效，也能容纳两个竞争解释；不值得借的是把每段对话都自动实体化。

### 5.3 Letta AI Memory SDK：借可见 Block，拒绝“潜意识 Agent”

| 项目 | 固定快照与许可 | 可验证边界 | 决策 |
| --- | --- | --- | --- |
| `letta-ai/ai-memory-sdk` | `4494e00410469082bf298b8b03b7c9f93e244f14`；Apache-2.0；官方标为 experimental | Subject → Blocks → Messages；每个 Subject 建立后台 memory agent；`add_messages()` 会调用该 Agent 更新 blocks，可选 archival/vector memory | **BORROW UI/data separation；REJECT 自动后台运行时** |

来源：[AI Memory SDK README](https://github.com/letta-ai/ai-memory-sdk/blob/4494e00410469082bf298b8b03b7c9f93e244f14/README.md)；[license](https://github.com/letta-ai/ai-memory-sdk/blob/4494e00410469082bf298b8b03b7c9f93e244f14/LICENSE)

README 明确建议把 5–10 条消息批量送入以降低成本，这反过来证明其“潜意识 Agent”会产生独立模型调用、token 和托管成本。若隐藏运行，它还会把未经确认的推断持续改写进用户画像，形成操纵与偏差放大风险。

Deep Code 可以借“短小的 in-context block + 外部 archive + 查看/删除 API”，也可以借 Git 历史式可审计变更；但不应把后台 Agent 称作潜意识，更不能默认从亲密对话中学习。所有候选应先出现在收件箱，只有用户确认后才成为 durable memory。

### 5.4 CoALA：可用的研究词汇，不是工程证明

CoALA 论文把语言 Agent 的记忆区分为工作记忆与长期记忆，并用 episodic、semantic、procedural 等类别讨论决策循环。这可以帮助团队辨认“一个具体项目事实”“一个做事流程”和“一次对话经历”不是同一类数据。[Cognitive Architectures for Language Agents, arXiv:2309.02427](https://arxiv.org/abs/2309.02427)

**判断：BORROW 词汇，不采用为依赖。** 论文不是可集成软件，也没有证明类人记忆结构必然带来更好的亲密感、正确率或长期协作；论文发行权不等于软件许可证。Deep Code 必须用自己的任务完成率、纠正次数、越权率、token 增量和用户撤回率验证设计。

## 6. Deep Code 应采用的最小架构

### 6.1 五个独立对象

1. **Execution Policy**：由 Harness 提供并作为唯一执行真相；只读展示给 Soft Harness。
2. **Project Instructions**：用户明确拥有的文件规则，显示来源、作用域、优先级和 token 预算。
3. **Skill Registry**：只在相关时加载正文；显示触发原因和本轮成本。
4. **Response Style**：极短、可预览、可 A/B 比较；只控制语气、结构、称呼和解释密度。
5. **Memory Ledger**：本地、项目隔离、来源可见、可撤回；与 Session history 分开。

旧角色卡若保留，不再作为每轮完整 prompt，而应拆为：用户明确选择的短 Style、可编辑的 global instructions、按需 Skills，以及经过逐条确认的 Memory。无法归入这四类的亲密叙事只留在 UI 文案，不进入执行上下文。

### 6.2 建议的 Memory record

```ts
type MemoryRecord = {
  id: string;
  kind: "preference" | "procedure" | "project_fact" | "collaboration_rule" | "hypothesis";
  claim: string;
  status: "candidate" | "confirmed" | "disputed" | "superseded" | "expired" | "deleted";
  scope: { type: "user" | "project" | "workspace"; id?: string };
  evidence: Array<{ source: string; excerpt?: string; observedAt: string }>;
  counterEvidence: Array<{ source: string; note: string; observedAt: string }>;
  alternatives: Array<{ claim: string; status: "open" | "rejected" | "preferred" }>;
  validFrom?: string;
  validUntil?: string;
  supersedes?: string[];
  reviewedBy?: "user";
  sensitivity: "ordinary" | "private" | "never_store";
  injectionPolicy: "never" | "on_demand" | "always";
};
```

`hypothesis` 默认不能 `always` 注入；它必须与竞争解释并列，并有“为什么暂时偏向它”的证据。模型自述、亲密隐喻、健康/财务/身份等敏感推断默认 `never_store`。删除不能只是 UI 隐藏，必须说明本地文件、索引、备份和第三方 Provider 的删除范围。

### 6.3 不增加独立模型调用的 MVP 流程

```text
用户点击“记住这件事”
  → 本地表单选择 scope / kind / expiry
  → 保存为 confirmed record
  → 后续任务只载一份很小的可用索引
  → 关键词与结构化条件命中时按需读取正文
  → 回复中显示“本轮参考了 2 条记忆”及来源
```

Agent 也可以在本轮正常结果中提出候选，但只写入 `candidate` 收件箱，不另起模型，不自动生效。用户确认、编辑或拒绝后才改变状态。这样新增成本主要是被读取文本的输入 token，不产生后台 extraction/embedding 账单。

### 6.4 以后才考虑的可选自动化

自动提取与 consolidation 必须满足全部条件：用户单独开启；空闲运行；显示使用的模型、估算/实际 token 和费用；允许排除外部 MCP/Web、私聊和敏感项目；输出仍是 candidate；有一键停用和删除。嵌入检索同样必须展示本地/远端 Provider 与数据去向。

不应承诺“自动记忆永久免费”。可行的费用回执至少分为：

- `style/instructions input tokens`：每轮固定输入；
- `retrieved memory input tokens`：本轮实际召回；
- `memory tool steps`：本地检索/读写；
- `background extraction tokens`：若开启，独立列出模型和费用；
- `embedding/storage/network`：若第三方 memory provider 使用，独立列出。

## 7. 操纵、隐私与安全边界

| 风险 | 形成机制 | Deep Code 的硬边界 |
| --- | --- | --- |
| 信任操纵 | always-on persona 用亲切语气提高服从或依赖 | Style 可预览、可关闭，不以亲密度解锁能力，不把认同作为关系进展 |
| 长期偏见 | 错误自动记忆反复进入未来上下文 | candidate/confirmed 分离；来源、反证、expiry、superseded 状态；用户最终裁决 |
| 权限越权 | Persona/Style 替换 system/runtime context | DSH 固定 `complete:false`、`includeRuntimeContext:true`；Style 永不控制工具和权限 |
| 私密外泄 | 原始私聊、MCP/Web 或 secret 被后台沉淀或送去 embedding | 默认不收集；敏感类别 `never_store`；第三方数据目的地和删除范围显式展示 |
| 画像固化 | 一次情绪或模型推断变成“用户是什么样的人” | 一次性印象不入库；假设须有竞争解释；当前用户陈述覆盖旧推断 |
| 成本隐藏 | 后台提取、整合、embedding 被包装为免费记忆 | 每个后台阶段单列模型、token、费用和开关；低额度时自动跳过而不是静默烧额度 |

## 8. Adopt / Borrow / Reject 总表

### ADOPT

- 权限、Project Instructions、Skills、Response Style、Memory、Session history 六层分离。
- Style 只管表达，默认保持工程指令和 runtime context。
- Memory 本地、按项目隔离、来源可见、读写开关分离、可编辑删除。
- `candidate → confirmed → disputed/superseded/expired/deleted` 的审阅生命周期。
- 小索引 + 按需读取；本轮显示召回来源和 token/费用。
- MCP 作为可选扩展边界，第三方 Provider 必须展示数据去向。

### BORROW

- OpenAI 的渐进披露、读写分离和“当前事实覆盖旧记忆”。
- Claude 的有限索引 + topic files，但阈值要用 Deep Code 实测，不照抄 200 行/25KB。
- Graphiti 的 episode provenance、双时间、失效而非抹除。
- Letta 的可见 blocks 和 archive 分层，不采用后台“潜意识”自动改写。
- CoALA 的 episodic / semantic / procedural 分类，仅作为设计与实验词汇。
- “河床深度”可作为用户主动回顾的 UI 隐喻，不作为数据库中的信任分数。

### REJECT

- 每轮注入整张角色卡或所有历史记忆。
- 隐藏的人格塑造、关系分数自动累积、模型自述写成事实。
- Style、角色或插件改变工具、Shell、批准、Provider、model、effort 或安全策略。
- 默认跨项目共享；默认摄取私聊、外部 MCP/Web、secrets 或完整 transcript。
- 用 memory 作为权限、合规、事实或人格真相。
- MVP 强依赖图数据库、embedding、后台 Agent 或多阶段模型 consolidation。

## 9. 可验证的产品验收

Soft Harness 的优越性不能用“更像一个人”验收，而应至少测量：

1. **连续性**：同一已确认偏好是否减少用户重复纠正；错误偏好能否一次撤回且不再出现。
2. **正确性**：Style 开启后任务完成率、测试通过率和安全策略遵循不下降。
3. **显著但不过量**：用户能盲测区分 Style，同时输入/输出 token 增量在可见预算内。
4. **反证能力**：新证据能让旧记录变为 disputed/superseded，而不是被静默覆盖。
5. **可审计性**：每次使用记忆都能回答“用了哪条、来源是什么、为何仍有效、花了多少”。
6. **隐私与自主**：关闭读取或生成后立即生效；删除后能说明本地、备份和第三方边界；未确认候选不影响回复。

如果这些指标没有改善，角色叙事再精美也不是壁垒。Deep Code 真正可形成的壁垒是：**把长期协作中最容易失控的提示、记忆、来源、费用和权限，翻译成普通用户看得懂且能撤回的产品契约。**
