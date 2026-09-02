# Deep code v0.6.1-beta.5 审查与下一步（2026-08-28）

> **本文档给谁看**：你的 Codex（执行者）。
> **怎么用**：第 0 节是执行纪律（先读）；第 2–5 节是分级任务清单，每条含【证据→改法→验收】；第 6 节是里程碑路线；第 7 节是完成定义汇总表。做完一条勾一条，改代码后跑 `pnpm test`。
> **审查范围**：本地 Deep Code 仓库（src/ 主进程模块 + 渲染层 + 测试文件 + docs/ 全量），并对照上游官方 DeepSeek Harness 的 architecture/defensive-patterns 文档，以及 pi / Codex / Claude Code 三个竞品的已验证设计。未修改任何文件。

---

## 0. 执行纪律（先读）

1. **不破坏的边界**（这是产品的立身之本，任何改动不得违反）：
   - Engine（官方 DeepSeek Harness）是唯一执行真相：Session、工具、权限、审批、模型、Skill 归它。Deep code 只翻译与转发，**永不重写 Agent Loop、权限或审批逻辑**。
   - 凭据只走 write-only seam：输入框永远为空、不回显旧值、不存应用侧副本、错误消息脱敏。
   - **未知就标注未知，绝不估算**：usage/费用没有上游事实就显示"未提供"，不编数字。
   - 投影是派生值：`thread.agent/run/outcome` 只在内存计算，不得回写本地任务库（避免第二本账）。
2. **发布闸门**（`docs/BEGINNER_PROTECTION_ROADMAP.md` 末节）：每个进入发布的模块必须具备：正常状态、进行中、可恢复错误、技术证据折叠、自动化回归测试、Windows 安装版实测。没有真实 Harness 数据源的占位数据不得进产品。
3. **流程**：改代码 → 同步改/加 `test/*.test.cjs` → `pnpm test` 全绿 → 涉及界面或打包时 `pnpm package:test:win` 并实测 → 更新 `README.md` 的 Project status 与 `docs/releases/`。
4. **文档纪律**：`CONTEXT.md` 是术语唯一权威；`docs/development/MODEL_ROUTING_POLICY.md` 是**开发协作 meta 文档**，不是产品路由文档，不要与 `docs/design/ADAPTIVE_MODEL_ROUTING_PLAN` 混淆。
5. 仓库目前**没有 AGENTS.md**（见 P1-7）：在补上之前，接手 agent 以本文件第 0 节为临时纪律。

---

## 1. 总体评价

**一句话**：工程地基在同类"个人作品"里属于少见的高水准——README 的自我评价基本属实；问题集中在"安全边界的一处漏洞、成本承诺的一处偏差、以及大量文档与现实的小裂缝"，没有架构性缺陷。

**做得好的（保持，别改坏）**：
- Adapter seam 干净：所有 RPC 强制 `127.0.0.1`（`dsh-adapter.cjs:68`）；Renderer 不接触 Harness 线格式；有效模型以 `request/header` 回读为准，不轻信会话配置。
- 真相源纪律：执行真相在 Engine；本地任务库只是索引；投影不回写（`main.cjs:220-221`）。
- 防呆细节齐整：Decision Gate 只转发不代答、5 分钟超时诚实取消；Task Outcome 不信任模型自述（只认终态+已确认文件改动+验证命令退出码）；插件安装强制 40 位 commit + 路径穿越校验 + 一次性 token；工作区创建有 `..` 守卫；诊断导出脱敏。
- Electron 基线达标：`contextIsolation:true`、`sandbox:true`、`nodeIntegration:false`、CSP 已设（`index.html:5`）、`window.open` 全拒、外链仅 http/https、markdown 渲染 `html:false` 且远程图片不加载。
- 打包结构完整（已实测 `app.asar`）：src 全量 + markdown-it 依赖树都在包内。
- **安全专项结论**（渲染层/打包审查）：未发现可远程利用的脚本执行 / XSS 级漏洞——markdown `html:false` + CSP 无 `unsafe-inline` + 链接三层拦截 + 全链路限定 127.0.0.1 的纵深防御有效。剩余问题见 P0-5/P1。

