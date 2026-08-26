# DeepSeek Harness 2026-08-22 图像、实时连接与上游对齐审计

审计日期：2026-08-26

范围：官方 `deepseek-ai/deepseek-harness` 仓库、官方发布与 npm 包、本机官方 Harness checkout，以及 Deep Code 当前适配层。本文严格区分 **已验证事实**、**推断** 与 **建议**。

## 结论摘要

1. **8 月 22 日前后出现的“识图”不是给 `deepseek-v4-flash` / `deepseek-v4-pro` 两个文本模型解除限制。** 官方在 `dsh-v0.1.1-rc.2` 中发布了独立的 `deepseek-v4-flash-vision-exp`，其 catalog 明确声明 `inputModalities: [text, image]`。Harness 同时把浏览器草稿图、持久附件、模型请求图片和 DeepSeek Files API 串成了可恢复的完整链路。
2. **HTTP 426 是确定的协议不匹配。** 官方早在 commit `8b4ddfe60c751f4596e497b739ef6b4979104bc1`（2026-08-04）就把 `/api/events.mux` 与 `/api/events.host` 从 SSE 改为只下行 WebSocket；普通 GET 会按设计返回 426，且没有网络 SSE fallback。Deep Code 的 `src/dsh-live-session.cjs` 仍用 `fetch(... Accept: text/event-stream)`，所以“实时状态连接失败”是 Deep Code adapter 落后，而非 Engine 本身断线。
3. **审计开始时，本机官方 checkout 明显落后于已发布版本；本轮已对齐。** 初始 `master` 为 `47f943859b`（2026-08-13，`0.1.0-rc.5`），官方 tag `dsh-v0.1.1-rc.2` 为 `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e` / `0.1.1-rc.2`（2026-08-21 UTC；中国时区传播与用户看到更新可落在 8 月 22 日）。在确认 tracked files 干净并保留 6 个 untracked 日志后，本轮已 fast-forward 到该 tag、按锁文件安装依赖并完成官方 build。
4. **“每次自动跟上游”不应等于每次启动自动 `git pull`。** 官方 README 明示 Developer Preview 会有 breaking changes。可持续方案是：固定已验证 release、记录 engine fingerprint、运行协议 contract probes、给出可选更新提示，并用 upstream-canary CI 提前发现破坏；更新必须显式、可回退、不得改动用户的 dirty checkout。
5. **启动慢有一条明确的成熟替代路径。** Deep Code 当前每次通过 TypeScript 源入口 `node --import tsx/esm apps/cli/src/bin.ts web` 启动整个源码 checkout；官方面向普通用户的入口已经是发布并构建好的 `npx @deepseek-ai/dsh web`。Deep Code 应管理一个固定版本的已构建 runtime，而不是长期把开发源码 checkout 当产品运行时。

## 1. 8 月 22 日附近的识图究竟怎样实现

### 1.1 已验证事实：发布节点与独立 vision model

