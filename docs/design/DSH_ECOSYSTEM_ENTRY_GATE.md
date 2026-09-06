# Deep Code 进入 DSH 生态的准入门

状态：发布决策文档。达到 Beta Gate 后由维护者提出具体外部动作，产品所有者审核；未达到前不把开发快照伪装成成熟产品。

## 身份判断

Deep Code 当前是 **powered by DeepSeek Harness 的独立桌面 Workbench**，不是一个 Harness Plugin。

因此：

- 可以使用 `deepseek-harness`、`dsh`、`desktop-agent`、`electron` 等 GitHub topics；
- 当前不使用 `dsh-plugin` topic，不向只接受 `dsh.bundle` 的插件目录伪装提交；
- README 明确“非 DeepSeek 官方产品”，同时说明依赖的官方 Harness 版本；
- 如果未来提供一个真正的 DSH bundle / Skill 集成，应作为独立可安装资产接受兼容、安全和卸载验证，再提交插件目录。

官方 Harness README 当前建议插件仓库添加 `dsh-plugin` topic，并强调 Developer Preview 存在兼容性破坏。这个约定不能自动扩大到独立桌面 App。

## Beta Gate：达到后应主动进入生态

### 新用户闭环

- 安装版和便携版都能启动；
- 可以自动准备或手动选择固定、已验证的 Harness；
- 可以创建 / 选择真实工作区；
- 可以配置至少两条模型服务路径：一个 catalog Provider 和一个自定义 OpenAI-compatible Provider；
- 可以创建、停止、继续或恢复一项任务；
- Ask User / Approval 能留置、提交和超时恢复；
- 完成后能看见可追溯的工作回执。

### 可信发布

- 公共仓库有 MIT License、第三方 notices、隐私与安全边界；
- Release 同时提供 Setup、Portable、SHA256；
- tag、package version 和发布说明一致；
- 固定支持的 Harness version / commit，并公开兼容矩阵；
- 全量测试、打包 smoke 和空白用户路径人工测试通过；
- 默认不会向第三方安装进程泄露凭据；
- “非官方产品”与已知限制清楚可见。

### 产品可解释

- 首页用一句话说明 Deep Code 是什么，不依赖用户先理解 Harness；
- 至少一张真实任务截图和一个三分钟入门视频；
- README 同时给普通用户安装路径和开发者架构路径；
- 不把规划中的 Provider、Soft Harness、关系记忆或插件能力写成已实现功能。

## 进入顺序

1. 在 GitHub Release 发布第一个满足 Gate 的公开 Beta。
2. 设置准确的 GitHub topics；不使用 `dsh-plugin`。
3. 在官方 DeepSeek Harness GitHub Discussions 做一次产品展示，说明独立 App 身份、固定兼容版本、安装方式、边界和反馈入口。
4. 向允许“相关桌面产品 / 客户端”的社区索引提交，而不是绕过插件格式检查。
5. 收集真实安装失败、Provider 配置、恢复和回执可理解度证据。
6. 只有出现真实 DSH bundle / Skill 时，才按插件目录的 `package.json`、`dsh.bundle`、commit pin、install / uninstall 规则独立提交。

## 不作为发布阻塞项

- 完整视觉重构；
- 自动多模型路由；
- 多 Agent 编排；
- 关系型 Agent；
- Archify 默认集成；
- 覆盖所有云厂商认证方式。

这些可以形成后续差异，但不应成为永远不进入生态的借口。

## 林的当前判断

Deep Code 现在接近 Gate，但还没越线。最大的缺口不是 UI，而是完整 Provider Provisioning、固定 Harness / canary 兼容、发布校验和，以及一次真正的空白用户安装验收。

因此当前不提交插件市场，也不立即做生态宣传。完成上述四项后，维护者应主动给产品所有者一份外部动作清单（topics、Discussion 文案、Release、社区目录候选与公开信息），审核后执行。