**最大的五件事**（后文展开）：① v0.6.1 的全部工作还**没有提交进 git**；② 插件安装把完整宿主环境变量交给第三方 prepare 脚本；③ 决策门回答会被推送刷新**整树替换而丢失**；④ 路由对规划/执行任务恒选最强推理档、且界面看不到任何费用事实；⑤ `will-navigate` 白名单过宽（任意 file: 与本机任意端口）。

---

## 2. P0：必须修（按执行顺序）

### P0-1 把 v0.6.1 的工作先提交（数据安全第一）
- 【证据】`git status --short` 有 **41 个未提交文件**（modified + 新增 model-router/plugin-installer/docs/design/docs/releases…），最后一次提交是 `ef25e24 Deep code v0.6.0`。dist/ 里已产出 `Deep-code-Test-0.6.1-beta.5.exe`，但源码没有对应 commit——一旦磁盘/误操作，整段工作没有回滚点。
- 【改法】按功能拆成若干提交（如：mux 实时会话 / 图片草稿 / 模型路由 / 生态安装 / 文档），每条提交信息用英文一句话；确认不含密钥（已核对无 auth/key/token 文件）。
- 【验收】working tree 干净；`git log` 能看到 v0.6.1-beta.5 对应的提交链。

### P0-2 子进程环境清洗（唯一真正的安全漏洞）
- 【证据】`plugin-installer.cjs:47-48`（`env: this.environment`，默认 `process.env`）——`plugin add` 会**在 Agent 沙箱外**执行第三方仓库的 prepare 脚本，可读走宿主环境里的任何密钥（`DEEPSEEK_API_KEY` 等）；`setup-assistant.cjs:19` 同样把 `process.env` 交给 git/pnpm（第三方依赖的 postinstall）。上游官方 DSH 的 `docs/defensive-patterns.md` 明确要求 spawn 前剔除 `*KEY*/*SECRET*/*TOKEN*/*PASSWORD*`。
- 【改法】写一个共享的 `sanitizedEnvironment()`：只保留 `PATH、SystemRoot、TEMP、TMP、USERPROFILE、APPDATA、LOCALAPPDATA、ProgramFiles、ProgramFiles(x86)、NODE_ENV、npm_config_*（按需）、HTTP(S)_PROXY 类`，**显式剔除**匹配 `*KEY*/*SECRET*/*TOKEN*/*PASSWORD*` 的变量；两处 spawn 与 `resolveNodeExecutable` 改用白名单后的 env。`runtime-supervisor.cjs:123` 传给的是官方 Harness 本体（第一方可信），保留现状，但在代码注释里写明"官方运行时需要完整 env（可能承载 API key），第三方安装路径必须走清洗"。
- 【验收】测试断言：传给第三方子进程的 env 不含任何 `KEY/SECRET/TOKEN/PASSWORD` 变量；`pnpm test` 全绿。

### P0-3 路由停止"恒选最强推理档"，并显式告知代价
- 【证据】`model-router.cjs:107`：planner/executor 一律取 `strongestEffort`——直接抬升 token 用量；而 `run-projection.cjs:48` 的 usage 恒为"未提供"，用户看不到代价。这与 README"未知就标注"的承诺形成张力，也与 `ADAPTIVE_MODEL_ROUTING_PLAN` "以 balanced 为基线、评测证明后再升"相悖（Claude Code/Codex 的实践都是：默认低档，用户/评测才升档）。
- 【改法】planner/executor 默认取 `defaultEffort(chosen)`；`ADAPTIVE` 计划中的评测结论落地后（在文档里写明"哪次评测证明哪档更优"）再允许升级；`engineNotice` 里明示"本次采用推理档 X，如想更强可手动调高"。
- 【验收】`model-router.test.cjs` 新增用例：planner/executor 不再自动升到最强档；notice 文案包含档位提示。

