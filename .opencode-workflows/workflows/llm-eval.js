export const meta = {
  name: 'llm_eval',
  description: 'LLM 语义匹配（分批+两轮）+ 评测报告（不依赖 eval.py）',
}

const MODEL_STRONG = 'biangfeng-gateway/glm-5.2-high'
const MODEL_FAST = 'biangfeng-gateway/deepseek-v4.1-flash-official'
const AGENT_TIMEOUT = 1800000

// 10 批 golden ID 范围（96 条 golden）
var BATCHES = [
  { ids: ['GOLDEN-001','GOLDEN-002','GOLDEN-003','GOLDEN-004','GOLDEN-005','GOLDEN-006','GOLDEN-007','GOLDEN-008','GOLDEN-009','GOLDEN-010'], file: '1_10', label: '001-010' },
  { ids: ['GOLDEN-011','GOLDEN-012','GOLDEN-013','GOLDEN-014','GOLDEN-015','GOLDEN-016','GOLDEN-017','GOLDEN-018','GOLDEN-019','GOLDEN-020'], file: '11_20', label: '011-020' },
  { ids: ['GOLDEN-021','GOLDEN-022','GOLDEN-023','GOLDEN-024','GOLDEN-025','GOLDEN-026','GOLDEN-027','GOLDEN-028','GOLDEN-029','GOLDEN-030'], file: '21_30', label: '021-030' },
  { ids: ['GOLDEN-031','GOLDEN-032','GOLDEN-033','GOLDEN-034','GOLDEN-035','GOLDEN-036','GOLDEN-037','GOLDEN-038','GOLDEN-039','GOLDEN-040'], file: '31_40', label: '031-040' },
  { ids: ['GOLDEN-041','GOLDEN-042','GOLDEN-043','GOLDEN-044','GOLDEN-045','GOLDEN-046','GOLDEN-047','GOLDEN-048','GOLDEN-049','GOLDEN-050'], file: '41_50', label: '041-050' },
  { ids: ['GOLDEN-051','GOLDEN-052','GOLDEN-053','GOLDEN-054','GOLDEN-055','GOLDEN-056','GOLDEN-057','GOLDEN-058','GOLDEN-059','GOLDEN-060'], file: '51_60', label: '051-060' },
  { ids: ['GOLDEN-061','GOLDEN-062','GOLDEN-063','GOLDEN-064','GOLDEN-065','GOLDEN-066','GOLDEN-067','GOLDEN-068','GOLDEN-069','GOLDEN-070'], file: '61_70', label: '061-070' },
  { ids: ['GOLDEN-071','GOLDEN-072','GOLDEN-073','GOLDEN-074','GOLDEN-075','GOLDEN-076','GOLDEN-077','GOLDEN-078','GOLDEN-079','GOLDEN-080'], file: '71_80', label: '071-080' },
  { ids: ['GOLDEN-081','GOLDEN-082','GOLDEN-083','GOLDEN-084','GOLDEN-085','GOLDEN-086','GOLDEN-087','GOLDEN-088','GOLDEN-089','GOLDEN-090'], file: '81_90', label: '081-090' },
  { ids: ['GOLDEN-091','GOLDEN-092','GOLDEN-093','GOLDEN-094','GOLDEN-095','GOLDEN-096'], file: '91_96', label: '091-096' },
]

// =========================================================================
// 第一轮：分批匹配（5 个 agent 并行）
// =========================================================================
phase('第一轮分批匹配')

log('开始第一轮：5 批 golden 各 10 条，并行匹配')

function buildBatchPrompt(batch) {
  return [
    '你是需求匹配助手。请严格按照以下步骤执行，不要遗漏任何匹配：',
    '',
    '1. 用 Read 工具读取文件 golden/requirements.jsonl（50 条 golden 需求，每行一条 JSON）',
    '2. 用 Read 工具读取文件 requirements/requirements.jsonl（published 需求，每行一条 JSON）',
    '3. 你只负责匹配以下 ' + batch.ids.length + ' 条 golden 需求：',
    '   ' + batch.ids.join(', '),
    '',
    '4. 逐条判断每条 golden 需求是否在 published 中有语义相同或高度相似的条目',
    '   匹配标准（从严到宽）：',
    '   a) 语义完全一致：golden 和 published 描述的是同一条规则（标题/措辞不同没关系）',
    '   b) 语义包含：golden 描述的规则被 published 中某条完整包含（如 published 是更详细版本）',
    '   c) 语义交叉：golden 和 published 描述的规则有核心交集',
    '   只要满足以上任一条，就应判定为匹配',
    '',
    '5. 用 Write 工具将匹配结果写入文件 reports/match_batch_' + batch.file + '.json',
    '   格式为 JSON 数组：[{"golden_id":"GOLDEN-001","published_id":"REQ-GAME-001","score":0.95}]',
    '   score 为匹配置信度（0.5-1.0），完全一致 0.95+，包含 0.85+，交叉 0.7+',
    '   如果没有匹配，写入空数组 []',
    '   每条 golden 最多匹配一条 published，每条 published 最多被一条 golden 匹配',
    '',
    '【重要】请务必逐条仔细判断，不要遗漏任何可能的匹配。',
    '只写文件，不要在回复中输出解释文字。',
  ].join('\n')
}

