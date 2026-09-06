# Provider 身份、Profile 与凭据写入契约调研（2026-09-03）

## 结论摘要

DeepSeek Harness **不会，也不应根据 API Key 字符串自动识别 GLM、Anthropic 或 MiniMax**。Provider 的身份来自用户明确选择并写入的 route id；API Key 只是随后绑定到该 route 所引用的 `CredentialRef` 的秘密值。相同字符串可以被写入多个 ref，Harness 的凭据层不会据此推断、阻止或更改 Provider 身份。

`llm.providers` 同时包含已激活 route 和大量 dormant catalog entries。它是“哪些 Provider 可以配置、配置地址在哪里”的目录，不是“用户已经添加了哪些 Provider”的清单。因此，把目录中下一项、全部项或新增显示项称为“新添加的 Provider”，会产生 Anthropic、MiniMax、`minimax-cn` 等虚假成功提示。

正确产品流程应是：**先明确选择 Provider → 只写该 route 的 profile → 只写该 profile 引用的 credential ref → 重新读取 settings、active routes 与 credential descriptor → 报告“已保存” → 经用户明确触发的最小真实请求成功后，才报告“已验证”。**

本调研没有读取、记录或输出任何真实 API Key，也没有发出带用户凭据的网络请求。

## 调研范围与快照

- 本机官方源码：`C:\Users\lenovo\Desktop\deepseek-harness`
- 上游：`https://github.com/deepseek-ai/deepseek-harness`
- 本机 checkout commit：`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`
- 调研时间：2026-09-03（Asia/Shanghai）
- 一手外部资料：智谱、Anthropic、MiniMax 官方文档。

## 1. Provider 的身份来自 route，不来自 Key

`llm-pi-ai` 的配置将 `providers` 定义为由 route id 索引的字典；字典 key 才是 Provider route 身份。配置中的 `apiKeyEnv` 只是该 route 指向凭据层的引用。[Harness source: `packages/llm/llm-pi-ai/src/config.ts:87-100`]

Harness 官方 Models UI 对 catalog route 编辑时，也先持有明确的 `provider`，再从现有 profile 的 `apiKeyEnv` 取 ref；没有 ref 时，才由明确的 provider id 派生，例如 `anthropic` → `ANTHROPIC_API_KEY`。[Harness source: `packages/client/ui-settings-models/src/client/ProviderEditor.tsx:135-147`; `packages/client/ui-settings-models/src/client/store.ts:63-72`]

自定义 Provider 更清楚地体现了这个边界：用户必须分别提供 route、协议、base URL 和 models；profile 写到 `providers.<route>`，API Key 再单独写到由 route 派生的 ref。[Harness source: `packages/client/ui-settings-models/src/client/CustomProviderCard.tsx:99-168`]

当前安装的 `@earendil-works/pi-ai@0.82.x` catalog 中，GLM/Zhipu 的 route 是 `zai` 与 `zai-coding-cn`，默认 ref 分别是 `ZAI_API_KEY` 与 `ZAI_CODING_CN_API_KEY`；相邻但独立的 MiniMax routes 才是 `minimax` 与 `minimax-cn`。[Installed first-party dependency source: `node_modules/.pnpm/@earendil-works+pi-ai@0.82._9916508ebaead6849a95c389aba67c68/node_modules/@earendil-works/pi-ai/dist/models.generated.js:76-77`; `dist/env-api-keys.js:88-92`] 因而 UI 中的“GLM”必须映射到一个明确 route；普通 Z.AI 与中国区 Coding Plan 不能凭 Key 猜选。

凭据 seam 的 `set(ref, value)` 只接收引用和值。它不知道调用者心中的厂商，也不从值推导 route。[Harness source: `packages/credentials/credentials/src/index.ts:157-179`; `packages/credentials/credentials-local/src/index.ts:641-646,752-785`]

因此，同一个 Key 被依次写进 `ANTHROPIC_API_KEY`、`MINIMAX_API_KEY`、`MINIMAX_CN_API_KEY` 在存储层是三个合法、互不相同的写入；这证明不了 Key 属于其中任何一个 Provider。

## 2. Catalog、active route、profile 和 credential 是四类不同事实

| 事实 | Harness 权威来源 | 能证明什么 | 不能证明什么 |
|---|---|---|---|
| Catalog / configurable directory | `listConfigurableProviders()` / `llm.providers` 的全部 rows | Adapter 知道该 route，并公布 settings 地址 | 用户已添加；Key 已保存；网络可用 |
| Active route | `listProviders()`，或 `llm.providers[].active === true` | Route 当前已注册，可参与模型路由 | Key 有效；调用成功 |
| Stored profile | `settings.describe` 对应 namespace/path 的 value | 用户层/合成设置中存在该 route 配置 | Credential value 存在或有效 |
| Credential descriptor | `credentials.describe(ref)` | `{configured, source?, writable}` 的脱敏状态 | Key 内容；Provider 所属；真实调用成功 |
| Verified connection | 对用户所选 route 发出的真实低成本请求成功 | 该 route、端点、协议、Key 在本次验证中可用 | 永久可用；所有模型都可用 |

