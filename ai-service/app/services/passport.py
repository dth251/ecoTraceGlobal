"""Điều kiện cấp hộ chiếu xanh: quy tắc quyết định, Gemini chỉ viết lời nhận xét.

Mọi điều kiện bắt buộc phải đạt thì mới cấp. Điểm 0-100 chỉ để định hướng cải thiện và so với ngưỡng cấu hình.
Trường backend chưa có dữ liệu (None) tính là chưa đạt: không có bằng chứng thì không cấp.
"""
import json
import logging
from typing import Optional

from pydantic import BaseModel

from app.config import settings
from app.gemini_client import GeminiError, generate_structured
from app.prompts import PASSPORT_PROMPT
from app.schemas import PassportReadiness, ReadinessCheck, ReadinessReason, ReadinessSnapshot

log = logging.getLogger("ai.passport")

WEIGHTS = {
    "PERIOD_LOCKED": 10, "FACTOR_COVERAGE": 15, "PERIOD_COVERAGE": 15, "ACTUAL_DATA_SHARE": 20,
    "TRACEABILITY": 15, "ALLOCATION": 10, "ANOMALIES": 10, "INTEGRITY": 5,
}


class _Narrative(BaseModel):
    overall_assessment: str


def _check(code: str, title: str, ok: bool, pass_msg: str, fail_msg: str, action: str, credit: float = 1.0) -> ReadinessCheck:
    """`credit` là tỷ lệ điểm nhận được khi đạt (chỉ tỷ lệ dữ liệu thực tế dùng điểm theo tỷ lệ)."""
    return ReadinessCheck(
        code=code, title=title, status="PASSED" if ok else "FAILED",
        message=pass_msg if ok else fail_msg, action="" if ok else action,
        weight=WEIGHTS[code], earned=round(WEIGHTS[code] * (credit if ok else 0.0), 1),
    )


