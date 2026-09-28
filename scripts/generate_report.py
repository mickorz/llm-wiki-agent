#!/usr/bin/env python3
"""
需求提取流水线 - 概览报告生成器

从各阶段的 JSONL 文件中提取统计信息，生成完整的流水线概览报告。
不调用 LLM，纯数据统计。

用法：
    python scripts/generate_report.py              # 输出到终端
    python scripts/generate_report.py --save       # 保存到 reports/
    python scripts/generate_report.py --json        # JSON 格式输出
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent

CANDIDATES_DIR = ROOT / "requirements" / "candidates"
REVIEW_DIR = ROOT / "requirements" / "review"
NORMALIZED_FILE = ROOT / "requirements" / "normalized" / "normalized.jsonl"
DEDUPED_FILE = ROOT / "requirements" / "deduped" / "deduped.jsonl"
REQUIREMENTS_FILE = ROOT / "requirements" / "requirements.jsonl"
TRACEABILITY_FILE = ROOT / "requirements" / "traceability.json"
REPORT_FILE = ROOT / "reports" / "requirement-extraction-report.md"


def load_jsonl(filepath):
    records = []
    if not filepath.exists():
        return records
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return records


def load_json(filepath):
    if not filepath.exists():
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def collect_stats():
    """从各阶段文件收集统计信息"""
    stats = {
        "candidates": {},
        "review": {},
        "normalized_count": 0,
        "deduped_count": 0,
        "published_count": 0,
        "traceability": None,
        "categories": {},
        "evidence_levels": {},
    }

    # Phase 1: candidates
    if CANDIDATES_DIR.exists():
        for f in sorted(CANDIDATES_DIR.glob("*.jsonl")):
            records = load_jsonl(f)
            stats["candidates"][f.stem] = len(records)

    # Phase 2: review
    if REVIEW_DIR.exists():
        for level in ["explicit", "derived", "unsupported", "conflict"]:
            records = load_jsonl(REVIEW_DIR / f"{level}.jsonl")
            stats["review"][level] = len(records)

    # Phase 4: normalized
    stats["normalized_count"] = len(load_jsonl(NORMALIZED_FILE))

    # Phase 5: deduped
    stats["deduped_count"] = len(load_jsonl(DEDUPED_FILE))

    # Phase 7: published
    published = load_jsonl(REQUIREMENTS_FILE)
    stats["published_count"] = len(published)

    for r in published:
        cat = r.get("category", "unknown")
        stats["categories"][cat] = stats["categories"].get(cat, 0) + 1

        level = r.get("evidence_level", "unknown")
        stats["evidence_levels"][level] = stats["evidence_levels"].get(level, 0) + 1

    stats["traceability"] = load_json(TRACEABILITY_FILE)

    return stats


def generate_report(stats):
    """生成 Markdown 概览报告"""
    lines = [
        "# 需求提取流水线概览报告",
        "",
        "> 生成时间：2026-09-24（P0）",
        "",
        "## 各阶段产出统计",
        "",
        "| 阶段 | 产出 | 数量 |",
        "|------|------|------|",
    ]

    total_candidates = sum(stats["candidates"].values()) if stats["candidates"] else 0

    lines.append(f"| Phase 1 Discovery | 候选需求 | {total_candidates} |")
    lines.append(f"| Phase 2 Validation | explicit | {stats['review'].get('explicit', 0)} |")
    lines.append(f"| Phase 2 Validation | derived | {stats['review'].get('derived', 0)} |")
    lines.append(f"| Phase 2 Validation | unsupported | {stats['review'].get('unsupported', 0)} |")
    lines.append(f"| Phase 2 Validation | conflict | {stats['review'].get('conflict', 0)} |")
    lines.append(f"| Phase 4 Normalize | 原子化后 | {stats['normalized_count']} |")
    lines.append(f"| Phase 5 Dedup | 去重后 | {stats['deduped_count']} |")
    lines.append(f"| Phase 7 Publish | 正式需求 | {stats['published_count']} |")

    if stats["candidates"]:
        lines.extend([
            "",
            "## 候选需求按 Topic 分布",
            "",
            "| Topic | 候选数 |",
            "|-------|--------|",
        ])
        for topic, count in stats["candidates"].items():
            lines.append(f"| {topic} | {count} |")

    if stats["categories"]:
        lines.extend([
            "",
            "## 正式需求按分类分布",
            "",
            "| 分类 | 数量 |",
            "|------|------|",
        ])
        for cat, count in sorted(stats["categories"].items()):
            lines.append(f"| {cat} | {count} |")

    if stats["evidence_levels"]:
        lines.extend([
            "",
            "## 正式需求按证据等级分布",
            "",
            "| 证据等级 | 数量 |",
            "|---------|------|",
        ])
        for level, count in sorted(stats["evidence_levels"].items()):
            lines.append(f"| {level} | {count} |")

    if stats["traceability"]:
        trace_count = len(stats["traceability"])
        lines.extend([
            "",
            "## 可追溯性",
            "",
            f"- traceability.json 中共 {trace_count} 条映射记录",
        ])

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="需求提取流水线概览报告生成器")
    parser.add_argument("--json", action="store_true", help="JSON 格式输出")
    parser.add_argument("--save", action="store_true", help="保存报告到 reports/ 目录")
    args = parser.parse_args()

    stats = collect_stats()

    if args.json:
        print(json.dumps(stats, ensure_ascii=False, indent=2))
    else:
        report = generate_report(stats)
        print(report)

    if args.save:
        REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(REPORT_FILE, "w", encoding="utf-8") as f:
            f.write(generate_report(stats))
        print(f"\n报告已保存到 {REPORT_FILE}")


if __name__ == "__main__":
    main()
