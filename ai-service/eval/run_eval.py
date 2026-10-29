"""Chạy đánh giá trích xuất trên bộ dữ liệu có đáp án, xuất báo cáo Markdown + JSON.

    python eval/run_eval.py                     # dùng cache nếu có
    python eval/run_eval.py --no-cache --tag v2 # luôn gọi Gemini, gắn nhãn phiên bản prompt
    python eval/run_eval.py --dataset eval/dataset_real   # chứng từ thật (cùng định dạng labels.json)
"""
import argparse
import json
import sys
import time
from collections import Counter
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "eval"))

from app.cache import PROMPT_VERSION  # noqa: E402
from app.config import settings  # noqa: E402
from app.services.extraction import extract_invoice  # noqa: E402
from scoring import SCORED_FIELDS, aggregate, score_document  # noqa: E402

MIME = {".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".webp": "image/webp"}
TYPE_VI = {"ELECTRICITY": "Điện", "FUEL": "Nhiên liệu", "MATERIAL": "Nguyên liệu", "FREIGHT": "Vận chuyển",
           "OTHER": "Ngoài phạm vi"}

# (chỉ số, nhãn, ngưỡng, cao hơn là tốt?) - ngưỡng đề xuất cho demo, không phải chuẩn chính thức
TARGETS = [
    ("doc_accuracy", "Chứng từ đúng mọi trường quan trọng", 90, True),
    ("field_accuracy", "Độ chính xác theo trường", 95, True),
    ("classification_accuracy", "Phân loại loại/Scope/mã hệ số", 95, True),
    ("hallucination_rate", "Tỷ lệ bịa", 2, False),
    ("review_recall", "Lỗi quan trọng được gắn cờ", 90, True),
    ("co2e_total_error_pct", "Sai lệch tổng CO2e", 5, False),
]


def fmt(v, suffix="%"):
    return "—" if v is None else f"{v:.1f}{suffix}"


def run(dataset: Path, limit: int | None, sleep: float):
    labels = json.loads((dataset / "labels.json").read_text(encoding="utf-8"))[:limit]
    scored, raw = [], []
    for i, lb in enumerate(labels, 1):
        path = dataset / lb["file"]
        start = time.perf_counter()
        pred, error = None, None
        try:
            res = extract_invoice(path.read_bytes(), MIME[path.suffix.lower()])
            pred = res.data.model_dump(mode="json")
        except Exception as e:  # ghi nhận lỗi gọi API như một chứng từ thất bại
            error = str(e)[:300]
        ms = int((time.perf_counter() - start) * 1000)
        s = score_document(lb, pred)
        s["elapsed_ms"], s["error"] = ms, error
        scored.append(s)
        raw.append({"file": lb["file"], "predicted": pred, "error": error})
        mark = "OK " if s["critical_ok"] else "ERR"
        detail = "; ".join(f"{e['field']}: {e['expected']} -> {e['predicted']}" for e in s["errors"][:3])
        print(f"[{i:02d}/{len(labels)}] {mark} {lb['file']:42} {ms:6d}ms {error or detail}")
        if sleep:
            time.sleep(sleep)
    return scored, raw


def build_report(scored: list[dict], meta: dict) -> tuple[str, dict]:
    overall = aggregate(scored)
    by_type = {t: aggregate([d for d in scored if d["doc_type"] == t]) for t in TYPE_VI}
    by_quality = {"Ảnh sạch": aggregate([d for d in scored if d["degradation"] == "clean"]),
                  "Ảnh xấu": aggregate([d for d in scored if d["degradation"] != "clean"])}
    by_deg = {k: aggregate([d for d in scored if d["degradation"] == k])
              for k in sorted({d["degradation"] for d in scored})}

    per_field = {}
    for f in SCORED_FIELDS:
        c = Counter(d["fields"][f] for d in scored if f in d["fields"])
        filled = c["correct"] + c["wrong"] + c["missed"]
        per_field[f] = {**c, "accuracy": c["correct"] / filled * 100 if filled else None}

    confusion = Counter((d["fields"]["factor_code"], e["expected"], e["predicted"])
                        for d in scored for e in d["errors"] if e["field"] == "factor_code")
    latency = [d["elapsed_ms"] for d in scored]

    L = [f"# Báo cáo đánh giá trích xuất — {meta['tag']}", "",
         f"- Thời điểm: {meta['time']}  ",
         f"- Model: `{meta['model']}` · Prompt/cache: `{meta['prompt_version']}` · Ngưỡng review: {meta['threshold']}  ",
         f"- Bộ dữ liệu: `{meta['dataset']}` ({overall['documents']} chứng từ) · Cache: {meta['cache']}  ",
         f"- Thời gian trung bình: {sum(latency) / len(latency) / 1000:.1f}s/chứng từ (gồm cả cache hit)", "",
         "## Kết quả so với mục tiêu", "", "| Chỉ số | Kết quả | Mục tiêu | Đạt |", "|---|---|---|---|"]
    for key, name, target, higher in TARGETS:
        v = overall[key]
        ok = v is None or (v >= target if higher else v <= target)
        L.append(f"| {name} | {fmt(v)} | {'≥' if higher else '≤'} {target}% | {'✅' if ok else '❌'} |")
    L += ["", f"Sau khi người dùng sửa các trường bị gắn cờ, sai lệch tổng CO2e còn "
              f"**{fmt(overall['co2e_total_error_after_review_pct'])}** "
              f"(trung bình mỗi chứng từ {fmt(overall['co2e_mean_abs_error_after_review_pct'])}).",
          f"Cờ bắt buộc (vd. thiếu quãng đường) được bật: {fmt(overall['expected_flags_raised'])} · "
          f"Cờ thừa: {overall['false_alarms']} · Chứng từ không tính được CO2e theo đáp án: "
          f"{overall['co2e_not_computable']} · Gọi API lỗi: {overall['failed_calls']}", ""]

    def table(title, groups):
        rows = [f"## {title}", "", "| Nhóm | Số CT | CT đúng | Trường đúng | Bịa | Gắn cờ lỗi | Sai lệch CO2e |",
                "|---|---|---|---|---|---|---|"]
        for name, a in groups.items():
            if a:
                rows.append(f"| {name} | {a['documents']} | {fmt(a['doc_accuracy'])} | {fmt(a['field_accuracy'])} | "
                            f"{fmt(a['hallucination_rate'])} | {fmt(a['review_recall'])} | "
                            f"{fmt(a['co2e_total_error_pct'])} |")
        return rows + [""]

    L += table("Theo loại chứng từ", {TYPE_VI[k]: v for k, v in by_type.items()})
    L += table("Theo chất lượng ảnh", {**by_quality, **{f"↳ {k}": v for k, v in by_deg.items() if k != "clean"}})

    L += ["## Độ chính xác theo trường", "", "| Trường | Đúng | Sai | Bỏ sót | Bịa | Độ chính xác |",
          "|---|---|---|---|---|---|"]
    for f, c in per_field.items():
        L.append(f"| {f} | {c.get('correct', 0)} | {c.get('wrong', 0)} | {c.get('missed', 0)} | "
                 f"{c.get('hallucinated', 0)} | {fmt(c['accuracy'])} |")
    L.append("")
    if confusion:
        L += ["## Nhầm mã hệ số", "", "| Đáp án | AI trả | Số lần |", "|---|---|---|"]
        L += [f"| {e} | {p} | {n} |" for (_, e, p), n in confusion.most_common()]
        L.append("")

    L += ["## Chi tiết lỗi", "", "| Chứng từ | Trường | Loại lỗi | Đáp án | AI trả | Đã gắn cờ |", "|---|---|---|---|---|---|"]
    for d in scored:
        if d.get("error"):
            L.append(f"| {d['file']} | — | gọi API lỗi | | {d['error'][:80]} | |")
        for e in d["errors"]:
            L.append(f"| {d['file']} | {e['field']} | {e['status']} | {e['expected']} | {e['predicted']} | "
                     f"{'✔' if e['field'] in d['flagged'] else ''} |")
    L += ["", "> Dữ liệu là chứng từ giả lập (hư cấu). Kết quả này không thay thế đánh giá trên chứng từ thật."]

    data = {"meta": meta, "overall": overall, "by_type": by_type, "by_quality": by_quality,
            "by_degradation": by_deg, "per_field": per_field, "documents": scored}
    return "\n".join(L), data


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default=str(ROOT / "eval" / "dataset"))
    ap.add_argument("--tag", default=PROMPT_VERSION)
    ap.add_argument("--no-cache", action="store_true")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--sleep", type=float, default=0, help="nghỉ giữa các lần gọi (giây) để tránh giới hạn tốc độ")
    args = ap.parse_args()

    if settings.mock_mode or not settings.gemini_api_key:
        sys.exit("Cần GEMINI_API_KEY và MOCK_MODE=false để đánh giá.")
    if args.no_cache:
        settings.cache_enabled = False

    dataset = Path(args.dataset)
    meta = {"tag": args.tag, "time": datetime.now().strftime("%Y-%m-%d %H:%M"), "model": settings.gemini_model,
            "prompt_version": PROMPT_VERSION, "threshold": settings.review_threshold,
            "dataset": dataset.name, "cache": "tắt" if args.no_cache else "bật"}
    scored, raw = run(dataset, args.limit, args.sleep)
    md, data = build_report(scored, meta)

    out = ROOT / "eval" / "reports"
    out.mkdir(parents=True, exist_ok=True)
    stem = f"{datetime.now():%Y%m%d_%H%M}_{args.tag}"
    (out / f"{stem}.md").write_text(md, encoding="utf-8")
    (out / f"{stem}.json").write_text(json.dumps({**data, "raw": raw}, ensure_ascii=False, indent=2), encoding="utf-8")

    o = data["overall"]
    print(f"\nChứng từ đúng: {fmt(o['doc_accuracy'])} | Trường đúng: {fmt(o['field_accuracy'])} | "
          f"Bịa: {fmt(o['hallucination_rate'])} | Gắn cờ lỗi: {fmt(o['review_recall'])} | "
          f"Sai lệch CO2e: {fmt(o['co2e_total_error_pct'])} (sau xác nhận {fmt(o['co2e_total_error_after_review_pct'])})")
    print(f"Báo cáo: {out / (stem + '.md')}")


if __name__ == "__main__":
    main()
