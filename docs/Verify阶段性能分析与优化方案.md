# Phase 3 Verify 阶段性能分析与优化方案

> 生成时间：2026-09-28
> 基于 Run 6 数据分析（9 topics, 195 candidates, 192 verify agents）

## 1. 问题描述

Phase 3 Verify 是整个需求提取流水线中耗时最长的阶段，占总耗时的 ~48%（约 25 分钟/52 分钟）。
根本原因是**逐条验证 + 文件重复读取**的设计缺陷。

## 2. 当前实现分析

### 2.1 代码结构

```
Phase 3 Verify 当前流程：
  toVerify = [...explicit, ...derived]  // 192 条
  │
  ├─ verify(需求1) → reviewer agent 1 → 读取 raw 文件 → 判断
  ├─ verify(需求2) → reviewer agent 2 → 读取 raw 文件 → 判断
  ├─ verify(需求3) → reviewer agent 3 → 读取 raw 文件 → 判断
  │  ...（192 个并行 agent，并发上限 12）
  └─ verify(需求192) → reviewer agent 192 → 读取 raw 文件 → 判断
```

每个 `verify()` 调用启动 1 个独立的 reviewer agent，共 192 个 agent。

### 2.2 逐条验证的问题

| 维度 | 当前实现 | 问题 |
|------|----------|------|
| agent 数量 | 192 个 | 每个 agent 有独立的会话初始化开销 |
| 并发上限 | 12 | 192/12 = 16 批次串行等待 |
| 文件读取 | 每个 agent 独立读取 raw 文件 | 同一文件被重复读取几十次 |
| LLM 调用 | 192 次 | 大量重复推理，tokens 浪费 |
| 执行时间 | ~25 分钟 | 占总耗时 48% |

## 3. 文件重复读取分析

### 3.1 各 raw 文件被读取次数估算

| Raw 文件 | 大小 | 关联 Topic | 候选数 | 估算读取次数 | 重复读取数据量 |
|----------|------|-----------|--------|-------------|---------------|
| 01-基础规则.md | 11.4KB | T01,T02,T03,T06,T07 | 97条 | ~97 次 | 1,106 KB |
| 06-结算.md | 30.2KB | T02,T03,T06,T07 | 76条 | ~76 次 | 2,295 KB |
| 07-配置.md | 59.7KB | T08,T09 | 48条 | ~48 次 | 2,866 KB |
| 03-打牌操作.md | 13.1KB | T01,T08 | 46条 | ~46 次 | 603 KB |
| 04-番型.md | 46.9KB | T05 | 25条 | ~25 次 | 1,173 KB |
| 05-胡牌类型.md | 25.4KB | T04 | 25条 | ~25 次 | 635 KB |
| 02-游戏流程.md | 18.1KB | T03 | 18条 | ~18 次 | 326 KB |

### 3.2 汇总

| 指标 | 数值 |
|------|------|
| 总重复读取次数 | **~335 次** |
| 总重复读取数据量 | **~9 MB** |
| 实际独立 raw 文件数 | 7 个 |
| 实际 raw 文件总大小 | ~205 KB |
| 重复倍数 | **335 / 7 = 48 倍** |

> 类比：相当于一本书被翻了 335 遍，每次只看一页。如果一次性把相关章节读完，只需要翻 7 次。

## 4. 执行时间拆解

### 4.1 Run 6 各阶段耗时估算

| 阶段 | Agent 数 | 耗时估算 | 占比 |
|------|---------|----------|------|
| Phase 1 Discovery | 9 + 9 写入 | ~250s | 8% |
| Phase 2 Validation | 9 + 3 写入 | ~500s | 16% |
| **Phase 3 Verify** | **192** | **~1500s** | **48%** |
| Phase 4 Normalize | 1 + 1 写入 | ~300s | 10% |
| Phase 5 Dedup | 1 + 1 写入 | ~200s | 6% |
| Phase 6 Checkpoint | 0 | ~10s | 0% |
| Phase 7 Publish | 1 + 3 写入 | ~200s | 6% |
| Phase 8 Eval | 1 + 1 写入 | ~180s | 6% |
| **总计** | **233** | **~3140s** | 100% |

