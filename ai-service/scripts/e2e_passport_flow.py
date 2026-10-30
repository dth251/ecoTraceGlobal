"""E2E riêng cho luồng cấp hộ chiếu xanh (không chạy cả hệ thống).

Luồng: tạo kỳ + sản phẩm -> AI đọc 4 chứng từ mẫu -> lưu vào kỳ làm bản nháp -> chưa xác nhận thì bị chặn
-> xác nhận nhập liệu (+ chứng từ các tháng còn lại) -> tính phát thải -> nhập sản lượng -> khóa kỳ
-> xét điều kiện -> cấp -> xác minh công khai (chữ ký) -> thu hồi.

Cần backend (8080), ai-service (8001) và PostgreSQL đang chạy. Tạo dữ liệu thử mới mỗi lần chạy (nhà máy "E2E Passport ...").
Chạy: .venv/Scripts/python scripts/e2e_passport_flow.py
"""
import io
import sys
import time
from pathlib import Path

import httpx

BACKEND = "http://127.0.0.1:8080/api/v1"
AI = "http://127.0.0.1:8001"
EMAIL, PASSWORD = "lan@abc-mech.vn", "DemoPassword123"
SAMPLES = Path(__file__).resolve().parents[1] / "samples_preview"
RUN = str(int(time.time()))

results: list[tuple[bool, str]] = []


def check(ok: bool, label: str, detail: str = "") -> None:
    results.append((ok, label))
    print(("PASS " if ok else "FAIL ") + label + (f"  ({detail})" if detail else ""))


