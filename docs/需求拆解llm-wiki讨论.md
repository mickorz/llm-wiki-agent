你现在可以把整个链路明确成：

> **原始游戏需求文档 → LLM-Wiki 知识层 → 原子需求点 → 概要设计 → 详细设计 → 代码**

你截图里的 LLM-Wiki 已经承担了“理解文档、拆概念、建立关联”的工作，所以接下来最重要的不是再总结一次，而是做一层 **可追踪、可开发、可验证的需求点数据库**。

### 我建议新增这一层目录

```text
project/
├─ raw/                       # 原始需求文档
├─ wiki/                      # llm-wiki 生成
│  ├─ concepts/
│  ├─ entities/
│  ├─ syntheses/
│  ├─ sources/
│  └─ overview.md
│
├─ requirements/              # ← 下一阶段新增
│  ├─ gameplay/
│  ├─ ui/
│  ├─ config/
│  ├─ settlement/
│  ├─ data/
│  ├─ requirements.jsonl      # 给 Agent / Workflow 使用
│  ├─ index.md                # 给人看
│  └─ traceability.json       # 需求 → Wiki → Raw 映射
│
└─ reports/
```

这里有一个关键原则：

> **Wiki 用来找需求，Raw 用来证明需求。**

不要只从 `wiki/concepts/*.md` 直接生成最终需求点，因为 Wiki 本身已经经过一次 LLM 综合，有可能包含归纳、遗漏甚至轻微推断。

正确方式应该是：

```text
wiki concept / synthesis
        ↓
发现候选需求
        ↓
回溯 sources / raw
        ↓
确认原文证据
        ↓
生成 requirement
```

---

## 一个需求点应该拆到什么粒度

不要生成这种：

```text
REQ-001
实现麻将结算系统
```

这个粒度太大，后面没办法直接做设计、代码生成和测试。

应该尽量满足：

> **一个需求点 = 一个可以独立描述、实现、验证的行为或约束。**

假设原文存在类似规则：

```text
杠牌后需要立即计算杠分
荒庄时部分杠分需要特殊处理
```

应该拆成两个需求：

```yaml
id: REQ-SETTLEMENT-001
category: settlement
title: 杠牌后计算杠分
requirement: >
  当玩家完成符合计分条件的杠牌操作后，
  系统需要执行杠分计算。

source:
  wiki:
    - concepts/杠与杠分.md
  raw:
    - 06-结算.md#杠分结算

evidence_level: explicit
```

另一个：

```yaml
id: REQ-SETTLEMENT-002
category: settlement
title: 荒庄时处理杠分
requirement: >
  当牌局进入荒庄状态时，
  按荒庄规则处理已经产生的杠分。

source:
  wiki:
    - concepts/荒庄与查叫.md
    - syntheses/结算流程的规则依赖.md
  raw:
    - 06-结算.md#荒庄

evidence_level: explicit
```

注意：**不要在这个阶段把代码设计塞进去。**

比如不要写：

```text
SettlementManager 调用 GangScoreCalculator.calculate()
```

这是后面的概要设计/详细设计阶段。

---

# 我建议第一版 Requirement Schema 保持很小

你之前碰到过“大 Schema + 巨大 JSON”的问题，所以这里千万不要一次让 Agent 返回整个游戏的几百条需求。

第一版只需要：

```json
{
  "id": "REQ-SETTLEMENT-001",
  "category": "settlement",
  "title": "杠牌后计算杠分",
  "requirement": "完成杠牌后需要进行杠分计算",
  "source_refs": [
    "wiki/concepts/杠与杠分.md",
    "raw/06-结算.md"
  ],
  "evidence_level": "explicit",
  "tags": ["杠", "结算"]
}
```

后续第二阶段再补：

```text
trigger
precondition
input
output
acceptance_criteria
dependencies
related_ui
related_config
```

不要第一步就全部生成。

---

# 具体怎么跑，我建议分 4 个 Agent 阶段

你的 `opencode-dynamic-workflows` 特别适合干这个事情。

```text
Phase 1
Requirement Discovery
        ↓
Phase 2
Evidence Validation
        ↓
Phase 3
Normalize / Deduplicate
        ↓
Phase 4
Requirement Index
```

### Phase 1：候选需求发现

不要一次读取整个 Wiki。

按：

```text
concepts/创房配置.md
concepts/对局流程.md
concepts/番型体系.md
concepts/杠与杠分.md
...
```

逐个或者并行处理。

例如：

```text
parallel(
  extract("concepts/创房配置.md"),
  extract("concepts/对局流程.md"),
  extract("concepts/番型体系.md"),
  extract("concepts/杠与杠分.md")
)
```

每个 Agent 只负责：

