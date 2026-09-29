# Run 13 全量文档测试报告与优化建议

## 一、测试背景

Run 10-12 中每个 topic 只引用 2-3 个 raw 文件和 1-2 个 wiki concepts，交叉验证不充分。Run 13 将全部 8 个 raw 文件 + 14 个 wiki concepts + 2 个 syntheses 加到每个 topic，让 Discovery/Validation/Verify 都能看到全量文档。

### 全量文档清单

| 类型 | 数量 | 新增文件 |
|------|------|----------|
| Raw | 8 | `08-UI交互.md`（之前未被任何 topic 引用） |
| Wiki concepts | 14 | `缺门.md`、`过手规则.md`、`掷骰双分流.md`、`换三张.md`、`将牌与根.md` |
| Wiki syntheses | 2 | `一局血战麻将从开始到结束的完整流程是什么.md` |

---

## 二、Run 13 核心指标

| 指标 | 值 | 说明 |
|------|-----|------|
| Recall | 95.8% | 92/96 条 Golden 命中 |
| Precision (multi-match) | 115.0% | 92/80，多对一匹配 |
| Strict Precision | 76.3% | 61/80，唯一被匹配的 published 占比 |
| Unsupported | 0% | 0/240，幻觉清零 |
| Traceability | 100% | 80/80，全部可追溯 |
| Published | 80 | 目标范围 80-100 的下限 |
| Tokens | 2,362,412 | 约 2.36M |
| 耗时 | 2002s | 约 33 分钟 |
| Agents | 68 | |

### 数据流水线

```
Candidates 240 -> Verify通过 207 -> Normalized 317 -> Deduped 80 -> Published 80
                                                合并率 74.8%
```

### 4 条未匹配 Golden（全部来自创房配置）

| Golden ID | 标题 | 根因 |
|-----------|------|------|
| GOLDEN-068 | 速度配置项 | Dedup 合并进其他配置条目 |
| GOLDEN-069 | 局数配置项 | Dedup 合并进其他配置条目 |
| GOLDEN-075 | 定庄与轮庄配置 | Dedup 合并进其他配置条目 |
| GOLDEN-077 | 座位安排随人数联动 | Dedup 合并进其他配置条目 |

### 19 条未匹配 Published

分 3 类：
1. **合理扩展**（Golden 未覆盖）：天胡番型定义、血战到底、胡牌判定两层流程、过手碰、过手加番可胡、死叫不算叫、听牌标签、输出小结算
2. **加倍项拆分过细**：海底炮、断幺九、夹心五、绝张、卡二条、杠上炮、根的定义、各自带根数（8 条可合并为 1-2 条）
3. **配置重复**：呼叫转移开关、擦挂开关（可合并进对应规则条目）

---

## 三、四次 Run 完整对比

| 指标 | Run 10 | Run 11 | Run 12 | Run 13 |
|------|--------|--------|--------|--------|
| **文档范围** | 部分(2-3 raw) | 部分(2-3 raw) | 部分(2-3 raw) | **全量(8 raw+14 wiki)** |
| Golden | 50 | 96 | 96 | 96 |
| Published | 97 | 82 | 99 | 80 |
| Candidates | 216 | 216 | 208 | 240 |
| Normalized | 217 | 169 | 213 | 317 |
| Deduped | 97 | 82 | 99 | 80 |
| **Recall** | 100% (50/50) | 90.6% (87/96) | **100%** (96/96) | 95.8% (92/96) |
| **Strict Precision** | 51.5% (50/97) | 70.7% (58/82) | **75.8%** (75/99) | 76.3% (61/80) |
| Unsupported | 0.9% | 0.9% | 1.0% | **0%** |
| Traceability | 100% | 100% | 100% | 100% |
| Tokens | 878K | 938K | 938K | **2,362K** |
| 耗时 | 1636s | 1781s | 1623s | 2002s |
| Agents | 63 | 63 | 66 | 68 |
| 评测批次 | 5 | 10 | 10 | 10 |

### 关键趋势

```
Run 10 -> 11 -> 12 -> 13 的 Recall 和 Token 成本变化

Recall:   100% -> 90.6% -> 100% -> 95.8%
Tokens:   878K -> 938K  -> 938K -> 2362K  (+152% vs Run 12)
Published:  97 ->  82  ->  99  ->   80
```

---

## 四、根因分析

### 4.1 全量文档的收益

| 收益 | 证据 |
|------|------|
| 幻觉清零 | unsupported 从 1.0% 降到 0%，交叉验证充分 |
| 候选数增加 | 240 vs 208（+15%），Discovery 能看到更多 wiki 概念 |
| 证据等级提升 | explicit 208/240 = 86.7%，derived 仅 2 条 |

