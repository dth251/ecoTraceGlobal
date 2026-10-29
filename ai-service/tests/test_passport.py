import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.schemas import ReadinessSnapshot
from app.services import passport


@pytest.fixture(autouse=True)
def mock_mode(monkeypatch):
    monkeypatch.setattr(settings, "mock_mode", True)


def good(**over) -> ReadinessSnapshot:
    base = dict(
        period_locked=True, documents_pending=0, documents_rejected=0, activities_total=40, activities_without_factor=0,
        months_expected=12, months_covered=12, precursors_required=True, precursors_covered=True, actual_data_share=0.9,
        unconfirmed_ai_records=0, records_without_source=0, production_output_present=True, allocation_method="MASS",
        allocation_error_pct=0.2, unresolved_anomalies=0, signature_valid=True, revoked=False, verification="VERIFIED",
    )
    base.update(over)
    return ReadinessSnapshot(**base)


def failed(r):
    return set(r.blockers)


def test_du_dieu_kien_va_da_tham_dinh_thi_cap_chinh_thuc():
    r = passport.assess(good())
    assert r.decision == "ISSUED" and r.can_issue and r.blockers == [] and r.score >= settings.passport_min_score


def test_chua_tham_dinh_chi_cap_tam():
    r = passport.assess(good(verification="SELF_DECLARED"))
    assert r.decision == "PROVISIONAL" and r.can_issue


def test_backend_chua_co_du_lieu_thi_khong_cap():
    r = passport.assess(ReadinessSnapshot())
    assert r.decision == "NOT_ISSUED" and not r.can_issue and r.score == 0
    assert len(r.blockers) == 8 and all(x.action for x in r.reasons)


@pytest.mark.parametrize("over,code", [
    (dict(period_locked=False), "PERIOD_LOCKED"),
    (dict(documents_pending=2), "PERIOD_LOCKED"),
    (dict(activities_without_factor=3), "FACTOR_COVERAGE"),
    (dict(activities_total=0), "FACTOR_COVERAGE"),
    (dict(months_covered=11), "PERIOD_COVERAGE"),
    (dict(precursors_covered=False), "PERIOD_COVERAGE"),
    (dict(actual_data_share=0.79), "ACTUAL_DATA_SHARE"),
    (dict(unconfirmed_ai_records=1), "TRACEABILITY"),
    (dict(records_without_source=1), "TRACEABILITY"),
    (dict(production_output_present=False), "ALLOCATION"),
    (dict(allocation_method=None), "ALLOCATION"),
    (dict(allocation_error_pct=1.5), "ALLOCATION"),
    (dict(unresolved_anomalies=1), "ANOMALIES"),
    (dict(signature_valid=False), "INTEGRITY"),
    (dict(revoked=True), "INTEGRITY"),
])
def test_tung_dieu_kien_bat_buoc_chan_cap_du_diem_cao(over, code):
    r = passport.assess(good(**over))
    assert r.decision == "NOT_ISSUED" and not r.can_issue
    assert failed(r) == {code}
    assert r.score >= 60  # các điều kiện khác đều đạt, điểm cao nhưng vẫn không được cấp


def test_truoc_khi_cap_chua_co_chu_ky_van_duoc_xet_nhung_da_thu_hoi_thi_khong():
    assert passport.assess(good(stage="PRE_ISSUE", signature_valid=None)).decision == "ISSUED"
    assert passport.assess(good(signature_valid=None)).blockers == ["INTEGRITY"]  # hộ chiếu đã cấp mà thiếu chữ ký
    assert passport.assess(good(stage="PRE_ISSUE", signature_valid=None, revoked=True)).blockers == ["INTEGRITY"]


def test_co_hoat_dong_nhung_chua_biet_thieu_he_so_thi_bao_chua_co_du_lieu():
    r = passport.assess(good(activities_without_factor=None))
    assert "Chưa có dữ liệu" in next(x.message for x in r.reasons if x.code == "FACTOR_COVERAGE")


def test_chung_tu_da_tu_choi_co_ly_do_khong_chan_cap():
    r = passport.assess(good(documents_rejected=2))
    assert r.decision == "ISSUED"
    assert "2 chứng từ đã bị loại" in next(c.message for c in r.checks if c.code == "PERIOD_LOCKED")


def test_khong_yeu_cau_tien_chat_thi_khong_can_du_lieu_tien_chat():
    r = passport.assess(good(precursors_required=False, precursors_covered=None))
    assert r.decision == "ISSUED"


def test_ngay_chi_tiet_dung_nguong_thuc_te():
    assert passport.assess(good(actual_data_share=0.80)).can_issue
    assert not passport.assess(good(actual_data_share=0.7999)).can_issue


def test_diem_theo_ty_le_du_lieu_thuc_te():
    hi = passport.assess(good(actual_data_share=1.0)).score
    lo = passport.assess(good(actual_data_share=0.8)).score
    assert hi - lo == 4  # 20 điểm x 20% chênh lệch


def test_ngon_ngu_tieng_anh():
    r = passport.assess(good(period_locked=False, language="en"))
    assert "locked" in r.reasons[0].message and r.overall_assessment.startswith("Not issued")


def test_endpoint():
    client = TestClient(app)
    res = client.post("/ai/passport-readiness", json=good().model_dump())
    assert res.status_code == 200
    body = res.json()
    assert body["decision"] == "ISSUED" and body["source"] == "RULES" and len(body["checks"]) == 8
    empty = client.post("/ai/passport-readiness", json={}).json()
    assert empty["decision"] == "NOT_ISSUED"


def test_hop_dong_voi_backend():
    """Các trường backend gửi và chờ nhận (AiDtos.java) phải khớp schema của AI service."""
    import re
    from pathlib import Path

    java = Path(__file__).resolve().parents[2] / "backend/src/main/java/com/ecotrace/ai/dto/AiDtos.java"
    if not java.exists():
        pytest.skip("không có backend")
    src = java.read_text(encoding="utf-8")

    def fields(record: str) -> set[str]:
        body = re.search(rf"public record {record}\((.*?)\)\s*\{{", src, re.S).group(1)
        body = re.sub(r"//[^\n]*", "", body)  # bỏ chú thích cuối dòng
        names = set()
        for part in re.split(r",(?![^<]*>)", body):
            part = part.strip()
            if part:
                j = re.search(r'@JsonProperty\("([^"]+)"\)', part)
                names.add(j.group(1) if j else re.sub(r"@\w+(\([^)]*\))?", "", part).split()[-1])
        return names

    assert fields("PassportReadinessRequest") == set(ReadinessSnapshot.model_fields)
    body = TestClient(app).post("/ai/passport-readiness", json={}).json()
    assert fields("PassportReadinessResponse") == set(body)
    assert fields("ReadinessCheck") == set(body["checks"][0])
    assert fields("ReadinessReason") == set(body["reasons"][0])
