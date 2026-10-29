"""Chấm điểm kết quả trích xuất so với đáp án."""
import re
import unicodedata
from difflib import SequenceMatcher
from typing import Any, Optional

from app.demo.emission_calc import calculate
from app.schemas import ActivityType, ExtractedInvoice, TransportMode

NUMERIC = {"quantity", "amount", "weight_kg", "distance_km"}
EXACT = {"activity_type", "factor_code", "transport_mode", "invoice_date", "scope"}
SCORED_FIELDS = ["activity_type", "scope", "factor_code", "supplier", "invoice_date", "quantity", "unit",
                 "amount", "currency", "origin", "destination", "transport_mode", "weight_kg", "distance_km"]

# Trường quyết định con số CO2e: sai một trường là chứng từ bị tính sai
CRITICAL = {
    "ELECTRICITY": ["activity_type", "factor_code", "quantity", "unit", "invoice_date"],
    "FUEL": ["activity_type", "factor_code", "quantity", "unit", "invoice_date"],
    "MATERIAL": ["activity_type", "factor_code", "quantity", "unit"],
    "FREIGHT": ["activity_type", "factor_code", "weight_kg", "origin", "destination", "distance_km"],
    "OTHER": ["activity_type"],  # chứng từ ngoài phạm vi (nước, hàng tiêu dùng): phải nhận ra là OTHER
}
# Với vận chuyển, quantity/unit không có nghĩa thống nhất (có thể là số container hoặc khối lượng) -> không chấm
SKIP = {"FREIGHT": {"quantity", "unit"},
        "OTHER": {"supplier", "invoice_date", "quantity", "unit", "amount", "currency", "origin", "destination",
                  "transport_mode", "weight_kg", "distance_km"}}
CLASS_FIELDS = {"activity_type", "scope", "factor_code"}

REL_TOL = 0.005  # sai lệch số cho phép 0,5%


def norm_text(s: Any) -> str:
    s = str(s).lower().replace("đ", "d")
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", s)).strip()


def _val(v: Any) -> Any:
    return v.value if hasattr(v, "value") else v


def match(field: str, exp: Any, pred: Any, keyword: Optional[str] = None) -> bool:
    exp, pred = _val(exp), _val(pred)
    if field in NUMERIC:
        try:
            e, p = float(exp), float(pred)
        except (TypeError, ValueError):
            return False
        return abs(e - p) <= max(abs(e) * REL_TOL, 0.01)
    if field in EXACT:
        return str(exp) == str(pred)
    if field == "currency":
        return str(exp).upper() == str(pred).upper()
    if field == "unit":
        return norm_text(exp) == norm_text(pred)
    p = norm_text(pred)
    if field in ("origin", "destination") and keyword:
        return any(norm_text(k) in p for k in keyword.split("|"))
    e = norm_text(exp)
    return e in p or p in e or SequenceMatcher(None, e, p).ratio() >= 0.85


def field_status(field: str, exp: Any, pred: Any, keyword: Optional[str] = None) -> str:
    """correct | wrong | missed (đáp án có, AI để trống) | hallucinated (đáp án trống, AI tự điền) | both_null."""
    if exp is None and pred in (None, ""):
        return "both_null"
    if exp is None:
        return "hallucinated"
    if pred in (None, ""):
        return "missed"
    return "correct" if match(field, exp, pred, keyword) else "wrong"


def to_invoice(d: dict) -> ExtractedInvoice:
    data = {k: v for k, v in d.items() if k in ExtractedInvoice.model_fields}
    data["activity_type"] = ActivityType(data["activity_type"])
    if data.get("transport_mode"):
        data["transport_mode"] = TransportMode(data["transport_mode"])
    return ExtractedInvoice(**data)


def co2e(inv: ExtractedInvoice) -> Optional[float]:
    r = calculate(inv)
    return r.co2e_kg if r.status == "CALCULATED" else None