var batchTasks = BATCHES.map(function(batch) {
  return function() {
    return agent(buildBatchPrompt(batch), {
      agentType: 'general',
      model: MODEL_STRONG,
      label: '匹配 ' + batch.label,
    })
  }
})

var batchResults = await parallel(batchTasks)

log('第一轮分批匹配完成')

// =========================================================================
// 第二轮：合并 + 放宽匹配
// =========================================================================
phase('第二轮放宽匹配')

log('开始第二轮：合并批次结果 + 对未匹配 golden 放宽标准重匹配')

var mergePrompt = [
  '你是需求匹配合并助手。请严格按照以下步骤执行：',
  '',
  '步骤 1：读取并合并第一轮结果',
  '用 Read 工具读取以下 5 个批次文件：',
  '  reports/match_batch_1_10.json',
  '  reports/match_batch_11_20.json',
  '  reports/match_batch_21_30.json',
  '  reports/match_batch_31_40.json',
  '  reports/match_batch_41_50.json',
  '合并所有匹配结果，去重（同一 golden_id 只保留 score 最高的）',
  '',
  '步骤 2：找出未匹配的 golden',
  '用 Read 工具读取 golden/requirements.jsonl',
  '从合并结果中找出已匹配的 golden_id 列表',
  '剩余的 golden 即为未匹配项',
  '',
  '步骤 3：对未匹配 golden 放宽标准重匹配',
  '用 Read 工具读取 requirements/requirements.jsonl',
  '对每条未匹配的 golden，放宽匹配标准重新判断：',
  '  - 即使 published 中只是包含了 golden 的部分规则也算匹配',
  '  - golden 的规则可能在 published 中被拆分成多条，选择最相关的一条匹配',
  '  - 标题完全不同但描述的规则有交集也算匹配',
  '',
  '步骤 4：写入最终结果',
  '将第一轮 + 第二轮的全部匹配结果合并写入文件 reports/match_result.json',
  '格式为 JSON 数组：[{"golden_id":"GOLDEN-001","published_id":"REQ-GAME-001","score":0.95}]',
  '只写文件，不要输出解释文字。',
].join('\n')

var mergeResult = await agent(mergePrompt, {
  agentType: 'general',
  model: MODEL_STRONG,
  label: '合并+第二轮',
})

log('合并+第二轮匹配完成')

// =========================================================================
// 第三步：生成评测报告
// =========================================================================
phase('评测报告')

log('开始生成评测报告')

var evalPrompt = [
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
  '- Recall = matched_count / total_golden（百分比，保留 1 位小数）',
  '- Precision = matched_count / total_published（百分比，保留 1 位小数）',
  '- Unsupported Rate = total_unsupported / total_candidates（百分比，保留 1 位小数）',
  '- Traceability = 有 sources.raw 字段且非空的 published 需求数 / total_published（百分比，保留 1 位小数）',
  '',
  '用 Write 工具将报告写入文件 reports/requirement-extraction-report.md（UTF-8 编码）。',
  '报告格式为 Markdown：',
  '',
  '# 需求提取流水线评测报告',
  '',
  '## 核心指标',
  '| 指标 | 值 | 说明 |',
  '|------|-----|------|',
  '| Recall | {百分比} | 已知需求找出来多少（{matched}/{total}） |',
  '| Precision | {百分比} | 生成的需求有多少是真的（{matched}/{total}） |',
  '| Unsupported Rate | {百分比} | 幻觉需求比例（{unsup}/{total}） |',
  '| Traceability | {百分比} | 能回溯到 Raw 的需求比例（{traceable}/{total}） |',
  '',
  '## 数据统计',
  '（列出所有数值）',
  '',
  '## 匹配详情（前20条）',
  '（表格：Golden ID | Golden 标题 | Published ID | Published 标题 | Score | 策略）',
  '',
  '## Recall 缺失',
  '（表格：未匹配的 Golden 需求列表）',
  '',
  '## Precision 多余',
  '（表格：未被匹配的 Published 需求列表）',
  '',
  '## 说明',
  '- 匹配算法：LLM 语义匹配（glm-5.2-high，分批+两轮）',
  '- Unsupported Rate 和 Traceability 为确定性计算',
  '',
  '只写文件，不要在回复中输出报告内容。',
].join('\n')

var evalResult = await agent(evalPrompt, {
  agentType: 'general',
  model: MODEL_FAST,
  timeoutMs: AGENT_TIMEOUT,
  label: '生成评测报告',
})

log('评测报告生成完成')

return { status: 'done' }
