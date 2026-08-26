# DeepSeek Harness 外部 coding subagent 与多媒体输入核查

核查日期：2026-08-23（Asia/Shanghai）
DeepSeek Harness 官方仓库：`deepseek-ai/deepseek-harness`  ；本次固定到 `master` 在核查时的 commit [`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`](https://github.com/deepseek-ai/deepseek-harness/tree/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e)。

## 结论先行

1. **官方 Harness 当前已经有 Codex 与 Claude Code 的一等 subagent provider。** 不是“自动发现任何已安装 CLI”，而是由 profile/`cordis.yml` 显式挂载 `@deepseek-ai/dsh-subagent-codex`、`@deepseek-ai/dsh-subagent-claude-code`，再挂载 `@deepseek-ai/dsh-tool-subagent` 把指定 provider 暴露给父 agent。两者只接收一次性的非空文本任务，继承父任务工作目录，但不继承父对话、persona、工具过滤或结构化输出协议。
2. **Deep code 目前不会自然获得这项更新。** Deep code 是 Electron host + 外部 Harness checkout：仓库 `package.json` 没有任何 DSH subagent 包，`src/dsh-adapter.cjs` 只调用外部 runtime 的 session/prompt/snapshot/stream RPC。用户把 Engine checkout 更新到该 commit后，Harness 本身可以配置 provider；但 Deep code 还没有子 agent 配置 UI、子 agent 事件/生命周期投影或显式安全说明，因此暂时不能称为“支持”。
3. **官方多媒体稳定契约目前是图片，不是音频/视频/实时屏幕。** `dsh-attachment` v1 对 PNG/JPEG/WebP/GIF 做校验、持久化和内容寻址；LLM `ImageBlock` 只引用 durable attachment。官方 `read_image` 也要求当前路由声明图像输入。没有在固定 commit 的官方 docs/source 中找到 audio、video、screen capture 或 computer-use 输入协议。
4. **首版应做截图上传，不应做持续实时观看。** 截图有现成官方 attachment seam，能做大小/像素/格式限制和可审计持久化。短录屏可先作为本地文件/抽帧后由用户确认再提交，但不能伪装成 DSH 原生 video 输入。实时屏幕观察需要另建 Windows capture、权限、帧采样、隐私和取消协议，成本与风险都明显高于当前 MVP。

## 1. Codex / Claude Code subagent 契约

### 注册关系

官方 subagent subsystem 明确允许多个命名 provider 共存于 `ctx.subagents`；模型侧由 `dsh-tool-subagent` 选择一个 provider 执行，控制与报告是可选的独立工具。见官方 [subagent subsystem reference](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/subsystems/subagent.md)（固定 commit）。

官方 package README 列出了 `subagent-codex`、`subagent-claude-code`、`tool-subagent` 等 package 的职责，见 [subagent family README](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/subagent/README.md)。

### Codex

`@deepseek-ai/dsh-subagent-codex` 启动官方 Codex 的 `app-server --stdio`，创建一个 ephemeral thread，在父 Session 的 cwd 中提交一个自包含文本任务，只回传最终答案或安全诊断；其 README 明确说父上下文、persona、tool filter、depth policy 和 structured-output contract 都不会传给 Codex。见 [Codex provider README](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/subagent/subagent-codex/README.md)。

最小 profile 行（官方 README 的 composition 示例）如下：

```yaml
- id: subagent-codex
  name: '@deepseek-ai/dsh-subagent-codex'
  config:
    providerName: codex
    permissionMode: never
    env:
      OPENAI_API_KEY: !!js process.env.OPENAI_API_KEY

- id: tool-subagent-codex
  name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: codex
    toolName: subagent_codex
```

官方配置类型还支持 `approve-for-me` 与 `dangerously-bypass-approvals-and-sandbox`；后者明确跳过批准和 sandbox，不能作为 Deep code 新手默认。见 [config catalog](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/config-catalog.md#deepseek-ai-dsh-subagent-codex)。

### Claude Code

`@deepseek-ai/dsh-subagent-claude-code` 通过官方 Claude Agent SDK 的 `query()` 调用 native `claude`，同样只提交自包含文本任务，并只接受成功 result 的最终文本。固定 commit 的 README 标明当前运行时依赖 `@anthropic-ai/claude-agent-sdk@0.3.220`，并提醒 production 使用 native `claude` 安装；这不是任意版本 CLI 的兼容性承诺。见 [Claude provider README](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/subagent/subagent-claude-code/README.md)。

最小官方组合形状：

```yaml
- id: subagent-claude-code
  name: '@deepseek-ai/dsh-subagent-claude-code'
  config:
    env:
      ANTHROPIC_API_KEY: !!js process.env.ANTHROPIC_API_KEY

- id: tool-subagent-claude-code
  name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: claude-code
    toolName: subagent_claude_code
    enableRunInBackground: false
    maxDepth: provider-managed
```

官方配置允许 `dontAsk`、`acceptEdits`、`auto`、`plan`、`bypassPermissions` 等 native permission mode；默认应保持询问/拒绝侧，不应由桌面端静默提权。见 [Claude config catalog](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/config-catalog.md#deepseek-ai-dsh-subagent-claude-code)。Anthropic 的一手 SDK 文档确认 TypeScript `query()` 会作为子进程运行 Claude Code，并支持 `cwd`、`maxTurns`、`allowed_tools` 等选项，见 [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk)；CLI 安装/Windows 支持见 [Claude Code setup](https://docs.anthropic.com/en/docs/claude-code/getting-started)。

### 成本与安全

启动 provider 本身是装载配置；真正调用 Codex/Claude Code 时会再产生一次外部模型调用，可能产生另一套 token/计费，并启动受 Harness 管理的子进程。Codex/Claude provider 的 `env` 是显式注入到已清理父环境的凭据；不要把 API key 写入 profile 或 Deep code session。子 agent 与主 agent 共享工作目录时可能修改同一工程，必须在 UI 中显示 provider、cwd、权限模式、状态、结果和取消入口。

官方 Harness 的产品页也明确它仍是 developer preview，插件和 API 会继续演化，见 [DeepSeek Harness official overview](https://deepseek.com/harness/en/)。其 MIT 许可只覆盖 Harness 源码；Codex、Claude Code、SDK、模型服务和用户凭据仍各自受其官方条款/许可约束。

## 2. 与当前 Deep code 的关系

本仓库在固定核查时的 `package.json` 仅包含 Electron、electron-builder 和 markdown-it；没有 `@deepseek-ai/dsh-subagent-*` 或 `@deepseek-ai/dsh-tool-subagent`。本地 `src/main.cjs`、`src/runtime-supervisor.cjs` 和 `src/dsh-adapter.cjs` 的职责是启动/轮询一个外部 Harness，并经 HTTP/RPC 读取 session、prompt、snapshot、mux stream；它没有 profile composition、provider registry、subagent event projection 或子 agent UI。

因此可分两层：

- **外部能力层：** 用户更新/配置官方 Harness checkout 后，Harness 可以拥有 Codex/Claude provider。
- **Deep code 产品层：** 当前版本不会发现、配置或安全展示这些 provider；即使模型在 Harness 内部成功调度，Deep code 也只能把未规范化的部分事件当作普通 Harness 运行状态，不能给新手可靠呈现。

推荐的后续 seam 是读取官方 durable subagent/session 事件并做只读投影；不在 Deep code 另建一套执行器、mailbox 或权限真相。第一步做“检查已安装 provider + 明示权限模式”的 settings card，第二步做“子 agent 时间线/结果/取消”只读视图，第三步才允许用户在任务级选择 provider。

## 3. 图片、音频、视频与屏幕捕获

### 已有：durable image attachment

官方 attachment subsystem 将二进制交给 `ctx.attachments`，在 session event 追加前持久化为内容寻址的不可变引用；ImageBlock 不携带浏览器 object URL、临时路径或 base64。v1 接受 `image/png`、`image/jpeg`、`image/webp`、`image/gif`，并有最大 bytes、最大图片数、总 bytes、最大像素等限制。见 [attachment subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/subsystems/attachment.md) 与 [attachment package README](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/attachment/README.md)。

官方 `read_image` 也只接受 PNG/JPEG/WebP/GIF，先验证/限流/持久化，再返回 image block；如果当前模型路由没有声明图像输入则失败。见 [filesystem tool README](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/fs/tool-fs/README.md)。这给 Deep code 的可靠 MVP 路径是：选择/粘贴截图 → 本地预览 → 明示“发送” → 通过官方 attachment RPC → 在任务中显示缩略图和模型是否支持图片。

### 未发现的稳定官方输入

固定 commit 的 `llm-streaming` 文档把 `ContentBlock` 列为 text、reasoning、image、tool-call、tool-result；没有音频、视频或屏幕帧 block。见 [LLM streaming message types](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/subsystems/llm-streaming.md)。因此：

- **音频/语音：** DSH 没有稳定的 audio input seam；可在桌面端本地转写成文本再提交，但这会是 Deep code 自己的插件/依赖，不应冒充官方 DSH 多模态。
- **视频/录屏：** 没有 video attachment 或 frame sampling 契约。可以做本地短片保存、用户选段、抽取若干 PNG 后按图片附件发送；原视频不应直接塞进 prompt。
- **实时屏幕观看/computer use：** 没有官方 DSH screen-capture/computer-use 输入接口。要实现需要 Windows capture 权限、帧采样、隐私遮罩、取消、缓存清理和独立成本控制，当前不应做进 MVP。

## 4. 对 Deep code 的可控路线

### P0：截图（建议立即做）

只做显式一次性截图：系统截图/文件选择/剪贴板 → 本地预览 → 用户点击发送。限制格式、尺寸、数量，明确“截图会发送给当前模型”，在任务事实区显示附件名/尺寸/模型支持状态。默认不自动读取屏幕，不后台上传。

### P1：短录屏提交（可选）

录制 10–30 秒本地文件，停止后让用户预览并选择“抽帧解释”；本地抽取低频关键帧，最多提交受控数量的 PNG，音轨先不上传。若以后接语音转写，也应显示转写文本并要求确认。这样可以复现问题现场，但不宣称 DSH 支持 video。

### 暂不做：持续实时观察 / 直接复制其他产品

实时观察会同时增加帧传输、视觉 token、内存、隐私泄露和误操作风险；官方 DSH 当前没有承载契约。其他产品的交互理念可以借鉴，但不能复制其实现、品牌或未公开协议。等 DSH 或操作系统提供稳定的 screen/computer-use seam，再做可暂停、可见指示灯、敏感窗口黑名单和逐次确认的实验功能。

## 5. 访问记录与来源范围

所有 Harness claims 均来自上面的官方仓库固定 commit `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e` 的源码/文档；Codex/Claude product claims 使用 OpenAI/Anthropic 官方文档；访问日期均为 2026-08-23。没有使用社区实现来证明官方能力；社区讨论仅作为未纳入稳定契约的背景，不作为结论依据。
