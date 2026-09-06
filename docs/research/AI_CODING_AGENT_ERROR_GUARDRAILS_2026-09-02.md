# AI Coding Agent 错误与工程护栏调研

日期：2026-09-02
范围：AI coding agents 产生幻觉、意外错误与安全事故的主要失效模式，以及成熟产品和团队如何降低影响。
方法：优先使用 OpenAI、Anthropic、GitHub、Google Research/DeepMind 的官方文档、官方源码与论文；产品事实、研究证据和对 Deep Code 的产品推断分开陈述。

## 结论摘要

“让模型不犯错”不是可验收的工程目标。可验收的目标是：

1. 错误尽量在写入前被限制；
2. 写入后能由独立证据发现；
3. 发现后能定位、停止和撤回；
4. 高影响动作必须由人或确定性策略决定；
5. 产品绝不把“模型说完成了”当作“任务真的完成了”。

成熟系统采用的是多层防线，而不是更长的提示词：代码库指令减少误解，最小改动降低爆炸半径，测试和静态分析提供独立证据，diff/PR 让人审核，沙箱与网络边界限制权限，Git checkpoint 提供恢复点，供应链扫描阻断恶意依赖，evals 监测系统性回归，停止条件阻止无效循环。

对 Deep Code 的核心建议是建立一条可机器判断的“可信变更管线”：

> 任务契约 → 受限执行 → 最小补丁 → 确定性验证 → diff 风险审查 → 人类可懂回执 → 可撤回 checkpoint

Soft Harness 的职责不是替 Harness 再判断一次真假，而是把这条管线的证据、缺口和恢复动作翻译成人话。

## 1. “幻觉”应拆成可诊断的失效模式

### 1.1 任务误解与错误前提

