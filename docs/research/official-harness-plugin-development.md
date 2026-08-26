# DeepSeek Harness 官方插件开发调研与 Deep code 采用边界

> 调研日期：2026-08-15
> 一手资料范围：DeepSeek Harness 官方文档与 `deepseek-ai/deepseek-harness` 官方仓库。
> 核对版本：官方仓库 `main` 的 `47f943859bef60e4160492346772ded9b24f765a`；调研时本地 checkout 与远端 `HEAD` 一致。以下 GitHub 链接尽量固定到该 commit，避免 developer preview 后续改动使结论失真。
> 上游状态：Harness 官方仍标记为 **developer preview**，明确警告会有破坏兼容性的变更。因此本文是 2026-08-15 的工程快照，不是永久稳定 API 承诺。[官方 README](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md)

## 结论先行

Deep code 不应整体改造成一个 Harness 插件。最稳妥的结构仍是：

1. **Deep code 桌面产品层**负责 Electron 生命周期、Engine 进程监督、本地目录选择、首次向导、更新、故障恢复，以及把工程状态翻译成自然语言。
2. **DshAdapter 边界**负责调用官方 Host/API，并把 DSH 协议归一化成 Deep code 的产品状态；模型设置、凭据状态、会话与审批应优先走官方现有 seam/API，而不是复制一套实现。
3. **可选的 Deep code Harness bundle**只承载真正需要在 Harness 进程内运行的能力，例如注册一种新 Tool、Skill Provider、只读事件观察器，或新的 LLM Adapter。官方把 bundle 定义为携带一个配置 patch 层的 npm 包，而 profile 是用户实际启动的一套有序组合；两者不是同一个概念。[官方“Package and install a plugin”](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish) / [固定版本源码](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.md)

对近期 Deep code 路线的直接判断：

- **模型配置**：继续放在桌面端，通过 Harness 的 Settings/Credentials seam；只有“增加一个新的模型提供方/适配器”才值得做插件。
- **Decision Gates**：界面可由 Deep code 提供，但决定与审计必须接官方 Approval/Sandbox/Permission Presets seam；不得用角色提示词或另一个本地布尔值代替执行侧强制。
- **技能与角色卡**：Skill 兼容应接官方 `ctx.skills` 和官方文件格式；角色卡保留为 Deep code 自己的亲和交互数据，再受控翻译成 persona。不要让普通角色卡直接变成 preset composition，因为官方明确说 preset 与它引用的插件同等有权，`user` preset 具有与 shell access 相同的信任级别。[Agent Presets 官方包说明](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/preset/agent-presets/README.md)
- **自然语言解释层**：主要属于 Deep code UI/DshAdapter。Harness 内插件适合提供结构化、只读事件证据，不应在上游运行时里再造第二份“产品真相”。

## 1. 官方词汇：plugin、bundle、profile、seam 分别是什么

### 1.1 Plugin：运行时能力模块

