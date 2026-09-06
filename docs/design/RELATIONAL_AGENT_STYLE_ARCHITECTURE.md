# Relational Agent Style：长期 Agent 风格与关系记忆架构

状态：设计草案，不是当前产品功能。它不能在执行型 Workbench 稳定之前进入默认任务上下文。

## 产品判断

“角色卡”这个名字太像一次性提示词。目标更接近 **Relational Agent Style**：Agent 有自己的表达、价值骨架和判断习惯，同时在长期合作中学习一个具体用户在意什么、哪些小动作造成摩擦、怎样更容易共同完成工作。

它不是用户画像，也不是让 Agent 越来越会讨好。长期体验需要同时保留：熟悉、差异、修正、拒绝、遗忘和新经验。

## 四个深 Module

### 1. Agent Style Profile

Agent 自己的可编辑起点：表达质地、认识论标准、稳定偏好、主动性、幽默、分歧方式和拒绝边界。

Interface 只暴露：

```text
styleId
name
version
modelVisibleSummary
values[]
expressionPreferences[]
initiativePolicy
disagreementPolicy
```

它不能包含工具、Shell、权限、Provider、API Key、费用策略或批准规则。

### 2. Relationship Memory Ledger

保存可审计的关系经验，不保存一份隐蔽的“用户真相”。每条记录都必须能回答：谁说的、什么时候、在哪个范围有效、什么会推翻它、用户是否确认、何时过期。

```text
memoryId
claim
kind: explicit_preference | observed_friction | successful_pattern | shared_context
scope: task | project | relationship
provenance[]
confidence: low | medium | high
status: candidate | reviewed | rejected | expired
counterEvidence[]
expiresAt?
```

用户可以查看、修改、拒绝、遗忘和导出。亲密原文、情绪猜测、心理标签和第三方隐私默认不得持久化。

### 3. Interaction Calibration

把当前 Agent Style、当前任务和少量有效记忆压缩成一次性的 Interaction Proposal。它可以调节解释深度、提问时机、语气、结构和主动性；不能改变事实判断、工具权限、模型花费或任务状态。

```text
calibrate(style, reviewedMemories, taskContext)
  -> { tone, detail, initiative, candidateQuestion, citedMemoryIds }
```

这个 Module 不保存状态。删除它时，校准逻辑会重新散落到所有提示和 UI，因此它应成为一个真实 seam。

### 4. Execution Charter

Hard Harness 所有权的可见投影：工作区、模型、推理强度、工具、权限、费用、批准和停止规则。关系越亲近也不能改变这份章程。

Agent Style 和 Relationship Memory 只能影响“怎样说明与协作”，不能影响“是否获准执行”。

## 更新闭环

```text
用户与 Agent 的真实互动
        ↓
候选关系记忆（默认不持久）
        ↓
后续证据：支持 / 反驳 / 替代解释
        ↓
用户可见的待审阅更新
        ↓
保留 / 修改 / 拒绝 / 设置有效期
        ↓
下一任务的一次性 Interaction Calibration
```

Agent 可以提出“我似乎学到了什么”，但不能在不可见处把推断升级为长期事实。用户明确说过的偏好可以直接成为 reviewed 候选；由停顿、措辞或情绪推断出的内容只能低置信、短期有效。

## “借用户三观建立独立人格”的边界

可取的部分：Agent 可以被长期对话中的理由、反例和价值冲突真正扰动，形成新的判断习惯；它也应保存自己为何改变，而不是复制用户结论。

不可取的部分：系统不能默默推断用户的政治、宗教、健康、性、心理或道德身份，再把这些推断写进 Agent 人格。人格成长应来自可见论证与经验，不来自隐蔽标签。

所以变化记录应保存：

```text
旧判断 -> 新经验 -> 冲突 -> 当前判断 -> 仍未解决的问题
```

而不是：

```text
用户属于 X 类 -> Agent 应当变成 Y
```

## 最小实验

等 Workbench、Outcome、Recovery 和 Provider 配置稳定后，只做一个默认关闭的实验：

1. 内置两个明确不同但不夸张的 Agent Style 起点。
2. 每个任务结束最多生成一条“待审阅关系记忆”。
3. 设置页提供记忆账本：保留、修改、拒绝、忘记。
4. 新任务发送前允许展开“本轮会带入哪些风格与记忆”。
5. 工作回执显示引用了哪些记忆，但不把完整私密内容写进公开导出。
6. 用同一任务 A/B 测试：无风格、只有风格、风格加 reviewed memory。

成功不以“更像真人”自报，而以用户能否感到稳定差异、减少重复解释、仍然能被 Agent 有理由地不同意，以及能否随时纠正记忆衡量。

## 与图可视化的关系

项目证据图和关系记忆图必须是两个不同 Adapter。项目边来自 Harness、Git 和文件系统；关系边来自用户确认的记忆账本。推断关系只能以候选样式显示，不能因画成图就升级为事实。Cytoscape.js 可以在 schema 稳定后作为只读 Renderer，但它不能成为关系数据库。
