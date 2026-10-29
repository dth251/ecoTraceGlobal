"""Test e2e toàn hệ thống: frontend (Vite dev hoặc nginx) -> backend Spring Boot -> AI service (-> Gemini).

Chạy được cả trên máy lẫn trên GitHub Actions (.github/workflows/e2e.yml):
  * Có khóa Gemini  -> AI chạy thật, kiểm tra ĐÚNG GIÁ TRỊ trích xuất của 4 chứng từ mẫu.
  * Không có khóa   -> AI chạy mock, chỉ kiểm tra cấu trúc/hợp đồng dữ liệu (giá trị mock cố định).

Các chức năng backend chưa cài đặt (tải chứng từ, tạo hoạt động, tính CO2e) được ghi nhận là "GAP" (khoảng trống đã biết),
không làm job đỏ. Khi backend làm xong, chúng tự chuyển thành PASS. Dùng --strict để coi GAP là lỗi.

    python scripts/e2e_full_stack.py
    python scripts/e2e_full_stack.py --web http://localhost:5173 --backend http://localhost:8080 --ai http://localhost:8001
"""
import argparse
import sys
import uuid
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
SAMPLES = ROOT / "samples_preview"  # 4 chứng từ mẫu (ảnh PNG) đã commit trong repo

# (loại, factor_code, số lượng/khối lượng chính, tổng tiền, file mẫu)
CASES = [
    ("ELECTRICITY", "ELEC_GRID", 75280.0, 178521257.0, "Scope2_dien.png"),
    ("FUEL", "FUEL_DIESEL", 879.0, 19220692.0, "Scope1_nhien_lieu.png"),
    ("MATERIAL", "MAT_COTTON", 15000.0, 867210300.0, "Scope3_nguyen_lieu.png"),
    ("FREIGHT", "FREIGHT_SEA", 14750.0, 67090000.0, "Scope3_van_chuyen.png"),
]
DOC_TYPE = {"ELECTRICITY": "ELECTRICITY_BILL", "FUEL": "FUEL_INVOICE", "MATERIAL": "MATERIAL_INVOICE", "FREIGHT": "BILL_OF_LADING"}

# (tên, đạt?, chi tiết, lý do nếu là khoảng trống đã biết)
results: list[tuple[str, bool, str, str | None]] = []


def check(name: str, ok: bool, detail: str = "", gap: str | None = None) -> bool:
    results.append((name, bool(ok), detail, gap))
    tag = "PASS" if ok else ("GAP " if gap else "FAIL")
    print(f"  {tag}  {name}" + (f"  -> {detail}" if detail else "") + (f"  [{gap}]" if gap and not ok else ""))
    return bool(ok)