### 4.2 Phase 3 Verify 耗时拆解

```
192 个 agent / 12 并发 = 16 批次
每批次：12 个 agent 并行
  ├─ agent 初始化开销：~5s
  ├─ Read raw 文件：~10-30s（取决于文件大小）
  ├─ LLM 推理：~30-60s
  └─ 返回结果：~2s
每批次耗时：~50-90s
16 批次 × 80s = ~1280s ≈ 21 分钟
```

## 5. 优化方案

### 方案 A：按 Topic 批量验证（推荐）

将"逐条验证"改为"按 topic 批量验证"：

```
优化后 Phase 3 Verify 流程：
  TOPIC-01 (21条) → 1 个 agent → 读 raw 文件 1 次 → 批量验证 21 条
  TOPIC-02 (15条) → 1 个 agent → 读 raw 文件 1 次 → 批量验证 15 条
  ...
  TOPIC-09 (23条) → 1 个 agent → 读 raw 文件 1 次 → 批量验证 23 条

  9 个 agent 并行（并发上限 9）
```

| 指标 | 当前（逐条） | 优化后（批量） | 改善 |
|------|-------------|---------------|------|
| agent 数量 | 192 | **9** | -95% |
| 文件读取次数 | ~335 | **~18** | -95% |
| 重复读取数据量 | ~9 MB | **~205 KB** | -98% |
| 并发批次 | 16 | **1** | -94% |
| 预计耗时 | ~25 分钟 | **~3 分钟** | -88% |

#### 实现方式

用 `agent()` 替代 `verify()`，按 topic 分组：

```javascript
// 优化前：逐条 verify
const verifyResults = await parallel(
  toVerify.map(cand => () => verify(
    `需求描述：${cand.requirement}...`,
    { reviewers: 1, threshold: 0.0 }
  ))
)

// 优化后：按 topic 批量 verify
const topicGroups = {}
for (const cand of toVerify) {
  const topic = cand.topic
  if (!topicGroups[topic]) topicGroups[topic] = []
  topicGroups[topic].push(cand)
}

const verifyResults = await parallel(
  Object.entries(topicGroups).map(([topicName, candidates]) => () => agent(
    buildVerifyPrompt(topicName, candidates),
    { label: `Verify: ${topicName}`, agentType: 'general', model: MODEL_FAST, timeoutMs: AGENT_TIMEOUT }
  ))
)
```

#### 批量 Verify Prompt 设计

```
你是 Verify Agent。验证以下候选需求是否被原始文档直接支持。

候选需求（共 N 条）：
1. CAND-XX-001: 需求描述...
2. CAND-XX-002: 需求描述...
...

请使用 Read 工具读取以下 raw 文件：
- raw/mahjong/xx-xxx.md

然后逐条判断每条需求是否被 raw 文档直接支持。
输出 JSON 数组：[{"temp_id":"CAND-XX-001","pass":true,"reason":"..."},...]
```

### 方案 B：预读取 raw 文件内容内联到 Prompt

在 workflow 脚本中预先读取 raw 文件内容，内联到 verify prompt 中。

| 优点 | 缺点 |
|------|------|
| agent 不需要调用 Read 工具 | workflow runtime 禁止 import/require |
| 消除所有文件读取 | 无法用 fs 模块读取文件 |
| - | 需要借助 agent 预读取 |

#### 实现方式

在 Phase 2 完成后，用 1 个 agent 预读取所有 raw 文件并返回内容，
然后在 Phase 3 中将内容内联到 verify prompt 中。

