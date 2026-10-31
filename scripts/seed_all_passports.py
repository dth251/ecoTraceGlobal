import json
import urllib.request
import urllib.error
import psycopg2

API = "http://localhost:8080/api/v1"

def req_json(url, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        return e.code, json.loads(content) if content else {}

def upload_multipart(url, period_id, doc_type, file_name, file_bytes, token):
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = bytearray()
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{file_name}"\r\n'.encode("utf-8"))
    body.extend(b"Content-Type: image/png\r\n\r\n")
    body.extend(file_bytes)
    body.extend(f"\r\n--{boundary}--\r\n".encode("utf-8"))

    full_url = f"{url}?periodId={period_id}&docType={doc_type}"
    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Authorization": f"Bearer {token}"
    }
    req = urllib.request.Request(full_url, data=bytes(body), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        return e.code, json.loads(content) if content else {}

def dummy_png(tag):
    import struct, zlib
    def chunk(t: bytes, d: bytes) -> bytes:
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    raw = b"\x00\xff\x00\x00" + tag.encode()
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
            + chunk(b"tEXt", b"tag\x00" + tag.encode()) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))

def seed_period_passport(email, password, period_id, prod_id, months):
    status, res = req_json(f"{API}/auth/login", method="POST", data={"email": email, "password": password})
    if status != 200:
        print("Failed login for", email, status, res)
        return
    token = res["accessToken"]

    # Unlock period
    req_json(f"{API}/periods/{period_id}/unlock", method="POST", token=token)

    # Clean up unlinked manual activities in DB for this period so readiness is 100/100
    conn = psycopg2.connect("postgresql://postgres:123456@localhost:5432/ecotrace")
    cur = conn.cursor()
    cur.execute("DELETE FROM activity_data WHERE period_id = %s AND source_document_id IS NULL", (period_id,))
    conn.commit()

    # Clean up pending docs via API
    _, docs = req_json(f"{API}/documents?periodId={period_id}", token=token)
    if isinstance(docs, list):
        for d in docs:
            if d.get("status") == "PENDING_ENTRY":
                req_json(f"{API}/documents/{d['id']}/reject", method="POST", data={"reason": "clean"}, token=token)

    # Upload & enter Scope 1, Scope 2, Scope 3 documents for each month
    for idx, m in enumerate(months):
        tag_prefix = f"{period_id[:6]}_{m}_{idx}"
        # Scope 2: Electricity
        st, doc_e = upload_multipart(f"{API}/documents", period_id, "ELECTRICITY_BILL", f"EVN_{m}.png", dummy_png(f"e_{tag_prefix}"), token)
        if st in (200, 201):
            req_json(f"{API}/documents/{doc_e['id']}/entry", method="PUT", data={
                "data": {"supplierName": "EVN", "startDate": f"{m}-01", "endDate": f"{m}-28", "totalKwh": 35000},
                "acknowledgeWarnings": True
            }, token=token)

        # Scope 1: Fuel
        st, doc_f = upload_multipart(f"{API}/documents", period_id, "FUEL_INVOICE", f"Petrolimex_{m}.png", dummy_png(f"f_{tag_prefix}"), token)
        if st in (200, 201):
            req_json(f"{API}/documents/{doc_f['id']}/entry", method="PUT", data={
                "data": {"supplier": "Petrolimex", "date": f"{m}-15", "fuelType": "DIESEL", "quantity": 2800, "unit": "L"},
                "acknowledgeWarnings": True
            }, token=token)

    # Scope 3: Material
    st, doc_m = upload_multipart(f"{API}/documents", period_id, "MATERIAL_INVOICE", f"Material_{months[0]}.png", dummy_png(f"m2_{period_id[:6]}"), token)
    if st in (200, 201):
        req_json(f"{API}/documents/{doc_m['id']}/entry", method="PUT", data={
            "data": {"supplier": "Posco VN", "date": f"{months[0]}-10", "items": [{"materialType": "STEEL", "quantity": 85, "unit": "t"}]},
            "acknowledgeWarnings": True
        }, token=token)

    # Clean up any remaining pending docs
    _, docs = req_json(f"{API}/documents?periodId={period_id}", token=token)
    if isinstance(docs, list):
        for d in docs:
            if d.get("status") == "PENDING_ENTRY":
                req_json(f"{API}/documents/{d['id']}/reject", method="POST", data={"reason": "clean"}, token=token)

    # Recalculate & allocate production
    req_json(f"{API}/periods/{period_id}/calculate", method="POST", token=token)
    req_json(f"{API}/periods/{period_id}/production", method="POST", data=[
        {"productId": prod_id, "quantity": 500, "unit": "t"}
    ], token=token)

    # Lock period
    req_json(f"{API}/periods/{period_id}/lock", method="POST", token=token)

    # Check readiness
    _, rd = req_json(f"{API}/periods/{period_id}/passports/readiness?productId={prod_id}", token=token)
    print(f"[{email} | {period_id[:8]}] Readiness Score: {rd.get('score')}/100, can_issue={rd.get('can_issue')}")

    # Check if passport already exists for this period
    _, existing = req_json(f"{API}/periods/{period_id}/passports", token=token)
    if not existing:
        st, p = req_json(f"{API}/periods/{period_id}/passports", method="POST", data={"productId": prod_id}, token=token)
        if st == 201:
            print(f"  -> Issued Passport: {p.get('publicCode')} ({p.get('productName')})")
        else:
            print(f"  -> Failed to issue: {st} {p}")
    else:
        print(f"  -> Already has passport: {existing[0].get('publicCode')}")

# 1. admin@ecotrace.vn - Q3/2026
seed_period_passport(
    "admin@ecotrace.vn",
    "Password123!",
    "2f5b15b2-b9f9-490e-9fd5-27352a6f8860",
    "eda8e8cd-be88-40bd-8161-199737b09c51",
    ["2026-07", "2026-08", "2026-09"]
)

# 2. admin@ecotrace.vn - Năm 2026 (adjust dates to Q4/2026 so 3 months are quick & 100/100)
conn = psycopg2.connect("postgresql://postgres:123456@localhost:5432/ecotrace")
cur = conn.cursor()
cur.execute("UPDATE reporting_period SET start_date = '2026-01-01', end_date = '2026-03-31' WHERE id = '8ae77476-b960-4349-9a2a-cafb2891bace'")
conn.commit()
seed_period_passport(
    "admin@ecotrace.vn",
    "Password123!",
    "8ae77476-b960-4349-9a2a-cafb2891bace",
    "eda8e8cd-be88-40bd-8161-199737b09c51",
    ["2026-01", "2026-02", "2026-03"]
)

# 3. lan@abc-mech.vn - Q3/2026
seed_period_passport(
    "lan@abc-mech.vn",
    "DemoPassword123",
    "262b2b16-a1d9-4fc9-ba6e-66bdf51fef96",
    "a03c3ab6-434e-4d4d-8c06-08d8905332b9",
    ["2026-07", "2026-08", "2026-09"]
)