def run_checks(s: ReadinessSnapshot) -> list[ReadinessCheck]:
    en = s.language == "en"

    def t(vi: str, eng: str) -> str:
        return eng if en else vi

    min_share = settings.passport_min_actual_share
    tol = settings.passport_allocation_tolerance_pct
    no_data = t("Chưa có dữ liệu để kiểm tra.", "No data available to check.")

    def known(*vals) -> bool:
        return all(v is not None for v in vals)

    # 1. Kỳ đã khóa, không còn chứng từ chờ nhập. Chứng từ đã bị từ chối kèm lý do là đã xử lý xong
    #    (loại khỏi kiểm kê, có ghi audit) nên không chặn, chỉ nêu số lượng.
    docs_known = known(s.period_locked, s.documents_pending)
    docs_ok = docs_known and bool(s.period_locked) and s.documents_pending == 0
    if not docs_known:
        docs_msg = no_data
    elif not s.period_locked:
        docs_msg = t("Kỳ báo cáo chưa được khóa.", "The reporting period is not locked.")
    else:
        docs_msg = t(f"Còn {s.documents_pending} chứng từ chờ nhập liệu.", f"{s.documents_pending} documents still pending entry.")
    rejected_note = t(f" {s.documents_rejected} chứng từ đã bị loại có ghi lý do.", f" {s.documents_rejected} documents rejected with a reason.") \
        if s.documents_rejected else ""

    # 2. Mọi hoạt động có hệ số
    factor_known = known(s.activities_total, s.activities_without_factor) and (s.activities_total or 0) > 0
    factor_ok = factor_known and s.activities_without_factor == 0
    if not s.activities_total:
        factor_msg = t("Kỳ chưa có hoạt động phát thải nào được ghi nhận.", "No emission activities recorded for the period.")
    elif not factor_known:
        factor_msg = no_data
    else:
        factor_msg = t(f"{s.activities_without_factor}/{s.activities_total} hoạt động chưa có hệ số, nguồn hoặc đơn vị khớp.",
                       f"{s.activities_without_factor}/{s.activities_total} activities lack a matching factor, source or unit.")

    # 3. Đủ dữ liệu các tháng và tiền chất
    cover_known = known(s.months_expected, s.months_covered, s.precursors_required) and (s.months_expected or 0) > 0
    months_ok = cover_known and (s.months_covered or 0) >= (s.months_expected or 0)
    cover_ok = months_ok and (not s.precursors_required or s.precursors_covered is True)
    if not cover_known:
        cover_msg = no_data
    elif not months_ok:
        cover_msg = t(f"Chỉ có dữ liệu Scope 1 và 2 cho {s.months_covered}/{s.months_expected} tháng của kỳ.",
                      f"Scope 1 and 2 data covers only {s.months_covered}/{s.months_expected} months.")
    else:
        cover_msg = t("Sản phẩm có tiền chất (thép, nhôm...) nhưng chưa có dữ liệu Scope 3 tiền chất.",
                      "The product has precursors but no Scope 3 precursor data.")

    # 4. Tỷ lệ dữ liệu đo thực tế
    share = s.actual_data_share
    share_ok = share is not None and share >= min_share
    share_msg = no_data if share is None else t(
        f"Tỷ lệ dữ liệu thực tế {share * 100:.1f}%, thấp hơn mức yêu cầu {min_share * 100:.0f}%.",
        f"Actual data share is {share * 100:.1f}%, below the required {min_share * 100:.0f}%.")

    # 5. Truy vết và xác nhận số liệu AI
    trace_known = known(s.unconfirmed_ai_records, s.records_without_source)
    trace_ok = trace_known and s.unconfirmed_ai_records == 0 and s.records_without_source == 0
    trace_msg = no_data if not trace_known else t(
        f"{s.unconfirmed_ai_records} số liệu AI bóc tách chưa được người xác nhận, {s.records_without_source} bản ghi không truy được về chứng từ gốc.",
        f"{s.unconfirmed_ai_records} AI-extracted values unconfirmed, {s.records_without_source} records without a source document.")

    # 6. Sản lượng và phân bổ
    alloc_ok = bool(s.production_output_present) and bool(s.allocation_method) and s.allocation_error_pct is not None \
        and abs(s.allocation_error_pct) <= tol
    if not s.production_output_present:
        alloc_msg = t("Chưa có sản lượng của sản phẩm trong kỳ.", "No production output recorded for the product.")
    elif not s.allocation_method:
        alloc_msg = t("Chưa chọn phương pháp phân bổ phát thải.", "No allocation method selected.")
    elif s.allocation_error_pct is None:
        alloc_msg = no_data
    else:
        alloc_msg = t(f"Tổng phân bổ lệch {abs(s.allocation_error_pct):.2f}% so với tổng phát thải, vượt mức cho phép {tol:g}%.",
                      f"Allocated total deviates {abs(s.allocation_error_pct):.2f}% from the total, above the {tol:g}% limit.")

    # 7. Bất thường chưa giải trình
    anomaly_ok = s.unresolved_anomalies == 0
    anomaly_msg = no_data if s.unresolved_anomalies is None else t(
        f"Còn {s.unresolved_anomalies} cảnh báo bất thường (số học hóa đơn, lệch lớn so với kỳ trước) chưa giải trình.",
        f"{s.unresolved_anomalies} anomaly warnings remain unexplained.")

    # 8. Toàn vẹn và hiệu lực
    pre_issue = s.stage == "PRE_ISSUE"
    integ_ok = (pre_issue or s.signature_valid is True) and not s.revoked
    if s.revoked:
        integ_msg = t("Hộ chiếu đã bị thu hồi.", "The passport has been revoked.")
    elif s.signature_valid is None:
        integ_msg = no_data
    else:
        integ_msg = t("Chữ ký số hoặc mã hash không khớp dữ liệu gốc.", "Digital signature or hash does not match.")

    pct = (share or 0.0) * 100
    return [
        _check("PERIOD_LOCKED", t("Kỳ đã khóa, chứng từ đã nhập đủ", "Period locked, documents complete"), docs_ok,
               t("Kỳ đã khóa và không còn chứng từ chờ nhập.", "Period locked and no documents pending.") + rejected_note, docs_msg,
               t("Nhập liệu hoặc xử lý hết chứng từ còn tồn rồi khóa kỳ.", "Resolve outstanding documents, then lock the period.")),
        _check("FACTOR_COVERAGE", t("Hoạt động đều có hệ số hợp lệ", "All activities have valid factors"), factor_ok,
               t("Mọi hoạt động có hệ số, nguồn và đơn vị khớp.", "Every activity has a matching factor, source and unit."), factor_msg,
               t("Chạy tính phát thải cho kỳ; với hoạt động vẫn lỗi thì bổ sung hệ số hoặc sửa đơn vị.", "Run the period calculation; for activities still failing, add factors or fix units.")),
        _check("PERIOD_COVERAGE", t("Đủ dữ liệu các tháng và tiền chất", "Full period and precursor coverage"), cover_ok,
               t("Dữ liệu đủ các tháng của kỳ, có tiền chất nếu cần.", "All months covered, precursors included where needed."), cover_msg,
               t("Tải lên chứng từ của các tháng còn trống; xin số liệu tiền chất từ nhà cung cấp.", "Upload documents for missing months; request precursor data from suppliers.")),
        _check("ACTUAL_DATA_SHARE", t("Tỷ lệ dữ liệu đo thực tế", "Share of actual measured data"), share_ok,
               t(f"Tỷ lệ dữ liệu thực tế {pct:.1f}%, đạt mức yêu cầu.", f"Actual data share {pct:.1f}%, meets the requirement."), share_msg,
               t("Yêu cầu nhà cung cấp gửi số liệu thực tế thay cho hệ số mặc định.", "Ask suppliers for actual data instead of default factors."),
               credit=min(max(share or 0.0, 0.0), 1.0)),
        _check("TRACEABILITY", t("Truy vết và xác nhận số liệu AI", "Traceability and AI data confirmation"), trace_ok,
               t("Mọi số liệu truy được về chứng từ và đã được người xác nhận.", "All data traceable to documents and human-confirmed."), trace_msg,
               t("Mở từng chứng từ còn cờ 'cần xem lại', đối chiếu với bản gốc rồi xác nhận.", "Review each flagged document against the original and confirm.")),
        _check("ALLOCATION", t("Sản lượng và phân bổ phát thải", "Output and emission allocation"), alloc_ok,
               t("Có sản lượng, phương pháp phân bổ và tổng phân bổ khớp.", "Output, method present and allocation reconciles."), alloc_msg,
               t("Nhập sản lượng, chọn phương pháp phân bổ và chạy lại phân bổ.", "Enter output, choose an allocation method and re-run allocation.")),
        _check("ANOMALIES", t("Không còn bất thường chưa giải trình", "No unexplained anomalies"), anomaly_ok,
               t("Không còn cảnh báo bất thường nào mở.", "No open anomaly warnings."), anomaly_msg,
               t("Xem lại từng cảnh báo, sửa số liệu hoặc ghi giải trình có bằng chứng.", "Review each warning; fix the data or record an evidenced explanation.")),
        _check("INTEGRITY", t("Chữ ký số và hiệu lực", "Signature and validity"), integ_ok,
               t("Sẽ được ký số khi cấp." if pre_issue else "Chữ ký số và hash nguyên vẹn, hộ chiếu còn hiệu lực.",
                 "Will be digitally signed on issue." if pre_issue else "Signature and hash intact, passport valid."), integ_msg,
               t("Cấp lại hộ chiếu mới từ dữ liệu đã được xác nhận.", "Issue a new passport from confirmed data.")),
    ]