```javascript
// Phase 2.5: 预读取 raw 文件
const rawContent = await agent(
  `请使用 Read 工具读取以下文件并返回完整内容：\n${allRawFiles.map(f => `- ${f}`).join('\n')}`,
  { label: '预读取 raw', agentType: 'general', model: MODEL_FAST, timeoutMs: AGENT_TIMEOUT }
)

// Phase 3: verify 时内联 raw 内容
const verifyResults = await parallel(
  toVerify.map(cand => () => verify(
    `需求描述：${cand.requirement}\n\n原始文档内容：\n${rawContent}\n\n判断...`,
    { reviewers: 1, threshold: 0.0 }
  ))
)
```

| 指标 | 当前 | 方案 B |
|------|------|--------|
| 文件读取 | 335 次 | **1 次** |
| agent 数量 | 192 | 192 + 1 |
| prompt 大小 | 小 | 大（内联 raw 内容） |
| 预计耗时 | ~25 分钟 | ~15 分钟 |

### 方案 C：提高并发数

将并发上限从 12 提高到 16（workflow 上限）。

| 指标 | 当前 | 方案 C |
|------|------|--------|
| 并发上限 | 12 | 16 |
| 并发批次 | 16 | 12 |
| 预计耗时 | ~25 分钟 | ~18 分钟 |
| 改善 | - | -28% |

> 注意：提高并发数只是缓解，不解决根本问题。

## 6. 推荐方案

**方案 A（按 Topic 批量验证）** 是最优选择：

| 对比 | 方案 A | 方案 B | 方案 C |
|------|--------|--------|--------|
| agent 数量 | 9 | 193 | 192 |
| 文件读取 | 18 次 | 1 次 | 335 次 |
| 预计耗时 | 3 分钟 | 15 分钟 | 18 分钟 |
| 实现复杂度 | 中 | 高 | 低 |
| 根本解决 | 是 | 是 | 否 |

方案 A 的核心优势：
1. agent 数量减少 95%（192 → 9）
2. 文件读取减少 95%（335 → 18）
3. 执行时间减少 88%（25 分钟 → 3 分钟）
4. 每个 agent 只读取该 topic 的 raw 文件一次，然后批量验证所有需求
5. LLM 调用次数大幅减少，tokens 消耗降低

## 7. 预期效果

优化后各阶段耗时估算：

| 阶段 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| Phase 1 Discovery | 250s | 250s | - |
| Phase 2 Validation | 500s | 500s | - |
| **Phase 3 Verify** | **1500s** | **180s** | **-88%** |
| Phase 4 Normalize | 300s | 300s | - |
| Phase 5 Dedup | 200s | 200s | - |
| Phase 6 Checkpoint | 10s | 10s | - |
| Phase 7 Publish | 200s | 200s | - |
| Phase 8 Eval | 180s | 180s | - |
| **总计** | **3140s** | **1820s** | **-42%** |

> 总耗时从 ~52 分钟降到 ~30 分钟，Phase 3 不再是瓶颈。

## 8. 注意事项

1. **批量验证的 prompt 会更长**：包含 20-35 条需求，需要 agent 处理更多内容
2. **验证精度可能略有下降**：批量处理时 agent 可能不如逐条验证仔细
3. **需要调整 timeout**：批量验证的 agent 可能需要更长时间（但总体仍比逐条快很多）
4. **输出格式需要调整**：从 verify() 的布尔结果改为 agent() 的 JSON 数组结果
5. **需要解析验证结果**：从 agent 返回的 JSON 中提取每条需求的 pass/fail 状态

## 8.5 方案 A 上下文溢出风险分析

### 8.5.1 风险描述

方案 A 将一个 topic 的 20-35 条候选需求合并到一个 agent 中批量验证。agent 需要：
1. 使用 Read 工具读取 1-3 个 raw 文件（11-60KB）
2. 逐条比对需求和 raw 内容
3. 输出 20-35 条验证结果

当 raw 文件较大或候选需求较多时，agent 上下文会快速膨胀。一旦触及模型上下文上限，
系统会触发**上下文压缩**（context compression），早期读取的 raw 文件内容可能被截断或丢失，
导致后续需求验证时无法看到完整原始文档，验证结果不准确。

