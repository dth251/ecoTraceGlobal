import logging
import re
from typing import Optional

from app.config import settings
from app.factors import (
    ACTIVITY_DEFAULT_CODE,
    FACTOR_SCOPE,
    KEYWORD_RULES,
)
from app.gemini_client import GeminiError, generate_structured
from app.prompts import CLASSIFY_PROMPT
from app.schemas import ActivityType, ClassifyRequest, ClassifyResponse, LlmClassify

log = logging.getLogger("ai.classify")

_CODE_TO_ACTIVITY = {
    "ELEC_GRID": ActivityType.ELECTRICITY,
    **{c: ActivityType.FUEL for c in FACTOR_SCOPE if c.startswith("FUEL_")},
    **{c: ActivityType.MATERIAL for c in FACTOR_SCOPE if c.startswith("MAT_")},
    **{c: ActivityType.FREIGHT for c in FACTOR_SCOPE if c.startswith("FREIGHT_")},
}


def _match(text: str, keyword: str) -> bool:
    return re.search(rf"(?<!\w){re.escape(keyword.strip())}(?!\w)", text) is not None


# Dấu hiệu điện lưới thật sự; "điện" đứng riêng có thể nằm trong "máy phát điện", "điện thoại"...
_GRID_STRONG = ("kwh", "evn", "tiền điện", "tien dien", "hóa đơn điện", "hoa don dien", "electricity", "điện năng", "dien nang")


def classify_by_rule(text: str, activity: Optional[ActivityType] = None) -> Optional[str]:
    """Khi đã biết loại hoạt động, chỉ xét các mã thuộc loại đó
    (vd. "dầu diesel cho máy phát điện" không được rơi vào ELEC_GRID).
    Khi chưa biết, nếu khớp nhiều mã thì ưu tiên mã cụ thể (nhiên liệu, vật liệu) hơn ELEC_GRID trừ khi có dấu hiệu
    điện lưới rõ ràng."""
    text = text.lower()
    matched = []
    for keywords, code in KEYWORD_RULES:
        if activity and activity != ActivityType.OTHER and _CODE_TO_ACTIVITY[code] != activity:
            continue
        if any(_match(text, k) for k in keywords):
            matched.append(code)
    if len(matched) > 1 and "ELEC_GRID" in matched and not any(_match(text, k) for k in _GRID_STRONG):
        matched.remove("ELEC_GRID")
    return matched[0] if matched else None


def classify(req: ClassifyRequest) -> ClassifyResponse:
    text = f"{req.description} {req.unit or ''}"
    code = classify_by_rule(text, req.activity_type)
    if code:
        return ClassifyResponse(
            activity_type=_CODE_TO_ACTIVITY[code], scope=FACTOR_SCOPE[code],
            factor_code=code, method="RULE", confidence=0.9,
            reasoning=f"Khớp từ khóa trong mô tả -> {code} (Scope {FACTOR_SCOPE[code]})",
        )
    if settings.mock_mode or not settings.gemini_api_key:
        return ClassifyResponse(activity_type=ActivityType.OTHER, scope=None, factor_code=None, method="NONE",
                                confidence=0.0, reasoning="Không xác định được loại hoạt động; cần người chọn")
    try:
        out = generate_structured(
            CLASSIFY_PROMPT.format(
                description=req.description, unit=req.unit or "n/a", codes=", ".join(FACTOR_SCOPE)
            ),
            LlmClassify,
        )
        code = out.factor_code if out.factor_code in FACTOR_SCOPE else None
        return ClassifyResponse(
            activity_type=out.activity_type, scope=FACTOR_SCOPE.get(code) if code else None,
            factor_code=code, method="LLM", confidence=0.7 if code else 0.0,
            reasoning="Gemini phân loại vì mô tả không khớp từ khóa nào; cần người xác nhận",
        )
    except GeminiError as e:
        log.warning("Phân loại LLM lỗi: %s", e)
        return ClassifyResponse(activity_type=ActivityType.OTHER, scope=None, factor_code=None, method="NONE",
                                confidence=0.0, reasoning="Không xác định được loại hoạt động; cần người chọn")


def default_code_for(activity: ActivityType) -> Optional[str]:
    return ACTIVITY_DEFAULT_CODE.get(activity.value)
