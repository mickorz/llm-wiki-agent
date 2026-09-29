export const meta = {
  name: 'requirement_extraction',
  description: 'P0 需求提取流水线：Wiki 到候选到验证到原子化到去重到审核到发布到评测',
  phases: [
    { title: 'Phase 0 Prepare' },
    { title: 'Phase 1 Discovery' },
    { title: 'Phase 2 Validation' },
    { title: 'Phase 3 Verify' },
    { title: 'Phase 4 Normalize' },
    { title: 'Phase 5 Dedup' },
    { title: 'Phase 6 Checkpoint' },
    { title: 'Phase 7 Publish' },
    { title: 'Phase 8 Eval' },
  ],
}

// ===== 全量文档（所有 topic 共享，确保交叉验证） =====
var ALL_RAW = [
  'raw/mahjong/01-基础规则.md',
  'raw/mahjong/02-游戏流程.md',
  'raw/mahjong/03-打牌操作.md',
  'raw/mahjong/04-番型.md',
  'raw/mahjong/05-胡牌类型.md',
  'raw/mahjong/06-结算.md',
  'raw/mahjong/07-配置.md',
  'raw/mahjong/08-UI交互.md',
]
var ALL_CONCEPTS = [
  'wiki/concepts/刮风下雨.md',
  'wiki/concepts/呼叫转移与擦挂.md',
  'wiki/concepts/流局处理.md',
  'wiki/concepts/胡牌判定.md',
  'wiki/concepts/番型体系.md',
  'wiki/concepts/结算公式.md',
  'wiki/concepts/结算流水线.md',
  'wiki/concepts/行牌操作.md',
  'wiki/concepts/创房配置.md',
  'wiki/concepts/缺门.md',
  'wiki/concepts/过手规则.md',
  'wiki/concepts/掷骰双分流.md',
  'wiki/concepts/换三张.md',
  'wiki/concepts/将牌与根.md',
]
var ALL_SYNTHESES = [
  'wiki/syntheses/自摸涉及的规则番型结算配置UI.md',
  'wiki/syntheses/一局血战麻将从开始到结束的完整流程是什么.md',
]

// ===== P0 固定的 7 个 topic（全量文档交叉验证） =====
const TOPICS = [
  {
    id: 'TOPIC-01',
    name: 'gang-feng-xia-yu',
    displayName: '刮风下雨',
    concepts: ALL_CONCEPTS,
    syntheses: ALL_SYNTHESES,
    rawSources: ALL_RAW,
  },
  {
    id: 'TOPIC-02',
    name: 'hu-jiao-zhuanyi-yu-ca-gua',
    displayName: '呼叫转移与擦挂',
    concepts: ALL_CONCEPTS,
    syntheses: ALL_SYNTHESES,
    rawSources: ALL_RAW,
  },
  {
    id: 'TOPIC-03',
    name: 'liu-ju-chuli',
    displayName: '流局处理',
    concepts: ALL_CONCEPTS,
    syntheses: ALL_SYNTHESES,
    rawSources: ALL_RAW,
  },
  {
    id: 'TOPIC-04',
    name: 'hu-pai-panding-yu-fan-xing',
    displayName: '胡牌判定与番型体系',
    concepts: ALL_CONCEPTS,
    syntheses: ALL_SYNTHESES,
    rawSources: ALL_RAW,
    discoveryHints: [
      '【番型体系专项指令】',
      '1. 逐条提取 F01-F11 每个番型的结构定义和倍数，每个 F0X 编号必须为独立条目',
      '2. 提取基础番型互斥规则（F01-F11 互斥取最高，不叠加）',
      '3. 提取可叠加番型规则（清一色 x4 可与基础番型叠加、门清可与七对系叠加）',
      '4. 提取根数计算规则（自带根、多余根、每根 x2 作为加倍项）',
      '5. 提取叠加番型名规则（清碰清龙等 9 个名称仅显示不产生倍数）',
      '6. 提取天胡地胡规则（32 倍独立不叠加）',
      '7. 提取 13 种加倍项列表及其叠加关系',
    ],
  },
  {
    id: 'TOPIC-05',
    name: 'jie-suan-gongshi-yu-liushuixian',
    displayName: '结算公式与流水线',
    concepts: ALL_CONCEPTS,
    syntheses: ALL_SYNTHESES,
    rawSources: ALL_RAW,
  },
  {
    id: 'TOPIC-06',
    name: 'xing-pai-caozuo',
    displayName: '行牌操作',
    concepts: ALL_CONCEPTS,
    syntheses: ALL_SYNTHESES,
    rawSources: ALL_RAW,
  },
  {
    id: 'TOPIC-07',
    name: 'chuang-fang-peizhi',
    displayName: '创房配置',
    concepts: ALL_CONCEPTS,
    syntheses: ALL_SYNTHESES,
    rawSources: ALL_RAW,
  },
]

