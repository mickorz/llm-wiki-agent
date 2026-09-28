# eval.py --llm 优化分析与子 workflow 改造方案

## 当前流程

### Phase 8 Eval（requirement-extraction.js）

```
Phase 8 Eval
  |
  |  1 个 agent（buildEvalPrompt）
  |  -> 读取 golden/requirements.jsonl
  |  -> 读取 requirements/requirements.jsonl
  |  -> 读取 requirements/review/unsupported.jsonl
  |  -> 统计 candidates 目录
  |  -> LLM 自己做语义匹配（无结构化算法）
  |  -> 计算 Recall/Precision/Unsupported/Traceability
  |  -> 输出 Markdown 报告
  |
  |  1 个 agent（写入报告）
  |  -> 写入 reports/requirement-extraction-report.md
```

### eval.py --llm（独立运行）

```
python scripts/eval.py --llm --save
  |
  |  1. 检查 reports/match_result.json 是否存在
  |     -> 存在：直接读取（由外部 workflow agent 手动写入）
  |     -> 不存在：尝试直接调用 API
  |
  |  2. 直接调用 API（urllib.request）
  |     -> 从 ~/.config/opencode/opencode.json 读取 apiKey + baseURL
  |     -> POST {baseURL}/chat/completions
  |     -> 结果：HTTP 403 Forbidden（网关有额外认证）
  |
  |  3. API 失败 -> 回退到关键词匹配
  |     -> Recall 66%, Precision 33%
```

## 问题清单

| # | 问题 | 根因 | 影响 |
|---|------|------|------|
| 1 | **match_result.json 需手动生成** | Phase 8 Eval 不含 LLM 匹配步骤，需手动运行 `workflow(llm_eval_match_v2)` | 流程割裂，不能一键完成 |
| 2 | **API 直接调用 403** | aimeter.xk-devops.com 网关有额外认证（非标准 Bearer token） | eval.py --llm 无法自动调用 LLM |
| 3 | **opencode CLI 调用不可靠** | subprocess 调用 opencode run 有编码问题 + LLM 不执行指令 | eval.py 通过 subprocess 调用 opencode 失败 |
| 4 | **Phase 8 Eval 的 agent 匹配质量低** | agent 自己做语义匹配，无结构化算法，结果不可靠 | 报告中的 Recall/Precision 不准 |
| 5 | **LLM 匹配 agent 超时风险** | 50 golden x 100 published 全量匹配耗时 ~334s | 需要足够长的 timeout |

## 优化方案对比

### 方案 A：集成到 Phase 8 Eval 中（内联 agent）

```
Phase 8 Eval
  |
  |  agent #1: LLM 语义匹配
  |  -> 读取 golden/requirements.jsonl
  |  -> 读取 requirements/requirements.jsonl
  |  -> 写入 reports/match_result.json
  |  -> 模型：glm-5.2-high，超时：AGENT_TIMEOUT（30min）
  |
  |  agent #2: 运行 eval.py --llm --save
  |  -> bash: python scripts/eval.py --llm --save
  |  -> eval.py 读取 match_result.json 做评测
  |  -> eval.py --save 写入报告
```

| 维度 | 评价 |
|------|------|
| 优点 | 完全自动化，不需要手动操作 |
| 缺点 | LLM 匹配 agent 内联在主 workflow 中，不可复用 |
| 复杂度 | 低（修改 Phase 8 Eval 代码即可） |
| 可靠性 | 中（agent 有完整工具支持，但超时风险） |

### 方案 B：改成子 workflow（推荐）

```
Phase 8 Eval
  |
  |  workflow(llm-match.js)  -- 子 workflow
  |    |  agent #1: LLM 语义匹配
  |    |  -> 读取 golden/requirements.jsonl
  |    |  -> 读取 requirements/requirements.jsonl
  |    |  -> 写入 reports/match_result.json
  |
  |  agent #2: 运行 eval.py --llm --save
  |  -> bash: python scripts/eval.py --llm --save
```

| 维度 | 评价 |
|------|------|
| 优点 | 模块化，LLM 匹配可单独调试和复用；子 workflow 有独立 phase 和日志 |
| 缺点 | 需要额外的脚本文件；workflow 嵌套一层（满足限制） |
| 复杂度 | 中（创建 llm-match.js + 修改 Phase 8 Eval） |
| 可靠性 | 高（子 workflow 可独立测试，不影响主 workflow） |

### 方案 C：解决 API 403 + eval.py 自主调用

```
eval.py --llm
  |
  |  1. 检查 match_result.json（优先读取）
  |  2. 如果不存在，直接调用 API
  |     -> 研究 403 根因，添加正确的 header
  |  3. 如果 API 失败，回退到关键词匹配
```

| 维度 | 评价 |
|------|------|
| 优点 | eval.py 完全自主，不依赖 workflow |
| 缺点 | 需要逆向工程 opencode 的认证方式；API 认证可能变化 |
| 复杂度 | 高（需分析 opencode npm 包源码） |
| 可靠性 | 低（API 认证方式可能随时变化） |

### 方案 D：Phase 8 Eval 双模式（关键词 + LLM）

```
Phase 8 Eval
  |
  |  agent #1: 运行 eval.py --save（关键词匹配）
  |  agent #2: 运行 eval.py --llm --save（LLM 匹配）
  |  -> 但 LLM 匹配仍需 match_result.json
  |  -> 仍需子 workflow 或 agent 生成 match_result.json
```

| 维度 | 评价 |
|------|------|
| 优点 | 同时获得两种匹配结果，可对比 |
| 缺点 | 需要调用 eval.py 两次，增加耗时 |
| 复杂度 | 中 |
| 可靠性 | 中 |

## 推荐方案：B（子 workflow）— 已实施

### 实施状态

- [x] 创建 `.opencode-workflows/workflows/llm-eval.js` 子 workflow
- [x] 修改 `requirement-extraction.js` Phase 8 Eval → 调用子 workflow
- [x] eval.py 保留（可独立运行做关键词匹配对照）

### 架构

```
Phase 8 Eval（requirement-extraction.js）
  |
  +-- workflow(llm-eval.js)  -- 子 workflow
        |
        +-- agent #1: LLM 语义匹配（glm-5.2-high）
        |     读取 golden/requirements.jsonl
        |     读取 requirements/requirements.jsonl
        |     写入 reports/match_result.json
        |
        +-- agent #2: 评测报告生成（glm-5.2-high）
              读取 reports/match_result.json
              读取 golden/requirements.jsonl
              读取 requirements/requirements.jsonl
              读取 requirements/review/unsupported.jsonl
              统计 candidates/*.jsonl
              计算指标（Recall/Precision/Unsupported/Traceability）
              写入 reports/requirement-extraction-report.md
```

### 优点

- 完全自动化，不需要手动操作或外部脚本
- eval.py 不再是必需依赖（保留作为对照工具）
- 子 workflow 可独立调试和复用
- workflow agent 有完整工具支持（Read/Write/Glob/Bash），比 opencode CLI 和直接 API 调用可靠
