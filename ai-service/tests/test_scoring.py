import os
import sys
from pathlib import Path

os.environ["MOCK_MODE"] = "true"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "eval"))

from scoring import aggregate, field_status, score_document  # noqa: E402

LABEL = {
    "file": "x.png", "doc_type": "ELECTRICITY", "layout": "E0", "degradation": "clean",
    "expected": {"activity_type": "ELECTRICITY", "factor_code": "ELEC_GRID", "scope": 2,
                 "supplier": "CÔNG TY ĐIỆN LỰC MẪU", "invoice_date": "2025-03-31", "quantity": 12450.0,
                 "unit": "kWh", "amount": 27664920.0, "currency": "VND",
                 "origin": None, "destination": None, "transport_mode": None, "distance_km": None},
    "expected_review": [], "keywords": {},
}


def pred(**kw):
    return {**LABEL["expected"], "review_fields": [], **kw}


def test_field_status():
    assert field_status("quantity", 12450.0, 12460.0) == "correct"  # trong 0,5%
    assert field_status("quantity", 12450.0, 1245.0) == "wrong"
    assert field_status("unit", "Mét", "mét") == "correct"
    assert field_status("supplier", "CÔNG TY ĐIỆN LỰC MẪU", "Cong ty Dien luc Mau") == "correct"
    assert field_status("origin", "Cat Lai, HCMC", "Cảng Cát Lái", "cat lai") == "correct"
    assert field_status("origin", None, "Hà Nội") == "hallucinated"
    assert field_status("quantity", 1.0, None) == "missed"


def test_perfect_document():
    s = score_document(LABEL, pred())
    assert s["critical_ok"] and not s["errors"]
    assert s["co2e_expected"] == s["co2e_predicted"] == 12450 * 0.66


def test_unflagged_error_leaks_through_review():
    s = score_document(LABEL, pred(quantity=1245.0))
    assert not s["critical_ok"] and s["wrong_critical"] == ["quantity"] and not s["caught"]
    assert s["co2e_after_review"] == s["co2e_predicted"]  # không gắn cờ -> người dùng không sửa


def test_flagged_error_is_fixed_after_review():
    s = score_document(LABEL, pred(quantity=1245.0, review_fields=["quantity"]))
    assert s["caught"] == ["quantity"] and s["co2e_after_review"] == s["co2e_expected"]


def test_aggregate():
    docs = [score_document(LABEL, pred()), score_document(LABEL, pred(quantity=1245.0, origin="Hà Nội")),
            score_document(LABEL, None)]
    a = aggregate(docs)
    assert a["documents"] == 3 and a["failed_calls"] == 1
    assert round(a["doc_accuracy"], 1) == 33.3
    assert a["hallucination_rate"] > 0 and a["review_recall"] == 0