// Raw 文件大小映射（KB），用于 Verify 动态分批
const RAW_FILE_SIZE_KB = {
  'raw/mahjong/01-基础规则.md': 11.4,
  'raw/mahjong/02-游戏流程.md': 18.1,
  'raw/mahjong/03-打牌操作.md': 13.1,
  'raw/mahjong/04-番型.md': 46.9,
  'raw/mahjong/05-胡牌类型.md': 25.4,
  'raw/mahjong/06-结算.md': 30.2,
  'raw/mahjong/07-配置.md': 59.7,
  'raw/mahjong/08-UI交互.md': 11.5,
}

// Agent 超时：30 分钟
const AGENT_TIMEOUT = 1800000

// 写入 agent 超时：3 分钟
const WRITE_TIMEOUT = 180000

// 模型配置：Discovery 用强模型，其余用快速模型
const MODEL_STRONG = 'biangfeng-gateway/glm-5.2-high'
const MODEL_FAST = 'biangfeng-gateway/deepseek-v4.1-flash-official'

// =========================================================================
// Phase 0：Prepare
// =========================================================================
phase('Phase 0 Prepare')

const allPaths = []
for (const topic of TOPICS) {
  allPaths.push(...topic.concepts, ...topic.rawSources)
  if (topic.syntheses) allPaths.push(...topic.syntheses)
}
log(`Phase 0 完成：workset 包含 ${allPaths.length} 个文件路径、${TOPICS.length} 个 topic`)
log('文件清单：' + allPaths.join(', '))

// =========================================================================
// Phase 1：Requirement Discovery
// =========================================================================
phase('Phase 1 Discovery')

log('开始 Phase 1：并行发现候选需求，每 topic 一个 agent')

const discoveryResults = await parallel(
  TOPICS.map(topic => () => agent(
    buildDiscoveryPrompt(topic),
    {
      label: `Discovery: ${topic.displayName}`,
      agentType: 'general', model: MODEL_STRONG,
      timeoutMs: AGENT_TIMEOUT,
    }
  ))
)

// 解析每个 topic 的候选需求并写入 JSONL 文件
const candidateCounts = []
const allCandidates = []

for (let i = 0; i < TOPICS.length; i++) {
  const topic = TOPICS[i]
  const raw = discoveryResults[i]

  if (!raw) {
    log(`警告：topic ${topic.displayName} 的 Discovery 返回为空`)
    candidateCounts.push(0)
    continue
  }

  // 从 agent 返回的文本中解析 JSON
  const candidates = parseJSONFromText(raw, topic)

  if (candidates.length === 0) {
    log(`警告：topic ${topic.displayName} 没有解析到候选需求`)
    candidateCounts.push(0)
    continue
  }

  // 写入 JSONL 文件
  const jsonlContent = candidates.map(c => JSON.stringify(c)).join('\n')
  await agent(
    `将以下内容写入文件 requirements/candidates/${topic.name}.jsonl（覆盖写入，UTF-8 编码）：\n\n${jsonlContent}`,
    { label: `写入 candidates/${topic.name}`, agentType: 'general', model: MODEL_FAST, timeoutMs: WRITE_TIMEOUT }
  )

  candidateCounts.push(candidates.length)
  allCandidates.push(...candidates)
  log(`topic ${topic.displayName}：发现 ${candidates.length} 条候选需求`)
}

const totalCandidates = candidateCounts.reduce((a, b) => a + b, 0)
log(`Phase 1 完成：共发现 ${totalCandidates} 条候选需求`)

// =========================================================================
// Phase 2：Evidence Validation
// =========================================================================
phase('Phase 2 Validation')

log('开始 Phase 2：并行回 raw 原始文档验证证据，每 topic 一个 agent')

const validationResults = await parallel(
  TOPICS.map((topic, i) => () => agent(
    buildValidationPrompt(topic, candidateCounts[i]),
    {
      label: `Validation: ${topic.displayName}`,
      agentType: 'general', model: MODEL_FAST,
      timeoutMs: AGENT_TIMEOUT,
    }
  ))
)

// 解析验证结果并按证据等级分流
const buckets = { explicit: [], derived: [], unsupported: [], conflict: [] }

