import os

os.environ["MOCK_MODE"] = "true"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)
TYPES = ["ELECTRICITY", "FUEL", "MATERIAL", "FREIGHT"]


def mock_items():
    items = []
    for t in TYPES:
        r = client.post("/ai/extract-invoice", files={"file": (f"{t}.pdf", b"%PDF-1.4", "application/pdf")}, data={"doc_type": t})
        items.append({"name": f"id-{t}", "data": r.json()["data"]})
    return items


def test_estimate_totals_by_scope_for_all_four_documents():
    r = client.post("/ai/estimate", json={"items": mock_items()})
    assert r.status_code == 200
    b = r.json()
    # điện 12.500 kWh x 0,66 | diesel 800 L x 2,68 | cotton 5.000 kg x 5,9 | biển 18 t x 17.000 km x 0,016
    assert b["by_scope"] == {"1": 2144.0, "2": 8250.0, "3": 34396.0}
    assert b["total_co2e_kg"] == 44790.0 and b["calculated"] == 4
    assert [d["name"] for d in b["documents"]] == [f"id-{t}" for t in TYPES]  # giữ nguyên định danh và thứ tự
    assert all(d["status"] == "CALCULATED" and d["co2e_kg"] > 0 for d in b["documents"])
    assert b["optimization"]["suggestions"] and "THAM KHẢO" in b["disclaimer"]


def test_estimate_works_with_a_missing_scope():
    # Thiếu Scope vẫn tính được: Scope đó bằng 0, tổng vẫn đúng
    items = [i for i in mock_items() if i["name"] in ("id-ELECTRICITY", "id-FUEL")]
    b = client.post("/ai/estimate", json={"items": items}).json()
    assert b["by_scope"] == {"1": 2144.0, "2": 8250.0, "3": 0.0} and b["total_co2e_kg"] == 10394.0


def test_estimate_flags_documents_it_cannot_compute():
    other = {"activity_type": "OTHER", "needs_review": True, "review_fields": ["activity_type"]}
    b = client.post("/ai/estimate", json={"items": [{"name": "x", "data": other}]}).json()
    assert b["total_co2e_kg"] == 0 and b["calculated"] == 0
    assert b["documents"][0]["status"] == "NO_FACTOR" and b["documents"][0]["needs_review"] is True
    assert b["optimization"]["suggestions"] == []


def test_estimate_empty_batch():
    b = client.post("/ai/estimate", json={"items": []}).json()
    assert b["total_co2e_kg"] == 0 and b["documents"] == []
