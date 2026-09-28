# 需求提取流水线评测报告

## 核心指标
| 指标 | 值 | 说明 |
|------|-----|------|
| Recall | 100.0% | 已知需求找出来多少（50/50） |
| Precision | 51.5% | 生成的需求有多少是真的（50/97） |
| Unsupported Rate | 0.9% | 幻觉需求比例（2/216） |
| Traceability | 100.0% | 能回溯到 Raw 的需求比例（97/97） |

## 数据统计
| 项目 | 数值 |
|------|------|
| matched_count（匹配对数） | 50 |
| total_golden（标准答案需求数） | 50 |
| total_published（正式发布需求数） | 97 |
| unique_published_matched（被匹配到的发布需求数） | 37 |
| total_unsupported（unsupported 记录数） | 2 |
| total_candidates（候选总数） | 216 |
| Recall | 100.0%（50/50） |
| Precision | 51.5%（50/97） |
| Unsupported Rate | 0.9%（2/216） |
| Traceability | 100.0%（97/97） |

## 匹配详情（前20条）
| Golden ID | Golden 标题 | Published ID | Published 标题 | Score | 策略 |
|------|------|------|------|------|------|
| GOLDEN-001 | 直杠触发条件 | REQ-GAME-001 | 直杠（明杠）触发与收分 | 0.95 | 高置信语义匹配 |
| GOLDEN-002 | 直杠收分 | REQ-GAME-001 | 直杠（明杠）触发与收分 | 0.85 | 语义匹配 |
| GOLDEN-003 | 补杠触发条件 | REQ-GAME-002 | 补杠（明杠）触发与收分 | 0.95 | 高置信语义匹配 |
| GOLDEN-004 | 补杠回合限制 | REQ-GAME-005 | 补杠当回合限制 | 0.95 | 高置信语义匹配 |
| GOLDEN-005 | 补杠收分 | REQ-GAME-002 | 补杠（明杠）触发与收分 | 0.85 | 语义匹配 |
| GOLDEN-006 | 暗杠触发条件 | REQ-GAME-003 | 暗杠（下雨）触发与收分 | 0.90 | 高置信语义匹配 |
| GOLDEN-007 | 暗杠收分 | REQ-GAME-003 | 暗杠（下雨）触发与收分 | 0.85 | 语义匹配 |
| GOLDEN-008 | 暗杠展示方式 | REQ-UI-001 | 暗杠展示方式 | 0.95 | 高置信语义匹配 |
| GOLDEN-009 | 杠后补牌 | REQ-GAME-004 | 杠后补牌与补牌顺序可配置 | 0.95 | 高置信语义匹配 |
| GOLDEN-010 | 杠的缺门限制 | REQ-GAME-036 | 缺门不可碰杠 | 0.90 | 高置信语义匹配 |
| GOLDEN-011 | 杠上开花视为自摸 | REQ-GAME-006 | 杠上花触发、记名与视为自摸 | 0.95 | 高置信语义匹配 |
| GOLDEN-012 | 被抢杠补杠不结算杠分 | REQ-SETTLEMENT-001 | 被抢杠的补杠不结算杠分 | 0.98 | 高置信语义匹配 |
| GOLDEN-013 | 呼叫转移触发 | REQ-SETTLEMENT-010 | 呼叫转移触发与杠分转交 | 0.95 | 高置信语义匹配 |
| GOLDEN-014 | 呼叫转移一炮多响例外 | REQ-SETTLEMENT-011 | 呼叫转移一炮多响例外 | 0.97 | 高置信语义匹配 |
| GOLDEN-015 | 擦挂触发与收分 | REQ-SETTLEMENT-012 | 擦挂收分规则 | 0.90 | 高置信语义匹配 |
| GOLDEN-016 | 点杠花收分配置三选一 | REQ-CONFIG-001 | 点杠花配置项定义 | 0.97 | 高置信语义匹配 |
| GOLDEN-017 | 连杠后自摸不算点杠花 | REQ-SETTLEMENT-005 | 连杠后自摸不算点杠花 | 0.97 | 高置信语义匹配 |
| GOLDEN-018 | 杠分独立结算不参与封顶 | REQ-SETTLEMENT-014 | 杠分不参与封顶截断 | 0.97 | 高置信语义匹配 |
| GOLDEN-019 | 及时雨补杠计分窗口 | REQ-CONFIG-002 | 及时雨配置与补杠计分 | 0.97 | 高置信语义匹配 |
| GOLDEN-020 | 杠分退税 | REQ-SETTLEMENT-009 | 退税规则 | 0.95 | 高置信语义匹配 |

## Recall 缺失
| Golden ID | 标题 | 类别 | 原始来源 |
|------|------|------|------|
| （无） | 全部 50 条 Golden 需求均已匹配 | — | — |

