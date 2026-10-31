import json
import urllib.request
import urllib.error

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

print("=== SEEDING SHOWCASE ACCOUNT WITH ISSUED GREEN PASSPORT ===")

EMAIL = "cbam@ecotrace.vn"
PASS = "Password123!"

status, res = req_json(f"{API}/auth/login", method="POST", data={"email": EMAIL, "password": PASS})
if status != 200:
    status, res = req_json(f"{API}/auth/register", method="POST", data={
        "organizationName": "Tập đoàn Thép & Cơ khí Xanh EcoSteel",
        "taxCode": "0108888888",
        "fullName": "Kỹ sư Trưởng CBAM",
        "email": EMAIL,
        "password": PASS
    })

token = res["accessToken"]
print("Logged in as:", EMAIL)

# Get facility
_, facs = req_json(f"{API}/facilities", token=token)
fac_id = facs[0]["id"]
print("Facility ID:", fac_id)

# Get product
_, prods = req_json(f"{API}/products", token=token)
prod_id = prods[0]["id"]
print("Product ID:", prod_id)

# Get period
_, periods = req_json(f"{API}/periods?facilityId={fac_id}", token=token)
period_id = periods[0]["id"]
print("Period ID:", period_id)

# Unlock period if locked to make changes
req_json(f"{API}/periods/{period_id}/unlock", method="POST", token=token)

# Clean up any pending documents
_, docs = req_json(f"{API}/documents?periodId={period_id}", token=token)
for d in docs:
    if d.get("status") == "PENDING_ENTRY":
        print("Rejecting pending doc:", d["fileName"])
        req_json(f"{API}/documents/{d['id']}/reject", method="POST", data={"reason": "clean"}, token=token)

# Ensure Month 7, 8, 9 have BOTH Scope 1 and Scope 2
# Add Month 9 Fuel Invoice (Scope 1)
status, doc_fuel9 = upload_multipart(f"{API}/documents", period_id, "FUEL_INVOICE", "Petrolimex_T9_2026.png", dummy_png("fuel_09"), token)
if status == 200 or status == 201:
    req_json(f"{API}/documents/{doc_fuel9['id']}/entry", method="PUT", data={
        "data": {"supplier": "Petrolimex", "date": "2026-09-15", "fuelType": "DIESEL", "quantity": 3800, "unit": "L"},
        "acknowledgeWarnings": True
    }, token=token)
    print("Entered Month 9 Fuel Invoice (Scope 1).")

# Recalculate emissions
status, calc = req_json(f"{API}/periods/{period_id}/calculate", method="POST", token=token)
print("Calculated emissions:", calc)

# Re-allocate production (1200 tonnes)
status, prod_res = req_json(f"{API}/periods/{period_id}/production", method="POST", data=[
    {"productId": prod_id, "quantity": 1200, "unit": "t"}
], token=token)
print("Production allocated:", prod_res)

# Lock Period
req_json(f"{API}/periods/{period_id}/lock", method="POST", token=token)
print("Locked period successfully.")

# Check Readiness
status, rd = req_json(f"{API}/periods/{period_id}/passports/readiness?productId={prod_id}", token=token)
print(f"Readiness Score: {rd.get('score')}/100, Decision: {rd.get('decision')}, Can Issue: {rd.get('can_issue')}")
if rd.get("reasons"):
    print("Blockers/Reasons:", rd.get("reasons"))

# Issue Passport
status, passport = req_json(f"{API}/periods/{period_id}/passports", method="POST", data={"productId": prod_id}, token=token)
if status == 201:
    print("\n=======================================================")
    print(">>> PASSPORT ISSUED SUCCESSFULLY! <<<")
    print("Public Code:", passport.get("publicCode"))
    print("Product Name:", passport.get("productName"))
    print("Total Per Unit:", passport.get("totalPerUnit"), "kgCO2e / t")
    print("Verify URL: http://localhost:5173/verify/" + str(passport.get("publicCode")))
    print("=======================================================")
else:
    print("Issue failed:", status, passport)
