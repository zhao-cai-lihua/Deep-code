# Deep Code 本机长期记忆与检索设计（调研结论）

日期：2026-09-03  
状态：设计提案，尚未创建用户 Vault、复制会话或启用自动记忆。

## 结论

Deep Code 不应把“保存全部聊天”直接等同于“拥有长期记忆”。完整会话适合做可选的私密原始档案，但真正可复用的长期记忆应是少量、可审阅、可修订、带来源和有效期的 Markdown 条目。搜索索引只能是可删除、可重建的派生物，不能成为唯一真相。

推荐三层结构：

```text
Markdown 记忆条目（人工可读、可在 Obsidian 中修改）
        ↓ 可重建索引
SQLite FTS5（快速关键词/短语/前缀检索）

可选 JSONL 原始会话归档（私密、默认不进入长期记忆）
        ↓ 只有用户选择或明确提炼后
Markdown 记忆条目
```

## 一手来源事实

1. Obsidian 官方说明，笔记以 Markdown 纯文本文件保存在本机 Vault；Vault 就是本地文件夹。由此可知，Markdown 适合作为人类可以脱离 Deep Code 阅读、备份和迁移的长期事实层。[Obsidian: How Obsidian stores data](https://obsidian.md/help/data-storage)
2. Obsidian Properties 存储在 Markdown 的 YAML frontmatter 中，适合保存类型、来源、敏感度、状态、作用域和复核时间等可查询元数据。[Obsidian: Properties](https://obsidian.md/help/properties)
3. Obsidian 官方提醒本地数据仍需要独立备份；本地保存不等于天然安全或不会损坏。[Obsidian: Back up your Obsidian files](https://obsidian.md/help/backup)
4. SQLite FTS5 是从词项映射到文档位置的全文索引，并支持短语、前缀、邻近和列过滤查询。它可以显著改善大量 Markdown 的本地检索。[SQLite FTS5](https://www.sqlite.org/fts5.html)
5. SQLite 官方明确指出外部内容与 FTS 索引必须保持一致，并提供 `rebuild` 重建能力。因此 Markdown 应是 canonical source，SQLite 只是派生索引；索引损坏时应重建，而不是反向覆盖 Markdown。[SQLite FTS5 external content and rebuild](https://www.sqlite.org/fts5.html#external_content_and_contentless_tables)

## 建议的数据形状

每条长期记忆一个 Markdown 文件，不按“每句话”切碎，也不把一个人或项目全部塞进单文件：

```yaml
---
id: mem_20260903_example
kind: decision
scope: deep-code
status: active
sensitivity: private
source_refs:
  - task-local-id
created_at: 2026-09-03
review_after: 2026-12-03
supersedes: []
---
```

正文固定回答：

- 记住什么；
- 为什么值得记住；
- 适用于什么范围；
- 什么情况下不应使用；
- 来源在哪里；
- 后来怎样修正或废止。

## 建议的目录

```text
Deep Code Memory/
  00_Inbox/                 # 待用户确认的候选记忆
  10_Preferences/           # 稳定协作偏好
  20_Decisions/             # 项目与产品决策
  30_Handoffs/              # 当前状态、下一步、阻塞
  40_Learnings/             # 已验证经验与失败复盘
  80_Archive/               # 已被替代或失效的记忆
  90_Raw_Private/           # 可选原始会话；默认不索引、不进 Git
  .index/memory.sqlite      # 可删除重建，不进 Git
```

## 写入规则

Deep Code 第一版不应自动把每轮对话写成长期记忆。建议只产生候选项：

1. 用户明确说“记住”；
2. 一个工程决定经过验证并影响未来任务；
3. 重复出现的错误得到明确根因和回归测试；
4. 未完成事项需要跨会话继续；
5. 稳定偏好被多次观察到，并允许用户修订。

候选项先进入 `00_Inbox`，界面显示“将记住什么 / 来源 / 适用范围 / 是否包含私密内容”，用户可以接受、修改、设为仅本项目、归档或拒绝。

## 检索顺序

第一版采用低成本确定性检索：

1. 当前项目的 `HANDOFF` 与 active decisions；
2. scope、kind、status、时间等 Properties 过滤；
3. SQLite FTS5 关键词、短语和前缀检索；
4. 只返回少量匹配条目的标题、摘要和来源；
5. Agent 需要原文时再读取对应 Markdown。

向量 embedding / 语义 RAG 不应成为第一版前置条件。中文语义召回可能更好，但它增加模型依赖、重建成本、隐私说明和误召回问题。先用可解释的 FTS5 建立查询日志和漏召回样本，再决定是否加入本地 embedding。

## 隐私与删除

- 原始会话默认不进入长期记忆，也默认不进 Git。
- 亲密对话、第三方隐私、凭据、身份信息和医疗/财务内容不得自动提炼。
- 每条记忆必须能查看来源、修改、归档和删除。
- 删除 canonical Markdown 后重建索引；不能只从界面隐藏而留在索引中。
- FTS5 的普通删除不等于安全擦除；高度敏感内容不应首先进入索引。需要安全删除时还要考虑数据库页、备份与文件系统层，而不能只依赖 UI 删除。
- “忘记”与“删除原始会话”是两个动作，应分别说明覆盖范围。

## 最小可行版本

第一阶段只做：

1. 一个用户选择的本机 Memory Vault；
2. 四类 Markdown 模板：preference、decision、handoff、learning；
3. 明确的“保存为候选记忆”操作；
4. Obsidian 可直接打开；
5. 文件名/Properties/正文的本地 FTS5 检索；
6. 搜索结果附来源和作用域；
7. 索引一键重建；
8. 不自动复制完整会话，不做 embedding。

验收标准不是“记住得多”，而是：下一次任务能找回正确决定、不采用已失效决定、不把另一个项目或私密关系的内容串进当前任务，并且用户能看懂和删除所使用的记忆。

## 暂不实施

- 自动全量会话归档；
- 自动人格推断；
- 未经确认把私密对话提炼成长期偏好；
- 云端同步；
- 自动 embedding 全盘文件；
- 让记忆层成为第二个 Engine Session、权限或执行真相。
