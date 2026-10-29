"""Đánh giá ĐỘ TIN CẬY của chính kết quả đánh giá: khoảng tin cậy, độ ổn định giữa các lần chạy,
sai lệch giữa lần đầu gặp bố cục mới và sau khi đã chỉnh, mức độ đa dạng của dữ liệu.

    python eval/reliability.py                       # tự lấy các báo cáo mới nhất theo tag
    python eval/reliability.py --out eval/reports/reliability.md
"""
import argparse
import glob
import json
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPORTS = ROOT / "reports"
NEW_LAYOUTS = ("E3", "F3", "M3", "T3", "O0", "O1")  # bố cục thêm sau, từ mẫu hóa đơn điện tử thực tế


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    """Khoảng tin cậy 95% Wilson cho tỷ lệ k/n (đúng cả khi k=n hoặc n nhỏ)."""
    if n == 0:
        return (math.nan, math.nan)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return max(0.0, c - h), min(1.0, c + h)


def pct(x: float) -> str:
    return "—" if x is None or math.isnan(x) else f"{x * 100:.1f}%"


def ci(k: int, n: int) -> str:
    lo, hi = wilson(k, n)
    return f"{pct(k / n)} [{pct(lo)} – {pct(hi)}] (n={n})"


def load(tag: str):
    files = sorted(glob.glob(str(REPORTS / f"*_{tag}.json")))
    return json.load(open(files[-1], encoding="utf-8")) if files else None