def png(seed: str) -> bytes:
    """PNG 1x1 khác nhau theo seed (để không trùng SHA-256), dùng làm 'ảnh chứng từ' cho các tháng nhập tay."""
    import struct
    import zlib

    def chunk(t: bytes, d: bytes) -> bytes:
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    raw = b"\x00" + bytes([hash(seed) % 256, 120, 80])
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
            + chunk(b"tEXt", b"seed\x00" + seed.encode()) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def main() -> int:
    c = httpx.Client(base_url=BACKEND, timeout=120)
    tok = c.post("/auth/login", json={"email": EMAIL, "password": PASSWORD}).json()["accessToken"]
    c.headers["Authorization"] = f"Bearer {tok}"

    fac = c.post("/facilities", json={"name": f"E2E Passport {RUN}", "country": "VN", "gridRegion": "VN"}).json()
    period = c.post("/periods", json={"facilityId": fac["id"], "name": f"Q3-{RUN}", "startDate": "2026-07-01",
                                      "endDate": "2026-09-30"}).json()
    pid = period["id"]
    product = c.post("/products", json={"name": f"Steel coil {RUN}", "cnCode": "72081000", "unit": "t"}).json()
    check(bool(pid and product.get("id")), "tạo nhà máy, kỳ Q3, sản phẩm thép (CN 72)")

    # 1. AI đọc 4 chứng từ mẫu, lưu vào kỳ làm bản nháp (giống trang Trợ lý AI)
    drafts = {}
    for f in sorted(SAMPLES.glob("*.png")):
        content = f.read_bytes() + RUN.encode()  # đổi SHA-256 mỗi lần chạy để không bị báo trùng
        ext = httpx.post(f"{AI}/ai/extract-invoice", files={"file": (f.name, f.read_bytes(), "image/png")},
                         timeout=180).json()
        doc = c.post("/documents", params={"periodId": pid, "docType": ext["doc_type"]},
                     files={"file": (f.name, io.BytesIO(content), "image/png")}).json()
        r = c.put(f"/documents/{doc['id']}/ai-draft", json=ext)
        drafts[f.name] = (doc["id"], ext)
        check(r.status_code == 200 and r.json()["aiDraft"], f"AI đọc và lưu bản nháp: {f.name}", ext["doc_type"])

    dup = c.post("/documents", params={"periodId": pid},
                 files={"file": ("dup.png", io.BytesIO((SAMPLES / "Scope2_dien.png").read_bytes() + RUN.encode()), "image/png")})
    check(dup.status_code == 409 and dup.json().get("code") == "DUPLICATE_DOCUMENT", "tải trùng file bị chặn (409)")

    # 2. Bản nháp chưa xác nhận thì chưa có hoạt động nào được tính
    calc = c.post(f"/periods/{pid}/calculate").json()
    check(calc["activities"] == 0, "bản nháp AI chưa xác nhận không được tính", f"activities={calc['activities']}")

    # 3. Người dùng mở từng chứng từ, đối chiếu và lưu (xác nhận). Ngày đặt vào tháng 7 để nằm trong kỳ.
    month_dates = {"Scope2_dien.png": ("2026-07-01", "2026-07-31"), "Scope1_nhien_lieu.png": "2026-07-15",
                   "Scope3_nguyen_lieu.png": "2026-07-20", "Scope3_van_chuyen.png": "2026-07-25"}
    for name, (doc_id, ext) in drafts.items():
        entry = c.get(f"/documents/{doc_id}/entry").json()
        data = dict(entry["data"])
        if entry["docType"] == "ELECTRICITY_BILL":
            data["startDate"], data["endDate"] = month_dates[name]
        else:
            data["date"] = month_dates[name]
        if entry["docType"] == "BILL_OF_LADING" and not data.get("distanceKm"):
            data["distanceKm"] = 17000
        if entry["docType"] == "MATERIAL_INVOICE":
            data["materialGroup"] = "Thép cuộn"  # người dùng đối chiếu và ghi rõ loại nguyên liệu
        r = c.put(f"/documents/{doc_id}/entry", json={"data": data, "acknowledgeWarnings": True})
        check(r.status_code == 200 and r.json()["status"] == "ENTERED", f"xác nhận nhập liệu: {name}",
              "" if r.status_code == 200 else r.text[:200])

    # 4. Chứng từ các tháng 8, 9 (điện + nhiên liệu) để đủ dữ liệu cả kỳ
    for month in ("08", "09"):
        for kind, body in (("ELECTRICITY_BILL", {"supplierName": "EVN", "startDate": f"2026-{month}-01",
                                                 "endDate": f"2026-{month}-28", "totalKwh": 41000}),
                           ("FUEL_INVOICE", {"supplier": "Petrolimex", "date": f"2026-{month}-10", "fuelType": "DIESEL",
                                             "quantity": 800, "unit": "L"})):
            doc = c.post("/documents", params={"periodId": pid, "docType": kind},
                         files={"file": (f"{kind}-{month}.png", io.BytesIO(png(RUN + kind + month)), "image/png")}).json()
            r = c.put(f"/documents/{doc['id']}/entry", json={"data": body, "acknowledgeWarnings": True})
            check(r.status_code == 200, f"nhập chứng từ tháng {month}: {kind}", "" if r.status_code == 200 else r.text[:200])

    bad = c.post("/documents", params={"periodId": pid, "docType": "FUEL_INVOICE"},
                 files={"file": ("bad.png", io.BytesIO(png(RUN + "bad")), "image/png")}).json()
    r = c.put(f"/documents/{bad['id']}/entry", json={"data": {"fuelType": "DIESEL", "quantity": 5, "date": "2026-11-02"}})
    check(r.status_code == 422 and r.json().get("code") == "VALIDATION_FAILED", "ngày ngoài kỳ bị chặn khi lưu")
    c.post(f"/documents/{bad['id']}/reject", json={"reason": "Chứng từ thuộc kỳ khác"})

    # 5. Tính phát thải
    calc = c.post(f"/periods/{pid}/calculate").json()
    check(calc["recordsCalculated"] == calc["activities"] == 8 and not calc["failures"],
          "tính phát thải đủ 8 hoạt động", f"{calc['recordsCalculated']}/{calc['activities']}, lỗi={calc['failures']}")
    summ = c.get(f"/periods/{pid}/summary").json()
    check(summ["totalCo2eKg"] > 0 and summ["scope1Co2eKg"] > 0 and summ["scope2Co2eKg"] > 0 and summ["scope3Co2eKg"] > 0,
          "tổng hợp có đủ Scope 1/2/3", f"total={summ['totalCo2eKg']}")
    acts = c.get("/activities", params={"periodId": pid}).json()
    check(len(acts) == 8 and all(a["co2eKg"] is not None for a in acts),
          "danh sách hoạt động kèm phát thải (dạng giao diện mới)", f"{len(acts)} hoạt động")

    # 6. Chưa có sản lượng, chưa khóa kỳ -> chưa được cấp, lý do rõ ràng
    rd = c.get(f"/periods/{pid}/passports/readiness", params={"productId": product["id"]}).json()
    check(not rd["can_issue"] and "ALLOCATION" in rd["blockers"] and "PERIOD_LOCKED" in rd["blockers"],
          "chưa sản lượng + chưa khóa kỳ: chưa đủ điều kiện", f"blockers={rd['blockers']}")

    # 7. Nhập sản lượng (phân bổ theo khối lượng), khóa kỳ
    r = c.post(f"/periods/{pid}/production", json=[{"productId": product["id"], "quantity": 120, "unit": "t"}])
    check(r.status_code == 200 and r.json()["footprints"] == 1, "nhập sản lượng 120 t, phân bổ dấu chân sản phẩm")
    c.post(f"/periods/{pid}/lock")
    rd = c.get(f"/periods/{pid}/passports/readiness", params={"productId": product["id"]}).json()
    check(rd["can_issue"] and rd["decision"] == "PROVISIONAL" and not rd["blockers"],
          "đủ 8 điều kiện: được cấp tạm (chưa thẩm định độc lập)", f"{rd['decision']} {rd['score']}/100 blockers={rd['blockers']}")

    # 8. Cấp, xác minh công khai, thu hồi
    r = c.post(f"/periods/{pid}/passports", json={"productId": product["id"]})
    pp = r.json()
    check(r.status_code == 201 and pp.get("status") == "VALID", "cấp hộ chiếu", pp.get("publicCode", r.text[:200]))
    if r.status_code == 201:
        pub = httpx.get(f"{BACKEND}/public/verify/{pp['publicCode']}").json()
        check(pub["status"] == "VALID" and pub["signatureValid"] and pub["totalPerUnit"] > 0,
              "xác minh công khai: chữ ký hợp lệ", f"{pub['totalPerUnit']} kgCO2e/t")
        c.post(f"/passports/{pp['id']}/revoke", json={"reason": "e2e"})
        pub = httpx.get(f"{BACKEND}/public/verify/{pp['publicCode']}").json()
        check(pub["status"] == "REVOKED", "thu hồi: trang công khai báo đã thu hồi")

    failed = [label for ok, label in results if not ok]
    print(f"\n{len(results) - len(failed)} PASS | {len(failed)} FAIL")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