Agent 可能把含糊目标自行补成错误需求，忽略约束，或在代码库中找不到目标时仍继续生成。OpenAI 早期 Codex 系统卡记录了一类尤其危险的行为：面对极难或不可能的软件任务（例如被要求修改根本不存在的代码），模型有时会虚假声称已经完成，而不是报告无法完成。该系统卡因此强调完成后的 diff 与完整行动日志。[OpenAI Codex system card](https://cdn.openai.com/pdf/8df7697b-c1b2-4222-be00-1fd3298f351d/codex_system_card.pdf)

**护栏：**在动手前形成简短任务契约：目标、不可改变项、成功证据、允许的工作区、是否允许新增依赖。发现目标文件、接口或前提不存在时暂停并报告，而不是“创造”一个看似合理的替代事实。

### 1.2 代码库事实幻觉

Agent 可能虚构函数、配置项、命令、依赖版本或项目惯例。这并不一定表现为胡言乱语；更常见的是生成一段局部合理、但与真实代码库接口不兼容的实现。

OpenAI 官方说明 Codex 可以通过仓库中的 `AGENTS.md` 获得导航方式、测试命令和项目惯例；官方 Codex 仓库自己的 `AGENTS.md` 进一步把测试入口、格式化、集成测试、UI snapshot 和变更规模写成可执行规则。[Introducing Codex](https://openai.com/index/introducing-codex/)、[openai/codex AGENTS.md](https://github.com/openai/codex/blob/main/AGENTS.md)

GitHub Copilot 同样支持仓库级、路径级和 `AGENTS.md` 指令，并建议把构建、测试、架构边界和不同文件类型的规则放入相应层级。[GitHub custom instructions support](https://docs.github.com/en/copilot/reference/custom-instructions-support)、[Copilot task best practices](https://docs.github.com/en/copilot/using-github-copilot/using-copilot-coding-agent-to-work-on-tasks/best-practices-for-using-copilot-to-work-on-tasks)

**护栏：**项目指令必须短、可执行、能在仓库内验证；执行前先检索真实符号、调用点、测试和配置 schema，不能依赖模型记忆中的框架用法。

### 1.3 局部正确、系统错误

一段代码可能编译、单测也通过，却破坏其他调用者、配置兼容、状态同步、权限或 UI 行为。OpenAI 对 Codex code review 的官方描述强调：review 不只看局部 diff，还应对照 PR 意图、代码库和依赖，并执行代码与测试；同时明确它是额外 reviewer，不能替代人工审核。[Introducing upgrades to Codex](https://openai.com/index/introducing-upgrades-to-codex/)

**护栏：**修改前查调用者和数据流；修改后检查实际 diff、受影响接口和兼容面。跨模块修改需要更强验证，不能用“改动文件的单测通过”代表系统通过。

### 1.4 测试绿但补丁仍错误

测试是必要证据，不是充分证明。自动程序修复研究长期存在 test-suite overfitting：补丁满足已知测试，却没有修复真实缺陷或在未覆盖输入上出错。OpenAI 对 SWE-bench Verified 的后续审计还发现，测试本身也可能错误地拒绝功能正确的实现，说明单一测试结果既可能假阴性，也可能掩盖规格问题。[Why SWE-bench Verified no longer measures frontier coding capabilities](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/)

微软 AgentLens 将“只看最终测试是否通过”称作 lucky pass 问题：原则正确的解决方案与混乱试错后偶然通过，在二元结果中会被视为相同。[Microsoft Research AgentLens](https://www.microsoft.com/en-us/research/publication/agentlens-revealing-the-lucky-pass-problem-in-swe-agent-evaluation/)

Google 的 MLE-STAR 也报告：模型生成的代码即使能运行，仍可能采用不现实或数据泄漏的做法，因此系统加入专门的数据泄漏检查器和数据使用检查器，而不是相信一次成功执行。[Google Research MLE-STAR](https://research.google/blog/mle-star-a-state-of-the-art-machine-learning-engineering-agents/)

**护栏：**同时检查：原有测试、针对缺陷的回归测试、类型/静态分析、lint、构建、关键手动验收、diff 是否符合任务意图。高风险变更需要“不同种类的证据”，而不是反复跑同一测试。

### 1.5 过度改动与顺手重构

Agent 容易在修一个问题时顺带改格式、抽象、命名或依赖，扩大审查面并引入无关回归。OpenAI Codex 仓库把非机械变更的规模限制写入 `AGENTS.md`：大改动应拆成可审查阶段，依据实际 diff、依赖和调用点寻找最小可落地阶段。[openai/codex AGENTS.md](https://github.com/openai/codex/blob/main/AGENTS.md)

**护栏：**默认最小补丁；把“必须修改”和“顺便优化”分开；无关重构另开任务。变更超过文件数、行数或模块边界阈值时，自动升级风险等级并要求 checkpoint/review。

### 1.6 工具、权限与提示注入错误

模型不仅会写错代码，还可能执行错误命令、越出工作区、访问网络、泄露数据，或受仓库、网页、依赖文档中的恶意指令影响。

Anthropic 官方安全文档说明 Claude Code 默认采用权限模型，并提供文件系统和网络隔离；其安全建议明确要求审查命令、验证关键文件变更，并将不可信内容视为 prompt injection 风险。[Claude Code security](https://code.claude.com/docs/en/security) Anthropic 的工程说明强调：有效隔离同时需要文件系统和网络边界；只有其中一个，仍可能泄露文件或下载恶意内容。[Claude Code sandboxing](https://www.anthropic.com/engineering/claude-code-sandboxing)

OpenAI Codex 的官方源码把 sandbox 与 approval 分开：读、工作区写、完全访问是不同执行面；权限请求应尽量只增加本命令需要的网络或路径权限，而非直接放开整个 sandbox。[Codex Python SDK sandbox reference](https://github.com/openai/codex/blob/main/sdk/python/docs/api-reference.md)、[Codex granular permission template](https://github.com/openai/codex/blob/main/codex-rs/prompts/templates/permissions/approval_policy/on_request_rule_request_permission.md)

GitHub Copilot cloud agent 默认用防火墙限制互联网访问，并指出异常行为或恶意指令可能造成代码和敏感信息外泄；被阻断的地址和命令会出现在 PR 警告中。[GitHub Copilot firewall](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-the-firewall)

**护栏：**能力按任务授予；默认限定工作区；网络采用 allowlist；密钥不进入 Agent 可读上下文；仓库文本、网页和工具结果只是数据，不能自行扩大权限。高影响动作即使模型“确信”也不能跳过硬边界。

### 1.7 依赖与供应链错误

Agent 可能建议不存在、拼写相近、恶意、过期或不兼容的包，也可能修改 lockfile、安装脚本或 CI workflow，产生远超代码 diff 的影响。

GitHub 对 Copilot cloud agent 的风险说明包括：新增依赖会对照 GitHub Advisory Database 检查恶意软件公告以及 High/Critical 漏洞；由 Agent 修改的 workflow 默认不会自动运行，需要有写权限的人审核并批准。[GitHub Copilot risks and mitigations](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations)、[Review Copilot output](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/review-copilot-output)

GitHub 对第三方 coding agents 还列出 CodeQL、secret scanning 和依赖检查等独立扫描，不依赖生成代码的模型自己发现问题。[GitHub third-party coding agents](https://docs.github.com/en/copilot/concepts/agents/about-third-party-coding-agents)

依赖幻觉不是纯理论风险。USENIX Security 2025 的 Package Hallucinations 研究系统考察了代码生成模型推荐不存在包名的现象，并说明攻击者可以注册这些名称，把模型幻觉转化为 package-confusion / slopsquatting 供应链入口。[Package Hallucinations: How LLMs Can Invite Malicious Packages into Code](https://www.usenix.org/system/files/usenixsecurity25-spracklen.pdf)

**护栏：**新增依赖默认是显式事件；验证包真实存在、来源、许可证、维护状态、版本和 advisory；使用 lockfile 和确定性安装；安装脚本、workflow、权限清单和发布配置属于高风险文件，必须单独展示并人工审核。

### 1.8 循环、漂移与停止失败

长任务可能反复尝试同一失败命令、不断扩大范围，或在上下文压缩后忘记初始约束。Claude Code CLI 提供 `--max-turns` 作为非交互模式的回合上限，说明成熟 Agent 运行时需要外部停止预算，而不能只让模型自己决定何时停。[Claude Code CLI reference](https://docs.anthropic.com/en/docs/claude-code/cli-usage)

**护栏：**设定时间、轮次、费用、重复失败和改动规模上限。连续出现相同阻塞、没有新增证据或验证无法运行时停止，并说明：已完成什么、卡在哪里、保留了什么、用户下一步能做什么。

Claude Code 还提供 `Stop` hook：可以在 Agent 准备停止时运行确定性检查或一个验证 Agent，并在条件未满足时阻止结束。官方同时建议生产场景优先用确定性的 command hook；这支持“完成判定尽量由工具证据决定，而不是模型自评”。[Claude Code hooks guide](https://code.claude.com/docs/en/hooks-guide)

## 2. 成熟团队的防线不是一条，而是一组互相独立的门

| 阶段 | 硬证据/控制 | 主要防止什么 |
|---|---|---|
| 开始前 | 任务契约、真实仓库扫描、代码库指令 | 误解目标、虚构接口 |
| 改动中 | 工作区边界、网络 allowlist、最小权限 | 越权、泄露、恶意下载 |
| 每个 coherent step 后 | Git checkpoint、实际 diff | 爆炸半径过大、无法撤回 |
| 完成前 | 单测、回归测试、类型检查、lint、构建 | 语法、类型、已知行为回归 |
| 完成前 | 调用点/契约/安全 review | 局部正确、系统错误 |
| 高风险变更 | 依赖扫描、secret scanning、workflow 审核 | 供应链和凭据事故 |
| 交付前 | 人类审核 diff 与证据缺口 | 测试盲区、产品语义错误 |
| 持续改进 | 固定 eval 集、历史事故回放、版本对比 | 模型或提示更新后的系统性回退 |

这里最重要的是“独立”：生成补丁的同一次模型自述不能同时充当测试结果、代码审查和完成证明。测试日志来自工具，diff 来自版本控制，权限来自执行系统，最终产品体验来自人类使用。

## 3. Git checkpoint 与人工审核

GitHub 的 Agent 工作流天然把生成变更放在分支和 draft PR 中。Copilot 不能把自己的 PR 标为 ready、批准或合并；workflow 默认也不会因 Agent push 自动执行，直到有权限的人批准。[GitHub Copilot risks and mitigations](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations)

GitHub 还明确要求：Copilot PR 应像任何其他贡献一样接受彻底审核，Agent 生成并不降低审核标准。[Review Copilot output](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/review-copilot-output)

Claude Code 的官方 checkpoint 机制会在每次用户提示和编辑前记录文件状态，并允许恢复代码、对话或两者；但官方明确限定：它只跟踪 Claude 的文件编辑，不覆盖 Bash 命令造成的副作用，也不能撤回数据库、远程 API 或部署。因此，“有 checkpoint”不能被展示成“所有操作都可恢复”。[Claude Code checkpointing](https://code.claude.com/docs/en/checkpointing)

**对本地桌面 Agent 的产品推断：**不必强迫每个新手理解 branch，但必须给每轮任务一个恢复点。可实现为：

- 开始任务时记录基线 commit 与 dirty files；
- 每个最小阶段生成可恢复 checkpoint，但不擅自覆盖用户已有变更；
- 回执展示“本轮改了哪些文件、验证了什么、哪些未验证”；
- “撤回本轮”只逆转明确归属于本轮的变更；
- dirty worktree 或变更重叠时停止自动撤回，转为逐文件审核。
- 远程 API、数据库、发布、部署和外部消息必须在执行前单独批准，并提供服务端恢复方案；本地 Git checkpoint 不能替代它。

这是工程推断，不是上述官方产品的统一实现细节。

## 4. Evals：防止下一版比这一版更会犯同一种错

单次测试回答“这个补丁是否通过已知检查”；eval 回答“整个 Agent 系统是否在一组代表性任务上持续满足要求”。OpenAI Evals API 将 evaluation 定义为数据源和测试标准的组合，可用不同模型和参数运行；这支持版本、模型、提示或工具变更前后的对比。[OpenAI Evals API](https://developers.openai.com/api/reference/java/resources/evals/methods/create)

OpenAI 对 coding eval 的公开审计进一步说明：问题陈述、代码和测试可能彼此不一致，可靠评估需要多次独立审计和最终人类判断，而不是只读 leaderboard 分数。[Separating signal from noise in coding evaluations](https://openai.com/index/separating-signal-from-noise-coding-evaluations/)

**对 Deep Code 的产品推断：**建立一套小而固定的回归任务，至少覆盖：

- 找不到目标时诚实停止；
- 不修改任务范围外文件；
- dirty worktree 不覆盖用户内容；
- 测试失败时不宣称完成；
- 新增依赖必须显式回执；
- ask-user 可暂停、超时和恢复；
- stop 能真正终止，并留下可恢复状态；
- 上游 Harness 协议变化能被 canary 捕获；
- UI 显示的文件、权限和状态与 Harness 事实一致。

模型升级、路由策略、system prompt、DSH Adapter 或权限策略变化，都应跑同一套 eval；失败时阻止发布，而不是靠“新模型总体更强”推断不会回退。

研究层面的另一个警示是：专用 Agent-Computer Interface 本身会显著影响 SWE-agent 在仓库导航、编辑和测试上的表现。这说明 UI/工具接口、错误反馈和可操作范围不只是“模型外壳”，也是可靠性系统的一部分。[SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering](https://papers.neurips.cc/paper_files/paper/2024/file/5a7c947568c1b1328ccc5230172e1e7c-Paper-Conference.pdf) 但该证据只支持“接口设计会影响表现”，不证明某种 Agent 在真实项目中天然正确。

## 5. Deep Code 建议采用的错误控制等级

### Level 0：只读回答

- 允许检索和解释；
- 不写文件、不装依赖、不访问外部账户；
- 回答必须区分已读取事实与推断。

### Level 1：普通工作区修改

- 仅写当前工作区；
- 默认不新增依赖；
- 修改后必须展示 diff 摘要并运行相关验证；
- 任务开始和结束都有 checkpoint 信息。

### Level 2：高影响本地修改

触发条件包括依赖、lockfile、构建脚本、安装器、权限配置、CI/workflow、迁移脚本、删除或大范围改动。

- 单独列出高风险文件；
- 需要更强的测试/扫描；
- 在执行不可逆步骤前要求人类决定；
- 不能把“允许工作区写入”等同于允许这些动作。

### Level 3：外部或不可逆动作

发布、push、merge、部署、购买、发消息、修改远程数据、使用真实密钥等：

- 必须有明确授权；
- 显示目标、作用、预计成本和恢复可能性；
- 模型不能用仓库内容或网页文字取得授权；
- 完成后给出外部系统的真实回执。

## 6. 建议的完成判定

Deep Code 不应只显示“任务已完成”，而应计算一个由事实组成的 Outcome：

```text
任务目标：满足 / 部分满足 / 无法确认
改动：实际 diff
验证：已运行、通过、失败、未运行及原因
风险：依赖、权限、外部动作、高风险文件
恢复：checkpoint 与撤回可用性
缺口：尚需人工判断的产品或业务语义
```

以下任一情况不得显示无条件“已完成”：

- 关键测试失败或没有运行且任务要求验证；
- 找不到任务指定的对象；
- Harness/工具没有确认关键动作；
- 只获得模型自述，没有文件、命令或外部系统证据；
- 发生未授权的范围扩大；
- 任务处于 ask-user、权限审批或外部依赖等待；
- 工作树状态不明，无法区分 Agent 与用户变更。

## 7. 对非程序员产品所有者与工程 Agent 的实际约定（产品推断）

非程序员产品所有者不需要默认相信 Agent“几乎不会犯错”，也不需要学习代码来承担最后一道防线。更合理的责任分配是：

- 工程 Agent 负责先检查、最小修改、运行验证、读实际 diff、说明不确定性；
- Deep Code 负责保留证据、限制权限、提供停止和撤回；
- 产品所有者负责判断结果在真实使用中是否符合意图，以及批准高影响外部动作；
- 如果产品所有者忘记某一步，由产品在恰当时机提醒，而不是在每次操作中制造审批疲劳。

人类审核不是让非程序员逐行证明代码正确。Deep Code 应把审核翻译为少量可回答的问题：

1. 这是不是你原本要解决的问题？
2. 你能接受它改动这些文件/新增这些依赖吗？
3. 关键功能在你的实际使用中是否如预期？
4. 哪些项目尚未验证，是否要继续发布？

## 8. Adopt / Borrow / Reject

### Adopt

- Harness 是唯一执行事实；模型自述不是完成证据。
- 工作区与网络硬边界、最小权限、明确外部动作授权。
- 仓库级与路径级项目指令。
- 最小 coherent patch、checkpoint、实际 diff。
- 多种确定性验证与独立 review。
- 依赖、secret、workflow 高风险检查。
- 时间/轮次/重复失败/费用停止条件。
- 固定 eval 与历史事故回放。

### Borrow with adaptation

- GitHub draft PR 模式：本地版转译成普通人能理解的“本轮草稿 + 撤回点”。
- AGENTS.md：保留工程原文，同时由 Soft Harness 显示简短的人话摘要。
- 自动 code review：作为第二意见，不作为自动合并依据；高成本 review 按风险触发。
- 自动路由和多 Agent 验证：只用于高风险或可并行任务，必须显示额外费用。

### Reject

- 仅靠更长 system prompt 防错。
- 把测试通过等同于需求正确。
- 让生成补丁的模型自证完成。
- 默认全盘网络和文件权限。
- Agent 自行安装未核验依赖或修改 workflow 后自动运行。
- 用“用户已经允许工作”推导出 push、发布、部署或花费授权。
- 为了消除提醒而关闭所有边界；这会把审批疲劳换成不可控风险。

## 9. 最小落地顺序

1. **P0：Outcome truth table**——完成/部分完成/失败由真实事件和验证决定。
2. **P0：Stop + checkpoint + recovery**——停止后不丢状态，撤回只针对本轮。
3. **P0：高风险文件与依赖标记**——在回执和 diff 中显眼展示。
4. **P1：验证策略表**——按文件和任务类型选择 tests/typecheck/lint/build/manual smoke。
5. **P1：最小 diff budget**——大范围变更自动拆阶段或升级审核。
6. **P1：上游 canary 与本地固定 eval**——Harness、模型和 prompt 更新前后对比。
7. **P2：风险触发的第二 reviewer**——只在安全、跨模块、发布路径等场景调用，显示 token/费用。

这套方案的目标不是让错误消失，而是让错误不再悄悄穿过“模型生成 → 本机改动 → 发布”整条链路。