### P0-4 自动准备 Engine 必须固定到已验证版本
- 【证据】`setup-assistant.cjs:57` 用 `git clone --depth 1` 拉**最新 HEAD**，而兼容闸门 `host-care.cjs:11` 只验证 `0.1.1-rc.2`——新手用自动安装得到的 Engine 会被自己的 App 判成"尚未验证"，自相矛盾；且 HEAD 可能是 breaking change（上游官方 README 自述 developer preview、会有不兼容变更）。
- 【改法】克隆后 `git checkout` 到固定 tag/commit（与 `VERIFIED_HARNESS_RELEASE` 同源常量，只定义一次）；`inspectRuntime` 对非基线版本给出明确升级/降级指引。
- 【验收】新装 Engine 的 `harnessCompatibility()` 返回 `pass`；手动构造旧/新版本时提示语正确。

### P0-5 消除 Companion 层的文档三派矛盾
- 【证据】代码里 `companion` 零命中、README:37/61 声明已移除；但 `CONTEXT.md:73-81` 仍以"当前功能"口吻描述 Companion Card 与 Correction；`docs/COMPANION_CARDS_POLICY.md` 全文仍用当前/未来口吻；`BEGINNER_PROTECTION_ROADMAP.md:116` 的 P4 又把它列为未来方向。
- 【改法】`CONTEXT.md` 删除/改写 Companion 段；`COMPANION_CARDS_POLICY.md` 顶部加 "ARCHIVED — 已从产品移除，仅作设计史" 横幅；ROADMAP P4 标注"当前不实现，仅为方向记录"。
- 【验收】三处文档与代码/README 一致；grep `Companion` 只剩"历史/已移除"语境。

### P0-6 补齐发布说明
- 【证据】`package.json:3` 已是 `0.6.1-beta.5`，但 `docs/releases/` 只到 beta.3。
- 【改法】补 `v0.6.1-beta.4.md`、`v0.6.1-beta.5.md`（按既有模板：能做什么/边界/已知问题）。
- 【验收】版本号在 package.json、docs/releases、README 三处一致。

### P0-7 决策门回答不被刷新吞掉（违背"等你回答"承诺）
- 【证据】`shell.js:1594-1596`：`onWorkbenchChanged` 无条件 `refreshWorkbench() → renderLiveState()`，`decisionGates.replaceChildren(...)`（`shell.js:1084`）会整树重建——用户勾选/输入到一半时，任何一次 `workbench:changed` 推送（如 5 分钟超时处理器 `main.cjs:88`）都会让答案消失。1.5s 轮询路径有 `interactions.length` 守卫（`shell.js:1614-1615`），**push 路径没有**。
- 【改法】push 路径加同样的守卫：渲染层存在"未提交的用户输入"（决策门表单有非默认值/焦点在门内）时跳过决策门区重建；或把决策门输入值抽到内存（类似 task-view-state）重建后回填。
- 【验收】测试/人工复现：勾选一个选项后触发 `workbench:changed`，选项与输入仍在；超时路径不再造成丢失。

### P0-8 收紧 will-navigate 白名单与 preload 注入面
- 【证据】`main.cjs:287-290` 放行**任意** `file:` 与**任意** `http://127.0.0.1:<port>`（`isLocalHarnessUrl:253-258` 只查 host/端口）；而 `preload` 会对窗口内加载的每个页面重新注入完整 `desktopHost` 桥（`main.cjs:279`）——一旦未来任何链接/重定向逃出当前点击拦截（`shell.js:1356-1366`），就会在保有全部 IPC 能力的主窗口里加载任意本地 HTML。
- 【改法】`will-navigate` 只放行：① 应用自身 `index.html`（file: 下精确匹配 `join(__dirname,'renderer','index.html')`）；② 当前 runtime 的确切 `http://127.0.0.1:<port>`（supervisor 报告值）；其余一律 `preventDefault`。
- 【验收】测试断言 will-navigate 分支只包含上述两个目标；人工验证任意外部 file:/localhost 导航被拦。

---

## 3. P1：应该做

