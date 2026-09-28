#!/usr/bin/env python3
"""
需求提取流水线 - 确定性结构校验工具

用于在各 Phase 之间校验中间产物的文件完整性和 JSONL 格式正确性。
不调用 LLM，纯确定性检查，可安全地在每次 Phase 完成后运行。

用法：
    python scripts/validate_structure.py              # 校验所有存在的文件
    python scripts/validate_structure.py --phase 1    # 只校验 Phase 1 的产出
    python scripts/validate_structure.py --json        # JSON 格式输出
"""

import argparse
import json
import os
import sys
from pathlib import Path

# 项目根目录
ROOT = Path(__file__).parent.parent

# 各 Phase 期望的产出文件
PHASE_FILES = {
    0: {
        "name": "Phase 0 Prepare",
        "files": [],
        "optional": ["requirements/workset.json"],
    },
    1: {
        "name": "Phase 1 Discovery",
        "files": [
            "requirements/candidates/gang-yu-gang-fen.jsonl",
            "requirements/candidates/huang-zhuang-yu-cha-jiao.jsonl",
            "requirements/candidates/zi-mo-xiang-guan-gui-ze.jsonl",
        ],
        "optional": [],
    },
    2: {
        "name": "Phase 2 Validation",
        "files": [],
        "optional": [
            "requirements/review/explicit.jsonl",
            "requirements/review/derived.jsonl",
            "requirements/review/unsupported.jsonl",
            "requirements/review/conflict.jsonl",
        ],
    },
    3: {
        "name": "Phase 3 Verify",
        "files": [],
        "optional": [],
    },
    4: {
        "name": "Phase 4 Normalize",
        "files": ["requirements/normalized/normalized.jsonl"],
        "optional": [],
    },
    5: {
        "name": "Phase 5 Dedup",
        "files": ["requirements/deduped/deduped.jsonl"],
        "optional": [],
    },
    6: {
        "name": "Phase 6 Checkpoint",
        "files": [],
        "optional": [],
    },
    7: {
        "name": "Phase 7 Publish",
        "files": [
            "requirements/requirements.jsonl",
            "requirements/index.md",
            "requirements/traceability.json",
        ],
        "optional": [],
    },
    8: {
        "name": "Phase 8 Eval",
        "files": [],
        "optional": ["reports/requirement-extraction-report.md"],
    },
}

# 候选需求必须包含的字段
CANDIDATE_REQUIRED_FIELDS = [
    "temp_id", "topic", "category", "title", "requirement", "wiki_sources"
]

# 验证结果必须包含的字段
VALIDATION_REQUIRED_FIELDS = [
    "temp_id", "evidence_level", "raw_sources", "evidence_summary", "confidence"
]

# 正式需求必须包含的字段
REQUIREMENT_REQUIRED_FIELDS = [
    "id", "category", "title", "requirement", "evidence_level"
]

# 允许的 category 值
VALID_CATEGORIES = {"gameplay", "settlement", "config", "ui"}

# 允许的 evidence_level 值
VALID_EVIDENCE_LEVELS = {"explicit", "derived", "unsupported", "conflict"}


def parse_jsonl(filepath):
    """解析 JSONL 文件，返回记录列表和错误列表"""
    records = []
    errors = []

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                    records.append(record)
                except json.JSONDecodeError as e:
                    errors.append(f"  第 {line_num} 行 JSON 解析失败: {e}")
    except FileNotFoundError:
        errors.append(f"  文件不存在")
    except Exception as e:
        errors.append(f"  读取失败: {e}")

    return records, errors


def validate_fields(record, required_fields, context=""):
    """校验记录是否包含所有必需字段"""
    errors = []
    for field in required_fields:
        if field not in record:
            errors.append(f"  {context} 缺少字段: {field}")
    return errors


def validate_enum(record, field, valid_values, context=""):
    """校验字段值是否在允许的枚举范围内"""
    errors = []
    if field in record and record[field] not in valid_values:
        errors.append(f"  {context} 字段 {field} 值 '{record[field]}' 不在允许范围: {valid_values}")
    return errors


def check_candidates(filepath):
    """校验 candidates JSONL 文件"""
    records, parse_errors = parse_jsonl(filepath)
    errors = list(parse_errors)

    for i, record in enumerate(records):
        ctx = f"记录 {i+1} ({record.get('temp_id', '未知')})"
        errors.extend(validate_fields(record, CANDIDATE_REQUIRED_FIELDS, ctx))
        errors.extend(validate_enum(record, "category", VALID_CATEGORIES, ctx))

    return len(records), errors


def check_validation(filepath):
    """校验 review JSONL 文件"""
    records, parse_errors = parse_jsonl(filepath)
    errors = list(parse_errors)

    for i, record in enumerate(records):
        ctx = f"记录 {i+1} ({record.get('temp_id', '未知')})"
        errors.extend(validate_fields(record, VALIDATION_REQUIRED_FIELDS, ctx))
        errors.extend(validate_enum(record, "evidence_level", VALID_EVIDENCE_LEVELS, ctx))

        # confidence 应在 0-1 之间
        if "confidence" in record:
            try:
                c = float(record["confidence"])
                if c < 0 or c > 1:
                    errors.append(f"  {ctx} confidence 值 {c} 不在 0-1 范围")
            except (ValueError, TypeError):
                errors.append(f"  {ctx} confidence 值 '{record['confidence']}' 不是数字")

    return len(records), errors


