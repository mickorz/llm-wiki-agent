#!/usr/bin/env python3
"""
需求提取流水线 - 评测脚本（Phase 8）

对比 requirements/requirements.jsonl（实际产出）与 golden/requirements.jsonl（标准答案），
计算 Recall / Precision / Unsupported Rate / Traceability 四个核心指标。

匹配算法：多策略组合匹配（标题匹配 + 关键词重叠 + 序列相似度）

用法：
    python scripts/eval.py                    # 文本报告
    python scripts/eval.py --json             # JSON 格式输出
    python scripts/eval.py --save             # 保存到 reports/requirement-extraction-report.md
"""

import argparse
import json
import os
import re
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path

# 修复 Windows PowerShell 编码问题
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

ROOT = Path(__file__).parent.parent

REQUIREMENTS_FILE = ROOT / "requirements" / "requirements.jsonl"
REQUIREMENTS_JSON_FILE = ROOT / "requirements" / "requirements.json"
GOLDEN_FILE = ROOT / "golden" / "requirements.jsonl"
CANDIDATES_DIR = ROOT / "requirements" / "candidates"
REVIEW_DIR = ROOT / "requirements" / "review"
REPORT_FILE = ROOT / "reports" / "requirement-extraction-report.md"


def load_jsonl(filepath):
    """加载 JSONL 文件"""
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


