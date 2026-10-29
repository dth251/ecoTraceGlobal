"""Test e2e toàn hệ thống: frontend (nginx) -> backend Spring Boot -> AI service -> Gemini.

Cần hệ thống đang chạy (docker compose). Mọi bước đi qua cổng của FRONTEND (nginx proxy /api) giống trình duyệt,
riêng các bước "AI trực tiếp" gọi thẳng cổng 8001 để đối chiếu.

    python scripts/e2e_full_stack.py
    python scripts/e2e_full_stack.py --web http://localhost:5173 --ai http://localhost:8001
"""
import argparse
import sys
import time
import uuid
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
MIME = {".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp"}

# số thứ tự file trong eval/dataset (seed 42) -> kỳ vọng (loại, factor_code, số lượng/khối lượng chính, tổng tiền)
CASES = [
    (7, "ELECTRICITY", "ELEC_GRID", 75280.0, 178521257.0),
    (15, "FUEL", "FUEL_DIESEL", 879.0, 19220692.0),
    (23, "MATERIAL", "MAT_COTTON", 15000.0, 867210300.0),
    (31, "FREIGHT", "FREIGHT_SEA", 14750.0, 67090000.0),
]

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> bool:
    results.append((name, ok, detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"  -> {detail}" if detail else ""))
    return ok