### 8.5.2 上下文大小估算

每个 topic 的批量验证 agent 上下文构成：

| Topic | 候选数 | Raw 文件 | Raw 总大小 | 候选需求大小 | 估算上下文 | 风险等级 |
|-------|--------|---------|-----------|-------------|-----------|---------|
| T01 刮风下雨 | 21 | 01(11.4KB)+03(13.1KB) | 24.5KB | ~6KB | ~10K tok | 低 |
| T02 呼叫转移 | 15 | 01(11.4KB)+06(30.2KB) | 41.6KB | ~4.5KB | ~14K tok | 中 |
| T03 流局处理 | 18 | 02(18.1KB)+01(11.4KB)+06(30.2KB) | 59.7KB | ~5.4KB | ~19K tok | **高** |
| T04 胡牌判定 | 25 | 05(25.4KB) | 25.4KB | ~7.5KB | ~11K tok | 低 |
| T05 番型体系 | 25 | 04(46.9KB) | 46.9KB | ~7.5KB | ~16K tok | 中 |
| T06 结算公式 | 23 | 06(30.2KB)+01(11.4KB) | 41.6KB | ~6.9KB | ~14K tok | 中 |
| T07 结算流水线 | ~20 | 06(30.2KB)+01(11.4KB) | 41.6KB | ~6KB | ~14K tok | 中 |
| T08 行牌操作 | ~25 | 03(13.1KB)+07(59.7KB) | 72.8KB | ~7.5KB | **~24K tok** | **高** |
| T09 创房配置 | ~23 | 07(59.7KB) | 59.7KB | ~6.9KB | **~20K tok** | **高** |

> 注：估算按 1 token ≈ 3.5 字节换算，实际可能因中文编码有所不同。

### 8.5.3 压缩触发的具体场景

场景：TOPIC-08 行牌操作（25 条候选，2 个 raw 文件共 72.8KB）

```
agent 上下文时间线：
  t0: system prompt + verify prompt（~2K tok）
  t1: Read raw/03-打牌操作.md → 上下文增至 ~6K tok
  t2: Read raw/07-配置.md → 上下文增至 ~24K tok
  t3: 开始验证第 1-10 条需求，LLM 推理产生中间 token
      上下文增至 ~30K tok（接近 32K 模型上限）
  t4: 【压缩触发】07-配置.md 的前半部分被截断
  t5: 验证第 11-20 条需求时，agent 无法看到完整的 07-配置.md
      → 可能误判：raw 中实际有证据但 agent 看不到 → 误判为 fail
      → 或 agent 不再引用 raw 内容，仅凭需求描述猜测 → 误判为 pass
  t6: 验证第 21-25 条需求时，上下文进一步压缩
      → 验证结果几乎不可靠
```

### 8.5.4 影响后果

| 后果 | 严重程度 | 说明 |
|------|---------|------|
| raw 内容被截断 | **严重** | 后续需求无法准确比对原始文档 |
| 误判 pass（假阳性） | 中 | raw 中有证据但被压缩掉了，agent 凭摘要猜测通过 |
| 误判 fail（假阴性） | 中 | raw 中有证据但 agent 看不到，判定为不支持 |
| 验证不一致 | 中 | 同一 topic 内，前面的需求验证准确，后面的不准确 |
| Recall 下降 | 高 | 被误判 fail 的需求被排除，导致最终产出缺失 |
| Precision 下降 | 中 | 被误判 pass 的需求实际上缺乏证据，但仍进入后续流程 |

### 8.5.5 缓解方案

#### 缓解 1：按 raw 文件大小动态分批

根据 raw 文件总大小动态决定每批次的需求数量：

