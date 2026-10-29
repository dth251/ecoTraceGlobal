import os

os.environ["MOCK_MODE"] = "true"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.demo.emission_calc import calculate  # noqa: E402
from app.normalize import normalize_currency, normalize_date, normalize_unit  # noqa: E402
from app.pipeline import InputDocument, run_pipeline  # noqa: E402
from app.schemas import ActivityType, FieldConfidence, RawExtraction, TransportMode  # noqa: E402
from app.services.extraction import build_result  # noqa: E402

client = TestClient(app)


def test_normalize():
    assert normalize_unit(2, "MWh") == (2000.0, "kWh")
    assert normalize_unit(3, "tấn") == (3000.0, "kg")
    assert normalize_date("31/03/2025") == "2025-03-31"
    assert normalize_currency("VNĐ") == "VND"


def test_demo_calc_freight_route_lookup():
    inv = build_result(RawExtraction(
        activity_type=ActivityType.FREIGHT, origin="Cat Lai, HCMC", destination="Hamburg, Germany",
        transport_mode=TransportMode.SEA, weight_kg=18000,
    ))
    e = calculate(inv)
    assert e.status == "CALCULATED" and e.co2e_kg == 4896.0


def test_demo_calc_unit_mismatch():
    inv = build_result(RawExtraction(
        activity_type=ActivityType.FUEL, description="Dầu diesel", quantity=500, unit="kg",
        invoice_date="2025-01-01",
    ))
    assert calculate(inv).status == "UNIT_MISMATCH"


def test_pipeline_mock():
    docs = [InputDocument(name=f"{t}.pdf", content=b"%PDF", mime_type="application/pdf", doc_type=t)
            for t in ("ELECTRICITY", "FUEL", "MATERIAL", "FREIGHT")]
    r = run_pipeline(docs)
    assert r.inventory.documents_failed == 0
    assert all(r.inventory.by_scope[s] > 0 for s in "123")
    assert r.optimization.suggestions


def test_extract_mock():
    r = client.post(
        "/ai/extract-invoice",
        files={"file": ("a.pdf", b"%PDF-1.4", "application/pdf")},
        data={"doc_type": "FREIGHT"},
    )
    assert r.status_code == 200
    assert r.json()["data"]["scope"] == 3


def test_extract_bad_mime():
    r = client.post("/ai/extract-invoice", files={"file": ("a.txt", b"x", "text/plain")})
    assert r.status_code == 422


def test_freight_missing_distance_needs_review():
    raw = RawExtraction(
        activity_type=ActivityType.FREIGHT, origin="Cát Lái", destination="Hamburg",
        transport_mode=TransportMode.SEA, weight_kg=18000,
        confidences=[FieldConfidence(field="weight_kg", confidence=0.9)],
    )
    d = build_result(raw)
    assert d.scope == 3 and d.factor_code == "FREIGHT_SEA"
    assert d.needs_review and "distance_km" in d.review_fields


def test_low_confidence_flagged():
    raw = RawExtraction(
        activity_type=ActivityType.ELECTRICITY, quantity=1000, unit="kWh", invoice_date="2025-01-05",
        confidences=[FieldConfidence(field="quantity", confidence=0.4)],
    )
    d = build_result(raw)
    assert d.scope == 2 and "quantity" in d.review_fields


def test_fuel_for_generator_not_electricity():
    # Lỗi bắt được khi chạy e2e: "máy phát điện" từng khớp ELEC_GRID trước "diesel"
    raw = RawExtraction(
        activity_type=ActivityType.FUEL, description="Dầu DO 0,05S-II cho máy phát điện",
        quantity=800, unit="Lít", invoice_date="2025-03-15",
    )
    d = build_result(raw)
    assert d.factor_code == "FUEL_DIESEL" and d.scope == 1 and d.unit == "L"


def test_classify_rules():
    for text, code, scope in [
        ("Tiền điện tháng 3", "ELEC_GRID", 2),
        ("Dầu diesel DO 0,05S", "FUEL_DIESEL", 1),
        ("Cước vận chuyển đường biển container", "FREIGHT_SEA", 3),
        ("Mua thép cuộn", "MAT_STEEL", 3),
    ]:
        r = client.post("/ai/classify-activity", json={"description": text}).json()
        assert r["factor_code"] == code and r["scope"] == scope and r["method"] == "RULE"


