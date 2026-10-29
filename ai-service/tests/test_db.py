import os

os.environ["MOCK_MODE"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine, init_db
from app.db_service import (
    get_extraction_detail,
    get_extraction_history,
    get_history_stats,
    save_audit_feedback,
    save_classification_record,
    save_extraction_record,
)
from app.main import app
from app.schemas import (
    ActivityType,
    AuditFeedbackRequest,
    ClassifyRequest,
    ClassifyResponse,
    ExtractedInvoice,
    ExtractionResponse,
)

client = TestClient(app)


def setup_module():
    Base.metadata.create_all(bind=engine)


def test_init_db_and_health():
    init_db()
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert "database" in data
    assert data["database"]["status"] == "connected"


def test_save_and_retrieve_extraction():
    fake_invoice = ExtractedInvoice(
        activity_type=ActivityType.ELECTRICITY,
        supplier="EVN Hà Nội",
        invoice_date="2026-03-31",
        quantity=1500.0,
        unit="kWh",
        amount=3500000.0,
        currency="VND",
        confidence={"quantity": 0.95},
    )
    fake_res = ExtractionResponse(status="OK", mock=True, data=fake_invoice)

    rec_id = save_extraction_record(
        file_bytes=b"fake-pdf-content",
        mime_type="application/pdf",
        file_name="evn_bill.pdf",
        doc_type_hint="ELECTRICITY",
        res=fake_res,
        latency_ms=120.5,
        model_name="test-model",
    )
    assert rec_id is not None

    # Retrieve history
    history = get_extraction_history()
    assert len(history) >= 1
    found = next((item for item in history if item.id == rec_id), None)
    assert found is not None
    assert found.vendor == "EVN Hà Nội"
    assert found.quantity == 1500.0

    # Retrieve detail
    detail = get_extraction_detail(rec_id)
    assert detail is not None
    assert detail["file_name"] == "evn_bill.pdf"


def test_audit_feedback():
    # Gửi feedback
    fb_req = AuditFeedbackRequest(
        is_correct=True,
        rating=5,
        corrections={"unit": "kWh"},
        notes="Bóc tách chính xác",
    )
    fb_res = save_audit_feedback(fb_req)
    assert fb_res.status == "SAVED"
    assert fb_res.feedback_id is not None

    # API feedback
    resp = client.post(
        "/ai/feedback",
        json={"is_correct": True, "rating": 4, "notes": "Hài lòng"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "SAVED"


def test_history_stats():
    stats = get_history_stats()
    assert stats.total_extractions >= 1
    assert stats.total_feedbacks >= 1

    resp = client.get("/ai/history/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_extractions"] >= 1


def test_api_extract_persists_to_db():
    files = {"file": ("test_bill.png", b"\x89PNG\r\n\x1a\nfakeimage", "image/png")}
    resp = client.post("/ai/extract-invoice", files=files)
    assert resp.status_code == 200

    # Check if a new record was saved to DB
    history_resp = client.get("/ai/history/extractions")
    assert history_resp.status_code == 200
    items = history_resp.json()
    assert len(items) > 0