def find_sample(n: int) -> Path | None:
    """Tìm eval/dataset/<nnn>_*; nếu chưa sinh thì chạy eval/generate_dataset.py trước."""
    hits = sorted((ROOT / "eval" / "dataset").glob(f"{n:03d}_*"))
    return hits[0] if hits else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--web", default="http://127.0.0.1:5173", help="frontend (Vite dev hoặc nginx)")
    ap.add_argument("--backend", default="http://127.0.0.1:8080", help="Spring Boot")
    ap.add_argument("--ai", default="http://127.0.0.1:8001")
    args = ap.parse_args()
    web, ai, be = args.web.rstrip("/"), args.ai.rstrip("/"), args.backend.rstrip("/")
    c = httpx.Client(timeout=180)

    print("A. Hạ tầng")
    r = c.get(web + "/")
    check("Frontend trả trang chủ", r.status_code == 200 and "<div id=\"root\"" in r.text, f"HTTP {r.status_code}")
    h = c.get(ai + "/health").json()
    check("AI service /health", h.get("status") == "ok", f"model={h.get('model')} mock={h.get('mock_mode')} db={h.get('database')}")
    check("AI service dùng Gemini thật (không mock)", h.get("mock_mode") is False)

    print("B. Đăng ký, đăng nhập, dữ liệu nền")
    email = f"e2e_{uuid.uuid4().hex[:8]}@example.com"
    pw = "Passw0rdE2E"
    r = c.post(be + "/api/v1/auth/register", json={"organizationName": "Công ty Dệt May E2E", "taxCode": "0312345678",
                                                      "fullName": "Tester E2E", "email": email, "password": pw})
    check("Đăng ký tổ chức + người dùng", r.status_code in (200, 201), f"HTTP {r.status_code} {r.text[:120] if r.status_code >= 300 else ''}")
    r = c.post(be + "/api/v1/auth/login", json={"email": email, "password": pw})
    ok = check("Đăng nhập lấy JWT", r.status_code == 200 and "accessToken" in r.json(), f"HTTP {r.status_code}")
    if not ok:
        return finish()
    auth = {"Authorization": "Bearer " + r.json()["accessToken"]}
    api = lambda p: be + "/api/v1" + p  # noqa: E731
    r = c.get(api("/ai/health"), headers=auth)
    hb = r.json() if r.status_code == 200 else {}
    check("Backend -> AI /ai/health (có JWT)", r.status_code == 200 and hb.get("status") == "ok", f"HTTP {r.status_code} {hb}")

    fac = c.post(api("/facilities"), headers=auth, json={"name": "Nhà máy 1", "address": "Bình Dương", "country": "VN", "gridRegion": "VN"})
    check("Tạo nhà máy", fac.status_code in (200, 201), f"HTTP {fac.status_code}")
    per = c.post(api("/periods"), headers=auth, json={"facilityId": fac.json().get("id"), "name": "Q3-2025",
                                                       "startDate": "2025-07-01", "endDate": "2025-09-30"}) if fac.status_code < 300 else None
    period_id = per.json().get("id") if per is not None and per.status_code < 300 else None
    check("Tạo kỳ báo cáo", bool(period_id), f"HTTP {per.status_code if per is not None else '-'}")

    print("C. AI service gọi TRỰC TIẾP (đối chứng)")
    direct = {}
    for n, act, code, qty, amount in CASES:
        p = find_sample(n); fname = p.name if p else str(n)
        if not p:
            check(f"Có file mẫu số {n} (chạy eval/generate_dataset.py)", False)
            continue
        r = c.post(ai + "/ai/extract-invoice", files={"file": (p.name, p.read_bytes(), MIME[p.suffix])})
        d = r.json().get("data", {}) if r.status_code == 200 else {}
        direct[fname] = d
        main = d.get("quantity") if act != "FREIGHT" else d.get("weight_kg")
        check(f"AI trực tiếp đọc đúng {act}", d.get("factor_code") == code and abs((main or 0) - qty) < 1 and abs((d.get("amount") or 0) - amount) < 1,
              f"code={d.get('factor_code')} main={main} amount={d.get('amount')}")

    print("D. Qua BACKEND (đúng đường người dùng đi): /api/v1/ai/extract-invoice")
    for n, act, code, qty, amount in CASES:
        p = find_sample(n); fname = p.name if p else str(n)
        if not p:
            continue
        r = c.post(api("/ai/extract-invoice"), headers=auth, files={"file": (p.name, p.read_bytes(), MIME[p.suffix])})
        j = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
        line = (j.get("lines") or [{}])[0]
        main = line.get("quantity")
        ok = (r.status_code == 200 and bool(j.get("supplier_name")) and abs((j.get("total_amount") or 0) - amount) < 1
              and line.get("factor_code") == code and abs((main or 0) - qty) < 1 and j.get("doc_type"))
        check(f"Backend trả đúng giá trị trích xuất ({act})", ok,
              f"HTTP {r.status_code}; NCC={j.get('supplier_name')!r} số HĐ={j.get('invoice_no')!r} tổng={j.get('total_amount')} "
              f"dòng={line.get('factor_code')}/{main} {line.get('unit')} loại={j.get('doc_type')} tin cậy={j.get('overall_confidence')}")

    print("E. Phân loại qua backend")
    r = c.post(api("/ai/classify-activity"), headers=auth, json={"description": "Dầu diesel DO 0,05S cho máy phát điện", "unit": "Lít"})
    j = r.json() if r.status_code == 200 else {}
    check("Classify -> FUEL_DIESEL, Scope 1 (kèm confidence, reasoning)", j.get("factor_code") == "FUEL_DIESEL" and j.get("scope") == 1 and j.get("confidence") and j.get("reasoning"), f"HTTP {r.status_code} {j}")

    print("F. Tải chứng từ lên (luồng chính)")
    if period_id:
        p = find_sample(CASES[0][0])
        r = c.post(api("/documents"), headers=auth, data={"periodId": period_id, "docType": "ELECTRICITY_BILL"},
                   files={"file": (p.name, p.read_bytes(), MIME[p.suffix])})
        check("POST /documents lưu được chứng từ", r.status_code in (200, 201), f"HTTP {r.status_code} {r.text[:140]}")

    print("G. Từ kết quả AI -> dữ liệu hoạt động -> tính CO2e (backend)")
    if period_id:
        cat = {"ELECTRICITY": ("ELECTRICITY", "kWh"), "FUEL": ("STATIONARY_FUEL", "litre"), "MATERIAL": ("PURCHASED_MATERIAL", "kg")}
        made = 0
        for n, act, code, qty, amount in CASES:
            if act not in cat:
                continue
            d = direct.get(find_sample(n).name, {})
            category, unit = cat[act]
            q = d.get("quantity")
            r = c.post(api("/activities"), headers=auth, json={"periodId": period_id, "activityDate": d.get("invoice_date") or "2025-08-15",
                                                                  "category": category, "subType": None, "quantity": q, "unit": unit, "note": f"AI: {fname}"})
            made += r.status_code in (200, 201)
            if r.status_code >= 300:
                print("     ", act, "HTTP", r.status_code, r.text[:160])
        check("Tạo hoạt động từ kết quả AI", made == 3, f"{made}/3 hoạt động")
        r = c.post(api(f"/periods/{period_id}/calculate"), headers=auth)
        check("Backend tính CO2e kỳ", r.status_code == 200, f"HTTP {r.status_code} {r.text[:160]}")
        s = c.get(api(f"/periods/{period_id}/summary"), headers=auth)
        sj = s.json() if s.status_code == 200 else {}
        print("      summary:", {k: sj.get(k) for k in ("scope1Co2eKg", "scope2Co2eKg", "scope3Co2eKg", "totalCo2eKg") if k in sj})
        check("Tổng hợp inventory có số liệu", s.status_code == 200 and (sj.get("totalCo2eKg") or 0) > 0, f"HTTP {s.status_code}")

    print("H. Gợi ý tối ưu qua backend")
    if period_id:
        r = c.post(api(f"/ai/optimize/{period_id}"), headers=auth)
        j = r.json() if r.status_code == 200 else {}
        sug = j.get("suggestions") or []
        titles = [x.get("title", "") for x in sug]
        fallback = any("300 kWp" in t or "sinh khối" in t for t in titles)
        empty = not sug and "dữ liệu" in (j.get("summary") or "")
        if empty:  # kỳ chưa có hoạt động nào (backend chưa cài đặt tạo hoạt động) => AI trả "chưa có dữ liệu", không phải câu viết cứng
            check("Gợi ý do AI trả (kỳ trống => AI báo chưa có dữ liệu, không dùng câu viết cứng)", r.status_code == 200 and not fallback,
                  f"HTTP {r.status_code}; summary={j.get('summary')!r}")
        else:
            check("Gợi ý lấy từ AI thật (không phải câu viết cứng)", r.status_code == 200 and bool(sug) and not fallback
                  and all(x.get("target_factor_code") for x in sug) and bool(j.get("summary")),
                  f"{len(sug)} gợi ý; viết cứng={fallback}; titles={titles[:2]}")

    print("I. Đường đi THẬT của giao diện: frontend /api/v1/ai/* (Vite proxy)")
    p = find_sample(CASES[1][0])
    r = c.post(web + "/api/v1/ai/extract-invoice", files={"file": (p.name, p.read_bytes(), MIME[p.suffix])})
    j = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    need = ["supplier_name", "total_amount", "lines", "invoice_date", "invoice_no", "doc_type", "overall_confidence"]
    miss = [k for k in need if j.get(k) in (None, [], "")]
    check("Giao diện nhận đủ trường và đúng giá trị (NCC, tổng tiền)", r.status_code == 200 and not miss and abs((j.get("total_amount") or 0) - CASES[1][4]) < 1,
          f"HTTP {r.status_code}; thiếu: {miss or 'không'}; NCC={j.get('supplier_name')!r}; tổng={j.get('total_amount')}")
    r = c.post(web + f"/api/v1/ai/optimize/{period_id}", params={"language": "vi", "maxSuggestions": 5})
    check("Giao diện gọi được /ai/optimize/{kỳ} (Vite dev proxy chuyển thẳng sang AI nên 404: lỗi cấu hình của bạn họ)", r.status_code == 200, f"HTTP {r.status_code} {r.text[:100]}")

    finish()


def finish():
    n_ok = sum(1 for _, ok, _ in results if ok)
    print(f"\nKết quả: {n_ok}/{len(results)} PASS")
    for name, ok, detail in results:
        if not ok:
            print(f"  FAIL: {name} -> {detail}")
    sys.exit(0 if n_ok == len(results) else 1)


if __name__ == "__main__":
    t = time.time()
    main()