Harness 明确将 configurable directory 定义为“registered or dormant”的可配置 routes；`listProviders()` 则只返回当前已注册 adapter 的 `{id, name}`。[Harness source: `packages/llm/llm/README.md:19-23`; `packages/llm/llm/src/index.ts:442-448,513-519`]

`llm-pi-ai` 即使没有任何 provider profile、整个插件处于 dormant 状态，也会注册完整的 installed catalog 供配置界面选择。其源码将 catalog 与当前 profiles 求并集，catalog entries 先于用户配置存在。[Harness source: `packages/llm/llm-pi-ai/src/index.ts:110-137,213-230`; test evidence: `packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:88-102`]

Host RPC 的 `llm.providers` 正是把 configurable directory 和 active registry 合并，然后用 `active.has(entry.provider)` 标记活跃状态；它没有把 catalog presence 定义成“已添加”。[Harness source: `packages/host/apiproxy/src/api-proxy.ts:3268-3295`; contract: `packages/host/apiproxy/src/api/llm.ts:1-52`]

## 3. Profile 与 Credential 的官方写入顺序

Harness 官方现有 Provider 编辑器的顺序是：

1. 由用户正在编辑的 provider route 决定 settings path 和 credential ref；
2. 若要保存新 Key，profile 必须先记录 `apiKeyEnv: keyRef`；
3. 通过带 revision 的 settings mutation 写 profile；
4. profile 成功后再调用 `credentials.set({ref, value})`；
5. 两步必须分别报告，因为 profile 可能成功而 credential 写入失败。

[Harness source: `packages/client/ui-settings-models/src/client/ProviderEditor.tsx:248-295`; custom-provider equivalent: `CustomProviderCard.tsx:136-168`]

Credential 的安全读取面只返回描述信息。`describe` 暴露 `configured/source/writable`，不返回 secret；配置界面把 provider directory、settings profile 与 credential descriptor 做 join 后才形成最终显示。[Harness source: `packages/credentials/credentials-local/src/index.ts:627-638`; `packages/client/ui-settings-models/src/client/store.ts:127-205`; credential contract: `packages/credentials/credentials/README.md:25-55`]

## 4. 为什么“拉到了模型列表”也不等于 Key 被识别或验证

Harness 的 `discoverModels` 是配置辅助，不是身份识别。对 installed catalog 中已有的 route，`llm-pi-ai` 会直接从本地 catalog 返回模型元数据，不访问网络，也不会使用输入的 Key；只有 catalog 不认识的自定义 route 才会进入 endpoint interrogation。[Harness source: `packages/llm/llm-pi-ai/src/discovery.ts:195-211,232-252`; `packages/llm/llm-pi-ai/README.md`, section “Endpoint interrogation”]

所以以下推断均不成立：

- “出现 Anthropic 模型列表” → Key 是 Anthropic；
- “MiniMax 有 catalog models” → MiniMax Key 有效；
- “同一个 Key 能保存到多个 Provider” → Harness 自动识别出了多个 Provider；
- “credential configured” → 网络和模型调用已验证。

## 5. 外部官方资料对身份边界的佐证