### P1-1 接通"可编辑能力档案"（消除死代码）
- 【证据】`model-capability-registry.cjs:22-32` 支持 `overrides`（第 2 信任源），但 `model-router.cjs:100` 调 `scoreModel(model, role)` 不带 options——用户覆盖永不生效；文档 `MODEL_CAPABILITY_REGISTRY_2026-08-28.md` 却写得像已生效。
- 【改法】`chooseModelRoute` 接受并传递 `overrides`（从设置读，主进程内存缓存）；加一个极简"模型档案"编辑面板（providers+model+角色分），改完即对后续路由生效；未覆盖的模型行为不变。
- 【验收】测试：override 某模型为 executor 后，build 策略选中它；UI 编辑→路由结果可复现。

### P1-2 结构化路由证据 + 一次自动回退
- 【证据】`main.cjs:154-159` 只把路由写成一条人话 notice；`ADAPTIVE` 计划要求每轮存 `requested/effective/reasons/fallback/source` 结构；`dsh-adapter.cjs:86-87` 对"模型不支持图片"只提示用户删图，不自动回退。
- 【改法】在 thread 上落一个 `routeEvidence`（内存派生，仍不回写本地库为唯一真相，但可随 runDetails 展示）：requested/effective/fallback/explanation；图片失败时提供"自动切换到官方 Vision 模型并重发"选项（仍经用户确认或作为一次显式回退记录）。
- 【验收】Trace 视图能展示本轮完整路由证据；图片失败恢复路径有测试。

### P1-3 主进程编排单测（当前最大测试盲区）
- 【证据】`main.cjs` 680 行（launchTask/workbenchSnapshot/prepareModelRoute/retry/send-message/5 分钟超时），只有 `renderer-contract.test.cjs` 的正则匹配兜底，零行为级测试。
- 【改法】把可测逻辑抽薄（如 `launchTask` 的编排步骤、`workbenchSnapshot` 的 engineState 重投影、`retryDisposition` 分支），用依赖注入（已有先例：各模块构造函数注入 fetch/spawn/pathExists）补 `main` 级测试；至少覆盖：启动失败→error、快照时 Engine 离线→reconcile、超时→取消+恢复文案、重试重连 vs 重发。
- 【验收】`pnpm test` 覆盖上述分支；新增测试 ≥6 条。

### P1-4 发送前知情：Plan 影响预览 + 真实 Mode/Permission preset 上下文栏
- 【证据】ROADMAP P1-5（任务上下文栏）与 P1-8（Plan 影响预览）是 P1 里唯一完全没做的；`conversation-projection.cjs:31-53` 已能提取 permission facts，可复用。
- 【改法】任务顶部常驻一行"人话上下文"：工作区、当前 Mode、Permission preset、Engine 状态（展开看 Harness 原值）；plan-review 类 Decision Gate 出现时，把 Harness 计划里的"预计改动/命令/待决定项"以列表预览（不创造第二套 Plan 状态机，只投影）。
- 【验收】新手发送前能看到"当前权限是什么、这轮大概会动什么"；不新增任何审批逻辑。

### P1-5 统一错误卡 + 恢复中心
- 【证据】ROADMAP P2-9/P2-10 未做；错误文案散落在各 handler，恢复路径只有"等待超时"一种有专门设计。
- 【改法】定义错误分类枚举（认证失败/网络不可达/模型不可用/限流/工作区无效/Engine 缺失或版本不兼容/协议不匹配），统一渲染为"发生什么→为什么→怎么修→可否重试→技术细节"五段卡；恢复中心聚合最近失败与对应动作（重测/重启/重选/导出）。
- 【验收】每种错误分类至少一条测试；UI 上所有错误出口走统一卡片。

### P1-6 上游隔离补课：canary CI + 契约矩阵
- 【证据】`docs/research/harness-2026-08-22-vision-live-update-alignment.md` 建议的 release watcher + upstream-canary CI、多 DSH 版本契约矩阵均未落地；每次发布应记录 `supportedHarnessVersion/testedCommit/protocol probe/降级行为`。
- 【改法】加一个 GitHub Actions job：每日/每周拉上游最新 release，跑 `pnpm test` 契约测试，失败开 issue 并标注"尚未验证版本"；`host-care` 的记录里带上 testedCommit。
- 【验收】上游出新版本后 24h 内 CI 给出 pass/fail 信号。

