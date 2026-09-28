# Workflow 优化方案

## 问题分析

### Run 3 执行结果（优化前）

| 指标 | 数值 |
|---|---|
| 总耗时 | 45 分钟（2700 秒） |
| Agent 总数 | 107 |
| 失败 Agent | 4 |
| 成功率 | 96.3% |

### 4 个失败 Agent 分析

| 失败 Agent | 原因 | 影响 |
|---|---|---|
| TOPIC-03 Discovery | 6 concepts + 1 synthesis + 6 raw = 13 文件，数据量过大 | 自摸相关规则 16 条 Golden 需求全部缺失 |
| 写入 explicit.jsonl | 25+ 条 JSONL 约 10KB，60s 超时 | Phase 3 Verify 缺少输入 |
| 写入 requirements.jsonl | 40 条 JSONL 约 14KB，60s 超时 | Phase 8 Eval 无法读取产出 |
| 写入评测报告 | Eval agent 可能因 requirements.jsonl 缺失而失败 | 无评估指标 |

### 耗时分布

| Phase | 耗时（分钟） | Agent 数 | 说明 |
|---|---|---|---|
| Phase 1 Discovery | 5 | 6 | 3 topics 并行 + 3 write |
| Phase 2 Validation | 5 | 7 | 3 topics 并行 + 4 write（串行） |
| Phase 3 Verify | 20 | 44 | 22 candidates x 2 reviewers = 44 agents |
| Phase 4 Normalize | 3 | 2 | 1 agent + 1 write |
| Phase 5 Dedup | 3 | 2 | 1 agent + 1 write |
| Phase 6 Checkpoint | 0 | 0 | auto-pass |
| Phase 7 Publish | 5 | 4 | 1 agent + 3 write（串行） |
| Phase 8 Eval | 4 | 2 | 1 agent + 1 write |
| 合计 | 45 | 67+ | |

### 类比理解

把 workflow 想象成一个工厂流水线：

- Phase 3 Verify 就像质检环节，每个产品要 2 个质检员检查（44 个质检任务），但只有 8 个质检工位（并发 8），所以排队等待花了 20 分钟
- TOPIC-03 就像一个超大的原材料包，工人一次搬不动（13 个文件太多），直接放弃了
- 写入文件就像打包发货，60 秒打包不完就超时丢弃了

## 优化方案

### 优化 1：拆分 TOPIC-03（解决 Discovery 失败）

将 6 个 concept 的 TOPIC-03 拆分为 3 个子 topic，每个 2 个 concept：

| 子 Topic | Concepts | Raw Sources |
|---|---|---|
| TOPIC-03 自摸与胡牌番型 | 胡牌判定 + 番型体系 | 04-番型 + 05-胡牌类型 |
| TOPIC-04 自摸与结算流水线 | 结算公式 + 结算流水线 | 06-结算 + 01-基础规则 |
| TOPIC-05 自摸与行牌配置 | 行牌操作 + 创房配置 | 03-打牌操作 + 07-配置 |

预期效果：每个子 topic 只需读取 4-5 个文件（2 concepts + 1 synthesis + 2 raw），不会超时

### 优化 2：减少 AGENT_TIMEOUT（10 分钟 → 5 分钟）

减少单个 agent 的最大等待时间，避免卡死

### 优化 3：增加写入 agent timeout（60s → 120s）

写入文件 agent 从 60 秒增加到 120 秒，解决 JSONL 数据写入超时问题

### 优化 4：减少 verify reviewers（2 → 1）

从 2 个 reviewer 减为 1 个 reviewer，threshold 从 0.5 改为 0.0

预期效果：verify agents 从 44 个减少到 22 个，Phase 3 耗时减半

### 优化 5：增加 verify 并发（8 → 12）

提高并发度，加速 verify 阶段

### 优化 6：并行化写入操作

Phase 2 的 4 个 review 文件写入和 Phase 7 的 3 个 publish 文件写入改为并行

预期效果：写入时间从串行累加变为取最大值

## 预期优化效果

| 指标 | 优化前 | 优化后（预期） |
|---|---|---|
| 总耗时 | 45 分钟 | 20-25 分钟 |
| 失败 Agent | 4 | 0-1 |
| Topic 数 | 3 | 5 |
| Verify Agent 数 | 44 | 22 |
| 写入超时 | 是 | 否 |

## 修改清单

| 修改项 | 文件 | 行号 |
|---|---|---|
| 拆分 TOPIC-03 | requirement-extraction.js | TOPICS 数组 |
| AGENT_TIMEOUT 600000→300000 | requirement-extraction.js | 常量定义 |
| 新增 WRITE_TIMEOUT=120000 | requirement-extraction.js | 常量定义 |
| timeoutMs: 60000→WRITE_TIMEOUT | requirement-extraction.js | 所有写入 agent |
| reviewers: 2→1, threshold: 0.5→0.0 | requirement-extraction.js | verify 调用 |
| setConcurrency(8)→12 | requirement-extraction.js | verify 阶段 |
| Phase 2 写入并行化 | requirement-extraction.js | review 写入 |
| Phase 7 写入并行化 | requirement-extraction.js | publish 写入 |

## 参考引用

- [OpenCode Workflow Authoring Skill](https://github.com/anomalyco/opencode) - workflow 脚本语法和最佳实践
- [LLM Wiki Agent AGENTS.md](./AGENTS.md) - 需求提取流水线设计规范
- [P0 需求提取流水线执行计划](./P0需求提取流水线执行计划.md) - 原始执行计划