for (let i = 0; i < TOPICS.length; i++) {
  const topic = TOPICS[i]
  const raw = validationResults[i]
  if (!raw) {
    log(`警告：topic ${topic.displayName} 的 Validation 返回为空`)
    continue
  }

  const validations = parseValidationFromText(raw)

  // 合并候选需求与验证结果
  const topicCandidates = allCandidates.filter(c => c.topic === topic.displayName)

  for (const val of validations) {
    const cand = topicCandidates.find(c => c.temp_id === val.temp_id)
    if (!cand) {
      log(`警告：验证结果 ${val.temp_id} 在候选需求中找不到`)
      continue
    }

    const merged = {
      ...cand,
      evidence_level: val.evidence_level,
      raw_sources: val.raw_sources || [],
      evidence_summary: val.evidence_summary || '',
      confidence: val.confidence || 0,
    }

    if (buckets[val.evidence_level]) {
      buckets[val.evidence_level].push(merged)
    }
  }
}

// 并行写入各等级的 review 文件
const reviewWriteTasks = []
for (const [level, items] of Object.entries(buckets)) {
  if (items.length === 0) {
    log(`证据等级 ${level}：0 条`)
    continue
  }

  const jsonlContent = items.map(c => JSON.stringify(c)).join('\n')
  reviewWriteTasks.push(() => agent(
    `将以下内容写入文件 requirements/review/${level}.jsonl（覆盖写入，UTF-8 编码）：\n\n${jsonlContent}`,
    { label: `写入 review/${level}`, agentType: 'general', model: MODEL_FAST, timeoutMs: WRITE_TIMEOUT }
  ))
  log(`证据等级 ${level}：${items.length} 条`)
}

if (reviewWriteTasks.length > 0) {
  await parallel(reviewWriteTasks)
}

const explicitCount = buckets.explicit.length
const derivedCount = buckets.derived.length
const unsupportedCount = buckets.unsupported.length
const conflictCount = buckets.conflict.length
const totalValidated = explicitCount + derivedCount + unsupportedCount + conflictCount

log(`Phase 2 完成：共验证 ${totalValidated} 条` +
  `（explicit ${explicitCount} / derived ${derivedCount}` +
  ` / unsupported ${unsupportedCount} / conflict ${conflictCount}）`)

// =========================================================================
// Phase 3：Semantic Verify
// =========================================================================
phase('Phase 3 Verify')

log('开始 Phase 3：对 explicit 和 derived 的候选需求做语义级 verify')

const toVerify = [...buckets.explicit, ...buckets.derived]

if (toVerify.length === 0) {
  log('Phase 3 跳过：没有需要语义验证的候选需求')
}
var verifiedCandidates = toVerify
if (toVerify.length > 0) {
  setConcurrency(12)

  // 按 topic 分组候选需求
  const topicGroups = {}
  for (const cand of toVerify) {
    const topic = cand.topic
    if (!topicGroups[topic]) topicGroups[topic] = []
    topicGroups[topic].push(cand)
  }

  // 根据 raw 文件大小动态分批，构建 verify 任务
  const verifyTasks = []
  for (const [topicName, candidates] of Object.entries(topicGroups)) {
    const topic = TOPICS.find(t => t.displayName === topicName)
    if (!topic) continue

    // 估算 raw 文件总大小
    const rawSizeKB = topic.rawSources.reduce((sum, f) => sum + (RAW_FILE_SIZE_KB[f] || 10), 0)

    // 动态分批：大文件少分批，小文件多分批
    let batchSize = 25
    if (rawSizeKB > 50) batchSize = 10
    else if (rawSizeKB > 30) batchSize = 15

    // 分批创建 verify 任务
    const numBatches = Math.ceil(candidates.length / batchSize)
    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const labelSuffix = numBatches > 1 ? ' ' + batchNum : ''
      verifyTasks.push(() => agent(
        buildVerifyPrompt(topic, batch),
        { label: `Verify: ${topicName}${labelSuffix}`, agentType: 'general', model: MODEL_FAST, timeoutMs: AGENT_TIMEOUT }
      ))
    }
  }

  log(`Phase 3：${verifyTasks.length} 个批量 verify agent（vs 逐条 ${toVerify.length} 个）`)

  const verifyResults = await parallel(verifyTasks)

  // 解析批量 verify 结果
  let passed = 0
  let rejected = 0
  verifiedCandidates = []

  for (const result of verifyResults) {
    const parsed = parseJSONFromText(result || '', TOPICS[0])
    for (const item of parsed) {
      const cand = toVerify.find(c => c.temp_id === item.temp_id)
      if (!cand) continue
      if (item.pass !== false) {
        passed++
        verifiedCandidates.push(cand)
      } else {
        rejected++
        cand.verify_rejected = true
      }
    }
  }

  log(`Phase 3 完成：verify 通过 ${passed} 条，拒绝 ${rejected} 条`)

  if (rejected > 0) {
    const rejectedItems = toVerify.filter(c => c.verify_rejected)
    buckets.unsupported.push(...rejectedItems)
  }
}