### P1-7 仓库自描述：AGENTS.md + 验收闸门对照表 + ADR 索引
- 【证据】仓库无 AGENTS.md；架构决策散落在 design/development/research，只有 1 个 ADR；`docs/design/SOFT_HARNESS_SKILL.md` 描述的"未来角色/河床系统"没有验收门槛，易被误读为已存在。
- 【改法】新建根 `AGENTS.md`（目录指南+纪律+命令+发布闸门）；补 3 个 ADR：Companion 卡移除、模型路由取确定性本地打分、不建第二 Agent Loop；`SOFT_HARNESS_SKILL.md`、`UI_REFERENCE_INTAKE.md` 标注"未来方向，非当前功能"（后者再补素材授权处置）。
- 【验收】下一个接手 agent 只读 AGENTS.md + ADR 索引即可判断"什么已做、什么没做、为什么"。

### P1-8 补全 CSP 指令
- 【证据】`index.html:5` 缺 `object-src 'none'`、`base-uri`（无 default-src 兜底，缺省允许任意 `<base href>`）、`frame-ancestors`、`connect-src`、`form-action`；策略依赖 file: 下 `'self'` 的宽松解析。
- 【改法】补 `object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; connect-src 'self'`。
- 【验收】renderer-contract 断言新增指令存在且 `script-src` 不含 `unsafe-inline`。

### P1-9 渲染层增量更新（当前最大性能风险）
- 【证据】`shell.js:1611-1616` 运行中每 1.5s 全量 `renderWorkbench()`（`:1133-1236`）：会话 feed、工具卡、决策门全部 `replaceChildren`，且每条消息重新 `markdown.render`（`:534-546`）。长会话 + 高频 DSH 事件 = DOM 撕裂、内存抖动、滚动定位失准。
- 【改法】最小可行：按 seq 增量追加新消息/新 tool-card，仅内容变化时重渲染；决策门区只在 interactions 集合变化时重建（与 P0-7 守卫合并做）；markdown 结果按消息 seq 缓存。
- 【验收】长会话（>50 条消息）运行时 CPU 与重排显著下降；可加一条"消息追加不重解析旧消息"的单元断言。

### P1-10 发布物签名与校验和
- 【证据】`package.json:19-33` 无 `win.sign`/`publisher`；`release.yml:32,38` `--publish never` + `gh release create` 只传 `dist/*.exe`，无 SHA256。处理 API Key 的应用无签名会触发 Windows SmartScreen 且用户无法验证真实性。
- 【改法】短期：release job 生成 `SHA256SUMS.txt` 一并上传；中期：申请代码签名证书配置 `win.sign`（个人项目可先用低成本 OV 证书或先只做校验和）。
- 【验收】每个 Release 附校验和文件；`release-contract.test.cjs` 断言 workflow 含 checksum 步骤。

### P1-11 发布版本一致性校验
- 【证据】产品版本只来自 `package.json:3`，Release 标题用 tag（`release.yml:38`），未校验 `v*` tag ↔ `package.json.version` 对应；`release-contract.test.cjs` 未覆盖。
- 【改法】workflow 加一步：`git describe --exact-match --tags` 与 package.json version 比较，不一致即 fail；测试断言该步骤存在。
- 【验收】打错 tag 的发布直接失败。

---

## 4. "傻瓜式"体验缺口（按价值排序，含可借鉴对象）

> 结论来自对 pi / Codex / Claude Code / 上游 DSH 的一手调研（详见工作区 `Agent对比与自研设计笔记.md`）。Deep code 的护城河（可验证的翻译链）不变，以下是新手最痛的六个缺口：