def decide(verification: Optional[str], checks: list[ReadinessCheck]) -> tuple[str, int]:
    """Có điều kiện bắt buộc trượt hoặc điểm dưới ngưỡng thì không cấp; đạt cả hai thì cấp chính thức nếu đã thẩm định, không thì cấp tạm."""
    score = round(sum(c.earned for c in checks))
    if any(c.status == "FAILED" for c in checks) or score < settings.passport_min_score:
        return "NOT_ISSUED", score
    return ("ISSUED" if verification == "VERIFIED" else "PROVISIONAL"), score


def _template_assessment(decision: str, score: int, reasons: list[ReadinessReason], en: bool) -> str:
    if decision == "ISSUED":
        return (f"Score {score}/100, all mandatory checks passed and third-party verified: eligible for an official passport." if en else
                f"Hồ sơ đạt {score}/100, qua mọi điều kiện bắt buộc và đã được bên thứ ba thẩm định: đủ điều kiện cấp hộ chiếu chính thức.")
    if decision == "PROVISIONAL":
        return (f"Score {score}/100 and all mandatory checks passed, but not independently verified: provisional (self-declared) only." if en else
                f"Hồ sơ đạt {score}/100 và qua mọi điều kiện bắt buộc nhưng chưa có thẩm định độc lập: chỉ cấp tạm (tự khai báo). Nên nhờ tổ chức thẩm định để cấp chính thức.")
    first = reasons[0].action if reasons else ""
    return (f"Not issued: {len(reasons)} checks failed (score {score}/100). First step: {first}" if en else
            f"Chưa cấp hộ chiếu: còn {len(reasons)} điều kiện chưa đạt (điểm {score}/100). Việc nên làm trước tiên: {first}")


def assess(s: ReadinessSnapshot) -> PassportReadiness:
    en = s.language == "en"
    checks = run_checks(s)
    decision, score = decide(s.verification, checks)
    reasons = [ReadinessReason(code=c.code, title=c.title, message=c.message, action=c.action) for c in checks if c.status == "FAILED"]
    if decision == "NOT_ISSUED" and not reasons:  # đạt mọi điều kiện nhưng điểm thấp hơn ngưỡng
        reasons = [ReadinessReason(
            code="SCORE", title="Score below threshold" if en else "Điểm dưới ngưỡng",
            message=f"Score {score} is below {settings.passport_min_score}." if en else f"Điểm {score} thấp hơn ngưỡng {settings.passport_min_score}.",
            action="Increase the share of actual data." if en else "Tăng tỷ lệ dữ liệu đo thực tế.")]
    text = _template_assessment(decision, score, reasons, en)
    mock = settings.mock_mode or not settings.gemini_api_key
    source = "RULES"
    if not mock:
        try:
            payload = json.dumps({"decision": decision, "score": score, "min_score": settings.passport_min_score,
                                  "verification": s.verification, "failed": [r.model_dump() for r in reasons]}, ensure_ascii=False)
            out = generate_structured(PASSPORT_PROMPT.format(language="English" if en else "Tiếng Việt", payload=payload), _Narrative)
            text, source = out.overall_assessment or text, "AI"
        except GeminiError as e:
            log.warning("LLM nhận xét hộ chiếu lỗi, dùng văn bản quy tắc: %s", e)
    return PassportReadiness(
        decision=decision, can_issue=decision != "NOT_ISSUED", score=score, min_score=settings.passport_min_score,
        checks=checks, blockers=[c.code for c in checks if c.status == "FAILED"], reasons=reasons,
        overall_assessment=text, source=source, mock=mock,
    )
