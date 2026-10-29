#!/usr/bin/env bash
# Tạo dữ liệu demo (doanh nghiệp mẫu + nhà máy + sản phẩm + kỳ báo cáo Q3/2026) qua REST API (mục 4, 32)
set -euo pipefail

API="${API_BASE_URL:-http://localhost:8080/api/v1}"

echo "Registering demo organization..."
TOKEN=$(curl -sS -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"organizationName":"ABC Mechanical JSC","taxCode":"0101234567","fullName":"Chị Lan","email":"lan@abc-mech.vn","password":"DemoPassword123"}' \
  | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')

FACILITY_ID=$(curl -sS -X POST "$API/facilities" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Nhà máy Bắc Ninh","address":"KCN VSIP Bắc Ninh","country":"VN","gridRegion":"VN"}' \
  | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')

curl -sS -X POST "$API/products" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Bu lông lục giác M12","hsCode":"731815","cnCode":"73181595","unit":"t"}' > /dev/null

curl -sS -X POST "$API/periods" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"facilityId\":\"$FACILITY_ID\",\"name\":\"Q3/2026\",\"startDate\":\"2026-07-01\",\"endDate\":\"2026-09-30\"}" > /dev/null

echo "Seeded demo account: lan@abc-mech.vn / DemoPassword123"

