"""Test e2e qua HTTP khi service đang chạy (run.bat):

    python scripts/e2e_http.py [--base http://localhost:8001]

Kiểm tra từng endpoint mà backend sẽ gọi, rồi chạy /ai/pipeline/run với toàn bộ samples.
"""
import argparse
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
MIME = {".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg"}

# file -> (activity_type, scope, factor_code) mong đợi
EXPECTED = {
    "01_hoa_don_dien_t03.png": ("ELECTRICITY", 2, "ELEC_GRID"),
    "02_hoa_don_dien_t04.png": ("ELECTRICITY", 2, "ELEC_GRID"),
    "03_hoa_don_dau_diesel.pdf": ("FUEL", 1, "FUEL_DIESEL"),
    "04_hoa_don_nguyen_lieu_soi.png": ("MATERIAL", 3, "MAT_COTTON"),
    "05_van_don_duong_bien.pdf": ("FREIGHT", 3, "FREIGHT_SEA"),
    "06_cuoc_van_chuyen_duong_bo.png": ("FREIGHT", 3, "FREIGHT_ROAD"),
}

failures: list[str] = []


def check(cond: bool, msg: str):
    print(("  PASS " if cond else "  FAIL ") + msg)
    if not cond:
        failures.append(msg)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8001")
    base = ap.parse_args().base
    c = httpx.Client(base_url=base, timeout=180)

    print("1) /health")
    h = c.get("/health").json()
    check(h["status"] == "ok", f"health ok (mock={h['mock_mode']}, model={h['model']})")

    print("2) /ai/extract-invoice từng chứng từ")
    for name, (act, scope, code) in EXPECTED.items():
        p = ROOT / "samples" / name
        r = c.post("/ai/extract-invoice", files={"file": (name, p.read_bytes(), MIME[p.suffix])})
        if r.status_code != 200:
            check(False, f"{name}: HTTP {r.status_code} {r.text[:200]}")
            continue
        d = r.json()["data"]
        check(d["activity_type"] == act and d["scope"] == scope and d["factor_code"] == code,
              f"{name}: {d['activity_type']}/S{d['scope']}/{d['factor_code']} qty={d['quantity']} {d['unit']} "
              f"date={d['invoice_date']} review={d['review_fields']}")

    print("3) /ai/extract-invoice sai định dạng")
    r = c.post("/ai/extract-invoice", files={"file": ("x.txt", b"abc", "text/plain")})
    check(r.status_code == 422, f"trả 422 (thực tế {r.status_code})")

    print("4) /ai/classify-activity")
    for text, code in [("Tiền điện sản xuất tháng 5", "ELEC_GRID"), ("Mua 2 tấn hạt nhựa PP", "MAT_PLASTIC"),
                       ("Air freight SGN-FRA", "FREIGHT_AIR")]:
        d = c.post("/ai/classify-activity", json={"description": text}).json()
        check(d["factor_code"] == code, f"'{text}' -> {d['factor_code']} ({d['method']})")

    print("5) /ai/pipeline/run toàn bộ samples")
    files = [("files", (n, (ROOT / "samples" / n).read_bytes(), MIME[Path(n).suffix])) for n in EXPECTED]
    res = c.post("/ai/pipeline/run", files=files, data={"language": "vi"}).json()
    inv = res["inventory"]
    check(inv["documents_failed"] == 0, f"không có chứng từ lỗi ({inv['documents_failed']})")
    check(inv["documents_calculated"] == len(EXPECTED), f"tính được {inv['documents_calculated']}/{len(EXPECTED)}")
    check(all(inv["by_scope"][s] > 0 for s in "123"), f"đủ 3 scope: {inv['by_scope']}")
    check(len(res["optimization"]["suggestions"]) > 0,
          f"có gợi ý: {[s['id'] for s in res['optimization']['suggestions']]}")
    print(f"   Tổng {inv['total_co2e_kg']:,.1f} kg CO2e")

    print(f"\nKết quả: {'TẤT CẢ PASS' if not failures else f'{len(failures)} FAIL'}")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