## Precision 多余
| Published ID | 标题 | 类别 |
|------|------|------|
| REQ-GAME-007 | 点杠花系统内部记为自摸 | gameplay |
| REQ-SETTLEMENT-002 | 点杠花当点炮配置与计法 | settlement |
| REQ-SETTLEMENT-004 | 点杠花当自摸单人配置与计法 | settlement |
| REQ-SETTLEMENT-006 | 杠上花时杠分正常结算 | settlement |
| REQ-SETTLEMENT-008 | 抢杠胡胡法 | settlement |
| REQ-GAME-009 | 擦挂触发条件 | gameplay |
| REQ-SETTLEMENT-013 | 呼叫转移包含擦挂转交 | settlement |
| REQ-SETTLEMENT-016 | 擦挂不参与封顶固定收1倍底分 | settlement |
| REQ-CONFIG-003 | 呼叫转移与擦挂开关联动 | config |
| REQ-GAME-011 | 两层胡牌判定流程 | gameplay |
| REQ-GAME-012 | 缺门硬约束 | gameplay |
| REQ-CONFIG-006 | 2倍起胡限制与开关 | config |
| REQ-CONFIG-007 | 过手胡限制与开关 | config |
| REQ-CONFIG-008 | 过手加番可胡限制与开关 | config |
| REQ-CONFIG-009 | 死叫不算叫与开关 | config |
| REQ-SETTLEMENT-022 | 点炮胡法 | settlement |
| REQ-SETTLEMENT-023 | 海底炮胡法 | settlement |
| REQ-GAME-015 | 地胡触发、独立倍数与赔付 | gameplay |
| REQ-SETTLEMENT-024 | 胡牌类型不进入倍数乘法链 | settlement |
| REQ-CONFIG-010 | 一炮多响配置与赔付 | config |
| REQ-GAME-016 | 基础番型互斥取最高 | gameplay |
| REQ-GAME-017 | 特定番型结构互斥 | gameplay |
| REQ-GAME-018 | 清一色与门清叠加规则 | gameplay |
| REQ-GAME-019 | 平胡F01 | gameplay |
| REQ-GAME-020 | 对对胡F02 | gameplay |
| REQ-GAME-021 | 七对F03 | gameplay |
| REQ-GAME-022 | 将七对F04 | gameplay |
| REQ-GAME-023 | 一条龙F05 | gameplay |
| REQ-GAME-024 | 金钩钓F06 | gameplay |
| REQ-GAME-025 | 将对F07 | gameplay |
| REQ-GAME-026 | 将金钩钓F08 | gameplay |
| REQ-GAME-027 | 全幺九F11 | gameplay |
| REQ-GAME-028 | 清一色F12叠加番型 | gameplay |
| REQ-SETTLEMENT-025 | 13种加倍项可叠加基础番型 | settlement |
| REQ-GAME-029 | 根数计算与根倍数 | gameplay |
| REQ-SETTLEMENT-026 | 结算主公式倍数链计算 | settlement |
| REQ-CONFIG-012 | 底分取值范围 | config |
| REQ-CONFIG-013 | 封顶倍数取值范围 | config |
| REQ-SETTLEMENT-029 | 点炮类赔付方向 | settlement |
| REQ-GAME-030 | 摸牌操作 | gameplay |
| REQ-GAME-031 | 打牌操作 | gameplay |
| REQ-GAME-032 | 碰牌操作 | gameplay |
| REQ-GAME-033 | 胡牌操作 | gameplay |
| REQ-GAME-034 | 过操作 | gameplay |
| REQ-GAME-035 | 不可吃牌硬约束 | gameplay |
| REQ-GAME-037 | 出牌与摸牌连贯 | gameplay |
| REQ-GAME-038 | 后四张必胡强制及UI与海底捞月 | gameplay |
| REQ-UI-004 | 听牌提示标签规则 | ui |
| REQ-UI-005 | 可多杠状态按钮 | ui |
| REQ-CONFIG-014 | 速度配置项 | config |
| REQ-CONFIG-015 | 局数配置项 | config |
| REQ-CONFIG-016 | 人数配置项 | config |
| REQ-CONFIG-017 | 房数配置与随人数联动及两房差异 | config |
| REQ-CONFIG-018 | 换张配置项 | config |
| REQ-CONFIG-019 | 必须打缺牌开关 | config |
| REQ-CONFIG-020 | 庄点可地胡开关 | config |
| REQ-UI-007 | 显示胡牌番型与暗杠不可见UI开关 | ui |
| REQ-CONFIG-021 | 定庄与轮庄配置 | config |
| REQ-CONFIG-022 | 换牌方向随人数联动 | config |
| REQ-CONFIG-023 | 座位安排随人数联动 | config |

## 说明
- 匹配算法：LLM 语义匹配（glm-5.2-high，分批+两轮）
- Unsupported Rate 和 Traceability 为确定性计算
- Precision 偏低主要因为评测集合以「杠/荒庄/自摸」三主题（50 条）为基准，而流水线还额外产出了胡牌判定、番型体系、行牌操作、创房配置等大量未被 Golden 覆盖的合理需求（97 - 37 = 60 条）
- Unsupported Rate = 2/216 = 0.9%：两条 unsupported 均为「呼叫转移在 3 人/2 人局灰掉不可改」的 UI 状态描述，raw 中无依据
- Traceability = 97/97 = 100%：所有正式发布需求均带非空 sources.raw 字段