def score_document(label: dict, pred: Optional[dict]) -> dict:
    """pred: ExtractedInvoice dạng dict (None nếu gọi AI thất bại)."""
    exp, doc_type = label["expected"], label["doc_type"]
    kw = label.get("keywords", {})
    pred = pred or {}
    skip = SKIP.get(doc_type, set())

    fields = {f: field_status(f, exp.get(f), pred.get(f), kw.get(f))
              for f in SCORED_FIELDS if f not in skip}
    errors = [{"field": f, "status": s, "expected": exp.get(f), "predicted": _val(pred.get(f))}
              for f, s in fields.items() if s in ("wrong", "missed", "hallucinated")]
    critical = CRITICAL[doc_type]
    critical_ok = bool(pred) and all(fields[f] in ("correct", "both_null") for f in critical)

    # Cờ "cần xem lại": lỗi ở trường quan trọng có được gắn cờ không? Sai phân loại tính là bắt được nếu gắn cờ factor_code
    flagged = set(pred.get("review_fields", []))
    wrong_critical = [f for f in critical if fields[f] not in ("correct", "both_null")]

    def caught(f):
        return f in flagged or (f in CLASS_FIELDS and "factor_code" in flagged)

    false_alarms = [f for f in flagged if f in fields and fields[f] in ("correct", "both_null")
                    and f not in label.get("expected_review", [])]

    exp_co2e = co2e(to_invoice(exp))
    pred_co2e = after_review = None
    if pred:
        inv = to_invoice(pred)
        pred_co2e = co2e(inv)
        # Giả lập người dùng sửa đúng các trường bị gắn cờ, tính lại -> phần sai còn "lọt" qua form xác nhận
        fixes = {f: exp.get(f) for f in flagged if f in exp}
        if "factor_code" in flagged:
            fixes.update({k: exp[k] for k in CLASS_FIELDS})
        after_review = co2e(to_invoice({**pred, **fixes}))

    return {
        "file": label["file"], "doc_type": doc_type, "layout": label["layout"],
        "degradation": label["degradation"], "ok": bool(pred),
        "fields": fields, "errors": errors, "critical_ok": critical_ok,
        "wrong_critical": wrong_critical, "caught": [f for f in wrong_critical if caught(f)],
        "flagged": sorted(flagged), "false_alarms": false_alarms,
        "expected_review": label.get("expected_review", []),
        "expected_review_raised": [f for f in label.get("expected_review", []) if f in flagged],
        "co2e_expected": exp_co2e, "co2e_predicted": pred_co2e, "co2e_after_review": after_review,
    }


def aggregate(docs: list[dict]) -> dict:
    """Gộp chỉ số cho một nhóm chứng từ."""
    n = len(docs)
    if not n:
        return {}
    statuses = [s for d in docs for s in d["fields"].values()]
    filled = [s for s in statuses if s in ("correct", "wrong", "missed")]  # đáp án có giá trị
    null_exp = [s for s in statuses if s in ("both_null", "hallucinated")]  # đáp án trống
    wrong_crit = sum(len(d["wrong_critical"]) for d in docs)
    caught = sum(len(d["caught"]) for d in docs)
    exp_rev = sum(len(d["expected_review"]) for d in docs)

    def co2e_err(key):
        pairs = [(d["co2e_expected"], d[key] or 0.0) for d in docs if d["co2e_expected"]]
        if not pairs:
            return None, None
        tot_e, tot_p = sum(e for e, _ in pairs), sum(p for _, p in pairs)
        return abs(tot_p - tot_e) / tot_e * 100, sum(abs(p - e) / e for e, p in pairs) / len(pairs) * 100

    tot, mean = co2e_err("co2e_predicted")
    tot_r, mean_r = co2e_err("co2e_after_review")
    return {
        "documents": n,
        "failed_calls": sum(not d["ok"] for d in docs),
        "doc_accuracy": sum(d["critical_ok"] for d in docs) / n * 100,
        "field_accuracy": filled.count("correct") / len(filled) * 100 if filled else None,
        "missed_rate": filled.count("missed") / len(filled) * 100 if filled else None,
        "hallucination_rate": null_exp.count("hallucinated") / len(null_exp) * 100 if null_exp else None,
        "classification_accuracy": sum(all(d["fields"][f] in ("correct", "both_null") for f in CLASS_FIELDS) for d in docs) / n * 100,
        "critical_errors": wrong_crit,
        "review_recall": caught / wrong_crit * 100 if wrong_crit else None,
        "false_alarms": sum(len(d["false_alarms"]) for d in docs),
        "expected_flags_raised": (sum(len(d["expected_review_raised"]) for d in docs) / exp_rev * 100
                                  if exp_rev else None),
        "co2e_total_error_pct": tot, "co2e_mean_abs_error_pct": mean,
        "co2e_total_error_after_review_pct": tot_r, "co2e_mean_abs_error_after_review_pct": mean_r,
        "co2e_not_computable": sum(1 for d in docs if not d["co2e_expected"]),
    }