def layout_key(d):  # "E3_evn_song_ngu" -> "E3"
    return d["layout"].split("_")[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(REPORTS / "reliability.md"))
    args = ap.parse_args()

    runs = {t: load(t) for t in ["v4_bo36", "v6_bo36", "v6_bo36_lan2", "v6_holdout", "v6_holdout_lan2"]}
    runs = {t: r for t, r in runs.items() if r}
    L = ["# Độ tin cậy của kết quả đánh giá", ""]

    # 1. Khoảng tin cậy theo từng lần chạy
    L += ["## 1. Khoảng tin cậy 95% (Wilson)", "",
          "Con số 100% trên 36 chứng từ KHÔNG có nghĩa là độ chính xác thật là 100%.", "",
          "| Lần chạy | Chứng từ đúng | Gắn cờ được lỗi quan trọng |", "|---|---|---|"]
    for t, r in runs.items():
        docs = r["documents"]
        ok = sum(d["critical_ok"] for d in docs)
        wrong = sum(len(d["wrong_critical"]) for d in docs)
        caught = sum(len(d["caught"]) for d in docs)
        L.append(f"| {t} | {ci(ok, len(docs))} | {ci(caught, wrong) if wrong else 'không có lỗi để bắt'} |")

    # 2. Gộp các lần chạy cuối (prompt không đổi)
    final = [r for t, r in runs.items() if t.startswith("v6_")]
    alld = [d for r in final for d in r["documents"]]
    ok = sum(d["critical_ok"] for d in alld)
    wrong = sum(len(d["wrong_critical"]) for d in alld)
    caught = sum(len(d["caught"]) for d in alld)
    undetected_docs = sum(1 for d in alld if d["wrong_critical"] and len(d["caught"]) < len(d["wrong_critical"]))
    L += ["", "## 2. Gộp các lần chạy với prompt cuối (v6)", "",
          f"- Số lượt chấm: **{len(alld)}** (tính lặp: cùng chứng từ chạy nhiều lần, nên KHÔNG phải {len(alld)} mẫu độc lập)",
          f"- Chứng từ đúng: {ci(ok, len(alld))}",
          f"- Lỗi quan trọng: {wrong}; được gắn cờ: {caught}; chứng từ có lỗi lọt qua không gắn cờ: {undetected_docs}",
          f"- Tỷ lệ **lỗi lọt** (sai mà không gắn cờ, người dùng không được nhắc sửa), tính theo chứng từ: "
          f"{ci(undetected_docs, len(alld))}"]
    layouts = {layout_key(d) for d in alld}
    leaked_layouts = {layout_key(d) for d in alld if d["wrong_critical"] and len(d["caught"]) < len(d["wrong_critical"])}
    lo, hi = wilson(len(leaked_layouts), len(layouts))
    L += [f"- Cùng chỉ số nhưng coi **mỗi bố cục là một đơn vị độc lập** (thực tế hơn, vì các chứng từ cùng bố cục chung khuôn): "
          f"{len(leaked_layouts)}/{len(layouts)} bố cục có lỗi lọt, cận trên 95% = **{pct(hi)}**",
          "- Các kiểm tra phát hiện lỗi (đơn giá, năm ký hiệu, đơn vị...) được thiết kế SAU khi thấy lỗi tương ứng, "
          "nên con số này có xu hướng lạc quan với dạng lỗi chưa từng gặp.", ""]

    # 3. Số mẫu cần thiết
    L += ["## 3. Cần bao nhiêu mẫu để khẳng định?", "",
          "Nếu KHÔNG quan sát thấy lỗi nào, cận trên 95% của tỷ lệ lỗi xấp xỉ 3/n (quy tắc ba).", "",
          "| Muốn khẳng định lỗi lọt ≤ | Cần tối thiểu (không lỗi nào) |", "|---|---|"]
    for target in (0.10, 0.05, 0.02, 0.01):
        L.append(f"| {target:.0%} | {math.ceil(3 / target)} chứng từ độc lập |")
    L.append("")

    # 4. Độ ổn định giữa các lần chạy
    L += ["## 4. Độ ổn định giữa các lần chạy (cùng prompt, cùng chứng từ)", ""]
    pairs = [("v6_bo36", "v6_bo36_lan2"), ("v6_holdout", "v6_holdout_lan2")]
    any_pair = False
    for a, b in pairs:
        if a in runs and b in runs:
            any_pair = True
            da = {d["file"]: d for d in runs[a]["documents"]}
            db = {d["file"]: d for d in runs[b]["documents"]}
            common = [f for f in da if f in db]
            same_ok = sum(da[f]["critical_ok"] == db[f]["critical_ok"] for f in common)
            diff = [f for f in common if da[f]["critical_ok"] != db[f]["critical_ok"]]
            pa = {x["file"]: x["predicted"] for x in runs[a]["raw"]}
            pb = {x["file"]: x["predicted"] for x in runs[b]["raw"]}
            fields = ("quantity", "unit", "invoice_date", "factor_code", "amount", "weight_kg")
            identical = sum(all((pa[f] or {}).get(k) == (pb[f] or {}).get(k) for k in fields) for f in common)
            L.append(f"- `{a}` vs `{b}`: {same_ok}/{len(common)} chứng từ cùng kết quả đúng/sai; "
                     f"{identical}/{len(common)} cho đầu ra giống hệt ở các trường chính"
                     + (f"; khác nhau: {', '.join(diff)}" if diff else ""))
    if not any_pair:
        L.append("- Chưa có cặp chạy lặp.")
    L.append("")

    # 5. Khoảng cách tổng quát hóa: lần đầu gặp bố cục mới
    L += ["## 5. Khoảng cách khi gặp bố cục MỚI (bằng chứng quan trọng nhất)", ""]
    first = runs.get("v4_bo36")
    if first:
        old = [d for d in first["documents"] if layout_key(d) not in NEW_LAYOUTS]
        new = [d for d in first["documents"] if layout_key(d) in NEW_LAYOUTS]
        L += ["Prompt v4 đã được chỉnh theo 24 chứng từ cũ. Khi thêm 6 bố cục mới (lần đầu gặp), chưa chỉnh gì:", "",
              "| Nhóm | Chứng từ đúng | Gắn cờ lỗi |", "|---|---|---|"]
        for name, ds in (("Bố cục đã dùng để chỉnh prompt", old), ("Bố cục MỚI (lần đầu gặp)", new)):
            w = sum(len(d["wrong_critical"]) for d in ds)
            c = sum(len(d["caught"]) for d in ds)
            L.append(f"| {name} | {ci(sum(d['critical_ok'] for d in ds), len(ds))} | "
                     f"{ci(c, w) if w else 'không có lỗi'} |")
        n_unflagged = sum(1 for d in new if d["wrong_critical"] and not d["caught"])
        L += ["", f"Trong {len(new)} chứng từ bố cục mới có {sum(1 for d in new if not d['critical_ok'])} chứng từ sai, "
                  f"trong đó {n_unflagged} chứng từ sai mà **không được gắn cờ**.",
              "Cả hai lần mở rộng bộ dữ liệu (24 -> 36 chứng từ) đều lộ lỗi mới => độ chính xác sau khi chỉnh "
              "KHÔNG nên ngoại suy sang dạng chứng từ chưa từng thấy. Đây là con số sát thực tế hơn mục 1-2.", ""]

    # 6. Đa dạng dữ liệu: đơn vị độc lập là bố cục, không phải chứng từ
    ref = runs.get("v6_holdout") or runs.get("v6_bo36")
    L += ["## 6. Dữ liệu giả lập đa dạng đến đâu?", "",
          "**Lưu ý về bộ held-out:** nó dùng seed khác (số liệu, ngày, công ty, kiểu làm xấu ảnh khác) nhưng vẫn là "
          "CÙNG 18 bố cục đã dùng khi chỉnh prompt. Vì vậy nó đo độ bền trước dữ liệu mới trên khuôn cũ, "
          "KHÔNG đo khả năng đọc một mẫu hóa đơn chưa từng thấy.", ""]
    if ref:
        by_layout = defaultdict(list)
        for d in ref["documents"]:
            by_layout[layout_key(d)].append(d)
        n_docs = len(ref["documents"])
        L += [f"- {n_docs} chứng từ nhưng chỉ **{len(by_layout)} bố cục**; các chứng từ cùng bố cục chung khuôn, "
              "chỉ khác số liệu và kiểu làm xấu ảnh, nên không độc lập với nhau.",
              f"- Cỡ mẫu hiệu dụng gần với số bố cục ({len(by_layout)}) hơn là số chứng từ ({n_docs}).",
              f"- Khoảng tin cậy nếu coi mỗi bố cục là một đơn vị: bố cục đúng trọn vẹn "
              f"{ci(sum(all(x['critical_ok'] for x in v) for v in by_layout.values()), len(by_layout))}",
              "- Chung nguồn sinh: 1 bộ sinh, 6 phông chữ hệ thống, nền trắng/viền đơn giản, dữ liệu nhất quán tuyệt đối, "
              "không có lỗi in ấn, con dấu đè chữ, chữ viết tay, tem, dòng gạch bỏ, bản photo nhiều thế hệ.",
              "- Các lỗi hay gặp ở hóa đơn thật mà bộ này CHƯA có: hóa đơn nhiều trang, nhiều mặt hàng thật sự "
              "(hiện chỉ tính một dòng chính), file Excel, hóa đơn sai/điều chỉnh, ảnh chụp cuộn/gấp, chữ ký đè số.", ""]

    # 7. Kết luận
    L += ["## 7. Kết luận", "",
          "| Mục đích | Dữ liệu giả lập đủ chưa? |", "|---|---|",
          "| Kiểm tra pipeline chạy đúng, hồi quy khi sửa code/prompt | ✅ Đủ |",
          "| So sánh phiên bản prompt A với B | ✅ Đủ nếu chênh lệch lớn (lớn hơn khoảng tin cậy ở mục 1) |",
          "| Bắt lỗi logic kiểm tra (đơn vị, dấu số, phân loại) | ✅ Đủ, đã bắt được nhiều lỗi thật |",
          "| Khẳng định độ chính xác với chứng từ doanh nghiệp thật | ❌ Không đủ |",
          "| Cam kết con số với nhà đầu tư/khách hàng | ❌ Không đủ: cần dữ liệu thật |"]
    out = Path(args.out)
    out.write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
