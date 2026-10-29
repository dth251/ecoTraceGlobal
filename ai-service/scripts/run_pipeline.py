"""Chạy toàn bộ luồng AI trên một thư mục chứng từ.

    python scripts/run_pipeline.py samples
    python scripts/run_pipeline.py samples --lang en --out output/result.json
"""
import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.config import settings  # noqa: E402
from app.pipeline import InputDocument, run_pipeline  # noqa: E402

MIME = {".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg", ".webp": "image/webp"}


def load_docs(folder: Path) -> list[InputDocument]:
    docs = []
    for p in sorted(folder.iterdir()):
        mime = MIME.get(p.suffix.lower())
        if mime:
            docs.append(InputDocument(name=p.name, content=p.read_bytes(), mime_type=mime))
    return docs


def print_report(result) -> None:
    line = "-" * 100
    print(f"\n{line}\nCHỨNG TỪ\n{line}")
    print(f"{'File':34} {'Loại':12} {'Scope':5} {'Mã hệ số':14} {'CO2e (kg)':>12}  {'Trạng thái':14} Cần xem lại")
    for d in result.documents:
        if not d.ok:
            print(f"{d.file:34} LỖI: {d.error}")
            continue
        x, e = d.extraction.data, d.emission
        co2e = f"{e.co2e_kg:,.1f}" if e.co2e_kg is not None else "-"
        print(f"{d.file:34} {x.activity_type.value:12} {str(x.scope or '-'):5} {str(x.factor_code or '-'):14} "
              f"{co2e:>12}  {e.status:14} {', '.join(x.review_fields) or '-'}")

    inv = result.inventory
    print(f"\n{line}\nINVENTORY\n{line}")
    print(f"Tổng: {inv.total_co2e_kg:,.1f} kg CO2e")
    for s, v in inv.by_scope.items():
        pct = v / inv.total_co2e_kg * 100 if inv.total_co2e_kg else 0
        print(f"  Scope {s}: {v:>12,.1f} kg ({pct:4.1f}%)")
    print("  Theo tháng: " + ", ".join(f"{m.month}={m.co2e_kg:,.0f}" for m in inv.monthly))
    print(f"  Đã tính: {inv.documents_calculated} | Cần xem lại: {inv.documents_need_review} | Lỗi: {inv.documents_failed}")

    print(f"\n{line}\nGỢI Ý TỐI ƯU\n{line}")
    for i, s in enumerate(result.optimization.suggestions, 1):
        print(f"{i}. [{s.priority}] {s.title}")
        print(f"   Giảm ~{s.estimated_reduction_kg:,.0f} kg ({s.estimated_reduction_pct}%), chi phí ~{s.estimated_cost_usd:,.0f} USD")
        print(f"   {s.rationale}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", nargs="?", default=str(ROOT / "samples"))
    ap.add_argument("--lang", default="vi")
    ap.add_argument("--out", default=str(ROOT / "output" / "pipeline_result.json"))
    args = ap.parse_args()

    docs = load_docs(Path(args.folder))
    if not docs:
        sys.exit(f"Không có chứng từ trong {args.folder}")
    print(f"Model: {settings.gemini_model} | Mock: {settings.mock_mode or not settings.gemini_api_key} | {len(docs)} chứng từ")

    start = time.perf_counter()
    result = run_pipeline(docs, language=args.lang)
    print_report(result)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result.model_dump(mode="json"), ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nHoàn tất sau {time.perf_counter() - start:.1f}s. Kết quả JSON: {out}")


if __name__ == "__main__":
    main()