```text
1. 阅读 concept
2. 找候选需求
3. 查关联 synthesis
4. 找对应 raw/source
5. 输出 5~30 个原子需求
```

这样上下文非常小。

---

## Phase 2：Evidence Validation

这一层非常重要。

Agent 生成：

```text
REQ-001
```

以后再检查：

```text
这个需求在 Raw 中真的存在吗？
```

最终分：

```text
explicit
    原文明确描述

derived
    多段规则组合可以推出

unsupported
    Wiki 有，但 Raw 无法支持
```

我建议：

```text
explicit → requirements/
derived → requirements/review/
unsupported → reports/issues/
```

默认不要让 `derived` 自动进入正式需求库。

这可以明显减少 LLM-Wiki → Requirement 过程中产生的“幻觉需求”。

---

# Phase 3：合并重复需求

这个阶段非常必要。

因为：

```text
concepts/番型体系.md
concepts/自摸相关规则.md
syntheses/番型与结算口径核查.md
```

很可能都会产生：

```text
自摸相关需求
```

不能得到：

```text
REQ-101 自摸结算
REQ-143 自摸结算
REQ-178 自摸时结算
```

所以做：

```text
Normalize
    ↓
Semantic Dedupe
    ↓
Merge Source References
```

最后可能：

```yaml
REQ-SETTLEMENT-023

sources:
  - concepts/番型体系.md
  - concepts/自摸相关规则.md
  - syntheses/番型与结算口径核查.md
  - raw/06-结算.md
```

反而信息更加完整。

---

# Phase 4：建立 Requirement Index

最后产生一个非常有用的文件：

```text
requirements/index.md
```

例如：

```markdown
# Requirements

## 游戏流程

REQ-GAME-001 开始牌局
REQ-GAME-002 发牌
REQ-GAME-003 玩家出牌
REQ-GAME-004 玩家碰牌
REQ-GAME-005 玩家杠牌
REQ-GAME-006 玩家胡牌
REQ-GAME-007 一局结束

## 配置

REQ-CONFIG-001 创房局数配置
REQ-CONFIG-002 番型配置
REQ-CONFIG-003 封顶配置

## UI

REQ-UI-001 创房规则选择
REQ-UI-002 番型配置展示
REQ-UI-003 结算界面展示

## 结算

REQ-SETTLEMENT-001 杠分计算
REQ-SETTLEMENT-002 胡牌结算
REQ-SETTLEMENT-003 荒庄结算
...
```

这样下一阶段你就不需要再面对：

```text
8 个 Raw 文件
+
20 个 Wiki Concept
+
几个 Synthesis
```

而是直接面对：

```text
REQ-GAME-001
REQ-GAME-002
REQ-UI-001
REQ-CONFIG-001
...
```

---

## 更重要的是建立 Traceability

我非常建议你生成：

```text
requirements/traceability.json
```

形成：

```text
REQ-SETTLEMENT-023
        ↓
concepts/自摸相关规则.md
        ↓
syntheses/番型与结算口径核查.md
        ↓
raw/06-结算.md
```

未来继续往后：

```text
REQ-SETTLEMENT-023
        ↓
DESIGN-SETTLEMENT-008
        ↓
TASK-SETTLEMENT-015
        ↓
SettlementService.ts
        ↓
TEST-SETTLEMENT-023
```

最终会得到：

```text
Raw
 ↓
Wiki
 ↓
Requirement
 ↓
Design
 ↓
Task
 ↓
Code
 ↓
Test
```

这其实已经不只是一个知识库了，而是一条完整的 **AI 游戏研发 Traceability Pipeline**。

---

### 按你当前这个项目，我建议先不要全量跑

先拿截图里的三个领域实验：

```text
concepts/杠与杠分.md
concepts/荒庄与查叫.md
concepts/自摸相关规则.md

+

syntheses/番型与结算口径核查.md
syntheses/结算流程的规则依赖.md
syntheses/自摸相关规则.md
```

先生成大约 **20～50 个 Requirement**。

人工检查：

```text
是否漏需求
是否重复
是否拆得太粗
是否拆得太细
是否有幻觉
是否能追溯 raw
```

这批质量稳定以后，再批量处理整个 Wiki。

**这一小批实际上就是你的 Requirement Extraction Golden Set。**

后面你还可以直接拿它做 A/B Test：

```text
A：Raw → Requirement

B：Raw → LLM-Wiki → Requirement
```

比较：

```text
Recall        漏需求率
Precision     错误需求率
Atomicity     原子化程度
Duplication   重复率
Traceability  可追溯率
```

按照你现在这套工程，我会优先走 **`Wiki → 候选需求 → Raw 证据核查 → 原子需求 → 去重 → requirements`** 这条线路，而不是简单再调用一个 Agent “把 Wiki 总结成需求点”。这两种方式最后的稳定性会差很多。