- 官方 commit [`e637bcfb985850e90710c0d67bc29c748eb13a77`](https://github.com/deepseek-ai/deepseek-harness/commit/e637bcfb985850e90710c0d67bc29c748eb13a77) 合并 PR #2726，提交信息为 `feat(llm-deepseek): publish the vision model`。
- 官方 release [`dsh-v0.1.1-rc.2`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.1-rc.2) 指向 commit [`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`](https://github.com/deepseek-ai/deepseek-harness/commit/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e)，npm 包 `@deepseek-ai/dsh@0.1.1-rc.2` 发布于 2026-08-21 12:42 UTC。
- 该 release 的 [`packages/llm/llm-deepseek/src/index.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/llm/llm-deepseek/src/index.ts) 默认 catalog 有三项：
  - `deepseek-v4-flash`：未声明 image，按 text-only 处理；
  - `deepseek-v4-pro`：未声明 image，按 text-only 处理；
  - `deepseek-v4-flash-vision-exp`：明确声明 `inputModalities: ['text', 'image']`，默认图片像素预算 640,000、编码后单图上限 1 MiB。

这意味着“官方 Harness 能收图”与“当前选中的模型能看图”是两层事实。前者由附件与 UI 能力决定，后者由精确的 provider/model route 声明决定。旧的两个文本模型不会因为 Harness 有附件基础设施就自动获得视觉能力。

### 1.2 已验证事实：不是直接把浏览器 base64 塞进历史

官方的 [`Durable Image Attachments`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/subsystems/attachment.md) 和 [`Unified normalized attachments, request versions, and provider files`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/.agents/notes/implemented/feature/2026-08-20-unified-image-request-pipeline.md) 固定了以下链路：

1. 浏览器中的未发送图片只是 draft，不属于 durable store。
2. 用户提交后，Host 先验证、解码并规范化图片，再把内容写入 `<DSH_HOME>/attachments/v1`；成功后才把不透明 `attachmentId` 与尺寸、格式、字节数写入 session event。
3. session history 保存的是稳定附件引用，不保存浏览器 object URL、本机临时路径、provider URL 或 base64。
4. 每个 image-capable route 再从 durable attachment 派生确定性的 request version；路由拥有自己的像素与字节预算。
5. DeepSeek vision route 优先把派生图片上传到 OpenAI-compatible Files API，并在 chat request 中发送 `{type: "file", file_id}`，以便后续轮次复用图片而不重复传 base64。
6. Files API 不可用、超时或解析失败时，官方 commit [`1b389798dcab65d2a29f673aa25ab4e68ca7876f`](https://github.com/deepseek-ai/deepseek-harness/commit/1b389798dcab65d2a29f673aa25ab4e68ca7876f) 引入整次请求的 inline data-URL 回退；回退复用完全相同的派生图片字节，并施加更小的 20 MiB base64 总预算。
7. 超出图片数量或请求体预算时，旧图按确定性的 oldest-first/quantized 策略变成明确 placeholder，但 session durable history 不被改写。

### 1.3 已验证事实：模型能力仍是准入条件

官方 provider 指南 [`Configure models — Image input`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/user/guide/providers.md#image-input) 说明：自定义 provider 的模型默认视为 text-only；只有 catalog 或配置明确声明 `input: [text, image]` 才会放行图片。这个声明只是对 endpoint 能力的陈述，不会探测或创造视觉能力；若声明错误，provider 仍会拒绝请求。

官方 [`tool-fs` 的 `read_image`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/fs/tool-fs/README.md) 也只会在“精确路由的模型声明 image input”时执行。把图片先复制进 workspace 再让纯文本模型自行理解，并不是这版官方视觉闭环。

### 1.4 对 Deep Code 当前问题的判断

**已验证事实：** 审计开始时，本机 checkout 的 `packages/llm/llm-deepseek/src/index.ts` / adapter 版本仍是 `0.1.0-rc.5` 前后的旧实现；用户报告的 `deepseek-v4-flash` 不支持识图，符合旧 Engine 与 text-only route 的能力边界。随后本轮已把本机 checkout fast-forward 到 `dsh-v0.1.1-rc.2` 并成功 build；但正在运行的旧 Engine 进程仍须停止并重新启动，才会加载新代码。

**推断：** 当前 Deep Code 里图片“创建了任务但仍停在输入框”，不是单一 CSS 状态问题。更根本的链路是：Deep Code 把浏览器 draft 直接序列化进 prompt；旧 Engine 或 text-only model 在 durable admission 前拒绝，因此没有可用于确认“已经发送”的 durable user event。只把缩略图视觉上清掉会制造数据已提交的假象。

**建议：** Deep Code 应先升级到经验证的 `dsh-v0.1.1-rc.2` runtime，并从 `session.models`/model catalog 投影 `inputModalities`。当草稿含图时：

- 默认选中当前可用的 image-capable route，或在发送前提供一键切换；
- 只有收到 durable user event / prompt receipt 后，才从 composer 移除 draft；
- provider 拒绝发生在 durable admission 之后时，历史中的图片仍应留在该任务内，但 composer 不应重复保留第二份；
- 没有 image-capable route 时，发送按钮旁应直接写明“当前模型不能看图”，列出可切换模型或配置路径，不能让用户提交后才读硬核错误。

## 2. 本机 checkout 状态

### 2.1 已验证事实

审计开始时在 `C:\Users\lenovo\Desktop\deepseek-harness` 执行只读 Git 检查得到：

- remote：`origin https://github.com/deepseek-ai/deepseek-harness`；
- branch：`master`；
- HEAD：`47f943859b`，commit 时间 2026-08-13 19:38 +08:00；
- package version：根与 `apps/cli/package.json` 均为 `0.1.0-rc.5`；
- tracked files 没有修改；存在 6 个 untracked log：`build-codex*.log`、`install-codex*.log`、`web-codex*.log`；
- `git ls-remote origin` 显示官方 `master` 和 tag `dsh-v0.1.1-rc.2` 都是 `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`；
- npm registry 的 `latest` / `next` 均为 `0.1.1-rc.2`。

完成初始审计后，本轮执行了 fetch 与 fast-forward，最终 HEAD 为 tag `dsh-v0.1.1-rc.2` / `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`；随后执行 `corepack pnpm install --frozen-lockfile` 与 `corepack pnpm run build`，均成功。6 个 untracked 日志仍原样保留，未执行 reset、clean 或删除。

### 2.2 建议

不要在这份 checkout 上静默 `git pull`：它虽然没有 tracked 修改，但仍有用户/工具生成的日志，且 source release 需要同步依赖与重新 build。产品路径应改为由 Deep Code 管理独立、固定版本的 built runtime；开发者路径才继续接受 checkout。

## 3. HTTP 426：实时状态为什么失败

### 3.1 已验证事实

官方 commit [`8b4ddfe60c751f4596e497b739ef6b4979104bc1`](https://github.com/deepseek-ai/deepseek-harness/commit/8b4ddfe60c751f4596e497b739ef6b4979104bc1)（`feat(web): move connection downlinks to WebSocket`）在 2026-08-04 把浏览器 downlink 改为 WebSocket。

当前本机官方源码 [`packages/client/connection/README.md`](C:/Users/lenovo/Desktop/deepseek-harness/packages/client/connection/README.md) 与 [`packages/client/connection/src/index.ts`](C:/Users/lenovo/Desktop/deepseek-harness/packages/client/connection/src/index.ts) 明确规定：

- `/api/events.mux` 与 `/api/events.host` 各建立一条 downlink-only WebSocket；
- 客户端不在 socket 上发送业务数据，普通 RPC/response 仍走 HTTP POST；
- readiness 需要两个 WebSocket 都 open，且 `host.describe` HTTP 成功；
- 普通网络 GET 这两个地址时，Host 有意返回 `426 Upgrade Required` 和 `Upgrade: websocket`；
- 网络模式没有 SSE fallback，SSE codec 只服务进程内同构 carrier。

Deep Code 的 [`src/dsh-live-session.cjs`](../../src/dsh-live-session.cjs) 当前却对 `/api/events.mux` 执行 HTTP GET，并设置 `Accept: text/event-stream`。其单元测试也把 SSE 当成“official loopback”固定下来。这与官方源码直接相反。

### 3.2 修复建议

1. 用 Node/Electron 主进程的 WebSocket 客户端连接 `ws://127.0.0.1:3080/api/events.mux`；如需 host frames，再独立连接 `/api/events.host`。
2. 解析官方 WebSocket 发出的 `ServerRequest` JSON envelope：`{type:'server-request', rpcId, method, payload}`，再把 `payload` 交给已有 projection；不能把整个 envelope 当旧 SSE frame。
3. 保留 HTTP `/api/respond` 作为 approval/question response carrier；WebSocket 是只下行。
4. 连接 readiness 至少要求 mux socket open + `host.describe` 成功；若 Deep Code暂时不消费 host stream，也要把“只实现了部分官方 readiness”写入 compatibility feature，而不是声称完全连接。
5. 针对 426 增加真实协议测试：普通 GET 必须得到 426（证明 Engine 是新 transport），WebSocket upgrade 必须得到 101，首帧必须满足 `ServerRequest` schema，断线后清除 transient draft/waits 并以 durable history 重建。

## 4. 启动慢：官方成熟路径与 Deep Code 的差异

### 4.1 已验证事实

Deep Code [`src/runtime-supervisor.cjs`](../../src/runtime-supervisor.cjs) 当前启动：

```text
node --import tsx/esm apps/cli/src/bin.ts web
```

也就是从源码 checkout 运行 TypeScript 入口；这要求完整 monorepo、`node_modules`、tsx 与构建产物。

官方根 [`README.md`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/README.md#run) 把普通用户路径定义为：

```text
npx @deepseek-ai/dsh web
```

源码路径则明确要求 `pnpm install`、`pnpm run build`、`pnpm dsh web`。官方 [`apps/cli/README.md`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/apps/cli/README.md) 说明 production runs require built package and frontend artifacts；已发布 CLI 的 `bin` 指向 `lib/bin.js`，并按命令动态 import 对应 runner。

### 4.2 推断

源码入口的 TS loader、monorepo resolution 与大量 plugin composition 会放大冷启动成本。未做逐阶段性能埋点前，不能把全部等待都归因于 `tsx`；profile 首次初始化、插件加载、Web 静态资源与端口探测也可能占时。

### 4.3 建议

- 普通用户：Deep Code 自己维护 `@deepseek-ai/dsh` 的固定版本 runtime 目录，直接执行已构建 `dsh` bin；不要在每次启动用 `npx` 临时解析 latest，也不要依赖桌面 checkout。
- 开发者：保留“使用源码 checkout”高级模式，要求先完成官方 build，并优先运行 `apps/cli/lib/bin.js`；只有显式开发模式才回退 TS source entry。
- 先埋四段时间：进程 spawn、CLI 首条日志、HTTP root ready、WebSocket + `host.describe` ready。UI 分别显示“启动运行时 / 加载插件 / 建立实时连接”，而不是一个无限旋转的“启动 Engine”。
- 当 3080 已有兼容 Engine 时继续复用；但必须做协议 probe，不能只凭 `/` 返回 2xx 就认定兼容。

## 5. 可持续跟进每次上游更新

### 5.1 已验证约束

官方 README 明示项目仍是 Developer Preview，并会发生 compatibility-breaking changes。官方 `host.describe.version` 在本机源码中仍是 TODO 后的固定占位值 `0.0.1`，不能把它当真实 dsh package version。

### 5.2 建议：Compatibility Manifest

在 Deep Code 内维护一份人可读、机可读的 manifest，每个已验证 Engine release 一行：

```json
{
  "engine": {
    "package": "@deepseek-ai/dsh",
    "version": "0.1.1-rc.2",
    "git": "b150a551b8d465e31e418e1b2eaf5e79bbb7d28e"
  },
  "transport": {
    "unary": "http-post",
    "mux": "websocket-downlink",
    "host": "websocket-downlink"
  },
  "contracts": {
    "requiredMethods": [
      "host.describe", "session.create", "session.list", "session.history",
      "session.prompt", "session.models", "session.cancel", "skills.list"
    ],
    "requiredEvents": [
      "session/event", "approval/requested", "question/requested", "stream/error"
    ]
  },
  "features": {
    "durableImageAttachments": true,
    "modelInputModalities": true,
    "deepseekVisionModel": "deepseek-v4-flash-vision-exp"
  }
}
```

真实实现不要只用 semver 范围，因为 preview 阶段同一 rc 系列也可能改 wire contract；优先匹配 package version + Git commit，未知 fingerprint 进入“兼容性未验证”而非“坏掉”。

### 5.3 建议：Contract tests，而不是复制官方内部实现

每个候选 release 在独立临时 `DSH_HOME` 与端口上运行，使用 mock provider，验证：

1. CLI 能启动并打印真实 package version；
2. `/api/events.mux` 普通 GET 的预期状态与 WebSocket upgrade；
3. `host.describe`、session create/list/history/prompt/cancel、models、skills 的请求与响应 schema；
4. text-only 模型拒图的 stable error；vision 模型接收图片后 session history 出现 durable attachment ref，composer receipt 可确认；
5. reconnect 后 durable history 收敛、transient draft 不重复；
6. approval/question 的 rpcId 只保留在 adapter 内，respond 仍走官方 carrier；
7. presenter wrapper、tool events、模型 capabilities 对未知字段向前兼容，缺失必需字段 fail visible。

测试 fixture 应来自真实 wire capture 并去敏，不从 Deep Code 自己手写的理想 schema反推“官方契约”。

### 5.4 建议：Release 跟踪与更新边界

- **生产通道：** 固定最后一个通过全部 contract tests 的官方 release；Deep Code installer 与 portable 记录它。
- **上游候选通道：** CI 每日或每个 GitHub Release 触发，在隔离环境运行上述 tests；失败生成 Architecture Delta，不影响用户 runtime。
- **应用内检查：** 可选、只读地查询 GitHub Releases/npm dist-tag，显示中文更新摘要、当前/候选版本、已验证状态与 breaking-risk；不在后台下载，不计模型 tokens。
- **更新动作：** 用户显式确认后下载到新的 versioned runtime 目录，校验包来源/完整性，启动 smoke probe 成功后切换；旧 runtime 保留到用户确认，提供一键回退。
- **源码 checkout：** 只报告 remote 是否更新、dirty/untracked 状态和官方命令；绝不自动 `pull`、`reset`、`clean`、install 或 build。
- **问题处理：** 先搜索官方 changelog/commit/tests 是否已解决，再决定“升级 adapter”“移植 presenter/UX pattern”或“在 Deep Code 产品层独立解决”。Harness 继续是执行真相，Deep Code 不复制 Agent Loop、权限或附件存储。

## 6. 推荐实施顺序

1. **P0：把 mux SSE adapter 改为 WebSocket，并用真实 Engine 做 426→101 的 contract test。** 这是当前实时状态错误的确定根因。
2. **P0（本轮已完成）：把 runtime 从旧 `0.1.0-rc.5` checkout 对齐到固定 `0.1.1-rc.2` 并完成 build。** 下一步只需停止旧 Engine 进程并由 Deep Code 重新启动。
3. **P0：读取 `session.models` 的 image modality，增加 vision route 选择与发送 receipt 状态机。** 以 durable admission 清理 composer 草稿。
4. **P1：引入 compatibility manifest、Engine fingerprint 与 unknown-version 明示。** 不依赖 `host.describe.version` 占位值。
5. **P1：增加启动阶段耗时埋点，并优先运行 built CLI。** 用数据决定是否继续优化 preload/profile composition。
6. **P2：建立 release watcher + upstream-canary CI。** 只有通过 contract tests 的 release 才进入“可升级”。

## 来源清单

- 官方仓库与 release：[`deepseek-ai/deepseek-harness`](https://github.com/deepseek-ai/deepseek-harness)、[`dsh-v0.1.1-rc.2`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.1-rc.2)
- Vision catalog：[`e637bcfb9858`](https://github.com/deepseek-ai/deepseek-harness/commit/e637bcfb985850e90710c0d67bc29c748eb13a77)、[`llm-deepseek/src/index.ts@b150a551`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/llm/llm-deepseek/src/index.ts)
- 统一图片管线：[`d29855f97c40`](https://github.com/deepseek-ai/deepseek-harness/commit/d29855f97c406893a4167d74a53db521ab8b308b)、[`2026-08-20-unified-image-request-pipeline.md`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/.agents/notes/implemented/feature/2026-08-20-unified-image-request-pipeline.md)
- Files inline fallback：[`1b389798dcab`](https://github.com/deepseek-ai/deepseek-harness/commit/1b389798dcab65d2a29f673aa25ab4e68ca7876f)、[`d618bfebb441`](https://github.com/deepseek-ai/deepseek-harness/commit/d618bfebb4411b5af36e4f9203bd0457a962d496)
- Durable attachments：[`docs/subsystems/attachment.md`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/subsystems/attachment.md)
- Model capability/config：[`docs/user/guide/providers.md`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/user/guide/providers.md)、[`packages/fs/tool-fs/README.md`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/fs/tool-fs/README.md)
- WebSocket downlink：[`8b4ddfe60c75`](https://github.com/deepseek-ai/deepseek-harness/commit/8b4ddfe60c751f4596e497b739ef6b4979104bc1)、[`packages/client/connection/README.md`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/client/connection/README.md)
- 官方启动路径：[`README.md#run`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/README.md#run)、[`apps/cli/README.md`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/apps/cli/README.md)
