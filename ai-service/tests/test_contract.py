"""Test hợp đồng: phản hồi của AI service phải chứa đúng các trường mà backend (AiDtos.java) và frontend (api/ai.ts)
đang chờ. Đọc thẳng từ code của họ nên lệch tên trường sẽ báo lỗi ngay (tránh trường hợp backend trả {} im lặng).
Bỏ qua nếu không có thư mục backend/frontend (khi chạy riêng ai-service)."""
import os
import re
from pathlib import Path

import pytest

os.environ["MOCK_MODE"] = "true"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)
REPO = Path(__file__).resolve().parents[2]
JAVA = REPO / "backend/src/main/java/com/ecotrace/ai/dto/AiDtos.java"
TS = REPO / "frontend/src/api/ai.ts"

needs_java = pytest.mark.skipif(not JAVA.exists(), reason="không có backend")
needs_ts = pytest.mark.skipif(not TS.exists(), reason="không có frontend")


def java_fields(record: str) -> set[str]:
    """Tên JSON của các thành phần trong `public record <record>(...)` ở AiDtos.java."""
    src = JAVA.read_text(encoding="utf-8")
    m = re.search(rf"public record {record}\((.*?)\)\s*\{{", src, re.S)
    assert m, f"không thấy record {record} trong AiDtos.java"
    body = re.sub(r"<[^>]*>", "", m.group(1))  # bỏ generic để dấu phẩy trong Map<K, V> không làm hỏng việc tách
    names = set()
    for part in body.split(","):
        part = part.strip()
        if not part:
            continue
        j = re.search(r'@JsonProperty\("([^"]+)"\)', part)
        names.add(j.group(1) if j else re.sub(r"@\w+(\([^)]*\))?", "", part).split()[-1])
    return names


def ts_fields(interface: str) -> set[str]:
    src = TS.read_text(encoding="utf-8")
    m = re.search(rf"export interface {interface} \{{(.*?)\}}", src, re.S)
    assert m, f"không thấy interface {interface} trong ai.ts"
    return {f.strip().rstrip("?") for f in re.findall(r"^\s*(\w+\??)\s*:", m.group(1), re.M)}


def extract(doc_type: str) -> dict:
    r = client.post("/ai/extract-invoice", files={"file": ("a.pdf", b"%PDF-1.4", "application/pdf")},
                    data={"doc_type": doc_type})
    assert r.status_code == 200
    return r.json()


OPT_BODY = {"inventory_summary": {"ELEC_GRID": 8000, "FUEL_DIESEL": 2000, "FREIGHT_SEA": 1000},
            "language": "vi", "max_suggestions": 3}


@needs_java
@pytest.mark.parametrize("doc_type", ["ELECTRICITY", "FUEL", "MATERIAL", "FREIGHT"])
def test_extraction_has_every_field_backend_expects(doc_type):
    body = extract(doc_type)
    for field in java_fields("ExtractionResponse"):
        assert body.get(field) not in (None, [], ""), f"thiếu hoặc rỗng: {field}"
    for field in java_fields("LineItem"):
        assert field in body["lines"][0], f"dòng hàng thiếu: {field}"
    assert 0 <= body["overall_confidence"] <= 1


@needs_ts
def test_extraction_has_every_field_frontend_expects():
    body = extract("ELECTRICITY")
    for field in ts_fields("ExtractionResponse"):
        assert body.get(field) is not None, f"frontend cần {field}"
    for field in ts_fields("LineItem"):
        assert field in body["lines"][0]


def test_doc_type_values_match_backend_enum():
    enum = REPO / "backend/src/main/java/com/ecotrace/document/domain/Document.java"
    if not enum.exists():
        pytest.skip("không có backend")
    allowed = set(re.search(r"enum DocType \{(.*?)\}", enum.read_text(encoding="utf-8"), re.S).group(1).replace("\n", "").replace(" ", "").split(","))
    for t in ["ELECTRICITY", "FUEL", "MATERIAL", "FREIGHT", "OTHER"]:
        assert extract(t)["doc_type"] in allowed


def test_review_caps_overall_confidence():
    body = extract("FREIGHT")  # mock vận đơn thiếu distance_km => needs_review
    assert body["data"]["needs_review"] and body["overall_confidence"] <= 0.79


@needs_java
def test_classify_has_every_field_backend_expects():
    body = client.post("/ai/classify-activity", json={"description": "Dầu diesel DO 0,05S", "unit": "Lít"}).json()
    for field in java_fields("ClassifyResponse"):
        assert field in body, f"thiếu {field}"
    assert body["scope"] == 1 and body["factor_code"] == "FUEL_DIESEL" and body["confidence"] > 0


@needs_java
def test_optimize_accepts_backend_request_and_returns_backend_fields():
    # Cấu trúc đúng như AiServiceClient.optimizePeriod gửi
    for f in java_fields("OptimizeRequest"):
        assert f in OPT_BODY
    r = client.post("/ai/optimize", json=OPT_BODY)
    assert r.status_code == 200
    body = r.json()
    for field in java_fields("OptimizeResponse"):
        assert body.get(field) not in (None, [], ""), f"thiếu {field}"
    assert len(body["suggestions"]) == 3
    for item in body["suggestions"]:
        for field in java_fields("SuggestionItem"):
            assert item.get(field) not in (None, ""), f"gợi ý thiếu {field}"
    assert body["suggestions"][0]["target_factor_code"] == "ELEC_GRID"


def test_optimize_maps_backend_category_names():
    # Backend gửi theo ActivityCategory/sub_category (không phải mã hệ số của AI)
    body = client.post("/ai/optimize", json={"inventory_summary": {"ELECTRICITY": 9000, "PURCHASED_MATERIAL": 4000,
                                                                    "WASTE": 500}}).json()
    assert body["total_co2e_kg"] == 13500 and any(s["target_factor_code"].startswith("MAT_") for s in body["suggestions"])


def test_native_contract_still_works():
    # Dạng gốc (sources[]) và khối `data` không bị phá
    body = client.post("/ai/optimize", json={"sources": [{"factor_code": "ELEC_GRID", "activity_type": "ELECTRICITY",
                                                           "scope": 2, "co2e_kg": 1000}]}).json()
    assert body["suggestions"][0]["id"] == "solar_rooftop"
    assert "data" in extract("ELECTRICITY")