// =========================================================================
// Phase 4：Atomicity Normalize
// =========================================================================
phase('Phase 4 Normalize')

log('开始 Phase 4：原子化拆分 + 标准化 + 统一分类')

const normalizeInput = JSON.stringify(verifiedCandidates, null, 2)

const normalizeResult = await agent(
  buildNormalizePrompt(normalizeInput, verifiedCandidates.length),
  { label: 'Normalize', agentType: 'general', model: MODEL_FAST, timeoutMs: AGENT_TIMEOUT }
)

const normalizedItems = parseJSONFromText(normalizeResult || '', TOPICS[0])

if (normalizedItems.length > 0) {
  const jsonlContent = normalizedItems.map(c => JSON.stringify(c)).join('\n')
  await agent(
    `将以下内容写入文件 requirements/normalized/normalized.jsonl（覆盖写入，UTF-8 编码）：\n\n${jsonlContent}`,
    { label: '写入 normalized', agentType: 'general', model: MODEL_FAST, timeoutMs: WRITE_TIMEOUT }
  )
  log(`Phase 4 完成：原子化后 ${normalizedItems.length} 条`)
} else {
  log('Phase 4 警告：没有解析到原子化结果')
}

// =========================================================================
// Phase 5：Semantic Dedup
// =========================================================================
phase('Phase 5 Dedup')

log('开始 Phase 5：语义去重合并，保留所有来源')

const dedupResult = await agent(
  buildDedupPrompt(),
  { label: 'Dedup', agentType: 'general', model: MODEL_FAST, timeoutMs: AGENT_TIMEOUT }
)

var dedupedItems = parseJSONFromText(dedupResult || '', TOPICS[0])

if (dedupedItems.length > 0) {
  const jsonlContent = dedupedItems.map(c => JSON.stringify(c)).join('\n')
  await agent(
    `将以下内容写入文件 requirements/deduped/deduped.jsonl（覆盖写入，UTF-8 编码）：\n\n${jsonlContent}`,
    { label: '写入 deduped', agentType: 'general', model: MODEL_FAST, timeoutMs: WRITE_TIMEOUT }
  )
  log(`Phase 5 完成：去重后 ${dedupedItems.length} 条`)
} else {
  log('Phase 5 警告：Dedup agent 超时或未解析到结果，使用 normalized 作为 fallback')
  dedupedItems = normalizedItems
  const jsonlContent = dedupedItems.map(c => JSON.stringify(c)).join('\n')
  await agent(
    `将以下内容写入文件 requirements/deduped/deduped.jsonl（覆盖写入，UTF-8 编码）：\n\n${jsonlContent}`,
    { label: '写入 deduped fallback', agentType: 'general', model: MODEL_FAST, timeoutMs: WRITE_TIMEOUT }
  )
  log(`Phase 5 完成：fallback 到 normalized ${dedupedItems.length} 条`)
}

// =========================================================================
// Phase 6：Checkpoint 人工审核
// =========================================================================
phase('Phase 6 Checkpoint')

log('开始 Phase 6：人工审核 Checkpoint')

const checkpointSummary =
  `需求提取结果摘要\n` +
  `========================================\n` +
  `候选需求: ${totalCandidates} 条\n` +
  `  explicit:  ${explicitCount} 条\n` +
  `  derived:   ${derivedCount} 条\n` +
  `  conflict:  ${conflictCount} 条\n` +
  `  unsupported: ${unsupportedCount} 条\n` +
  `verify 通过: ${verifiedCandidates.length} 条\n` +
  `原子化后: ${normalizedItems.length} 条\n` +
  `去重后: ${dedupedItems.length} 条\n` +
  `========================================\n` +
  `请审核 requirements/deduped/deduped.jsonl 中的需求，` +
  `确认后将继续分配永久 ID 并发布。`

try {
  await checkpoint(checkpointSummary)
  log('Phase 6 完成：人工审核通过')
} catch {
  log('Phase 6：人工审核被拒绝，流程终止')
  return { status: 'rejected', summary: checkpointSummary }
}

// =========================================================================
// Phase 7：Publish
// =========================================================================
phase('Phase 7 Publish')

log('开始 Phase 7：分配永久 ID 并发布')

const publishInput = JSON.stringify(dedupedItems, null, 2)

const publishResult = await agent(
  buildPublishPrompt(publishInput, dedupedItems.length),
  { label: 'Publish', agentType: 'general', model: MODEL_FAST, timeoutMs: AGENT_TIMEOUT }
)