| # | 缺口 | 现状 | 低成本做法（优先借上游） | 借鉴对象 |
|---|---|---|---|---|
| 1 | **一键撤销/回滚** | 完全没有"搞砸了，回去" | 暴露 Harness 的 session fork/resume：每轮 turn 边界存一个可点开的"回到这一轮之前"入口（Deep code 只发起 fork，不造第二份文件快照） | Claude Code checkpoint（/rewind）、DSH fork |
| 2 | **权限档位拨盘** | 只有逐次 Decision Gate，新手体验是"审批恐怖片" | 把 Harness 的 permission preset 读出来翻译成 只读/逐项确认/自动 三档展示与切换（仍只转发上游，不自行决策） | Claude Code 六档权限模式 |
| 3 | **usage/费用透明** | usage 恒为"未提供" | 优先接入 Harness 原生 usage 事件（四桶 input/output/cacheRead/cacheWrite），无数据仍标注未知；命中率 ≥99.5% 加小数位防"显示成 100%" | 上游 DSH 四桶计量、pi 的 footer |
| 4 | **零门槛运行时/登录** | 要自备 API key + 本地 checkout | 短期：P0-4 固定版本后，向导全自动；中期：支持"无 key 模式"（本地 Ollama 等 OpenAI 兼容端点，你已在 Codex 上试过 gemma4） | Codex 订阅登录、pi 的"no key, just run" |
| 5 | **插件市场闭环** | 只能发现+受控安装，无已装列表/卸载/回滚 | 补 已装列表/禁用/卸载/重启生效验证/失败回滚（安装前自动备份 profile 快照） | Codex 插件市场、pi 包管理 |
| 6 | **多会话后台监控** | 只有当前激活线程有实时流 | 低配版：后台只轮询持久历史（不挂 WebSocket），切回线程再升级为实时 | Codex 桌面版多会话、Claude Code 后台 agent |

---

## 5. P2 打磨项（合并简表，按文件排序）

| 项 | 位置 | 说明 |
|---|---|---|
| stop() 等到静止 | `runtime-supervisor.cjs:171-181` | 只 `kill('SIGINT')` 即返回；加短超时+强制终止，符合上游"Dispose must reach quiescence" |
| 吞异常补日志 | `main.cjs:71`、`dsh-live-session.cjs:186-190` | 至少 console 记录并挂入诊断导出 |
| pnpm 改 shell:false | `setup-assistant.cjs:18` | 带空格 runtimePath 的引号解析面；显式定位 pnpm.cmd |
| live 会话语义文档化 | `main.cjs:45-54` | 超时是"当前视图级"；要么文档写明，要么为挂起门做后台计时 |
| store 原子写+内存缓存 | `workbench-store.cjs:86-95` | 写临时文件再 rename（防崩溃损坏）；快照加缓存防并发丢更新 |
| send-message 长度上限 | `main.cjs:596-622` | 与 create 的 12000 对齐 |
| openExternal 收紧 | `external-links.cjs:4` | 拒绝私网/保留地址（link-local 元数据面） |
| 无证据完成提示 | `task-outcome-projection.cjs:62-67` | "无工具活动也无文件改动"时加"未见任何执行证据"提醒 |
| curated 家族分数据化 | `model-capability-registry.cjs:7-16` | 拍脑袋常数改为可版本化 JSON + 评测来源注释 |
| 图片草稿内存释放 | `image-draft-store.cjs:51` | 发送成功/放弃后清除 scope |
| 术语统一 | CONTEXT.md | 以 CONTEXT 为唯一权威：Run Projection/Evidence Drawer 统一、补 Model Router/Capability Registry/Permission preset 等词条 |
| UI 信息架构 | `index.html` 左栏 | 按 SOFT_HARNESS_COST_AND_LAYOUT_PLAN 把"本轮状态"迁右侧折叠检查器、对话过程可折叠 |
| renderWebCard href 校验 | `shell.js:723,731` | 渲染时校验 `card.url` scheme（仅 http/https 才生成 `<a>`），不要等到点击才拦 |
| deep-code-image 协议校验 | `main.cjs:319-330` | 协议 handler 复用 `imageDraftScope` 的 scopeId 校验，与 `main.cjs:485` 一致 |
| markdown-it 加载方式 | `index.html:220` | 相对路径 `../../node_modules/...` 脆弱（已实测当前 asar 内可用）；改为构建时拷贝进 `src/renderer/vendor/` 再 `./vendor/...` 引用 |
| shell.js 拆分 | `shell.js`（1617 行） | 按视图/表现/数据桥拆 3-4 个模块；`task-view-state.cjs` 是现成状态模块范例 |
| 原生 confirm 替换 | `shell.js:345,1378,1459,1477` | 改 `<dialog>`（仓库已有 dialog 模式），读屏与自动化友好 |
| 无障碍细节 | `index.html:95`、`shell.js:549` | conversation-feed 加独立 aria-live；消息 article 加 role/aria-label 区分角色 |
| Windows 图标 | `package.json:27` | `build/icon.png` 建议配套 `.ico`（≥256px），避免默认图标告警 |