最小 Harness 插件是一个 TypeScript 模块，导出 `apply(ctx)`；Harness 加载时调用它，插件通过 `ctx` 注册工具、事件监听器、服务等能力。`name` 只是可选诊断元数据。[官方基础教程](https://deepseek-harness.github.io/deepseek-harness/develop/basic/) / [固定版本源码](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/index.md)

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'deep-code-observer'

export function apply(ctx: Context) {
  // 通过 ctx 注册能力；不要在模块顶层偷偷修改全局状态。
}
```

插件还可以采用对象形式或 `Service` class 形式；官方建议普通插件优先用函数形式，只有需要向其他插件提供 service 时再用 class。[官方基础教程：Three plugin forms](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/index.md#three-plugin-forms)

依赖不靠 YAML 行顺序保证。插件导出 `inject = ['tools']` 后，会等所需 service 就绪再执行；service 消失时，依赖插件自动卸载，service 恢复后再加载。[Plugins and lifecycle](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/framework/index.md) / [Services and dependencies](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/framework/service.md)

通过 `ctx` 注册的事件、工具和 adapter 会随插件卸载自动清理；自有连接、定时器等资源应放进 `ctx.effect()` 并返回 disposer。这使 HMR 和替换插件时不会遗留旧注册。[官方插件生命周期文档](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/framework/index.md#automatic-cleanup)

### 1.2 Bundle：可安装、可排序的配置层

bundle 是一个 npm 包，在 `package.json` 的 `dsh.bundle.patch` 中声明自己的 `cordis.patch.yml`。patch 插入或覆盖插件行，bundle 回答“这个包为组合贡献什么”。官方给出的最小可分发结构是：[官方发布教程](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish) / [固定版本源码](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.md#the-bundle-manifest)

```text
deep-code-harness-plugin/
├── package.json
├── cordis.patch.yml
└── index.js
```

```json
{
  "name": "dsh-deep-code-plugin",
  "version": "0.1.0",
  "type": "module",
  "main": "index.js",
  "files": ["index.js", "cordis.patch.yml"],
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}
```

```yaml
- insert:
    - id: deep-code-observer
      name: dsh-deep-code-plugin
```

一个包即使能被 pnpm 安装，只要没有 `dsh.bundle`，就只是普通依赖，不会成为 profile 配置层；`dsh plugin` 会警告但不会激活它。[官方发布教程](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.md#the-bundle-manifest) / [CLI 实现](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/src/plugin.ts)

### 1.3 Profile：用户实际启动的一套产品组合

profile 位于 `$DSH_HOME/profiles/<name>`；未设置 `$DSH_HOME` 时，官方 home 规则回退到 `~/.dsh`。它包含由 pnpm 管理的 `package.json`、有序的 `dsh.profile.bundles` 列表，以及用户自己的 `cordis.patch.yml`。[App boot/profile 合同](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/boot/app-boot/README.md#profiles)

bundle 是作者编写并分发的东西；profile 是用户以 `dsh --profile <name>` 启动的东西；官方明确说明没有一个实体同时是两者。[官方发布教程：Two concepts, two manifests](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.md#two-concepts-two-manifests)

### 1.4 Seam：完整可替换能力，不等于一个包

当能力需要替换 provider 时，官方用三种角色组织它：

- **Service Definition**：定义能力接口与类型；
- **Service Provider**：提供具体实现；
- **Consumer**：把能力暴露给上层，例如做成模型可调用 Tool。

完整能力才是一个 seam，单独一个角色不是 seam；只有这些角色确实要独立演进或替换时才拆包，不应预先把简单插件拆成三包。[Three-role capability design](https://deepseek-harness.github.io/deepseek-harness/develop/practice/) / [固定版本源码](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/practice/index.md)

对 Deep code 的含义是：不要只因为“未来也许扩展”就建立一套抽象森林。先使用现有 `settings`、`credentials`、`approval`、`skills` seam；只有 Deep code 真有新的可替换 provider 时再新增 service definition/provider/consumer。

## 2. 插件怎样被加载、发现和覆盖

### 2.1 本地开发 overlay

本地教程把插件源码通过 `--patch` overlay 插入 Web profile。overlay 中的插件路径必须是绝对路径，因为 patch 提供配置，但不会改变 loader 的 profile 基准目录。[官方“Your first plugin”](https://deepseek-harness.github.io/deepseek-harness/develop/basic/) / [固定版本源码](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/index.md#register-it-in-cordisyml)

```yaml
- insert:
    - id: deep-code-observer
      name: 'C:/path/to/deep-code-observer.ts'
```

```powershell
pnpm dsh web --patch .\scratch-plugin\cordis.yml
```

loader 挂载配置里的每一项；各项并发开始，列表位置不保证加载先后，顺序由 `inject` service 依赖决定。插件导入或生命周期失败会明确导致启动失败，而不是静默跳过。[Cordis first plugin tutorial](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/cordis-tutorial/01-first-plugin.md)

### 2.2 已安装 bundle 的发现

`dsh plugin --profile <name> add <package>` 在 profile 目录中把参数转发给 pnpm，然后根据已安装包的 `dsh.bundle` manifest 更新 `dsh.profile.bundles`。内置 bundle 先从 dsh 安装自身解析，树外 bundle 再从 profile 的 `node_modules` 解析。[CLI README](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/README.md) / [profile loader source](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/boot/app-boot/src/profile.ts)

可以先不启动应用而检查最终组合：

```powershell
pnpm dsh --profile web --dump-default-config
pnpm dsh --profile web --dump-config
```

官方说明 `--dump-default-config` 只显示 bundle 层，`--dump-config` 还包含 profile/home 用户层和 overlay；这是 Deep code 插件安装器很适合调用并翻译成人话的诊断入口。[CLI README](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/README.md#profiles-and-bundles) / [dump-config implementation](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/apps/cli/src/dump-config.ts)

### 2.3 配置层优先级

有效配置从空树开始，依次应用：

1. `dsh.profile.bundles` 中每个 bundle 的 patch，按列表顺序；
2. profile 自己的 `cordis.patch.yml`；
3. home 级 `$DSH_HOME/cordis.patch.yml`；
4. 命令行中每一个 `--patch` overlay，按出现顺序。

后层覆盖前层。按 `id` 覆盖一行时，patch 会替换该行的**整个 `config`**，不会深合并字段，因此必须重述仍需要的键。[官方发布教程：The loading order](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.md#the-loading-order) / [app-boot profile contract](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/boot/app-boot/README.md#profiles)

这对 Deep code 很重要：普通用户不应被要求手改这些层。Deep code 若做插件管理 UI，应显示“来自哪个 bundle/profile/home/临时 overlay、谁最后覆盖了谁”，并在写入前生成可审阅 diff；否则新手很难理解为什么一个配置看似保存却没生效。

### 2.4 HMR 与失败行为

配置文件编辑会卸载旧插件并加载新插件；通过 `ctx` 注册的 effects 会随旧实例清理。若用户 patch 的读取、解析或新 Loader tree 失败，官方 watcher 保留最后一个可用树并发出 `hmr/config-update-failed`，而不是把正在工作的树破坏掉。[Composition and HMR](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/cordis-tutorial/06-composition-and-hmr.md) / [app-boot watcher contract](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/boot/app-boot/README.md#profiles)

## 3. Windows 本地开发流程

下面流程把官方 POSIX 教程改写成 PowerShell；语义仍以官方文档为准。

### 3.1 前置条件

官方当前要求：Node.js `22.19+` 或 `24+`，Corepack 管理的 pnpm（仓库固定 `pnpm@11.7.0`），Git `2.26+`；只有真实模型演示和 real-API e2e 才需要 DeepSeek API Key。[官方 Development guide](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/development.md#prerequisites)

```powershell
node --version
git --version
corepack enable
pnpm --version
```

首次 checkout：

```powershell
git clone https://github.com/deepseek-ai/deepseek-harness.git
Set-Location .\deepseek-harness
pnpm install
pnpm run typecheck
pnpm run build
```

官方把 `pnpm run typecheck` 成功视为源码环境准备完成；演示前单独执行 build。[官方 Development guide](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/development.md#first-time-setup) / [README run from source](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md#run-from-source)

### 3.2 最小本地插件

```powershell
New-Item -ItemType Directory -Force .\scratch-plugin\src | Out-Null
```

创建 `scratch-plugin\src\my-plugin.ts`：

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'deep-code-observer'

export function apply(_ctx: Context) {
  console.log('[deep-code-observer] loaded')
}
```

创建 `scratch-plugin\cordis.yml`。Windows 下建议用带引号、正斜杠形式的绝对路径，避免 YAML 反斜杠转义与 drive-letter ESM 歧义：

```yaml
- insert:
    - id: deep-code-observer
      name: 'C:/Users/you/path/deepseek-harness/scratch-plugin/src/my-plugin.ts'
```

先 dump 再启动：

```powershell
pnpm dsh --profile web --patch .\scratch-plugin\cordis.yml --dump-config
pnpm dsh web --patch .\scratch-plugin\cordis.yml
```

浏览 `http://127.0.0.1:3080`，并检查终端是否出现 `[deep-code-observer] loaded`。官方基础教程使用同一 `--patch` 路径，并明确要求绝对插件路径。[官方基础教程](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/index.md)

### 3.3 注册一个真实 Tool

Tool 插件应 `inject = ['tools']`，使用 `defineTool()` 描述参数、标准返回值和 model-facing render，再通过 `ctx.tools.register()` 注册。官方执行链会验证模型参数，并在卸载时注销工具。[官方 Build a tool](https://deepseek-harness.github.io/deepseek-harness/develop/basic/tool) / [固定版本源码](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/tool.md) / [Into the harness](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/cordis-tutorial/07-into-the-harness.md)

### 3.4 打包并安装进 profile

开发完成后，把 JS 构建产物和 patch 做成前述 bundle，然后安装进一个 profile：

```powershell
pnpm dsh plugin --profile web add .\deep-code-harness-plugin
pnpm dsh --profile web --dump-config
pnpm dsh --profile web
```

移除时：

```powershell
pnpm dsh plugin --profile web remove dsh-deep-code-plugin
```

这些命令来自官方 `dsh plugin --profile` 工作流；使用源码 checkout 时把文档中的 `dsh` 换成 `pnpm dsh`。[官方发布教程：Install into a profile](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.md#install-into-a-profile)

直接从 GitHub 安装 TypeScript 包有额外风险：git dependency 只拉源码，作者必须提供自包含 `prepare` 构建；pnpm 10+ 默认拒绝运行它，用户需在 profile 的 `pnpm-workspace.yaml` 明确 `allowBuilds`。官方强调这相当于允许包在安装时、在 agent sandbox 之外执行本机代码；只应授权可信源码并固定 commit SHA。若不想要求构建授权，应发布预构建 npm 包或 `pnpm pack` tarball。[官方 GitHub install 警告](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.md#installing-from-github-the-build-script-catch)

## 4. 官方 seam 与 Deep code 模块的对应关系

### 4.1 模型连接与配置

官方 Settings seam 把“组合的工程默认值”和“用户可编辑字段”分开：插件注册 namespace schema，配置 UI 可获取 redacted schema/value/base/user；所有 wire surface 必须使用 `describe({ redactSecrets: true })`，secret 字段会从各层删除，只留下可渲染的 write-only slot。[Settings subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/settings.md)

官方 Credentials seam 则让 `cordis.yml` 和 settings 只保存 credential reference（环境变量式名称），实际 secret 由 credential provider 保存；consumer 每次操作重新 resolve，因此轮换后的凭据可在下一次模型请求生效。配置 UI 需要刷新“已配置”状态时可以监听 `credentials/updated`，但不需要得到 secret 值。[Credentials subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/credentials.md)

**Deep code 建议：**

- 继续用 DshAdapter 把官方 settings/credentials 的安全投影转成人话；API Key 输入只做 write-only，永不回显、永不进入日志。
- “检查模型连接”保持产品层能力；它需要串联 Engine、provider、model catalog、credential configured 与最小真实调用证据，不需要另装插件。
- 只有增加一个官方没有的 LLM Adapter 时，才做 Harness 插件/provider，并通过 `ctx.llm.registerAdapter(...)` 注册；官方生命周期文档把 LLM adapter registration 列为 effect-bound registration。[Plugins and lifecycle](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/framework/index.md#automatic-cleanup)

### 4.2 Decision Gates、批准与权限

官方 Approval seam 的结果词汇是封闭且 fail-closed 的：只有 `allowed-once` 是授权，`rejected`、`cancelled`、`unavailable` 都必须拒绝；缺失、抛错或返回非法值的 answerer 归一化为 `unavailable`。每次询问写入 `approval/asked` 与 `approval/decided` 审计对；`never` policy 在 answerer waterfall 前强制执行，后注册的监听器也不能绕过它。[User Approval subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/approval.md)

Permission Presets 只是把两个独立 enforcement knob——sandbox mode 与 approval policy——组合成一个客户端选择项；它自己不拥有 enforcement，切换时仍通过两个官方 setter 写入。默认表包含 `workspace-write`（workspace-write + ask）和 `danger-full-access`（danger-full-access + never）。[Permission Presets subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/permission-presets.md)

**Deep code 建议：**

- Decision Gate UI 可以解释“准备执行什么、影响哪里、为何需要批准、结果是否进入审计”，但最终结果必须通过官方 approval/sandbox 写路径。
- 一个可选 Harness 插件可以提供风险分类、只读审计投影或一个明确受控的 answerer；它不得私自把 `unavailable` 改成允许，也不得在角色卡加载时改变 permission preset。
- 不要把“新手模式”“温柔角色”与安全策略绑在同一保存操作。角色层的文本改变不能顺带修改 shell、sandbox、tool allowlist 或 approval policy。

### 4.3 Skills 与角色卡兼容

官方 Skill family 已经具备可替换 provider：`ctx.skills` registry、filesystem provider、可选 bundled badge provider 和 model-facing skill tool。registry 可以合并本地、嵌入、远程或其他 provider；host/global 与 agent preset scope 分层，离当前 agent 更近的一层可覆盖同名 skill。[Skills subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/skills.md)

本地 provider 的官方发现优先级为：

1. `<projectRoot>/.dsh/skills`
2. `<projectRoot>/.agents/skills`
3. 自定义 `customSkillDirs`
4. `<dshHome>/skills`
5. `<agentsHome>/skills`
6. 配置的 bundled skill 目录

项目根是最近的含 `.git` 祖先；没有 git root 时使用 cwd。支持 `<name>/SKILL.md` 目录 bundle 和 `<name>.md` 扁平文件，不支持递归 `**/SKILL.md` 发现；skill name 必须是 kebab-case。[Skills：Local discovery priority and local format](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/skills.md#local-discovery-priority)

官方把 model invocation 与 user invocation 作为两个独立控制；本地 frontmatter 使用精确键 `disable-model-invocation` 与 `user-invocable`，省略时都默认允许。catalog 只向模型显示 name/description，不把正文与绝对路径整个塞进会话；完整正文由 `skill` tool 按需重新读取。[Skills：Invocation policy and loading](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/skills.md)

**Deep code 建议：**

- 对 `colleague-skill` 一类生态，优先兼容标准 `SKILL.md` 目录结构和调用控制，不复制另一套 skill parser。
- “角色卡”与 “skill” 是相邻但不同的产品概念：角色卡描述称呼、语气偏好、关系边界、展示素材与可选知识包；skill 是可发现、可加载的任务说明。一个角色可以关联多个 skill，但导入角色卡不应自动授予任何工具能力。
- 若需要让一个角色只在某个 agent 中看见某些 skill，可通过 agent preset scope 的 skill provider 实现；普通用户界面应展示“这张角色卡附带哪些说明”与“是否新增可执行能力”两个独立清单。

### 4.4 Agent Preset 与 persona：角色卡的危险边界

官方 Agent Preset 不是一张轻量 prompt 卡，而是一个含 `agent.cordis.yml` 的完整 per-agent composition。它可以一次挂载工具、prompt sections 和 projection units；不同 session 可共享同一 standing composition 但仍按 Agent/Session 分开状态。[dsh-agent-presets README](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/preset/agent-presets/README.md)

Preset 可以携带只用于展示的 `preset.yml`（name、description），但权限来自 composition 引用的插件。官方直言：preset 与它命名的插件同等有权，`user` preset 具有与 shell access 相同的 trust；trust 字段是给 UI 呈现差异，不是 enforcement。[Agent Presets：Display metadata and Trust](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/preset/agent-presets/README.md#display-metadata)

官方 `dsh-persona` 可以在 agent preset 内覆盖 deployment persona。其 `complete: true` 会把该 persona 恢复为唯一 system-prompt section；`includeRuntimeContext: false` 会抑制 sandbox、approval、delegation 等动态 runtime-context prompt 内容。[dsh-persona README](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/preset/persona/README.md)

**Deep code 建议：**

- 普通角色编辑器只生成受限 persona 文本和展示元数据，默认保持 `complete: false`、`includeRuntimeContext: true`；不要向新手角色卡暴露这两个底层开关。
- 不接受角色卡内嵌任意 `agent.cordis.yml`、任意 package specifier、任意 `!!js` 或绝对可执行路径。需要完整 preset 的导入应进入单独的“高级扩展”流程，按本机代码执行级别提示、预览和批准。
- 新手所谓“角色拥有多个专属 agent 的亲切感”可以由 Deep code 的角色数据、persona 与会话选择实现；没有必要让每张角色卡自动成为一个有 shell 权限的 preset。

### 4.5 工程解释层

Cordis events 适合松耦合观察；官方示例用 `tools/result` 监听每个工具结果，Harness 的 waterfall 还用于 `agent/request` 与 `approval/request` 等可协作决策点。[Event system](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/framework/events.md) / [Into the harness observer example](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/cordis-tutorial/07-into-the-harness.md#an-observer-plugin)

**Deep code 建议：**

- 若现有 API 已提供所需 session/tool/approval 证据，解释层留在 DshAdapter，避免增加安装复杂度。
- 若 API 缺少一个稳定、结构化的只读事件，可做一个极小的 observer 插件，把官方事件投影成 Deep code 需要的 schema；它只提供证据，不决定权限，也不重写上游 session history。
- UI 中必须把“事实（工具调用/文件变化/批准结果）”“Deep code 的解释”“推测/下一步建议”分栏或分级，不能让自然语言总结成为第二份执行真相。

## 5. 哪些事情不应放进 Harness 插件

以下内容应留在 Deep code 桌面产品层：

- Electron 窗口、托盘、安装器、自动更新、崩溃恢复、Engine 子进程启停、目录选择和 Windows 路径 UX。
- API Key 原文存储、回显、诊断日志和 Deep code 自建 secret 文件；secret 交给官方 Credentials seam。
- Deep code 自己的角色卡资料库、头像/主题/排序/关系展示等纯 UI 数据。
- 把复杂 DSH 状态翻译成面向新手的步骤、错误解释和恢复建议。
- 版本兼容检测与迁移。上游仍是 developer preview，桌面壳必须能在 Adapter 边界识别协议/能力差异，而不是让每个 UI 页面直接依赖上游内部类型。[官方 developer preview 警告](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md#developer-preview)

以下内容即使技术上能做，也不应作为近期默认插件能力：

- 角色卡导入时自动安装 npm/GitHub 包、执行 `prepare`、写 profile patch 或改变 permission preset。
- 自建一套批准、沙箱、工具执行、settings 或 credentials 服务，与官方 seam 并行。
- 用 system prompt 声称“不会修改文件”来替代真正 sandbox/approval enforcement。
- 自动运行任意 dynamic Cordis host/browser code。官方 Extensions subsystem 确实存在版本化动态 Cordis package 与 host/browser half 运行面，但这是可执行代码生命周期，不是温柔的 UI 自定义格式；Deep code 应先完成静态、可审计 bundle 管理，再考虑它。[Extensions subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/extensions.md)

## 6. 建议的 Deep code 分阶段采用方案

### 阶段 A：不新增插件，先完成官方 seam 的产品化

1. 模型 API Key write-only 配置与最小真实调用验证。
2. Approval/Permission 状态只读投影、中文解释和 Decision Gate UI。
3. Skills inventory：列出来源层、调用策略、健康状态，兼容标准 `SKILL.md`。
4. DshAdapter capability/version probe：若某 RPC/seam 不存在，显示“当前 Harness 版本不支持”，而不是崩溃。

这一步最符合 Deep code “把 developer preview 翻译成人类界面”的定位。

### 阶段 B：一个极小、可选、只读的 Deep code observer bundle

只在现有 API 确实缺证据时创建。初始 bundle 最多：

- 监听明确的官方事件；
- 生成稳定、无 secret 的结构化状态；
- 通过一个最小 service/Remote 暴露；
- 有版本/能力声明、卸载清理和失败隔离；
- 不注册执行 Tool，不回答 approval，不写用户配置。

安装前 Deep code 显示 package 来源、固定 commit/版本、将加入的 plugin rows、所需 build permission，以及 `--dump-config` 前后差异。

### 阶段 C：Skills/角色桥接，而不是任意 preset 导入

1. 角色卡保持 Deep code 自有 schema。
2. 关联标准 Skills，只保存引用和用户明确选择。
3. 将安全的人格字段编译为受限 persona；永不由角色卡改变工具、sandbox 或 approval。
4. 只有高级用户显式选择“创建完整 Agent Preset”时，才生成/复制 composition，并按 shell-trust 级别审核。

### 阶段 D：真正的 Harness 原生扩展市场

等上游协议相对稳定后再做：bundle 安装/卸载、profile 分层可视化、签名/来源/commit pin、构建授权、兼容矩阵与一键回滚。直接 Git 安装会触及官方明确警告的 install-time code execution，因此不能把它包装成普通“下载角色卡”。[官方 GitHub install 安全说明](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/publish.md#installing-from-github-the-build-script-catch)

## 7. 对项目位置重组的判断

插件开发不要求 Deep code 与 Harness 放在同一仓库。官方本地 overlay 支持绝对源码路径，安装式 bundle 则通过 profile 的 pnpm dependencies 解析；因此为了插件而把两个仓库物理合并没有必要。[本地绝对路径 overlay](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/basic/index.md#register-it-in-cordisyml) / [profile 双锚点解析](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/boot/app-boot/README.md#profiles)

建议长期结构：

```text
Deep-code/                         # 独立 Git 仓库，桌面产品
├── src/
├── docs/
└── packages/
    └── harness-plugin/            # 未来可选 bundle；尚无必要时不创建

deepseek-harness/                  # 独立官方 checkout，可替换、可升级
```

Deep code 只保存用户选择的 Harness checkout 路径/启动方式，不把官方源码复制进自己的 Git 历史。若需要一个共同开发父目录，可以把两个仓库并列放在空间充足的盘符，但保持 Git 边界独立。这样上游升级、Deep code 发布和插件兼容测试都更清楚。

## 8. 一手来源索引

- [DeepSeek Harness 官方站：插件基础教程](https://deepseek-harness.github.io/deepseek-harness/develop/basic/)
- [DeepSeek Harness 官方站：Build a tool](https://deepseek-harness.github.io/deepseek-harness/develop/basic/tool)
- [DeepSeek Harness 官方站：Plugin configuration](https://deepseek-harness.github.io/deepseek-harness/develop/basic/config)
- [DeepSeek Harness 官方站：Package and install a plugin](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish)
- [官方仓库 README（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md)
- [官方开发环境指南（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/development.md)
- [官方 Cordis tutorial（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/tree/47f943859bef60e4160492346772ded9b24f765a/docs/cordis-tutorial)
- [官方 three-role capability design（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/user/develop/practice/index.md)
- [官方 app boot/profile contract（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/boot/app-boot/README.md)
- [官方 Settings subsystem（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/settings.md)
- [官方 Credentials subsystem（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/credentials.md)
- [官方 Approval subsystem（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/approval.md)
- [官方 Permission Presets subsystem（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/permission-presets.md)
- [官方 Skills subsystem（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/skills.md)
- [官方 Agent Presets 包说明（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/preset/agent-presets/README.md)
- [官方 Persona 包说明（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/preset/persona/README.md)
- [官方 Extensions subsystem（固定 commit）](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/extensions.md)
