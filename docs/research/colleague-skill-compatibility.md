# Deep code 与 `colleague-skill` / `dot-skill` 的角色模块兼容性调研

> 调研日期：2026-08-15
> 上游仓库：[`titanwings/colleague-skill`](https://github.com/titanwings/colleague-skill)
> 审计分支与固定点：`dot-skill` @ [`22d96a76e05b91939493f604a0a46198d0d7f978`](https://github.com/titanwings/colleague-skill/tree/22d96a76e05b91939493f604a0a46198d0d7f978)
> 范围：只读分析；未运行数据采集器，未向 Deep code 写入产品代码。

## 结论先行

Deep code **可以兼容**这个项目，而且最稳妥的兼容点不是复制它的 UI 或人格文案，而是兼容它已经采用的 Agent Skills 文件格式和 DeepSeek Harness 的技能发现路径。

建议把角色模块分成两层：

1. **可移植 Skill 层**：保留上游的 `SKILL.md`、`work.md`、`persona.md`、`meta.json`、`manifest.json` 语义，并把角色目录安装到 DSH 能发现的 `.dsh/skills/<skill-name>` 或 `~/.dsh/skills/<skill-name>`。这一层负责跨宿主可用。
2. **Deep code 河床层**：由 Deep code 自己维护一个非标准 sidecar，例如 `deep-code.role.json`。它记录长期判断倾向、关系动力、纠正轨迹、证据与置信度、隐私范围等更深信息。它不能改变工具、Shell、批准策略或工作区边界，也不能伪装成上游标准字段。

换句话说：**直接兼容的是“角色作为 Skill 的包装与发现方式”；河床深度是 Deep code 的显式扩展，不应污染或冒充 Agent Skills 标准。**

上游在 2026-08-13 的 README/INSTALL 中刚加入 DeepSeek Harness 支持，声明 DSH 可原生发现 `~/.dsh/skills/dot-skill` 和项目内 `.dsh/skills/dot-skill`，生成角色也可以按同样方式安装，无需宿主包装脚本。[README](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/README.md#L65-L65)；[INSTALL](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/INSTALL.md#L121-L137)

但当前仓库对 DSH 的自动测试只检查文档和入口文字是否存在，并没有启动真实 DSH 做发现/激活集成测试。因此 Deep code 可以把它视为上游声称支持、结构上合理的兼容目标，但仍应补自己的 Windows + DSH 实机验收。[上游测试](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/tests/test_skill_entrypoint_docs.py#L38-L66)

## 1. 上游实际上是什么

`colleague-skill` 已升级为统一入口 `dot-skill`。它不是一张静态角色卡，而是一个**生成其他角色 Skill 的 meta-skill**：

- 三个 family：`colleague`、`relationship`、`celebrity`；
- Work 与 Persona 双层组合；
- 支持材料导入、增量纠正、版本存档和宿主安装；
- 角色生成后可以使用组合版、Work-only 或 Persona-only 入口。

上游 README 把执行顺序描述为“Persona 决定态度和语气，family 模块补执行细节”；生成结构和进化方式也有明确说明。[README：生成结构与 Evolution](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/README.md#L351-L366)

这与 Deep code 想做的角色体验有相交之处，但不能直接等同：

- 上游的主要目标是把人物材料蒸馏成可运行 Skill；
- Deep code 的目标还包括普通人的可视化管理、执行边界、解释、可逆操作和长期关系/判断轨迹；
- 因此 Deep code 应把 `dot-skill` 当作**可导入、可安装、可调用的生态格式**，而不是自己的完整领域模型。

## 2. 可直接兼容的数据结构

### 2.1 标准兼容核心：Skill 目录

Agent Skills 规范的最小单元是一个包含 `SKILL.md` 的目录。`SKILL.md` 必须有 YAML frontmatter 和 Markdown 指令；标准字段至少包括 `name` 与 `description`，还可包括 `license`、`compatibility`、`metadata` 和实验性的 `allowed-tools`。脚本、参考资料和资产可以作为按需加载资源放在同一 Skill 根目录下。[Agent Skills 格式规范](https://agentskills.io/specification)

Deep code 的兼容底线应是：

```text
<skill-name>/
├── SKILL.md          # 唯一必需文件
├── scripts/          # 可选
├── references/       # 可选
├── assets/           # 可选
└── ...               # 其他文件保留但不默认执行
```

导入器至少读取并保存：

| 字段 | 用途 | Deep code 行为 |
|---|---|---|
| `name` | 发现/激活名 | 校验，冲突时提示用户选择，不静默覆盖 |
| `description` | 何时使用 | 展示为“这个角色适合做什么”与激活匹配依据 |
| `license` | Skill 自身许可 | 展示；缺失时标记“未声明”，不能自动推断 |
| `compatibility` | 环境依赖 | 转译为新手可读的前置条件 |
| `allowed-tools` | 作者建议的工具范围 | 只作为提示和风险信号，不提升 Deep code 权限 |
| `metadata` | 扩展元数据 | 原样保留未知字段，保证往返兼容 |

Agent Skills 的实现指南建议发现阶段只加载 `name`、`description` 和路径，激活时再加载完整 `SKILL.md`，资源继续按需读取；它也建议项目级 Skill 覆盖用户级 Skill，并对语法小问题采用“警告但尽量加载”的兼容策略。[Agent Skills 客户端实现指南](https://agentskills.io/client-implementation/adding-skills-support)

### 2.2 `dot-skill` 的增强生成物

上游 writer 生成以下文件：

```text
skills/<character>/<slug>/
├── SKILL.md
├── work.md
├── persona.md
├── work_skill.md
├── persona_skill.md
├── manifest.json
├── meta.json
├── versions/
└── knowledge/
```

生成和更新都通过 `skill_writer.py` 完成；更新前会归档当前主要产物，纠正则进入 Persona correction 记录。[writer：写入与版本归档](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/tools/skill_writer.py#L183-L242)；[writer：更新与纠正](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/tools/skill_writer.py#L247-L359)

`meta.json` 当前 schema version 为 `3`，包含：

- `id`、`slug`、`kind`、`character`、`display_name`；
- `profile`、`classification`、`source_context`；
- `lifecycle`、`generation`、`engine`；
- `artifacts`、兼容旧字段的 `compat`；
- 原材料列表可通过 `knowledge_sources` / `generation.created_from` 保存。

来源：[skill_schema.py：schema 与元数据归一化](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/tools/skill_schema.py#L17-L25)、[skill_schema.py：enrich](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/tools/skill_schema.py#L140-L225)

`manifest.json` 描述组合/Work/Persona 三个 entrypoint、能力、工具链、安装器和命令名。Deep code 可以读取它来增强 UI，但**不能要求普通 Agent Skill 一定有 manifest**。[manifest builder](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/tools/skill_schema.py#L227-L276)

因此建议定义两档导入：

- **通用 Agent Skill**：只有 `SKILL.md` 也能完整导入和使用；
- **dot-skill 增强角色**：发现 `meta.json` / `manifest.json` 后显示版本、family、Work/Persona 分层、纠正数和材料来源。

不能把 dot-skill 的可选增强文件误写成 Deep code 的强制角色卡格式。

### 2.3 需要宽容处理的格式差异

严格 Agent Skills 规范要求 `name` 由小写字母、数字、连字符组成并与父目录同名；而上游生成源使用诸如 `colleague_<slug>` 的下划线名，安装器会在面向 Codex 等宿主发布时重写为 `{character}-{slug}` 并创建同名目录。[上游命名生成](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/tools/skill_schema.py#L94-L114)；[安装时重写 frontmatter](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/tools/install_generated_skill_common.py#L25-L55)

Deep code 应做到：

1. 严格解析失败时给出具体行和人话说明；
2. 对下划线、目录名不一致、额外 frontmatter 字段给出“兼容模式”警告；
3. 用户确认后可创建一个**安装副本**并规范化安装名；
4. 不直接修改用户导入的源目录；
5. 记录来源路径、安装路径和转换结果，支持卸载安装副本而不删除源文件。

## 3. 安装与发现方式

### 3.1 DeepSeek Harness 原生路径

上游明确给出的 DSH 路径是：

```text
# 项目级
<workspace>/.dsh/skills/dot-skill/
<workspace>/.dsh/skills/<character>-<slug>/

# 用户全局
~/.dsh/skills/dot-skill/
~/.dsh/skills/<character>-<slug>/

# 设置 DSH_HOME 时
$DSH_HOME/skills/...
```

来源：[INSTALL：DeepSeek Harness](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/INSTALL.md#L121-L137)

Deep code 应优先使用项目级安装，让角色随工作区明确生效；全局安装必须由用户显式选择，并在 UI 中标记“所有项目可见”。

### 3.2 建议的可视化安装流程

1. **选择来源**：本地 Skill 文件夹 / Git 仓库 URL / 已安装 DSH Skill。
2. **只读检查**：显示名称、描述、许可证、文件数、脚本、网络/命令依赖、可能读取的材料类型。
3. **选择范围**：仅此项目 / 所有项目。
4. **显示实际目标**：用完整路径告诉用户“将复制到哪里”。
5. **冲突处理**：保留现有、另存新名、升级；默认不覆盖。
6. **安装结果**：列出已复制文件、转换警告、如何启用、如何撤销。
7. **可逆卸载**：只删除 Deep code 创建的安装副本；永不顺手删除来源仓库或知识材料。

Git URL 安装必须先展示仓库、分支/commit、许可证和将执行的操作，再 clone；不要让角色卡安装隐含执行仓库脚本。

## 4. 运行期注入方式

### 4.1 推荐：使用 DSH Skill 激活，不复制整个角色到系统提示词

Agent Skills 的标准运行模式是渐进披露：会话开始只提供技能目录，匹配后激活完整 `SKILL.md`，其中引用的脚本/资料再按需读取。[Agent Skills Overview](https://agentskills.io/home)；[客户端实现指南](https://agentskills.io/client-implementation/adding-skills-support)

Deep code 因此应把角色选择翻译为：

```text
用户在 UI 选择角色
  → Deep code 确认该角色已安装在当前会话可发现的 DSH skills 路径
  → 创建/继续 DSH session，并记录 selectedSkillId
  → 使用 DSH 支持的 skill 激活语义（例如 /relationship-yanxing）
  → 由 DSH 加载 SKILL.md；Deep code 只展示激活证据和当前角色
```

上游对生成角色给出的命令模式是 `/{character}-{slug}`；DSH 安装说明则允许直接放入对应技能目录。[README：命令](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/README.md#L272-L290)；[INSTALL：生成角色路径](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/INSTALL.md#L126-L137)

产品上必须显示：

- 当前会话启用了哪个角色；
- 来自项目还是全局；
- 使用了哪个 Skill 文件及版本；
- 本轮是否真正激活成功；
- 一键停用后回到无角色模式。

不要只在后台悄悄加一句“你现在是某某”。那样既不可验证，也容易让角色文字覆盖工程任务边界。

### 4.2 Work、Persona 与执行权限必须分离

上游组合模板的规则是先由 Persona 决定态度，再由 Work 执行，并把 Persona Layer 0 设为最高优先级。[组合模板](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/tools/skill_writer.py#L35-L100)

Deep code 不应照搬“任何情况下最高优先级”到宿主安全层。推荐固定优先级：

```text
Deep code / DSH 安全与批准策略
  > 用户当前明确任务与工作区范围
  > 可移植 Work Skill
  > Persona 与河床表达/判断倾向
```

即使角色写着“从不询问，直接执行”或 `allowed-tools: Bash`，也不能自动获得 Shell 权限，更不能改变批准策略。Persona 可以影响解释方式、问题拆解、偏好和语气，但不能提高能力权限。

## 5. Deep code 的“河床深度”扩展

### 5.1 不直接塞进上游 `meta.json`

上游 `meta.json` 有 versioned schema 和 writer 维护规则。Deep code 如果往里面写私有结构，可能在上游升级、writer 重建或跨宿主安装时丢失。更稳妥的方式是在角色源目录或 Deep code 自己的数据目录保存：

```text
deep-code.role.json
```

建议最小 schema：

```json
{
  "schemaVersion": "1",
  "roleId": "relationship-yanxing",
  "portableSkill": {
    "name": "relationship-yanxing",
    "source": "dot-skill",
    "sourceSchemaVersion": "3"
  },
  "riverbed": {
    "stableValues": [],
    "decisionTendencies": [],
    "interactionDynamics": [],
    "repairPatterns": [],
    "boundaries": [],
    "corrections": []
  },
  "evidencePolicy": {
    "distinguishObservedFromInferred": true,
    "defaultConfidence": "unknown"
  },
  "privacy": {
    "scope": "local-project",
    "containsRealPersonData": false,
    "shareable": false
  },
  "capabilityBoundary": {
    "mayChangeToolPolicy": false,
    "mayChangeApprovalPolicy": false,
    "mayChangeWorkspaceScope": false
  }
}
```

这只是 Deep code 扩展提案，不属于上游或 Agent Skills 标准。

### 5.2 “深”不应等于“写更多口癖”

上游 colleague Persona 已有六层：核心规则、身份、表达、决策、人际、边界/纠正；relationship Persona 则强调亲近/不安全时的动作、表达 DNA、情绪逻辑、冲突与修复、记忆意象。[colleague persona builder](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/prompts/persona_builder.md#L10-L142)；[relationship persona builder](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/prompts/relationship/persona_builder.md#L16-L108)

Deep code 的河床可以在此基础上增加：

- **稳定价值与取舍**：遇到不同任务时如何排序，而非固定答案；
- **受扰动后的恢复轨迹**：分歧、失败、长时间中断后如何重新协调；
- **关系动力**：哪些变化来自用户、角色、任务环境的相互作用；
- **证据层级**：原话/材料观察、用户纠正、模型推断分别存放；
- **置信度和可撤销性**：每条结论能查看来源、降权、删除、回滚；
- **时间性**：允许“过去如此、现在未知”，避免把人物冻结；
- **情境生效范围**：写代码、闲聊、创作、压力场景可不同。

不建议增加：

- 大量固定口癖和必说句；
- 声称角色拥有连续意识或真实人物身份；
- 让“亲密程度”转化为更高文件、网络或 Shell 权限；
- 把私人原始对话打包进可公开 Skill；
- 让 Persona 覆盖用户当前明确指令或工程证据。

### 5.3 兼容导入、编辑和导出

建议约定：

- **导入 dot-skill**：原始 `SKILL.md` 等文件只读保留；Deep code 创建自己的 sidecar。
- **在 Deep code 编辑河床**：只改 sidecar，有变更历史和预览。
- **导出通用 Skill**：导出标准 Skill，不含 Deep code 私有层，除非用户选择“编译可移植摘要”。
- **导出 Deep code 角色包**：包含标准 Skill + sidecar + 明确许可证/隐私清单。
- **回写上游 dot-skill**：若以后需要，走上游 writer/correction 机制，不手改它声明由 writer 管理的文件。[上游写入规则](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/SKILL.md#L727-L766)

## 6. 安全、隐私和许可边界

### 6.1 Skill 是可执行说明，不是无害主题包

上游 meta-skill 声明可用 `Read, Write, Edit, Bash`，且仓库内包含 Python、Shell、浏览器自动化和企业消息采集器。[上游 SKILL.md frontmatter](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/SKILL.md#L1-L7)；[README：数据源](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/README.md#L238-L248)

因此 Deep code 安装前至少要做：

- 文件清单与脚本类型扫描；
- 命令、网络、浏览器和凭据需求摘要；
- `allowed-tools` 风险展示，但绝不据此自动授权；
- 安装与首次执行分开确认；
- 角色切换不得更改工具审批配置；
- 外部 Skill 默认在安全工作区、最小权限下运行。

Agent Skills 规范也明确把 `allowed-tools` 标为实验性、宿主支持可能不同；它不是跨产品安全授权凭证。[Agent Skills 规范](https://agentskills.io/specification)

### 6.2 真实人物材料需要 Deep code 补自己的同意与范围模型

上游元数据能标记 `is_real_person`、`is_public_figure`、`is_fictional` 并记录 `knowledge_sources`；但在本次固定点审计中，核心 schema 没有发现标准化的 `consent`、授权范围、删除期限或二次分享许可字段。[source_context 代码](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/tools/skill_schema.py#L140-L175)

上游贡献指南要求不要提交 secrets、tokens 或 personal data，并要求凭据配置采用严格文件权限；这是良好基础，但不能替代 Deep code 产品级的导入同意、材料最小化和分享防护。[CONTRIBUTING 安全段](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/CONTRIBUTING.md#L78-L82)

Deep code 应新增：

- “这是虚构角色、本人、公开人物，还是现实中的他人”；
- 材料是否包含第三方隐私、公司机密、未成年人信息；
- 本地使用、项目共享、公开发布三种独立范围；
- 原始材料默认不进入 Git、不进入导出包；
- 删除角色时分别选择“只卸载”“删除 Deep code 派生数据”“删除用户原始材料”，最后一项默认关闭并二次确认；
- 每条河床结论保留来源类型，允许删除推断而不伤害原始 Skill。

### 6.3 MIT 的边界

上游代码使用 MIT License，允许使用、复制、修改、合并、发布、分发、再许可和销售，但分发其代码或实质部分时必须保留版权声明和许可文本。[LICENSE](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/LICENSE)

这不自动意味着：

- 用户导入的聊天记录、邮件、文档也变成 MIT；
- 以真实人物为对象生成的人格材料可自由公开；
- 社区 gallery 中每张角色 Skill 都必然采用与引擎相同的许可证；
- Deep code 可以移除来源与版权声明后重新分发上游代码。

Deep code 导出时应分别列出：引擎代码许可、Skill 自身许可、用户材料状态、Deep code sidecar 许可。缺少声明就显示“未知/仅本地”，不要替用户猜。

## 7. 推荐实施顺序

### Phase A：只读发现与风险检查

- 扫描当前工作区 `.dsh/skills/` 与全局 DSH skills 目录；
- 解析 `SKILL.md`，可选解析 dot-skill `meta.json` / `manifest.json`；
- UI 展示来源、范围、许可证、脚本、格式警告；
- 不执行、不迁移、不修改。

### Phase B：可逆安装与真实 DSH 激活

- 从本地目录或固定 Git commit 安装到项目级 `.dsh/skills/`；
- 保留来源与安装记录；
- 用真实 DSH 会话验证技能发现和 `/character-slug` 激活；
- 展示“已激活/未激活”证据；
- 一键撤销仅清理安装副本。

### Phase C：dot-skill 增强角色 UI

- Work / Persona 分栏预览；
- family、版本、纠正数、材料类型展示；
- 通过上游 writer 或受控适配层做纠正和回滚；
- 不直接手改上游生成物。

### Phase D：河床 sidecar

- 引入 `deep-code.role.json`；
- 支持观察/推断/用户纠正三类证据；
- 可查看、降权、删除、回滚；
- 有上下文范围和时间性；
- 注入受安全优先级限制。

### Phase E：导入/导出与社区兼容

- 通用 Agent Skill 导入导出；
- dot-skill 增强包；
- Deep code 角色包；
- 每种导出都生成许可与隐私清单；
- 公布前做真实人物/第三方材料检查。

## 8. 验收标准

1. 只有 `SKILL.md` 的标准 Skill 可以被发现、检查、安装、激活和卸载。
2. dot-skill 角色能额外显示 Work/Persona/版本信息，但缺少 `meta.json` 时不崩溃。
3. 项目级角色不会意外泄漏到其他工作区；全局安装有明显标识。
4. 格式不严格但可解析时给警告；源目录不被修改。
5. 安装 Skill 不等于执行脚本，不等于批准 Shell 或网络。
6. Persona/河床无法改写工具、工作区和批准策略。
7. 真实 DSH Windows 测试能证明技能已发现并激活，而不只是 UI 显示“成功”。
8. 每个河床结论能区分观察、推断和用户纠正，并可撤销。
9. 卸载默认只删除 Deep code 创建的安装副本。
10. 导出包明确列出许可证、原始材料是否包含、可分享范围。

## 9. 最终判断

这个项目对 Deep code 有实质指导价值，尤其是：

- 角色不止是“语气”，还可拆成 Persona + Work；
- 角色可以作为标准 Skill 安装、发现和调用；
- correction、增量材料和版本回滚比一次性提示词更接近长期使用；
- 它已经明确提供 DSH 文件系统安装路径。

但 Deep code 不应把上游的“人物蒸馏”完整照搬为产品伦理和权限模型。我们的差异化应当是：**把可移植 Skill 当作外层兼容协议，把河床当作有证据、有时间性、可撤销、受安全边界约束的长期关系与判断层。** 这样既能适配 `colleague-skill`，又不会让角色卡越权成为隐藏的执行策略。

## 一手来源索引

- [`colleague-skill` 固定审计版本](https://github.com/titanwings/colleague-skill/tree/22d96a76e05b91939493f604a0a46198d0d7f978)
- [上游 README](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/README.md)
- [上游安装说明](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/INSTALL.md)
- [上游 meta-skill 入口](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/SKILL.md)
- [上游 schema](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/tools/skill_schema.py)
- [上游 writer](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/tools/skill_writer.py)
- [上游 DSH 文档测试](https://github.com/titanwings/colleague-skill/blob/22d96a76e05b91939493f604a0a46198d0d7f978/tests/test_skill_entrypoint_docs.py)
- [Agent Skills 规范](https://agentskills.io/specification)
- [Agent Skills 客户端实现指南](https://agentskills.io/client-implementation/adding-skills-support)
