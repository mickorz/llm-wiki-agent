export const meta = {
  name: 'llm_eval',
  description: 'LLM 语义匹配 + 评测报告生成（不依赖 eval.py）',
}

const MODEL_STRONG = 'biangfeng-gateway/glm-5.2-high'
const MODEL_FAST = 'biangfeng-gateway/deepseek-v4.1-flash-official'
const AGENT_TIMEOUT = 1800000

// =========================================================================
// 步骤 1：LLM 语义匹配
// =========================================================================
phase('LLM 语义匹配')

const matchPrompt = [
  '你是需求匹配助手。请完成以下任务：',
  '1. 用 Read 工具读取文件 golden/requirements.jsonl（50 条 golden 需求，JSONL 格式，每行一条 JSON）',
  '2. 用 Read 工具读取文件 requirements/requirements.jsonl（published 需求，JSONL 格式）',
  '3. 判断每条 golden 需求是否在 published 中有语义相同或高度相似的条目',
  '   （不要求字面完全相同，但核心规则语义需一致）',
  '4. 用 Write 工具将匹配结果写入文件 reports/match_result.json',
  '   格式为 JSON 数组：[{"golden_id":"GOLDEN-001","published_id":"REQ-GAME-001","score":0.95}]',
  '   如果没有匹配，写入空数组 []。',
  '   每条 golden 最多匹配一条 published，每条 published 最多被一条 golden 匹配（一对一匹配）。',
  '   只写文件，不要在回复中输出解释文字。',
].join('\n')

const matchResult = await agent(matchPrompt, {
  agentType: 'general',
  model: MODEL_STRONG,
  label: 'LLM 语义匹配',
})

log('LLM 语义匹配完成')

// =========================================================================
// 步骤 2：生成评测报告
// =========================================================================
phase('评测报告')

const evalPrompt = [
  '你是 Eval Agent。生成需求提取流水线的评测报告。',
  '',
  '【重要】请使用 Read 工具完成以下操作（每一步都要执行）：',
  '1. 读取文件 reports/match_result.json（LLM 语义匹配结果，JSON 数组）',
  '2. 读取文件 golden/requirements.jsonl（标准答案，每行一条 JSON）',
  '3. 读取文件 requirements/requirements.jsonl（实际产出，每行一条 JSON）',
  '4. 读取文件 requirements/review/unsupported.jsonl（unsupported 记录）',
  '5. 用 Glob 工具搜索 candidates/*.jsonl，逐个读取并统计总行数作为候选总数',
  '',
  '计算指标（使用 match_result.json 中的匹配结果，不要自己做语义匹配）：',
  '- matched_count = match_result.json 数组的长度',
  '- total_golden = golden/requirements.jsonl 的非空行数',
  '- total_published = requirements/requirements.jsonl 的非空行数',
  '- total_unsupported = unsupported.jsonl 的非空行数',
  '- total_candidates = candidates/*.jsonl 的总行数',
  '- Recall = matched_count / total_golden（保留 4 位小数）',
  '- Precision = matched_count / total_published（保留 4 位小数）',
  '- Unsupported Rate = total_unsupported / total_candidates（保留 4 位小数）',
  '- Traceability = 有 sources.raw 字段且非空的 published 需求数 / total_published（保留 4 位小数）',
  '',
  '生成 Markdown 格式的评测报告，用 Write 工具写入文件 reports/requirement-extraction-report.md（UTF-8 编码）。',
  '报告内容如下：',
  '',
  '# 需求提取流水线评测报告',
  '',
  '> 生成时间：2026-09-28（P0 评测 v2）',
  '',
  '## 核心指标',
  '',
  '| 指标 | 值 | 说明 |',
  '|------|-----|------|',
  '| Recall | {Recall 百分比} | 已知需求找出来多少（{matched_count}/{total_golden}） |',
  '| Precision | {Precision 百分比} | 生成的需求有多少是真的（{matched_count}/{total_published}） |',
  '| Unsupported Rate | {Unsupported Rate 百分比} | 幻觉需求比例（{total_unsupported}/{total_candidates}） |',
  '| Traceability | {Traceability 百分比} | 能回溯到 Raw 的需求比例（{traceable_count}/{total_published}） |',
  '',
  '## 数据统计',
  '',
  '- Golden Set 总数：{total_golden}',
  '- 正式需求总数：{total_published}',
  '- 候选需求总数：{total_candidates}',
  '- Unsupported 总数：{total_unsupported}',
  '- 有 Raw 证据的需求数：{traceable_count}',
  '- 语义匹配命中数：{matched_count}',
  '',
  '## 匹配详情（前20条）',
  '',
  '遍历 match_result.json，对每条匹配记录：',
  '- 从 golden 中找到对应 golden_id 的 title',
  '- 从 published 中找到对应 published_id 的 title',
  '- 输出表格行：| {golden_id} | {golden_title} | {published_id} | {published_title} | {score} | llm_semantic |',
  '',
  '## Recall 缺失（Golden 中有但产出中没有）',
  '',
  '找出 match_result.json 中没有匹配到的 golden 需求，输出表格：',
  '| ID | 标题 | 需求描述 |',
  '',
  '## Precision 多余（产出中有但 Golden 中没有）',
  '',
  '找出 match_result.json 中没有被匹配到的 published 需求，输出表格：',
  '| ID | 标题 | 需求描述 |',
  '',
  '## 说明',
  '',
  '- 匹配算法：LLM 语义匹配（glm-5.2-high）',
  '- Unsupported Rate 和 Traceability 为确定性计算，不依赖匹配算法',
  '',
  '只写文件，不要在回复中输出报告内容。',
].join('\n')

const evalResult = await agent(evalPrompt, {
  agentType: 'general',
  model: MODEL_STRONG,
  timeoutMs: AGENT_TIMEOUT,
  label: '生成评测报告',
})

log('评测报告生成完成')

return { status: 'done' }