def body(r: httpx.Response) -> dict:
    return r.json() if r.headers.get("content-type", "").startswith("application/json") else {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--web", default="http://127.0.0.1:5173", help="frontend (Vite dev hoặc nginx)")
    ap.add_argument("--backend", default="http://127.0.0.1:8080", help="Spring Boot")
    ap.add_argument("--ai", default="http://127.0.0.1:8001")
    ap.add_argument("--strict", action="store_true", help="coi khoảng trống đã biết (GAP) là lỗi")
    args = ap.parse_args()
    web, ai, be = args.web.rstrip("/"), args.ai.rstrip("/"), args.backend.rstrip("/")
    c = httpx.Client(timeout=180)

    print("A. Hạ tầng")
    r = c.get(web + "/")
    check("Frontend trả trang chủ", r.status_code == 200 and '<div id="root"' in r.text, f"HTTP {r.status_code}")
    # Vite dev biên dịch từng module: nếu thiếu src/lib/* (từng bị .gitignore loại) thì module này lỗi 500
    r = c.get(web + "/src/components/ui/NumberInput.tsx")
    check("Frontend biên dịch được module dùng src/lib (không thiếu file)", r.status_code == 200, f"HTTP {r.status_code}")
    h = c.get(ai + "/health").json()
    mock = bool(h.get("mock_mode"))
    check("AI service /health", h.get("status") == "ok", f"model={h.get('model')} mock={mock} db={h.get('database', {}).get('status')}")
    print(f"      Chế độ AI: {'MOCK (chỉ kiểm tra cấu trúc)' if mock else 'GEMINI THẬT (kiểm tra đúng giá trị)'}")

    print("B. Đăng ký, đăng nhập, dữ liệu nền")
    email = f"e2e_{uuid.uuid4().hex[:8]}@example.com"
    pw = "Passw0rdE2E"
    r = c.post(be + "/api/v1/auth/register", json={"organizationName": "Công ty Dệt May E2E", "taxCode": "0312345678",
                                                      "fullName": "Tester E2E", "email": email, "password": pw})
    check("Đăng ký tổ chức + người dùng", r.status_code in (200, 201), f"HTTP {r.status_code} {r.text[:120] if r.status_code >= 300 else ''}")
    r = c.post(be + "/api/v1/auth/login", json={"email": email, "password": pw})
    if not check("Đăng nhập lấy JWT", r.status_code == 200 and "accessToken" in body(r), f"HTTP {r.status_code}"):
        return finish(args.strict)
    auth = {"Authorization": "Bearer " + r.json()["accessToken"]}
    api = lambda p: be + "/api/v1" + p  # noqa: E731

    r = c.get(api("/ai/health"), headers=auth)
    check("Backend -> AI /ai/health (có JWT)", r.status_code == 200 and body(r).get("status") == "ok", f"HTTP {r.status_code}")

    fac = c.post(api("/facilities"), headers=auth, json={"name": "Nhà máy 1", "address": "Bình Dương", "country": "VN", "gridRegion": "VN"})
    check("Tạo nhà máy (ghi audit log)", fac.status_code in (200, 201), f"HTTP {fac.status_code} {fac.text[:100] if fac.status_code >= 300 else ''}")
    per = c.post(api("/periods"), headers=auth, json={"facilityId": body(fac).get("id"), "name": "Q3-2025",
                                                       "startDate": "2025-07-01", "endDate": "2025-09-30"}) if fac.status_code < 300 else None
    period_id = body(per).get("id") if per is not None and per.status_code < 300 else None
    check("Tạo kỳ báo cáo", bool(period_id), f"HTTP {per.status_code if per is not None else '-'}")

    def extract(url: str, sample: Path, act: str, headers=None):
        # Chế độ mock trả dữ liệu theo gợi ý loại chứng từ: AI đọc `doc_type`, backend đọc `docType` (gửi cả hai)
        data = {"doc_type": act, "docType": act} if mock else None
        return c.post(url, headers=headers or {}, files={"file": (sample.name, sample.read_bytes(), "image/png")}, data=data)

    def good(j: dict, act: str, code: str, qty: float, amount: float) -> tuple[bool, str]:
        line = (j.get("lines") or [{}])[0]
        struct = (bool(j.get("supplier_name")) and bool(j.get("invoice_date")) and j.get("total_amount") and j.get("doc_type") == DOC_TYPE[act]
                  and line.get("factor_code") == code and line.get("quantity") and line.get("unit") and j.get("overall_confidence") is not None)
        values = abs((j.get("total_amount") or 0) - amount) < 1 and abs((line.get("quantity") or 0) - qty) < 1
        return bool(struct and (mock or values)), (f"NCC={j.get('supplier_name')!r} số HĐ={j.get('invoice_no')!r} tổng={j.get('total_amount')} "
                                                   f"dòng={line.get('factor_code')}/{line.get('quantity')} {line.get('unit')} loại={j.get('doc_type')} "
                                                   f"tin cậy={j.get('overall_confidence')}")

    print("C. AI service gọi TRỰC TIẾP (đối chứng)")
    extracted: dict[str, dict] = {}
    for act, code, qty, amount, fname in CASES:
        r = extract(ai + "/ai/extract-invoice", SAMPLES / fname, act)
        j = body(r)
        extracted[act] = j.get("data") or {}
        ok, detail = good(j, act, code, qty, amount)
        check(f"AI trả đúng {act}", r.status_code == 200 and ok, f"HTTP {r.status_code}; {detail}")
    # Tổng hợp cả lô 4 chứng từ (điều giao diện làm khi người dùng chọn nhiều file): tổng CO2e theo Scope 1/2/3
    r = c.post(ai + "/ai/estimate", json={"items": [{"name": act, "data": d} for act, d in extracted.items()]})
    est = body(r)
    by = est.get("by_scope") or {}
    ok = (r.status_code == 200 and est.get("calculated") == len(CASES) and all((by.get(k) or 0) > 0 for k in "123")
          and abs(sum(by.values()) - est.get("total_co2e_kg", 0)) < 1 and bool(est.get("optimization", {}).get("suggestions")))
    if not mock:  # 2.355,72 + 49.684,8 + 88.500 + 295 (hệ số tham khảo của bản demo)
        ok = ok and abs(est.get("total_co2e_kg", 0) - 140835.52) < 5
    check("AI tổng hợp 4 chứng từ thành tổng CO2e theo Scope 1/2/3 kèm gợi ý", ok, f"HTTP {r.status_code}; tổng={est.get('total_co2e_kg')}; theo scope={by}")
    r = c.post(ai + "/ai/estimate", json={"items": [{"name": act, "data": d} for act, d in extracted.items() if act in ("ELECTRICITY", "FUEL")]})
    by = body(r).get("by_scope") or {}
    check("Thiếu một Scope vẫn tính được (Scope 3 = 0)", r.status_code == 200 and by.get("3") == 0 and (by.get("1") or 0) > 0 and (by.get("2") or 0) > 0, f"theo scope={by}")
    r = c.post(ai + "/ai/optimize", json={"inventory_summary": {"ELECTRICITY": 8000, "STATIONARY_FUEL": 2000, "UPSTREAM_TRANSPORT": 1000},
                                          "language": "vi", "max_suggestions": 3})
    j = body(r)
    sug = j.get("suggestions") or []
    check("AI nhận cấu trúc gợi ý của backend và trả gợi ý đủ trường",
          r.status_code == 200 and len(sug) == 3 and bool(j.get("summary")) and all(s.get("target_factor_code") and s.get("difficulty") and s.get("description") for s in sug),
          f"HTTP {r.status_code}; {len(sug)} gợi ý; đầu bảng: {sug[0].get('target_factor_code') if sug else None}")

    print("D. Qua BACKEND (đúng đường người dùng đi): /api/v1/ai/extract-invoice")
    for act, code, qty, amount, fname in CASES:
        r = extract(api("/ai/extract-invoice"), SAMPLES / fname, act, auth)
        ok, detail = good(body(r), act, code, qty, amount)
        check(f"Backend trả đúng trích xuất ({act})", r.status_code == 200 and ok, f"HTTP {r.status_code}; {detail}")

    print("E. Phân loại qua backend")
    r = c.post(api("/ai/classify-activity"), headers=auth, json={"description": "Dầu diesel DO 0,05S cho máy phát điện", "unit": "Lít"})
    j = body(r)
    check("Classify -> FUEL_DIESEL, Scope 1 (kèm confidence, reasoning)",
          j.get("factor_code") == "FUEL_DIESEL" and j.get("scope") == 1 and j.get("confidence") and j.get("reasoning"), f"HTTP {r.status_code} {j}")

    print("F. Tải chứng từ lên (luồng chính)")
    if period_id:
        s = SAMPLES / CASES[0][4]
        r = c.post(api("/documents"), headers=auth, data={"periodId": period_id, "docType": "ELECTRICITY_BILL"}, files={"file": (s.name, s.read_bytes(), "image/png")})
        check("POST /documents lưu được chứng từ", r.status_code in (200, 201), f"HTTP {r.status_code}", gap="backend chưa cài đặt POST /documents (Sprint 2)")

    print("G. Từ kết quả AI -> hoạt động -> tính CO2e (backend)")
    if period_id:
        cat = {"ELECTRICITY": ("ELECTRICITY", "kWh"), "FUEL": ("STATIONARY_FUEL", "litre"), "MATERIAL": ("PURCHASED_MATERIAL", "kg")}
        made = 0
        for act, code, qty, amount, fname in CASES:
            if act in cat:
                r = c.post(api("/activities"), headers=auth, json={"periodId": period_id, "activityDate": "2025-08-15", "category": cat[act][0],
                                                                      "subType": None, "quantity": qty, "unit": cat[act][1], "note": f"AI: {fname}"})
                made += r.status_code in (200, 201)
        check("Tạo hoạt động từ kết quả AI", made == 3, f"{made}/3 hoạt động", gap="backend chưa cài đặt POST /activities")
        c.post(api(f"/periods/{period_id}/calculate"), headers=auth)
        r = c.get(api(f"/periods/{period_id}/summary"), headers=auth)
        check("Tổng hợp inventory có số liệu", r.status_code == 200 and (body(r).get("totalCo2eKg") or 0) > 0, f"HTTP {r.status_code}",
              gap="phép tính CO2e của backend còn là khung (Sprint 3)")

    print("H. Gợi ý tối ưu qua backend")
    if period_id:
        r = c.post(api(f"/ai/optimize/{period_id}"), headers=auth)
        j = body(r)
        sug = j.get("suggestions") or []
        hardcoded = any("300 kWp" in x.get("title", "") or "sinh khối" in x.get("title", "") for x in sug)
        if sug:
            check("Gợi ý do AI trả (không phải câu viết cứng)", r.status_code == 200 and not hardcoded and all(x.get("target_factor_code") for x in sug) and bool(j.get("summary")),
                  f"{len(sug)} gợi ý; viết cứng={hardcoded}")
        else:  # kỳ chưa có hoạt động nào => AI phải báo "chưa có dữ liệu" (không dùng câu viết cứng dự phòng của backend)
            check("Gợi ý do AI trả (kỳ trống => AI báo chưa có dữ liệu)", r.status_code == 200 and "dữ liệu" in (j.get("summary") or ""), f"HTTP {r.status_code}; summary={j.get('summary')!r}")

    print("I. Đường đi của giao diện qua proxy của frontend")
    r = extract(web + "/api/v1/ai/extract-invoice", SAMPLES / CASES[1][4], CASES[1][0], auth)
    ok, detail = good(body(r), *CASES[1][:4])
    check("Giao diện nhận đủ trường và đúng giá trị", r.status_code == 200 and ok, f"HTTP {r.status_code}; {detail}")
    if period_id:
        r = c.post(web + f"/api/v1/ai/optimize/{period_id}", headers=auth)
        check("Giao diện gọi được /ai/optimize/{kỳ}", r.status_code == 200, f"HTTP {r.status_code}",
              gap="Vite dev chuyển /api/v1/ai thẳng sang AI (nginx production thì về backend)")

    finish(args.strict)


def finish(strict: bool = False):
    passed = [r for r in results if r[1]]
    gaps = [r for r in results if not r[1] and r[3]]
    fails = [r for r in results if not r[1] and not r[3]]
    print(f"\nKết quả: {len(passed)} PASS | {len(gaps)} GAP (khoảng trống đã biết của backend) | {len(fails)} FAIL")
    for name, _, detail, _ in fails:
        print(f"  FAIL: {name} -> {detail}")
    for name, _, _, why in gaps:
        print(f"  GAP : {name} -> {why}")
    sys.exit(1 if fails or (strict and gaps) else 0)


if __name__ == "__main__":
    main()