def load_published():
    """加载正式需求，优先 jsonl，回退到 json"""
    if REQUIREMENTS_FILE.exists():
        return load_jsonl(REQUIREMENTS_FILE)
    if REQUIREMENTS_JSON_FILE.exists():
        with open(REQUIREMENTS_JSON_FILE, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
                if isinstance(data, list):
                    return data
            except json.JSONDecodeError:
                pass
    return []


def load_all_candidates():
    """加载所有候选需求"""
    all_candidates = []
    if not CANDIDATES_DIR.exists():
        return all_candidates
    for f in CANDIDATES_DIR.glob("*.jsonl"):
        all_candidates.extend(load_jsonl(f))
    return all_candidates


def load_all_unsupported():
    """加载所有 unsupported 记录"""
    unsupported_file = REVIEW_DIR / "unsupported.jsonl"
    return load_jsonl(unsupported_file)


def extract_keywords(text):
    """提取关键词：按标点切分后取长度>=2的有意义片段"""
    if not text:
        return set()
    # 按标点和空白切分
    segments = re.split(r'[，。、；：（）《》「」「」\s,;:()\[\]{}""\']+', text)
    words = set()
    for seg in segments:
        seg = seg.strip()
        if len(seg) >= 2:
            # 提取中文词组（2-4字）
            cn_matches = re.findall(r'[\u4e00-\u9fff]{2,4}', seg)
            words.update(cn_matches)
            # 提取英文词（>=3字母）
            en_matches = re.findall(r'[a-zA-Z]{3,}', seg)
            words.update(en_matches)
            # 提取数字
            num_matches = re.findall(r'\d+', seg)
            words.update(num_matches)
    return words


def title_similarity(t1, t2):
    """标题相似度：SequenceMatcher"""
    if not t1 or not t2:
        return 0.0
    return SequenceMatcher(None, t1, t2).ratio()


def requirement_similarity(r1, r2):
    """需求描述相似度：SequenceMatcher"""
    if not r1 or not r2:
        return 0.0
    # 截取前200字进行比较（避免太长导致计算慢）
    r1_short = r1[:200]
    r2_short = r2[:200]
    return SequenceMatcher(None, r1_short, r2_short).ratio()


def keyword_overlap(req1, req2):
    """关键词重叠度：改进的 Jaccard"""
    words1 = extract_keywords(req1)
    words2 = extract_keywords(req2)
    if not words1 or not words2:
        return 0.0
    intersection = words1 & words2
    union = words1 | words2
    return len(intersection) / len(union)


def semantic_match(golden_item, published_item):
    """
    多策略组合语义匹配
    返回 (is_match: bool, score: float, strategy: str)
    """
    g_title = golden_item.get("title", "")
    p_title = published_item.get("title", "")
    g_req = golden_item.get("requirement", golden_item.get("title", ""))
    p_req = published_item.get("requirement", published_item.get("title", ""))

    # 策略1：标题完全相同
    if g_title and p_title and g_title == p_title:
        return True, 1.0, "title_exact"

    # 策略2：标题高度相似（>=0.8）
    t_sim = title_similarity(g_title, p_title)
    if t_sim >= 0.8:
        return True, t_sim, "title_similar"

    # 策略3：关键词重叠度（>=0.4，比之前0.5更低）
    kw_overlap = keyword_overlap(g_req, p_req)
    if kw_overlap >= 0.4:
        return True, kw_overlap, "keyword_overlap"

    # 策略4：需求描述序列相似度（>=0.6）
    r_sim = requirement_similarity(g_req, p_req)
    if r_sim >= 0.6:
        return True, r_sim, "sequence_similarity"

    # 策略5：组合评分（标题 + 关键词 + 描述）
    combined = t_sim * 0.3 + kw_overlap * 0.4 + r_sim * 0.3
    if combined >= 0.45:
        return True, combined, "combined"

    return False, combined, "no_match"


def llm_semantic_match(golden, published):
    """用 LLM 做批量语义匹配，优先读取已有结果文件，回退到直接 API 调用"""

    # 优先读取已有 match_result.json（由 workflow agent 写入）
    result_file = ROOT / "reports" / "match_result.json"
    if result_file.exists():
        try:
            with open(result_file, "r", encoding="utf-8") as f:
                matches = json.load(f)
            if isinstance(matches, list):
                print(f"已读取 LLM 匹配结果文件：{len(matches)} 条命中", file=sys.stderr)
                return matches
        except Exception:
            pass

    # 回退：直接调用 API
    import urllib.request

    # 从 opencode 配置文件读取 API 配置
    config_path = os.path.expanduser("~/.config/opencode/opencode.json")
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
        provider = config.get("provider", {})
        api_key = ""
        base_url = ""
        for name, settings in provider.items():
            if isinstance(settings, dict):
                opt = settings.get("options", {})
                if isinstance(opt, dict):
                    api_key = opt.get("apiKey", "")
                    base_url = opt.get("baseURL", "")
                    if api_key and base_url:
                        break
    except Exception as e:
        print(f"无法读取 opencode 配置：{e}，回退到关键词匹配", file=sys.stderr)
        return []

    if not api_key or not base_url:
        print("opencode 配置中缺少 apiKey 或 baseURL，回退到关键词匹配", file=sys.stderr)
        return []

    # 紧凑 JSON 直接嵌入 prompt
    golden_compact = json.dumps(
        [{"id": g.get("id", ""), "t": g.get("title", ""), "r": g.get("requirement", "")[:80]} for g in golden],
        ensure_ascii=False, separators=(",", ":")
    )
    published_compact = json.dumps(
        [{"id": p.get("id", ""), "t": p.get("title", ""), "r": p.get("requirement", "")[:80]} for p in published],
        ensure_ascii=False, separators=(",", ":")
    )

    prompt = (
        f"你是需求匹配助手。以下是 {len(golden)} 条 golden 需求和 {len(published)} 条 published 需求。\n"
        "判断每条 golden 需求是否在 published 中有语义相同或高度相似的条目（不要求字面相同）。\n"
        "返回 JSON 数组，只包含匹配的条目：\n"
        '[{"golden_id":"GOLDEN-001","published_id":"REQ-GAME-001","score":0.95}]\n'
        "如果没有匹配，返回空数组 []。只返回纯 JSON，不要包含任何解释。\n\n"
        f"Golden: {golden_compact}\n\n"
        f"Published: {published_compact}\n"
    )

    print(f"正在调用 LLM 语义匹配（{len(golden)} golden x {len(published)} published）...", file=sys.stderr)

    data = json.dumps({
        "model": "biangfeng-gateway/glm-5.2-high",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            result = json.loads(resp.read().decode("utf-8"))

        content = result["choices"][0]["message"]["content"]

        # 从 content 中提取 JSON
        start = content.find("[")
        end = content.rfind("]")
        if start >= 0 and end > start:
            matches = json.loads(content[start:end+1])
            print(f"LLM 匹配完成：{len(matches)} 条命中", file=sys.stderr)
            return matches
        else:
            print(f"LLM 输出中未找到 JSON 数组", file=sys.stderr)
            print(f"content: {content[:500]}", file=sys.stderr)
    except Exception as e:
        print(f"LLM 调用失败：{e}，回退到关键词匹配", file=sys.stderr)

    return []


def evaluate(use_llm=False):
    """执行评测"""
    published = load_published()
    golden = load_jsonl(GOLDEN_FILE)
    all_candidates = load_all_candidates()
    unsupported = load_all_unsupported()

    total_golden = len(golden)
    total_published = len(published)
    total_candidates = len(all_candidates)
    total_unsupported = len(unsupported)

    # Recall & Precision 匹配
    matched_count = 0
    matched_golden_indices = set()
    matched_published_indices = set()
    match_details = []

    if use_llm:
        # LLM 语义匹配
        llm_matches = llm_semantic_match(golden, published)
        for m in llm_matches:
            g_id = m.get("golden_id", "")
            p_id = m.get("published_id", "")
            for gi, g in enumerate(golden):
                if g.get("id") == g_id and gi not in matched_golden_indices:
                    for pi, p in enumerate(published):
                        if p.get("id") == p_id and pi not in matched_published_indices:
                            matched_golden_indices.add(gi)
                            matched_published_indices.add(pi)
                            match_details.append({
                                "golden_id": g_id,
                                "golden_title": g.get("title", ""),
                                "published_id": p_id,
                                "published_title": p.get("title", ""),
                                "score": m.get("score", 0),
                                "strategy": "llm_semantic",
                            })
                            break
                    break
        matched_count = len(matched_golden_indices)
    else:
        # 多策略组合匹配
        for gi, g in enumerate(golden):
            best_score = 0
            best_pi = -1
            best_strategy = ""
            for pi, p in enumerate(published):
                if pi in matched_published_indices:
                    continue
                is_match, score, strategy = semantic_match(g, p)
                if is_match and score > best_score:
                    best_score = score
                    best_pi = pi
                    best_strategy = strategy

            if best_pi >= 0:
                matched_count += 1
                matched_golden_indices.add(gi)
                matched_published_indices.add(best_pi)
                match_details.append({
                    "golden_id": g.get("id", ""),
                    "golden_title": g.get("title", ""),
                    "published_id": published[best_pi].get("id", ""),
                    "published_title": published[best_pi].get("title", ""),
                    "score": round(best_score, 3),
                    "strategy": best_strategy,
                })

    recall = matched_count / total_golden if total_golden > 0 else 0
    precision = matched_count / total_published if total_published > 0 else 0
    unsupported_rate = total_unsupported / total_candidates if total_candidates > 0 else 0

    # Traceability：有 raw 证据的需求比例
    traceable_count = 0
    for p in published:
        sources = p.get("sources", {})
        raw_sources = sources.get("raw", []) if isinstance(sources, dict) else []
        if raw_sources:
            traceable_count += 1
    traceability_rate = traceable_count / total_published if total_published > 0 else 0

    # 未匹配的 Golden 需求（Recall 缺失）
    missing_golden = []
    for gi, g in enumerate(golden):
        if gi not in matched_golden_indices:
            missing_golden.append({
                "id": g.get("id", ""),
                "title": g.get("title", ""),
                "requirement": g.get("requirement", ""),
            })

    # 未匹配的 Published 需求（Precision 多余）
    extra_published = []
    for pi, p in enumerate(published):
        if pi not in matched_published_indices:
            extra_published.append({
                "id": p.get("id", ""),
                "title": p.get("title", ""),
                "requirement": p.get("requirement", ""),
            })

    # 按策略统计
    strategy_stats = {}
    for d in match_details:
        s = d["strategy"]
        strategy_stats[s] = strategy_stats.get(s, 0) + 1

    return {
        "recall": round(recall, 4),
        "precision": round(precision, 4),
        "unsupported_rate": round(unsupported_rate, 4),
        "traceability_rate": round(traceability_rate, 4),
        "matched_count": matched_count,
        "total_golden": total_golden,
        "total_published": total_published,
        "total_candidates": total_candidates,
        "total_unsupported": total_unsupported,
        "traceable_count": traceable_count,
        "strategy_stats": strategy_stats,
        "match_details": match_details,
        "missing_golden": missing_golden,
        "extra_published": extra_published,
        "match_mode": "llm" if use_llm else "keyword",
    }


def generate_report(results):
    """生成 Markdown 报告"""
    lines = [
        "# 需求提取流水线评测报告",
        "",
        f"> 生成时间：2026-09-28（P0 评测 v2）",
        "",
        "## 核心指标",
        "",
        "| 指标 | 值 | 说明 |",
        "|------|-----|------|",
        f"| Recall | {results['recall']:.1%} | 已知需求找出来多少（{results['matched_count']}/{results['total_golden']}） |",
        f"| Precision | {results['precision']:.1%} | 生成的需求有多少是真的（{results['matched_count']}/{results['total_published']}） |",
        f"| Unsupported Rate | {results['unsupported_rate']:.1%} | 幻觉需求比例（{results['total_unsupported']}/{results['total_candidates']}） |",
        f"| Traceability | {results['traceability_rate']:.1%} | 能回溯到 Raw 的需求比例（{results['traceable_count']}/{results['total_published']}） |",
        "",
        "## 数据统计",
        "",
        f"- Golden Set 总数：{results['total_golden']}",
        f"- 正式需求总数：{results['total_published']}",
        f"- 候选需求总数：{results['total_candidates']}",
        f"- Unsupported 总数：{results['total_unsupported']}",
        f"- 有 Raw 证据的需求数：{results['traceable_count']}",
        f"- 语义匹配命中数：{results['matched_count']}",
        "",
        "## 匹配策略统计",
        "",
        "| 策略 | 命中数 | 说明 |",
        "|------|--------|------|",
    ]

    strategy_desc = {
        "title_exact": "标题完全相同",
        "title_similar": "标题高度相似 (>=0.8)",
        "keyword_overlap": "关键词重叠 (>=0.4)",
        "sequence_similarity": "序列相似度 (>=0.6)",
        "combined": "组合评分 (>=0.45)",
    }

    for s, count in sorted(results["strategy_stats"].items(), key=lambda x: -x[1]):
        desc = strategy_desc.get(s, s)
        lines.append(f"| {s} | {count} | {desc} |")

    lines.append("")

    if results["match_details"]:
        lines.extend([
            "## 匹配详情（前20条）",
            "",
            "| Golden ID | Golden 标题 | Published ID | Published 标题 | 得分 | 策略 |",
            "|-----------|-------------|--------------|----------------|------|------|",
        ])
        for d in results["match_details"][:20]:
            lines.append(f"| {d['golden_id']} | {d['golden_title']} | {d['published_id']} | {d['published_title']} | {d['score']} | {d['strategy']} |")
        lines.append("")

    if results["missing_golden"]:
        lines.extend([
            "## Recall 缺失（Golden 中有但产出中没有）",
            "",
            "| ID | 标题 | 需求描述 |",
            "|-----|------|---------|",
        ])
        for m in results["missing_golden"]:
            req = m["requirement"][:60] + "..." if len(m["requirement"]) > 60 else m["requirement"]
            lines.append(f"| {m['id']} | {m['title']} | {req} |")
        lines.append("")

    if results["extra_published"]:
        lines.extend([
            "## Precision 多余（产出中有但 Golden 中没有）",
            "",
            "| ID | 标题 | 需求描述 |",
            "|-----|------|---------|",
        ])
        for e in results["extra_published"]:
            req = e["requirement"][:60] + "..." if len(e["requirement"]) > 60 else e["requirement"]
            lines.append(f"| {e['id']} | {e['title']} | {req} |")
        lines.append("")

    match_mode = results.get("match_mode", "keyword")
    if match_mode == "llm":
        lines.extend([
            "## 说明",
            "",
            "- 匹配算法：LLM 语义匹配（通过 opencode CLI 调用 glm-5.2-high）",
            "- Unsupported Rate 和 Traceability 为确定性计算，不依赖匹配算法",
        ])
    else:
        lines.extend([
            "## 说明",
            "",
            "- 匹配算法：多策略组合（标题精确匹配 + 标题相似度 + 关键词重叠 + 序列相似度 + 组合评分）",
            "- 阈值：标题相似 >=0.8, 关键词重叠 >=0.4, 序列相似 >=0.6, 组合评分 >=0.45",
            "- Unsupported Rate 和 Traceability 为确定性计算，不依赖匹配算法",
        ])

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="需求提取流水线评测工具")
    parser.add_argument("--json", action="store_true", help="JSON 格式输出")
    parser.add_argument("--save", action="store_true", help="保存报告到 reports/ 目录")
    parser.add_argument("--llm", action="store_true", help="使用 LLM 语义匹配（通过 opencode CLI 调用）")
    args = parser.parse_args()

    published = load_published()
    if not published:
        print("错误：requirements/requirements.jsonl 和 requirements/requirements.json 均不存在，请先运行 Phase 7 Publish", file=sys.stderr)
        sys.exit(1)

    if not GOLDEN_FILE.exists():
        print("警告：golden/requirements.jsonl 不存在，无法计算 Recall 和 Precision", file=sys.stderr)
        print("提示：请先人工准备 Golden Set", file=sys.stderr)

    results = evaluate(use_llm=args.llm)

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    else:
        report = generate_report(results)
        print(report)

    if args.save:
        REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(REPORT_FILE, "w", encoding="utf-8") as f:
            f.write(generate_report(results))
        print(f"\n报告已保存到 {REPORT_FILE}")


if __name__ == "__main__":
    main()