const publishedItems = parseJSONFromText(publishResult || '', TOPICS[0])
// 从 publish 结果中提取 index_md 和 traceability
var indexMd = ''
var traceability = {}
if (publishResult) {
  const idx = publishResult.indexOf('---INDEX_MD_START---')
  if (idx >= 0) {
    const endIdx = publishResult.indexOf('---INDEX_MD_END---', idx)
    if (endIdx > idx) {
      indexMd = publishResult.substring(idx + 21, endIdx).trim()
    }
  }
  const traceIdx = publishResult.indexOf('---TRACEABILITY_START---')
  if (traceIdx >= 0) {
    const traceEnd = publishResult.indexOf('---TRACEABILITY_END---', traceIdx)
    if (traceEnd > traceIdx) {
      const traceText = publishResult.substring(traceIdx + 25, traceEnd).trim()
      try { traceability = JSON.parse(traceText) } catch (e) { log('traceability 解析失败') }
    }
  }
}

if (publishedItems.length > 0) {
  const jsonlContent = publishedItems.map(c => JSON.stringify(c)).join('\n')
  const publishWriteTasks = [
    () => agent(
      `将以下内容写入文件 requirements/requirements.jsonl（覆盖写入，UTF-8 编码）：\n\n${jsonlContent}`,
      { label: '写入 requirements.jsonl', agentType: 'general', model: MODEL_FAST, timeoutMs: WRITE_TIMEOUT }
    )
  ]

  if (indexMd) {
    publishWriteTasks.push(() => agent(
      `将以下内容写入文件 requirements/index.md（覆盖写入，UTF-8 编码）：\n\n${indexMd}`,
      { label: '写入 index.md', agentType: 'general', model: MODEL_FAST, timeoutMs: WRITE_TIMEOUT }
    ))
  }

  if (Object.keys(traceability).length > 0) {
    publishWriteTasks.push(() => agent(
      `将以下 JSON 写入文件 requirements/traceability.json（覆盖写入，UTF-8 编码，格式化输出）：\n\n${JSON.stringify(traceability, null, 2)}`,
      { label: '写入 traceability.json', agentType: 'general', model: MODEL_FAST, timeoutMs: WRITE_TIMEOUT }
    ))
  }

  await parallel(publishWriteTasks)
  log(`Phase 7 完成：发布 ${publishedItems.length} 条正式需求`)
} else {
  log('Phase 7 警告：没有解析到发布结果')
}

// =========================================================================
// Phase 8：Eval（调用子 workflow 做 LLM 语义匹配 + 评测报告）
// =========================================================================
phase('Phase 8 Eval')

log('开始 Phase 8：LLM 语义匹配 + 评测报告（子 workflow）')

await workflow({
  scriptPath: '.opencode-workflows/workflows/llm-eval.js',
  label: 'LLM 评测',
})

log('Phase 8 完成：评测报告已生成')

// =========================================================================
// 返回最终摘要
// =========================================================================
return {
  status: 'completed',
  topics: TOPICS.map(t => t.displayName),
  total_candidates: totalCandidates,
  evidence_breakdown: {
    explicit: explicitCount,
    derived: derivedCount,
    unsupported: unsupportedCount,
    conflict: conflictCount,
  },
  normalized_count: normalizedItems.length,
  deduped_count: dedupedItems.length,
  published_count: publishedItems.length,
}