---

## 6. 里程碑路线（建议顺序）

- **M0（本周末前）**：P0 全部（提交、env 清洗、effort 基线、固定版本、文档对齐、发布说明）。
- **M1 事实层收束**：P1-4 + usage 四桶接入 + Turn/Step 边界保留（ROADMAP P2-11 剩余）。
- **M2 安全闸**：P1-2 + 权限档位拨盘（缺口 2）+ 一键回滚（缺口 1）——三个加起来才是"新手敢用"。
- **M3 恢复契约**：P1-5 统一错误卡/恢复中心 + P1-3 编排单测（同步补测试债）。
- **M4 生态与上游**：P1-6 canary CI/契约矩阵 + 插件管理闭环（缺口 5）。
- **M5 打磨**：第 5 节 P2 清单 + 多会话监控（缺口 6）+ 零门槛运行时（缺口 4）。

---

## 7. 完成定义汇总（给 Codex 勾选用）

| 任务 | 涉及文件 | 必做测试 | 验收信号 |
|---|---|---|---|
| P0-1 提交工作 | 全部 | `pnpm test` | git 干净 |
| P0-2 env 清洗 | plugin-installer / setup-assistant (+新共享模块) | 新增 env 断言 | 第三方子进程 env 无密钥变量 |
| P0-3 effort 基线 | model-router / model-router.test | 新增 2 例 | 不再自动最强档 |
| P0-4 固定版本 | setup-assistant / host-care | 新增 1 例 | inspect 返回 pass |
| P0-5 文档对齐 | CONTEXT / POLICY / ROADMAP | — | 三处一致 |
| P0-6 发布说明 | docs/releases | — | 版本三处一致 |
| P1-1 overrides 接线 | model-router / registry / renderer | 新增 2 例 | 覆盖真实生效 |
| P1-2 路由证据+回退 | main / dsh-adapter / run-projection | 新增 2 例 | Trace 可见证据 |
| P1-3 编排单测 | main(抽薄) / 新测试文件 | 新增 ≥6 例 | 关键分支全覆盖 |
| P1-4 上下文栏+计划预览 | renderer / conversation-projection | renderer-contract 更新 | 发送前可见权限与影响 |
| P1-5 错误卡/恢复中心 | 各 handler + renderer | 每分类 1 例 | 所有错误走统一出口 |
| P1-6 canary CI | .github/workflows | CI job | 上游更新 24h 内出信号 |
| P1-7 AGENTS.md+ADR | 根 AGENTS.md / docs/adr | — | 索引完整 |
| P0-7 决策门输入守卫 | shell.js | 新增 1 例（或人工复现） | push 刷新不丢输入 |
| P0-8 will-navigate 收紧 | main.cjs | 新增 1 例 | 仅放行自身页面与 runtime URL |
| P1-8 CSP 补全 | index.html / renderer-contract | 断言更新 | 五条新指令在列 |
| P1-9 增量渲染 | shell.js | 新增 1 例 | 旧消息不重解析 |
| P1-10 签名/校验和 | release.yml / package.json | release-contract 更新 | Release 附 SHA256SUMS |
| P1-11 版本一致性 | release.yml | release-contract 更新 | tag≠版本即失败 |

> 附：审查基于 2026-08-28 的本机工作区快照；上游 DSH 为 developer preview，若其事件形状变化，以 `docs/research/official-harness-plugin-development.md` 的钉住契约为准重新跑契约测试。