### 4.2 全量文档的代价

| 代价 | 数据 |
|------|------|
| Token 成本 2.5 倍 | 938K -> 2,362K（+152%），每个 Verify agent 读 8 个 raw 文件（80K+ tokens/agent） |
| Dedup 过度合并 | 317 -> 80（合并率 74.8% vs Run 12 的 53.5%） |
| Recall 下降 | 4 条创房配置 Golden 被合并丢失 |

### 4.3 Dedup 过度合并根因

全量文档导致每个 topic 的 Discovery 都能看到所有 wiki 概念，产生大量跨 topic 重复候选。例如"缺门限制"在刮风下雨、行牌操作、创房配置三个 topic 都被发现。Dedup agent 面对大量重复，合并策略趋于激进：

- 速度/局数配置被合并进"创房面板默认配置"条目
- 定庄/轮庄被合并进"人数联动配置"条目
- 座位安排被合并进"人数联动配置"条目

这些合并虽然语义上合理，但导致 Golden 中的独立条目无法匹配。

---

## 五、优化建议

### 方案 A：混合文档策略（推荐）

**思路：** Discovery 用全量文档（保证发现率），Verify/Dedup 用 topic 专属文档（防止过度合并）

| 阶段 | 文档范围 | 理由 |
|------|----------|------|
| Discovery | 全量 14 wiki + 2 syntheses | 保证发现所有候选需求 |
| Validation | topic 专属 2-3 raw | 精准验证证据，减少噪音 |
| Verify | topic 专属 2-3 raw | 控制每批 token，避免 80K+ tokens/agent |
| Dedup | 全量 raw（仅引用路径） | 跨 topic 去重需要全局视角 |

**预期效果：**
- Discovery 发现率与 Run 13 持平（240 候选）
- Verify token 降回 20-30K/agent（Run 12 水平）
- Dedup 合并率回到 53-55%（Run 12 水平）
- Published 回到 90-100 条
- Recall 回到 98-100%

**实现改动：** TOPICS 结构拆分为 `discoveryConcepts`（全量）和 `verifyRawSources`（topic 专属）

### 方案 B：Dedup 保护配置项（快速修复）

**思路：** 在 Dedup prompt 中增加配置项保护规则，防止速度/局数/定庄/轮庄被合并

```
F. 创房配置保护规则（禁止合并）：
   速度、局数、人数、房数、底分、封顶倍数各自为独立配置项，不可合并
   定庄与轮庄为独立配置项，不可合并
   座位安排、换牌方向为独立配置项，不可合并
```

**预期效果：** Published 从 80 回到 90+，Recall 回到 98%+

### 方案 C：降低 Dedup 目标条数

**思路：** 将 Dedup 目标从 80-100 调整为 90-120，给全量文档的更多候选留空间

```
D. 目标条数：合并后控制在 90-120 条以内
```

**预期效果：** Published 从 80 升到 90-100，减少过度合并

### 方案对比

| 方案 | 改动量 | 预期 Recall | 预期 Token | 推荐度 |
|------|--------|-------------|-----------|--------|
| A: 混合文档 | 中（拆分 TOPICS 字段） | 98-100% | ~1.2M | 高 |
| B: Dedup 保护配置 | 小（加 prompt 规则） | 98% | 2.4M | 中 |
| C: 调目标条数 | 小（改数字） | 96-98% | 2.4M | 中 |
| A+B 组合 | 中 | 100% | ~1.2M | 最高 |

---

## 六、推荐路线

1. **短期（立即可做）：** 实施方案 B + C，在 Dedup prompt 增加配置项保护 + 调目标到 90-120，重跑 Run 14 验证
2. **中期（下个迭代）：** 实施方案 A，拆分 `discoveryConcepts` 和 `verifyRawSources`，让 Discovery 用全量、Verify 用专属，Token 降回 1.2M 水平
3. **长期（稳定后）：** Golden Set 继续扩展到 120+ 条，覆盖加倍项细节和 UI 交互规则，使 Strict Precision 更准确

---

## 七、引用说明

- Run 12 分析报告：`docs/Run12终极分析报告.md`
- Run 11 分析报告：`docs/Run11分析报告.md`
- Run 10 分析报告：`docs/Run10终极分析与优化建议.md`
- 主 workflow 脚本：`.opencode-workflows/workflows/requirement-extraction.js`
- 评测子 workflow：`.opencode-workflows/workflows/llm-eval.js`
- Golden 标准答案：`golden/requirements.jsonl`（96 条）
- Run 13 产出需求：`requirements/requirements.jsonl`（80 条）
- Run 13 评测报告：`reports/requirement-extraction-report.md`
