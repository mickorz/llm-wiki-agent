# Wiki Log

Append-only chronological record of all operations.

Format: `## [YYYY-MM-DD] <operation> | <title>`

Parse recent entries: `grep "^## \[" wiki/log.md | tail -10`

---

## [2026-09-16] ingest | 基础规则

**Source**: `raw/01-基础规则.md`
**Pages created**:
- Source: `wiki/sources/基础规则.md`
- Entity: `wiki/entities/功夫川麻.md`
- Concepts: `wiki/concepts/缺门.md`, `换三张.md`, `刮风下雨.md`, `呼叫转移与擦挂.md`, `过手规则.md`, `将牌与根.md`
**Index/Overview/Log**: updated
**Contradictions**: none (first ingest)

## [2026-09-16] ingest | 游戏流程

**Source**: `raw/mahjong/02-游戏流程.md`
**Pages created**:
- Source: `wiki/sources/游戏流程.md`
- Concepts: `wiki/concepts/掷骰双分流.md`, `流局处理.md`, `结算流水线.md`
**Pages updated**:
- Entity: `wiki/entities/功夫川麻.md` (added flow section + new concept links)
- Concept: `wiki/concepts/换三张.md` (added exchange hint logic + 掷骰双分流 link)
**Index/Overview/Log**: updated
**Contradictions**: none (consistent with 基础规则)

## [2026-09-16] ingest | 打牌操作

**Source**: `raw/mahjong/03-打牌操作.md`
**Pages created**: Source `wiki/sources/打牌操作.md`; Concept `wiki/concepts/行牌操作.md`
**Pages updated**: `过手规则.md`, `刮风下雨.md`
**Contradictions**: none

## [2026-09-16] ingest | 番型

**Source**: `raw/mahjong/04-番型.md`
**Pages created**: Source `wiki/sources/番型.md`; Concept `wiki/concepts/番型体系.md`
**Pages updated**: `将牌与根.md`
**Contradictions**: none

## [2026-09-16] ingest | 胡牌类型

**Source**: `raw/mahjong/05-胡牌类型.md`
**Pages created**: Source `wiki/sources/胡牌类型.md`; Concept `wiki/concepts/胡牌判定.md`
**Pages updated**: `过手规则.md`, `呼叫转移与擦挂.md`
**Contradictions**: none

## [2026-09-16] ingest | 结算

**Source**: `raw/mahjong/06-结算.md`
**Pages created**: Source `wiki/sources/结算.md`; Concept `wiki/concepts/结算公式.md`
**Pages updated**: `结算流水线.md`, `流局处理.md`, `刮风下雨.md`, `呼叫转移与擦挂.md`, `将牌与根.md`
**Contradictions**: none

## [2026-09-16] ingest | 配置

**Source**: `raw/mahjong/07-配置.md`
**Pages created**: Source `wiki/sources/配置.md`; Concept `wiki/concepts/创房配置.md`
**Pages updated**: `过手规则.md`, `刮风下雨.md`, `呼叫转移与擦挂.md`
**Contradictions**: none

## [2026-09-16] ingest | UI交互

**Source**: `raw/mahjong/08-UI交互.md`
**Pages created**: Source `wiki/sources/UI交互.md`
**Pages updated**: `换三张.md`, `缺门.md`
**Contradictions**: none

## [2026-09-16] batch ingest summary | 打牌操作 + 番型 + 胡牌类型 + 结算 + 配置 + UI交互

**Batch**: 6 sources ingested in one session
**Pages created** (10): 6 sources + 5 concepts (行牌操作, 番型体系, 胡牌判定, 结算公式, 创房配置)
**Pages updated** (9): 功夫川麻 entity + 8 existing concepts (added new source refs + cross-links)
**Index/Overview/Log**: updated (full 8-source synthesis)
**Wiki status**: ALL 8 sources ingested — wiki complete

## [2026-09-16] query | 一局血战麻将从开始到结束的完整流程

**Question**: 一局血战麻将从开始到结束的完整流程是什么？
**Synthesis filed**: `wiki/syntheses/一局血战麻将从开始到结束的完整流程是什么.md`
**Sources used**: 全部 8 份源文档
**Index**: updated (Syntheses section)

## [2026-09-17] query | 一局血战麻将从开始到结束的完整流程（Wiki验证版）

**Question**: 一局血战麻将从开始到结束的完整流程是什么？
**Method**: 仅依据 Wiki 页面，未读取 raw 原始设计文档
**Synthesis updated**: `wiki/syntheses/一局血战麻将从开始到结束的完整流程是什么.md`
**Wiki pages read**: 24（8 Source + 14 Concept + 1 Entity + 1 Index）
**Unconfirmed info**: 7项（码牌墩数/庄家额外张UI/方位显示/大结算统计/N值含义/座位方位映射/结束动画）

## [2026-09-17] query | 自摸涉及的规则、番型、结算、配置、UI

**Question**: 自摸涉及哪些规则、番型、结算、配置、UI？
**Method**: 仅依据 Wiki 页面，未读取 raw 原始设计文档
**Synthesis saved**: `wiki/syntheses/自摸涉及的规则番型结算配置UI.md`
**Wiki pages read**: 15（6 Source + 8 Concept + 1 Index）
**Tool calls**: 15 次 Read（分3批并行）
**Unconfirmed info**: 9项（自摸按钮UI布局/动画详细规格/人数联动/一底含义/模式切换连锁/超时秒数/颜色规格/牌面展示规则/倍数显示格式）