def test_optimize():
    body = {
        "sources": [
            {"factor_code": "ELEC_GRID", "activity_type": "ELECTRICITY", "scope": 2, "co2e_kg": 8000},
            {"factor_code": "FUEL_DIESEL", "activity_type": "FUEL", "scope": 1, "co2e_kg": 2000},
            {"factor_code": "FREIGHT_SEA", "activity_type": "FREIGHT", "scope": 3, "co2e_kg": 1000},
        ],
        "max_suggestions": 3,
    }
    r = client.post("/ai/optimize", json=body).json()
    assert r["total_co2e_kg"] == 11000
    assert len(r["suggestions"]) == 3
    assert r["suggestions"][0]["id"] == "solar_rooftop"


def test_lpg_from_fuel_company_not_petrol():
    # Lỗi bắt được khi đánh giá: tên "Công ty Xăng dầu" khiến LPG bị gắn mã xăng
    d = build_result(RawExtraction(activity_type=ActivityType.FUEL, supplier="CÔNG TY XĂNG DẦU KHU VỰC MẪU",
                                   description="Khí LPG (bình 45kg)", quantity=180, unit="kg"))
    assert d.factor_code == "FUEL_LPG" and "unit" not in d.review_fields


def test_arithmetic_mismatch_flags_quantity():
    d = build_result(RawExtraction(activity_type=ActivityType.FUEL, description="Dầu DO", quantity=95.9, unit="Lít",
                                   unit_price=20000, line_amount=19_180_000, invoice_date="2025-01-01"))
    assert "quantity" in d.review_fields


def test_material_in_meters_flags_unit():
    d = build_result(RawExtraction(activity_type=ActivityType.MATERIAL, description="Vải kaki cotton",
                                   material_type="vải", quantity=3340, unit="Mét"))
    assert d.factor_code == "MAT_COTTON" and "unit" in d.review_fields


def test_transport_fields_cleared_for_material():
    d = build_result(RawExtraction(activity_type=ActivityType.MATERIAL, description="PP resin", quantity=6075,
                                   unit="KGS", origin="Korea", destination="Vietnam", material_type="PP resin"))
    assert d.origin is None and d.destination is None
    assert d.factor_code == "MAT_PLASTIC" and d.unit == "kg"


def test_implausible_air_weight_flagged():
    d = build_result(RawExtraction(activity_type=ActivityType.FREIGHT, transport_mode=TransportMode.AIR,
                                   origin="SGN", destination="FRA", weight_kg=2.854))
    assert "weight_kg" in d.review_fields


def test_llm_derived_price_cannot_hide_wrong_quantity():
    # Lỗi bắt được khi thêm mẫu EVN: 75.280 kWh đọc thành 75,28; AI tự suy ra đơn giá nên SL x giá vẫn khớp thành tiền
    raw = RawExtraction(activity_type=ActivityType.ELECTRICITY, quantity=75.28, unit="kWh", unit_price=2195899.28,
                        line_amount=165297460, amount=178521257, currency="VND", invoice_date="2025-11-02")
    assert "quantity" in build_result(raw).review_fields
    ok = raw.model_copy(update={"quantity": 75280, "unit_price": 2195.9})
    assert "quantity" not in build_result(ok).review_fields


def test_discount_and_vat_do_not_raise_false_alarm():
    raw = RawExtraction(activity_type=ActivityType.FUEL, description="Dầu DO 0,05S", quantity=879, unit="Lít",
                        unit_price=20660, line_amount=17_796_937, amount=19_220_692, currency="VND",
                        invoice_date="2025-08-27")  # chiết khấu 2%
    assert "quantity" not in build_result(raw).review_fields


def test_invoice_series_year_cross_check():
    raw = RawExtraction(activity_type=ActivityType.MATERIAL, description="Thép cuộn", material_type="thép",
                        quantity=18000, unit="kg", invoice_series="1C25MSP", invoice_date="2023-02-20")
    assert "invoice_date" in build_result(raw).review_fields
    assert "invoice_date" not in build_result(raw.model_copy(update={"invoice_date": "2025-02-20"})).review_fields


def test_generic_material_and_other_need_review():
    d = build_result(RawExtraction(activity_type=ActivityType.MATERIAL, description="Kem chống nắng", quantity=1,
                                   unit="Tuýp"))
    assert d.factor_code == "MAT_GENERIC" and "factor_code" in d.review_fields
    o = build_result(RawExtraction(activity_type=ActivityType.OTHER, description="Hóa đơn tiền nước"))
    assert o.needs_review and "activity_type" in o.review_fields