智谱官方文档要求客户端先使用智谱的明确 endpoint，再把 API Key 放进 Bearer header；provider/endpoint 是调用配置，Key 是认证材料。通用 endpoint 是 `https://open.bigmodel.cn/api/paas/v4`，Coding 套餐还有独立 endpoint。[智谱官方快速开始](https://docs.bigmodel.cn/cn/api/introduction)

Anthropic 官方文档同样把服务 endpoint、API 协议和认证 header 分开：Claude API 位于 `https://api.anthropic.com`，API Key 通过 `x-api-key` 传递。[Anthropic 官方 API overview](https://platform.claude.com/docs/en/api/overview)

MiniMax 官方文档同时存在国际区与中国区 endpoint，并明确要求使用与购买区域匹配的配置；官方 CLI 即使提供 region auto-detection，也说明检测失败时必须手工设置 `global|cn`。这类厂商专属工具的便利能力不能被泛化成 Harness 可仅凭任意 Key 做可靠识别。[MiniMax 官方 Prerequisites](https://platform.minimax.io/docs/guides/quickstart-preparation), [MiniMax 官方 CLI 文档](https://platform.minimax.io/docs/token-plan/minimax-cli)

更重要的是，MiniMax 官方还支持 Anthropic-compatible API，并示范把 MiniMax Key 放在 `ANTHROPIC_API_KEY` 环境变量中。这直接说明“环境变量名、协议形状或 Key 前缀”都不能单独作为厂商身份真相。[MiniMax 官方 Prerequisites](https://platform.minimax.io/docs/guides/quickstart-preparation)

厂商可能公布当前 Key 的示例前缀，但前缀最多用于输入提示或明显格式错误检查。它不是稳定身份契约：代理网关、自定义 endpoint、区域/套餐变体与未来格式都会破坏这种推断。Anthropic 的管理 API 也只返回 `partial_key_hint`，不返回 secret value，进一步支持 UI 只保留脱敏状态。[Anthropic 官方 Retrieve API Key](https://platform.claude.com/docs/en/api/admin/api_keys/retrieve)

## 6. 对 Deep Code 的直接产品建议

### 6.1 添加表单

- Provider 必须由用户明确选择；下拉项显示 Harness 的 route id 与友好名称，例如“智谱 GLM（国际） · `zai`”。
- GLM 国际、GLM Coding 中国区等不同 route 不应只写“GLM”，应显示 endpoint/套餐差异的简短说明。
- 保存前在确认句中重复用户选中的单一 Provider：“将此 Key 保存给 智谱 GLM（国际）”。
- API Key 输入框不做厂商自动识别。可以做空白、长度、不可作为 HTTP header 的字符等通用校验。

### 6.2 原子事实与状态文案

保存后重新读取并检查**同一个选中 route**：

1. `settings.describe` 中该 settings path 是否存在 profile；
2. `llm.providers` 中该 exact route 是否 `active: true`；
3. profile 的 `apiKeyEnv` 是否等于本次预期 ref；
4. `credentials.describe(expectedRef)` 是否 `configured: true`。

只有四项都指向同一个 route，才能显示：

> 智谱 GLM（国际）已保存，尚未验证连接。

真实请求成功后才升级为：

> 智谱 GLM（国际）已验证。

若 profile 写入成功但 Key 失败，应显示“Profile 已创建，API Key 未保存”，并提供只重试 Key 的入口；不能再次遍历目录或默认选择下一项。

### 6.3 防止 dormant providers 被误报

- 写入前记录 `beforeActiveProviderIds`，写入后读取 `afterActiveProviderIds`；只允许所选 `providerId` 成为成功对象。
- 不根据数组位置、catalog 顺序或 `after - before` 中任意第一项命名结果。
- 若所选 route 未 active，即使其他 route 同时变化，也必须把本次操作标为失败或“状态冲突”，并列出脱敏诊断。
- dormant rows 只能出现在“可添加”列表；active rows 才能出现在“已添加”列表。
- `declared` 的含义是“是否只因配置声明而为 adapter 所知”，不是 configured/active/verified；不要将它映射为成功状态。

### 6.4 真实验证

- 验证必须由用户明确触发，因为会访问外部网络并可能产生少量费用。
- 验证只对当前选中的单一 route 进行；不要拿同一个 secret 枚举 GLM、Anthropic、MiniMax 端点试探，这会泄漏凭据并制造多次外部请求。
- installed catalog 的本地 `discoverModels` 不能充当验证。应调用 selected route 的实际模型，或使用厂商明确提供且 Harness 真正通过网络执行的低成本鉴权 endpoint。
- UI 分开显示“已保存”“未验证”“已验证”“验证失败”，并记录 provider id、model id、时间和脱敏错误，不记录 Key。

## 7. 建议的回归测试

1. 选择 `zai`，保存任意测试 secret：只允许 settings path `providers.zai` 和派生 ref 被调用；返回对象必须仍是 `zai`。
2. 初始 catalog 含 Anthropic/MiniMax/MiniMax-CN dormant rows：保存 `zai` 后，这些 rows 仍不得出现在 `newlyAdded`。
3. 同一测试 secret 连续提交两次：第二次应报告 exact route 已存在或替换 credential，不得选择下一个 dormant row。
4. profile 写成功、credential 写失败：显示 partial state，不得自动创建其他 Provider。
5. credential configured 但未发真实请求：状态只能是 saved/unverified。
6. `discoverModels` 对 catalog route 返回 models：测试必须断言这没有触发 verified 状态。
7. 写后重新读取发现 selected route 不 active，但其他 route active：本次操作失败并报告 state conflict。
8. 所有错误与诊断均断言不包含测试 secret。

## 最终判断

砚星观察到的 Anthropic、MiniMax 和 `minimax-cn` 轮流出现，不是 GLM Key 被这些服务识别出来，而是 UI/Adapter 把 **catalog/dormant provider 目录** 与 **本次明确选择并实际写入的 provider** 混淆了。修复重点不是设计更聪明的 Key 前缀识别，而是让一次添加操作拥有稳定的 selected provider identity，并以该 exact route 的 profile、active 状态和脱敏 credential descriptor 作为写后证据。