```javascript
// 动态分批逻辑
const MAX_CONTEXT_KB = 80  // 上下文安全阈值
const rawSizeKB = topic.rawSources.reduce((sum, f) => sum + fileSizeMap[f] || 0, 0) / 1024
const maxPerBatch = rawSizeKB > 50 ? 10 : rawSizeKB > 30 ? 15 : 25
// raw > 50KB → 每批 10 条
// raw 30-50KB → 每批 15 条
// raw < 30KB → 每批 25 条
```

| Raw 总大小 | 每批最大需求数 | 预计 agent 数 | 风险 |
|-----------|--------------|-------------|------|
| < 30KB | 25 | 1/topic | 低 |
| 30-50KB | 15 | 1-2/topic | 中 |
| > 50KB | 10 | 2-3/topic | 低（分批后） |

#### 缓解 2：分步读取 + 分批验证

将一个 topic 的验证拆为多步：
1. 第 1 步：agent 读取 raw 文件并生成结构化摘要（每条规则一行）
2. 第 2 步：用摘要替代全文，分批验证需求（每批 10 条）

```
步骤 1：摘要 agent
  Read raw/07-配置.md → 输出结构化摘要（约 2K tok）
  Read raw/03-打牌操作.md → 输出结构化摘要（约 1K tok）

步骤 2：验证 agent（分批，每批 10 条）
  输入：摘要（3K tok）+ 10 条需求（3K tok）= 6K tok
  输出：10 条验证结果
  上下文始终 < 10K tok，无压缩风险
```

| 优点 | 缺点 |
|------|------|
| 上下文始终很小 | 摘要可能丢失细节 |
| 无压缩风险 | 多了一步摘要 agent |
| 可并行分批验证 | 摘要质量影响验证精度 |

#### 缓解 3：混合策略（推荐）

根据 topic 的 raw 文件大小自动选择策略：

```
if raw总大小 < 30KB:
  → 方案 A 全量批量验证（1 agent 验证全部 25-35 条）
elif raw总大小 < 50KB:
  → 方案 A 分批验证（每批 15 条，1-2 个 agent）
else:
  → 缓解 2 分步读取 + 分批验证（摘要 + 验证，每批 10 条）
```

| Topic | Raw 大小 | 策略 | Agent 数 | 预计上下文 |
|-------|---------|------|---------|-----------|
| T01 刮风下雨 | 24.5KB | 全量批量 | 1 | ~10K tok |
| T04 胡牌判定 | 25.4KB | 全量批量 | 1 | ~11K tok |
| T02 呼叫转移 | 41.6KB | 分批(15) | 1 | ~14K tok |
| T06 结算公式 | 41.6KB | 分批(15) | 2 | ~14K tok |
| T07 结算流水线 | 41.6KB | 分批(15) | 2 | ~14K tok |
| T05 番型体系 | 46.9KB | 分批(15) | 2 | ~16K tok |
| T03 流局处理 | 59.7KB | 摘要+分批 | 3 | ~10K tok |
| T09 创房配置 | 59.7KB | 摘要+分批 | 3 | ~10K tok |
| T08 行牌操作 | 72.8KB | 摘要+分批 | 3 | ~10K tok |

总计：~18 个 agent（vs 当前 192 个，仍减少 91%）

### 8.5.6 结论

方案 A 确实存在上下文溢出风险，特别是当 raw 文件 > 50KB 时（如 T03、T08、T09）。
推荐采用**缓解 3（混合策略）**：

- 小文件 topic：直接批量验证（1 agent）
- 中文件 topic：分批验证（2 agent）
- 大文件 topic：先摘要再分批验证（3 agent）
- 总 agent 数：~18 个（vs 192 个，减少 91%）
- 总耗时：~3-5 分钟（vs 25 分钟，减少 80%+）
- 上下文风险：全部控制在安全范围内

## 9. 引用说明

- Run 6 数据：233 agent, 0 失败, 3149s, 3.1M tokens
- Phase 3 Verify: 192 个 verify agent, 并发 12, 约 1500s
- 文件大小数据来自 `Get-ChildItem` 统计
- workflow verify() 函数文档参考 OpenCode workflow-authoring skill
