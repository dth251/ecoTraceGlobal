"""Dữ liệu mẫu cho MOCK_MODE (dev, demo khi mất mạng)."""
from app.schemas import ActivityType, ExtractedInvoice, TransportMode

MOCK_INVOICES = {
    ActivityType.ELECTRICITY: ExtractedInvoice(
        activity_type=ActivityType.ELECTRICITY, scope=2, factor_code="ELEC_GRID",
        supplier="Điện lực TP.HCM (EVN)", invoice_no="0012345", invoice_date="2025-03-31",
        description="Tiền điện tháng 03/2025", quantity=12500.0, unit="kWh",
        amount=28500000.0, currency="VND",
        confidence={"quantity": 0.96, "invoice_date": 0.93, "supplier": 0.9, "amount": 0.95},
    ),
    ActivityType.FUEL: ExtractedInvoice(
        activity_type=ActivityType.FUEL, scope=1, factor_code="FUEL_DIESEL",
        supplier="Petrolimex", invoice_no="0004521", invoice_date="2025-03-15",
        description="Dầu diesel DO 0,05S", quantity=800.0, unit="L",
        amount=16800000.0, currency="VND",
        confidence={"quantity": 0.94, "invoice_date": 0.9, "supplier": 0.92, "amount": 0.93},
    ),
    ActivityType.MATERIAL: ExtractedInvoice(
        activity_type=ActivityType.MATERIAL, scope=3, factor_code="MAT_COTTON",
        supplier="Công ty Sợi Phong Phú", invoice_no="0001876", invoice_date="2025-03-10",
        description="Sợi cotton Ne30/1", quantity=5000.0, unit="kg",
        amount=275000000.0, currency="VND", material_type="cotton",
        confidence={"quantity": 0.9, "material_type": 0.88, "invoice_date": 0.9, "supplier": 0.85},
    ),
    ActivityType.FREIGHT: ExtractedInvoice(
        activity_type=ActivityType.FREIGHT, scope=3, factor_code="FREIGHT_SEA",
        supplier="Evergreen Line", invoice_no="EGL2503HCM001", invoice_date="2025-03-20",
        description="Cước vận chuyển container 40HC", amount=1850.0, currency="USD",
        origin="Cát Lái, Việt Nam", destination="Hamburg, Đức",
        transport_mode=TransportMode.SEA, weight_kg=18000.0, distance_km=None,
        quantity=18000.0, unit="kg",
        confidence={"weight_kg": 0.82, "origin": 0.9, "destination": 0.92, "transport_mode": 0.95},
        needs_review=True, review_fields=["distance_km"],
    ),
}


def mock_extraction(activity: ActivityType = ActivityType.ELECTRICITY) -> ExtractedInvoice:
    return MOCK_INVOICES.get(activity, MOCK_INVOICES[ActivityType.ELECTRICITY]).model_copy(deep=True)
