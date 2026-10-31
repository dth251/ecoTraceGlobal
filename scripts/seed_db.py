import urllib.request
import json

API = "http://localhost:8080/api/v1"

def post(endpoint, data, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{endpoint}", data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def get(endpoint, token):
    headers = {"Authorization": f"Bearer {token}"}
    req = urllib.request.Request(f"{API}{endpoint}", headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

print("=== SEEDING DEMO DATA ===")

# 1. Login or Register admin@ecotrace.vn
status, res = post("/auth/login", {"email": "admin@ecotrace.vn", "password": "Password123!"})
if status != 200:
    status, res = post("/auth/register", {
        "organizationName": "EcoTrace Global JSC",
        "taxCode": "0109999999",
        "fullName": "Quản trị viên EcoTrace",
        "email": "admin@ecotrace.vn",
        "password": "Password123!"
    })

admin_token = res["accessToken"]
print("Admin token obtained.")

# Check facilities for admin
_, facs = get("/facilities", admin_token)
fac_id = None
if not facs:
    print("Creating Facility for EcoTrace Global...")
    _, fac = post("/facilities", {
        "name": "Nhà máy Hà Nội (HQ)",
        "address": "KCN Thăng Long, Hà Nội",
        "country": "VN",
        "gridRegion": "VN"
    }, admin_token)
    fac_id = fac["id"]
    print(f"Created Facility: {fac['name']} ({fac_id})")
else:
    fac_id = facs[0]["id"]
    print(f"Existing Facility: {facs[0]['name']} ({fac_id})")

# Check periods for admin
_, periods = get(f"/periods?facilityId={fac_id}", admin_token)
period_id = None
if not periods:
    print("Creating Reporting Periods for EcoTrace Global...")
    _, per1 = post("/periods", {
        "facilityId": fac_id,
        "name": "Q3/2026",
        "startDate": "2026-07-01",
        "endDate": "2026-09-30"
    }, admin_token)
    period_id = per1["id"]
    print(f"Created Period Q3/2026 ({period_id})")

    _, per2 = post("/periods", {
        "facilityId": fac_id,
        "name": "Năm 2026",
        "startDate": "2026-01-01",
        "endDate": "2026-12-31"
    }, admin_token)
    print(f"Created Period Năm 2026 ({per2['id']})")
else:
    period_id = periods[0]["id"]
    print(f"Existing Period: {periods[0]['name']} ({period_id})")

# Check products for admin
_, products = get("/products", admin_token)
if not products:
    print("Creating Products...")
    _, prod = post("/products", {
        "name": "Túi vải dệt sinh thái EcoTote 12oz",
        "hsCode": "420292",
        "cnCode": "42029298",
        "unit": "chiếc"
    }, admin_token)
    print(f"Created Product: {prod['name']}")
else:
    print(f"Existing Product count: {len(products)}")

# 2. Register / login lan@abc-mech.vn
status, res = post("/auth/login", {"email": "lan@abc-mech.vn", "password": "DemoPassword123"})
if status != 200:
    status, res = post("/auth/register", {
        "organizationName": "ABC Mechanical JSC",
        "taxCode": "0101234567",
        "fullName": "Chị Lan (QA & Xuất khẩu)",
        "email": "lan@abc-mech.vn",
        "password": "DemoPassword123"
    })
    lan_token = res["accessToken"]
    print("Registered and logged in lan@abc-mech.vn")
    
    # Facility for ABC
    _, fac = post("/facilities", {
        "name": "Nhà máy Bắc Ninh",
        "address": "KCN VSIP Bắc Ninh",
        "country": "VN",
        "gridRegion": "VN"
    }, lan_token)
    lan_fac_id = fac["id"]
    
    # Product for ABC
    post("/products", {
        "name": "Bu lông lục giác M12",
        "hsCode": "731815",
        "cnCode": "73181595",
        "unit": "t"
    }, lan_token)
    
    # Period for ABC
    post("/periods", {
        "facilityId": lan_fac_id,
        "name": "Q3/2026",
        "startDate": "2026-07-01",
        "endDate": "2026-09-30"
    }, lan_token)
    print("Seeded ABC Mechanical data.")
else:
    print("lan@abc-mech.vn already exists.")

print("Done seeding!")

