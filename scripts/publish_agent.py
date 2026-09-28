#!/usr/bin/env python3
"""Publish Agent: 为通过审核的需求分配永久ID并生成最终产物。"""
import json
import os
from collections import OrderedDict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 读取输入
with open(os.path.join(BASE_DIR, "requirements", "deduped", "input_100.json"), "r", encoding="utf-8") as f:
    items = json.load(f)

# 分类计数器
category_prefix = {
    "gameplay": "GAME",
    "settlement": "SETTLEMENT",
    "config": "CONFIG",
    "ui": "UI",
}
category_order = {
    "gameplay": "Gameplay (玩法逻辑)",
    "settlement": "Settlement (结算规则)",
    "config": "Config (创房配置)",
    "ui": "UI (界面展示)",
}
category_seq = {cat: 0 for cat in category_prefix}
category_items = {cat: [] for cat in category_prefix}

# 按出现顺序分配永久ID
published = []
traceability = OrderedDict()

for item in items:
    cat = item["category"]
    category_seq[cat] += 1
    seq = category_seq[cat]
    prefix = category_prefix[cat]
    req_id = f"REQ-{prefix}-{seq:03d}"

    record = {
        "id": req_id,
        "category": cat,
        "title": item["title"],
        "requirement": item["requirement"],
        "evidence_level": item["evidence_level"],
        "sources": {
            "wiki": item["wiki_sources"],
            "raw": item["raw_sources"],
        },
    }
    published.append(record)
    category_items[cat].append(record)

    traceability[req_id] = {
        "wiki_sources": item["wiki_sources"],
        "raw_sources": item["raw_sources"],
        "original_temp_ids": item.get("original_temp_ids", []),
        "temp_id": item["temp_id"],
        "topic": item["topic"],
        "title": item["title"],
    }

# 生成 requirements.json
req_json_path = os.path.join(BASE_DIR, "requirements", "requirements.json")
with open(req_json_path, "w", encoding="utf-8") as f:
    json.dump(published, f, ensure_ascii=False, indent=2)

# 生成 traceability.json
trace_path = os.path.join(BASE_DIR, "requirements", "traceability.json")
with open(trace_path, "w", encoding="utf-8") as f:
    json.dump(traceability, f, ensure_ascii=False, indent=2)

# 生成 index.md
lines = []
lines.append("# 需求索引 (Requirements Index)")
lines.append("")
lines.append(f"> 共 {len(published)} 条正式需求，按分类组织。")
lines.append(f"> 生成日期: 2026-09-24")
lines.append("")
lines.append("| 分类 | 数量 | ID 范围 |")
lines.append("|------|------|---------|")
for cat in ["gameplay", "settlement", "config", "ui"]:
    count = category_seq[cat]
    prefix = category_prefix[cat]
    if count > 0:
        id_range = f"REQ-{prefix}-001 ~ REQ-{prefix}-{count:03d}"
    else:
        id_range = "-"
    lines.append(f"| {category_order[cat]} | {count} | {id_range} |")
lines.append("")

# 按分类列出
for cat in ["gameplay", "settlement", "config", "ui"]:
    items_in_cat = category_items[cat]
    if not items_in_cat:
        continue
    lines.append(f"## {category_order[cat]} ({len(items_in_cat)} 条)")
    lines.append("")
    lines.append("| ID | 标题 | 摘要 | 证据级别 |")
    lines.append("|----|------|------|----------|")
    for r in items_in_cat:
        summary = r["requirement"]
        # 截断过长的摘要
        if len(summary) > 80:
            summary = summary[:77] + "..."
        lines.append(f"| {r['id']} | {r['title']} | {summary} | {r['evidence_level']} |")
    lines.append("")

index_path = os.path.join(BASE_DIR, "requirements", "index.md")
with open(index_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

# 输出统计
print("=== Publish Agent 完成 ===")
print(f"总需求数: {len(published)}")
for cat in ["gameplay", "settlement", "config", "ui"]:
    print(f"  {category_order[cat]}: {category_seq[cat]} 条")
print(f"\n输出文件:")
print(f"  {req_json_path}")
print(f"  {index_path}")
print(f"  {trace_path}")