def check_requirements(filepath):
    """校验 requirements.jsonl 文件"""
    records, parse_errors = parse_jsonl(filepath)
    errors = list(parse_errors)

    seen_ids = set()
    for i, record in enumerate(records):
        ctx = f"记录 {i+1} ({record.get('id', '未知')})"
        errors.extend(validate_fields(record, REQUIREMENT_REQUIRED_FIELDS, ctx))
        errors.extend(validate_enum(record, "category", VALID_CATEGORIES, ctx))
        errors.extend(validate_enum(record, "evidence_level", VALID_EVIDENCE_LEVELS, ctx))

        # 检查 ID 唯一性
        rid = record.get("id")
        if rid:
            if rid in seen_ids:
                errors.append(f"  {ctx} ID '{rid}' 重复")
            seen_ids.add(rid)

    return len(records), errors


def validate_phase(phase_num):
    """校验指定 Phase 的产出"""
    phase_info = PHASE_FILES.get(phase_num)
    if not phase_info:
        return {"phase": phase_num, "error": "未知 Phase"}

    results = {
        "phase": phase_num,
        "name": phase_info["name"],
        "checks": [],
        "passed": True,
    }

    all_files = phase_info["files"] + phase_info["optional"]
    for rel_path in all_files:
        filepath = ROOT / rel_path
        is_required = rel_path in phase_info["files"]
        exists = filepath.exists()

        check_result = {
            "file": rel_path,
            "exists": exists,
            "required": is_required,
        }

        if not exists:
            if is_required:
                check_result["status"] = "FAIL"
                check_result["message"] = "必需文件不存在"
                results["passed"] = False
            else:
                check_result["status"] = "SKIP"
                check_result["message"] = "可选文件不存在（正常，可能该等级无数据）"
        else:
            # 文件存在，做内容校验
            if rel_path.endswith(".jsonl"):
                if "candidates" in rel_path:
                    count, errors = check_candidates(filepath)
                    check_result["record_count"] = count
                elif "review" in rel_path:
                    count, errors = check_validation(filepath)
                    check_result["record_count"] = count
                elif "normalized" in rel_path or "deduped" in rel_path:
                    records, parse_errors = parse_jsonl(filepath)
                    count = len(records)
                    errors = list(parse_errors)
                    check_result["record_count"] = count
                elif rel_path == "requirements/requirements.jsonl":
                    count, errors = check_requirements(filepath)
                    check_result["record_count"] = count
                else:
                    records, parse_errors = parse_jsonl(filepath)
                    count = len(records)
                    errors = list(parse_errors)
                    check_result["record_count"] = count

                if errors:
                    check_result["status"] = "FAIL"
                    check_result["errors"] = errors
                    results["passed"] = False
                else:
                    check_result["status"] = "PASS"
                    check_result["message"] = f"校验通过，{count} 条记录"
            elif rel_path.endswith(".json"):
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        json.load(f)
                    check_result["status"] = "PASS"
                    check_result["message"] = "JSON 格式正确"
                except json.JSONDecodeError as e:
                    check_result["status"] = "FAIL"
                    check_result["message"] = f"JSON 解析失败: {e}"
                    results["passed"] = False
            elif rel_path.endswith(".md"):
                size = filepath.stat().st_size
                if size > 0:
                    check_result["status"] = "PASS"
                    check_result["message"] = f"文件非空（{size} 字节）"
                else:
                    check_result["status"] = "FAIL"
                    check_result["message"] = "文件为空"
                    results["passed"] = False
            else:
                check_result["status"] = "PASS"
                check_result["message"] = "文件存在"

        results["checks"].append(check_result)

    return results


def validate_all():
    """校验所有 Phase"""
    all_results = []
    for phase_num in sorted(PHASE_FILES.keys()):
        result = validate_phase(phase_num)
        all_results.append(result)
    return all_results


def print_text_report(results):
    """打印文本格式报告"""
    total_pass = 0
    total_fail = 0
    total_skip = 0

    for phase_result in results:
        phase_name = phase_result["name"]
        phase_passed = phase_result["passed"]
        status = "[通过]" if phase_passed else "[失败]"
        print(f"\n{'='*60}")
        print(f"{status} {phase_name}")
        print(f"{'='*60}")

        for check in phase_result["checks"]:
            file = check["file"]
            check_status = check["status"]
            required = "必需" if check["required"] else "可选"

            if check_status == "PASS":
                total_pass += 1
                msg = check.get("message", "")
                count = check.get("record_count", "")
                count_str = f" ({count} 条)" if count != "" else ""
                print(f"  [通过] {file} [{required}]{count_str} {msg}")
            elif check_status == "FAIL":
                total_fail += 1
                msg = check.get("message", "")
                print(f"  [失败] {file} [{required}] {msg}")
                for err in check.get("errors", []):
                    print(f"         {err}")
            elif check_status == "SKIP":
                total_skip += 1
                msg = check.get("message", "")
                print(f"  [跳过] {file} [{required}] {msg}")

    print(f"\n{'='*60}")
    print(f"总计: {total_pass} 通过 / {total_fail} 失败 / {total_skip} 跳过")
    print(f"{'='*60}")

    return total_fail == 0


def main():
    parser = argparse.ArgumentParser(description="需求提取流水线确定性校验工具")
    parser.add_argument("--phase", type=int, help="只校验指定 Phase（0-8）")
    parser.add_argument("--json", action="store_true", help="JSON 格式输出")
    args = parser.parse_args()

    if args.phase is not None:
        result = validate_phase(args.phase)
        results = [result]
    else:
        results = validate_all()

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
        all_passed = all(r["passed"] for r in results)
    else:
        all_passed = print_text_report(results)

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