// =========================================================================
// 工具函数：从 agent 返回的文本中解析 JSON 数组
// =========================================================================
function parseJSONFromText(text, topic) {
  if (!text) return []

  // 先截取 ---INDEX_MD_START--- 等标记之前的内容（避免标记干扰 JSON 解析）
  var jsonStr = text
  var markerIdx = text.indexOf('---INDEX_MD_START---')
  if (markerIdx < 0) markerIdx = text.indexOf('---TRACEABILITY_START---')
  if (markerIdx < 0) markerIdx = text.indexOf('---REPORT_START---')
  if (markerIdx > 0) {
    jsonStr = text.substring(0, markerIdx)
  }

  // 尝试从 markdown 代码块中提取 JSON
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n([\s\S]*?)\n```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1]
  }

  // 尝试找到 JSON 数组的起始和结束
  const arrStart = jsonStr.indexOf('[')
  const arrEnd = jsonStr.lastIndexOf(']')
  if (arrStart >= 0 && arrEnd > arrStart) {
    jsonStr = jsonStr.substring(arrStart, arrEnd + 1)
  }

  try {
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed)) {
      return parsed
    }
    if (parsed && parsed.candidates && Array.isArray(parsed.candidates)) {
      return parsed.candidates
    }
    if (parsed && parsed.deduped && Array.isArray(parsed.deduped)) {
      return parsed.deduped
    }
    if (parsed && parsed.published && Array.isArray(parsed.published)) {
      return parsed.published
    }
    if (parsed && parsed.normalized && Array.isArray(parsed.normalized)) {
      return parsed.normalized
    }
    // 单个对象，包装为数组
    return [parsed]
  } catch (e) {
    log('JSON 解析失败，尝试逐行解析 JSONL')
    // 尝试逐行解析 JSONL
    const lines = text.split('\n').filter(l => l.trim().startsWith('{'))
    const results = []
    for (const line of lines) {
      try {
        results.push(JSON.parse(line.trim()))
      } catch (e2) {
        // 跳过无法解析的行
      }
    }
    return results
  }
}

function parseValidationFromText(text) {
  if (!text) return []

  var jsonStr = text
  const codeBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1]
  }

  const arrStart = jsonStr.indexOf('[')
  const arrEnd = jsonStr.lastIndexOf(']')
  if (arrStart >= 0 && arrEnd > arrStart) {
    jsonStr = jsonStr.substring(arrStart, arrEnd + 1)
  }

  try {
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed)) return parsed
    if (parsed && parsed.validated && Array.isArray(parsed.validated)) return parsed.validated
    return [parsed]
  } catch (e) {
    log('Validation JSON 解析失败，尝试逐行解析')
    const lines = text.split('\n').filter(l => l.trim().startsWith('{'))
    const results = []
    for (const line of lines) {
      try { results.push(JSON.parse(line.trim())) } catch (e2) {}
    }
    return results
  }
}

// =========================================================================
// Prompt 构建函数
// =========================================================================

function buildDiscoveryPrompt(topic) {
  return [
    '你是 Requirement Discovery Agent。你的任务是从 Wiki 知识中发现候选需求。',
    '',
    `当前 Topic：${topic.displayName}（${topic.id}）`,
    '',
    '【重要】请使用 Read 工具读取以下 Wiki 页面文件：',
    ...topic.concepts.map(c => `  - ${c}`),
    ...(topic.syntheses || []).map(s => `  - ${s}`),
    '',
    '读取完后，分析内容，从中提取候选需求。',
    '',
    '以下 raw 原始文档路径仅供标注来源参考：',
    ...topic.rawSources.map(r => `  - ${r}`),
    '',
    '【禁止】不要使用 Read 工具读取上述 raw 原始文档。只需将路径填入 raw_source_hints 字段。',
    '',
    '任务规则：',
    '1. 阅读 Wiki concept 和 synthesis 页面，找出所有候选需求',
    '2. 每条需求必须原子化（一条一个行为，不要把多个行为合并为一条）',
    '3. 不做代码设计，不补充 Wiki 中不存在的规则',
    '4. 每条需求必须保存 wiki_sources（wiki 页面路径数组）',
    '5. 在 raw_source_hints 中标注可能的 raw 原始文档路径',
    '6. category 从以下中选择：gameplay / settlement / config / ui',
    `7. temp_id 格式为 CAND-XX-XXX（XX 为 topic 序号 ${topic.id.replace("TOPIC-", "")}，XXX 为从 001 开始的序号）`,
    '8. 最多提取 35 条候选需求，优先提取核心规则',
    '',
    ...(topic.discoveryHints || []),
    '',
    '输出要求：',
    '返回一个 JSON 数组，不要包含任何解释文字，只返回纯 JSON。',
    '数组中每条记录格式：',
    '{"temp_id":"CAND-01-001","topic":"' + topic.displayName + '","category":"settlement","title":"简短标题","requirement":"详细需求描述","wiki_sources":["wiki/concepts/xxx.md"],"raw_source_hints":["raw/mahjong/xxx.md"]}',
    '',
    '请确保输出的 JSON 格式正确，可以被 JSON.parse 解析。',
  ].join('\n')
}

function buildValidationPrompt(topic, expectedCount) {
  return [
    '你是 Evidence Validation Agent。你的任务是回到 raw 原始文档验证候选需求的证据。',
    '',
    `当前 Topic：${topic.displayName}（${topic.id}）`,
    `预期候选需求数量：约 ${expectedCount} 条`,
    '',
    '【重要】请使用 Read 工具完成以下操作：',
    `1. 读取文件 requirements/candidates/${topic.name}.jsonl`,
    '2. 对每条候选需求，使用 Read 工具读取以下 raw 原始文档中查找依据：',
    ...topic.rawSources.map(r => `   - ${r}`),
    '3. 判断每条候选需求的证据等级：',
    '   - explicit：raw 原文直接、明确描述了该需求',
    '   - derived：raw 原文未直接描述，但可从现有规则合理推导',
    '   - unsupported：raw 原文无任何支持，疑似 Wiki 幻觉',
    '   - conflict：raw 原文与 Wiki 描述存在矛盾',
    '',
    '关键约束：禁止仅凭 Wiki 判定需求成立。必须回到 raw 原始文档查找依据。',
    '',
    '输出要求：',
    '返回一个 JSON 数组，不要包含任何解释文字，只返回纯 JSON。',
    '数组中每条记录格式：',
    '{"temp_id":"CAND-01-001","evidence_level":"explicit","raw_sources":["raw/mahjong/06-结算.md"],"evidence_summary":"raw 原文第x章明确描述了...","confidence":0.95}',
  ].join('\n')
}

function buildVerifyPrompt(topic, candidates) {
  return [
    '你是 Verify Agent。验证以下候选需求是否被原始文档直接支持。',
    '',
    `当前 Topic：${topic.displayName}（${topic.id}）`,
    `本批验证 ${candidates.length} 条候选需求：`,
    '',
    ...candidates.map((c, i) => `${i + 1}. ${c.temp_id}: ${c.requirement}`),
    '',
    '【重要】请使用 Read 工具读取以下 raw 原始文档（每个文件只读一次）：',
    ...topic.rawSources.map(r => `  - ${r}`),
    '',
    '然后逐条判断每条候选需求是否被 raw 文档直接支持。',
    '判断标准：',
    '- pass=true：raw 原文直接或间接支持该需求',
    '- pass=false：raw 原文无任何支持，或与 Wiki 描述矛盾',
    '- 不允许增加 Wiki 中不存在的游戏规则',
    '',
    '输出要求：',
    '返回一个 JSON 数组，不要包含任何解释文字，只返回纯 JSON。',
    '每条记录格式：',
    '{"temp_id":"CAND-04-001","pass":true,"reason":"raw 原文第x章明确描述了..."}',
  ].join('\n')
}

function buildNormalizePrompt(candidatesJson, count) {
  return [
    '你是 Atomic Normalize Agent。你的任务是对验证通过的候选需求做原子化拆分和标准化。',
    '',
    `输入数据（验证通过的候选需求，共 ${count} 条）：`,
    candidatesJson,
    '',
    '任务规则：',
    '1. 原子化：如果一条需求包含多个行为，拆分为多条',
    '2. 标准化：统一表述格式，去除冗余措辞',
    '3. 统一分类：确保每条需求的 category 正确（gameplay / settlement / config / ui）',
    '4. 保留 original_temp_ids 字段：记录拆分前的原始 temp_id',
    '5. 不要合并：同一操作的触发条件和收分规则应保持为独立条目，不要合并为一条',
    '6. 番型原子化：每个 F0X 编号的番型结构定义和倍数应保持为独立条目，不要合并为一条概述',
    '7. 番型互斥规则与番型结构定义不可合并为一条',
    '',
    '禁止：新增业务含义 / 删除原始约束 / 修改游戏规则',
    '',
    '输出要求：',
    '返回一个 JSON 数组，不要包含任何解释文字，只返回纯 JSON。',
    '每条记录格式：',
    '{"temp_id":"CAND-01-001","topic":"杠与杠分","category":"settlement","title":"标题","requirement":"描述","evidence_level":"explicit","wiki_sources":["wiki/concepts/xxx.md"],"raw_sources":["raw/mahjong/xxx.md"],"original_temp_ids":["CAND-01-001"]}',
  ].join('\n')
}

function buildDedupPrompt() {
  return [
    '你是 Semantic Dedup Agent。你的任务是跨 topic 合并语义重复的需求，保留所有来源。',
    '',
    '【重要】请使用 Read 工具读取文件 requirements/normalized/normalized.jsonl',
    '',
    '任务：',
    '1. 分析所有需求，找出语义重复或高度相似的条目',
    '2. 合并重复需求为一条，保留所有来源',
    '3. sources 字段分 wiki 和 raw 两层，合并所有来源',
    '4. original_temp_ids 合并所有原始 ID',
    '',
    '关键原则：合并 Requirement，保留所有 Traceability。不删除来源。',
    '',
    '【合并规则（严格执行）】',
    '',
    'A. 同配置项子项必须合并：',
    '   同一个配置项的不同方面（如人数联动的座位/换牌方向/默认房数）应合并为一条',
    '   示例：4人逆时针入房、3人房主下+上、2人房主对家 -> 合并为一条"人数联动-座位配置"',
    '   示例：4人按骰子换牌、3人对家点数随机、2人恒对家 -> 合并为一条"人数联动-换牌方向"',
    '',
    'B. 同规则不同表述必须合并：',
    '   描述同一规则但措辞不同的条目应合并',
    '   示例：直杠收2倍底分由打牌者支付 + 直杠收分规则 -> 合并为一条',
    '',
    'C. 大规则包含小规则时合并：',
    '   如果一条需求完全包含另一条的内容，合并为更完整的一条',
    '',
    'D. 目标条数：合并后控制在 90-120 条以内',
    '   如果合并后超过 120 条，继续寻找可合并的条目',
    '',
    'E. 番型保护规则（禁止合并）：',
    '   不同 F0X 编号的番型结构定义不可合并（F01 平胡和 F02 对对胡是不同番型）',
    '   番型互斥规则与番型结构定义不可合并',
    '   根数计算规则不可合并进其他条目',
    '   叠加番型名规则不可合并进配置条目',
    '',
    'F. 创房配置保护规则：',
    '   速度、局数、人数、房数、底分、封顶倍数各自为独立配置项，不可互相合并',
    '   定庄与轮庄为独立配置项，不可合并为一条',
    '   座位安排与换牌方向为独立配置项，不可合并为一条',
    '   自摸模式三选一为独立配置项，不可合并进其他条目',
    '   番型开关应合并为一条"番型开关体系"条目（列出所有开关名称和倍数下拉），不要拆为 14 条独立开关',
    '   及时雨、过手胡、后四张必胡等规则开关可合并进对应规则条目，不要独立发布',
    '',
    '输出要求：',
    '返回一个 JSON 数组，不要包含任何解释文字，只返回纯 JSON。',
    '每条记录格式：',
    '{"title":"标题","category":"settlement","requirement":"描述","evidence_level":"explicit","sources":{"wiki":["wiki/concepts/xxx.md"],"raw":["raw/mahjong/xxx.md"]},"original_temp_ids":["CAND-01-001","CAND-03-005"]}',
  ].join('\n')
}

function buildPublishPrompt(dedupedJson, count) {
  return [
    '你是 Publish Agent。你的任务是为通过审核的需求分配永久 ID 并生成最终产物。',
    '',
    `输入数据（去重后的需求，共 ${count} 条）：`,
    dedupedJson,
    '',
    '任务：',
    '1. 为每条需求分配永久 ID，格式为 REQ-{CATEGORY}-{序号}：',
    '   - gameplay 类：REQ-GAME-001, REQ-GAME-002, ...',
    '   - settlement 类：REQ-SETTLEMENT-001, ...',
    '   - config 类：REQ-CONFIG-001, ...',
    '   - ui 类：REQ-UI-001, ...',
    '2. 生成 index.md（按分类列出，每条附一行摘要）',
    '3. 生成 traceability.json（每个 REQ ID 到 wiki sources 和 raw sources 的映射）',
    '',
    '输出要求：',
    '先返回一个 JSON 数组（发布的正式需求），然后输出以下标记：',
    '',
    '---INDEX_MD_START---',
    '（Markdown 格式的 index.md 内容）',
    '---INDEX_MD_END---',
    '---TRACEABILITY_START---',
    '（JSON 格式的 traceability 对象）',
    '---TRACEABILITY_END---',
    '',
    'JSON 数组中每条记录格式：',
    '{"id":"REQ-SETTLEMENT-001","category":"settlement","title":"标题","requirement":"描述","evidence_level":"explicit","sources":{"wiki":["wiki/concepts/xxx.md"],"raw":["raw/mahjong/xxx.md"]}}',
  ].join('\n')
}

function buildEvalPrompt() {
  return [
    '你是 Eval Agent。你的任务是对 Golden Set 评测需求提取流水线的质量。',
    '',
    '【重要】请使用 Read 工具完成以下操作：',
    '1. 读取文件 requirements/requirements.jsonl（实际产出）；如果不存在，则读取 requirements/requirements.json',
    '2. 读取文件 golden/requirements.jsonl（标准答案）',
    '3. 读取文件 requirements/review/unsupported.jsonl（unsupported 记录）',
    '4. 统计 candidates 目录下所有 .jsonl 文件的总行数作为候选总数',
    '5. 语义匹配：判断每条 Golden 需求是否在产出中有对应条目（标题相同或描述高度相似）',
    '4. 计算以下指标：',
    '   - Recall = 命中 Golden 条数 / Golden 总条数',
    '   - Precision = 命中 Golden 条数 / 产出总条数',
    '   - Unsupported Rate = unsupported 条数 / 候选总条数',
    '   - Traceability = 有 raw 证据的需求条数 / 正式需求总条数',
    '',
    '输出要求：',
    '先输出指标摘要（一行），然后输出以下标记：',
    '',
    '---REPORT_START---',
    '（Markdown 格式的评测报告，包含指标表格、缺失的 Golden 需求列表、多余的产出需求列表）',
    '---REPORT_END---',
    '',
    '如果 golden/requirements.jsonl 不存在或为空，在报告中说明并跳过 Recall 和 Precision。',
  ].join('\n')
}
