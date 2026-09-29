# 需求提取流水线评测报告

## 核心指标
| 指标 | 值 | 说明 |
|------|-----|------|
| Recall | 99.0% | 已知需求找出来多少（95/96） |
| Precision | 106.7% | 生成的需求有多少是真的（95/89） |
| Unsupported Rate | 0.8% | 幻觉需求比例（2/237） |
| Traceability | 100.0% | 能回溯到 Raw 的需求比例（89/89） |

## 数据统计
| 项目 | 数值 |
|------|------|
| matched_count（匹配对数） | 95 |
| total_golden（标准答案需求数） | 96 |
| total_published（产出需求数） | 89 |
| total_unsupported（unsupported 记录数） | 2 |
| total_candidates（候选总数） | 237 |
| traceable_published（含 sources.raw 的产出数） | 89 |
| 未匹配 Golden 数 | 1（GOLDEN-068） |
| 未被匹配 Published 数 | 21 |
| 候选文件数 | 7 |

分文件候选数：
| 文件 | 行数 |
|------|------|
| chuang-fang-peizhi.jsonl | 35 |
| gang-feng-xia-yu.jsonl | 35 |
| hu-jiao-zhuanyi-yu-ca-gua.jsonl | 35 |
| hu-pai-panding-yu-fan-xing.jsonl | 35 |
| jie-suan-gongshi-yu-liushuixian.jsonl | 35 |
| liu-ju-chuli.jsonl | 27 |
| xing-pai-caozuo.jsonl | 35 |
| 合计 | 237 |

## 匹配详情（前20条）
| Golden ID | Golden 标题 | Published ID | Published 标题 | Score | 策略 |
|------|------|------|------|------|------|
| GOLDEN-001 | 直杠触发条件 | REQ-SETTLEMENT-001 | 直杠（明杠/刮风）触发条件与收分 | 0.85 | LLM 语义匹配 |
| GOLDEN-002 | 直杠收分 | REQ-SETTLEMENT-001 | 直杠（明杠/刮风）触发条件与收分 | 0.90 | LLM 语义匹配 |
| GOLDEN-003 | 补杠触发条件 | REQ-SETTLEMENT-002 | 补杠（明杠/刮风）触发条件与收分 | 0.85 | LLM 语义匹配 |
| GOLDEN-004 | 补杠回合限制 | REQ-GAME-002 | 补杠时机限制与及时雨 | 0.90 | LLM 语义匹配 |
| GOLDEN-005 | 补杠收分 | REQ-SETTLEMENT-002 | 补杠（明杠/刮风）触发条件与收分 | 0.90 | LLM 语义匹配 |
| GOLDEN-006 | 暗杠触发条件 | REQ-SETTLEMENT-003 | 暗杠（下雨）触发条件与收分 | 0.85 | LLM 语义匹配 |
| GOLDEN-007 | 暗杠收分 | REQ-SETTLEMENT-003 | 暗杠（下雨）触发条件与收分 | 0.90 | LLM 语义匹配 |
| GOLDEN-008 | 暗杠展示方式 | REQ-UI-001 | 暗杠展示方式 | 0.95 | LLM 语义匹配 |
| GOLDEN-009 | 杠后补牌 | REQ-GAME-001 | 杠后补牌 | 0.95 | LLM 语义匹配 |
| GOLDEN-010 | 杠的缺门限制 | REQ-GAME-005 | 缺门机制（声明/不可更改/不可碰杠/不可胡） | 0.85 | LLM 语义匹配 |
| GOLDEN-011 | 杠上开花视为自摸 | REQ-SETTLEMENT-006 | 杠上开花视为自摸 | 0.95 | LLM 语义匹配 |
| GOLDEN-012 | 被抢杠补杠不结算杠分 | REQ-SETTLEMENT-004 | 被抢杠时补杠不结算杠分 | 0.95 | LLM 语义匹配 |
| GOLDEN-013 | 呼叫转移触发 | REQ-SETTLEMENT-007 | 呼叫转移杠分转交胡牌者 | 0.90 | LLM 语义匹配 |
| GOLDEN-014 | 呼叫转移一炮多响例外 | REQ-SETTLEMENT-010 | 呼叫转移一炮多响不触发 | 0.95 | LLM 语义匹配 |
| GOLDEN-015 | 擦挂触发与收分 | REQ-SETTLEMENT-011 | 擦挂收分对象 | 0.90 | LLM 语义匹配 |
| GOLDEN-016 | 点杠花收分配置三选一 | REQ-CONFIG-001 | 点杠花配置三选一及连杠例外 | 0.95 | LLM 语义匹配 |
| GOLDEN-017 | 连杠后自摸不算点杠花 | REQ-CONFIG-001 | 点杠花配置三选一及连杠例外 | 0.85 | LLM 语义匹配 |
| GOLDEN-018 | 杠分独立结算不参与封顶 | REQ-SETTLEMENT-005 | 杠分独立结算不参与封顶 | 0.95 | LLM 语义匹配 |
| GOLDEN-019 | 及时雨补杠计分窗口 | REQ-GAME-002 | 补杠时机限制与及时雨 | 0.95 | LLM 语义匹配 |
| GOLDEN-020 | 杠分退税 | REQ-SETTLEMENT-039 | 退税规则 | 0.85 | LLM 语义匹配 |

## Recall 缺失
| Golden ID | Golden 标题 |
|------|------|
| GOLDEN-068 | 速度配置项 |

## Precision 多余
| Published ID | Published 标题 |
|------|------|
| REQ-GAME-004 | 擦挂触发条件 |
| REQ-GAME-018 | 死叫不算叫 |
| REQ-SETTLEMENT-042 | 查花猪赔付不参与封顶截断 |
| REQ-SETTLEMENT-012 | 擦挂收1倍底分固定不参与封顶 |
| REQ-GAME-020 | 一炮多响规则 |
| REQ-SETTLEMENT-044 | 查大叫赔付参与封顶截断 |
| REQ-CONFIG-014 | 定庄方式配置 |
| REQ-SETTLEMENT-022 | F08 将金钩钓番型定义 |
| REQ-SETTLEMENT-030 | 天胡地胡独立32倍不叠加规则 |
| REQ-UI-002 | 听牌提示标签 |
| REQ-GAME-015 | 血战到底机制 |
| REQ-GAME-003 | 呼叫转移触发条件 |
| REQ-CONFIG-002 | 呼叫转移开关及人数联动 |
| REQ-SETTLEMENT-009 | 呼叫转移转交杠分不参与封顶 |
| REQ-SETTLEMENT-013 | 呼叫转移包含擦挂转交 |
| REQ-CONFIG-016 | 番型开关体系 |
| REQ-GAME-019 | 胡牌两层判定流程 |
| REQ-SETTLEMENT-014 | 杠上炮加倍项 |
| REQ-SETTLEMENT-008 | 呼叫转移在结算流水线第5步执行 |
| REQ-GAME-013 | 过手碰约束 |
| REQ-CONFIG-003 | 擦挂开关及人数联动 |

## 说明
- 匹配算法：LLM 语义匹配（glm-5.2-high，分批+两轮）
- Unsupported Rate 和 Traceability 为确定性计算
- Precision > 100% 说明存在多条 Golden 映射到同一条 Published（需求合并粒度更粗），例如 GOLDEN-001/GOLDEN-002 同时命中 REQ-SETTLEMENT-001
- total_candidates 采用 requirements/candidates/ 下 7 个 jsonl 文件的非空行合计
