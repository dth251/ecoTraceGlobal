import logging
import re
from typing import Optional

from app import cache
from app.config import settings
from app.factors import (
    ACTIVITY_DEFAULT_CODE,
    FACTOR_SCOPE,
    FACTOR_UNIT,
    FREIGHT_MODE_TO_CODE,
    MATERIAL_PRICE_RANGE_VND,
    PRICE_RANGE_VND,
)
from app.gemini_client import generate_structured
from app.mock_data import mock_extraction
from app.normalize import normalize_currency, normalize_date, normalize_unit
from app.prompts import EXTRACT_PROMPT
from app.schemas import (
    ActivityType,
    ExtractedInvoice,
    ExtractionResponse,
    RawExtraction,
)
from app.services.classification import classify_by_rule

log = logging.getLogger("ai.extract")

ALLOWED_MIME = {
    "application/pdf", "image/png", "image/jpeg", "image/webp",
}

# Trường bắt buộc phải có theo từng loại hoạt động
REQUIRED = {
    ActivityType.ELECTRICITY: ["quantity", "unit", "invoice_date"],
    ActivityType.FUEL: ["quantity", "unit", "invoice_date"],
    ActivityType.MATERIAL: ["quantity", "unit", "material_type"],
    ActivityType.FREIGHT: ["weight_kg", "origin", "destination", "transport_mode"],
    ActivityType.OTHER: [],
}


# Khoảng giá trị hợp lý (đơn vị chuẩn) cho một chứng từ; ngoài khoảng -> nghi đọc sai số
PLAUSIBLE = {
    ActivityType.ELECTRICITY: ("quantity", 10, 10_000_000),
    ActivityType.FUEL: ("quantity", 1, 1_000_000),
    ActivityType.MATERIAL: ("quantity", 1, 10_000_000),
    ActivityType.FREIGHT: ("weight_kg", 10, 500_000),
}
DISTANCE_RANGE = (1, 25_000)
# thành tiền / (số lượng x đơn giá) nằm trong khoảng này là bình thường (chiết khấu tới ~15%, VAT tới ~10%)
ARITH_RATIO = (0.85, 1.12)
PRICE_SLACK = (0.6, 1.5)  # nới khoảng giá vì tổng tiền có thể gồm VAT và dòng phí phụ
TRANSPORT_FIELDS = ("origin", "destination", "transport_mode", "weight_kg", "distance_km")


class ExtractionInputError(Exception):
    pass


def _resolve_factor(raw: RawExtraction) -> Optional[str]:
    act = raw.activity_type
    if act == ActivityType.ELECTRICITY:
        return ACTIVITY_DEFAULT_CODE["ELECTRICITY"]
    if act == ActivityType.FREIGHT and raw.transport_mode:
        return FREIGHT_MODE_TO_CODE[raw.transport_mode.value]
    # Ưu tiên mô tả hàng hóa; tên nhà cung cấp chỉ là phương án cuối
    # (vd. "Công ty Xăng dầu ..." bán LPG không được gắn mã xăng)
    code = classify_by_rule(f"{raw.material_type or ''} {raw.description or ''}", act)
    if code is None and act == ActivityType.FUEL:
        code = classify_by_rule(raw.supplier or "", act)
    if code is None and act == ActivityType.MATERIAL:
        code = ACTIVITY_DEFAULT_CODE["MATERIAL"]
    return code


def consistency_flags(raw: RawExtraction, data: ExtractedInvoice) -> list[str]:
    """Kiểm tra xác định, không dựa vào confidence do LLM tự báo."""
    flags: list[str] = []
    act = data.activity_type
    # 1. Số học: số lượng x đơn giá phải khớp thành tiền dòng hàng (dùng số lượng gốc, trước khi đổi đơn vị)
    if raw.quantity and raw.unit_price and raw.line_amount:
        ratio = raw.line_amount / (raw.quantity * raw.unit_price)
        if not ARITH_RATIO[0] <= ratio <= ARITH_RATIO[1]:
            flags.append("quantity")
    # 1b. Đơn giá suy ra (tổng tiền / số lượng) phải nằm trong khoảng giá thị trường
    price_range = PRICE_RANGE_VND.get(data.factor_code or "") or (
        MATERIAL_PRICE_RANGE_VND if act == ActivityType.MATERIAL else None)
    money = raw.line_amount or data.amount
    if (price_range and data.currency == "VND" and money and data.quantity
            and data.unit == FACTOR_UNIT.get(data.factor_code or "")):
        implied = money / data.quantity
        if not price_range[0] * PRICE_SLACK[0] <= implied <= price_range[1] * PRICE_SLACK[1]:
            flags.append("quantity")
    # 1c. Ký hiệu hóa đơn điện tử (vd. 1C25TAA) chứa 2 chữ số năm lập hóa đơn -> đối chiếu với ngày lập
    m = re.match(r"^\d?[CK](\d{2})[A-Z]", (data.invoice_series or "").upper().replace(" ", ""))
    if m and data.invoice_date and int(data.invoice_date[:4]) != 2000 + int(m.group(1)):
        flags.append("invoice_date")
    # 2. Khoảng giá trị hợp lý
    if act in PLAUSIBLE:
        field, lo, hi = PLAUSIBLE[act]
        v = getattr(data, field)
        if v is not None and not lo <= v <= hi:
            flags.append(field)
    if data.distance_km is not None and not DISTANCE_RANGE[0] <= data.distance_km <= DISTANCE_RANGE[1]:
        flags.append("distance_km")
    # 3. Đơn vị phải khớp đơn vị mã hệ số yêu cầu
    need = FACTOR_UNIT.get(data.factor_code or "")
    if need and data.unit and data.unit != need:
        flags.append("unit")  # vd. vải tính theo mét: cần quy đổi ra kg
        if act == ActivityType.FUEL:
            flags.append("factor_code")  # nhiên liệu: đơn vị lệch thường do gắn nhầm loại (LPG kg vs xăng lít)
    return flags


def build_result(raw: RawExtraction) -> ExtractedInvoice:
    qty, unit = normalize_unit(raw.quantity, raw.unit)
    conf = {c.field: c.confidence for c in raw.confidences}

    transport = {f: getattr(raw, f) for f in TRANSPORT_FIELDS}
    if raw.activity_type == ActivityType.FREIGHT:
        if transport["weight_kg"] is None and unit == "kg":
            transport["weight_kg"] = qty
    else:
        # Các trường vận chuyển chỉ có nghĩa với cước vận chuyển (tránh lấy "xuất xứ hàng" làm nơi đi)
        transport = dict.fromkeys(TRANSPORT_FIELDS)

    code = _resolve_factor(raw)
    scope = FACTOR_SCOPE.get(code) if code else None

    data = ExtractedInvoice(
        activity_type=raw.activity_type, scope=scope, factor_code=code,
        supplier=raw.supplier, invoice_date=normalize_date(raw.invoice_date),
        invoice_series=raw.invoice_series,
        description=raw.description, quantity=qty, unit=unit,
        unit_price=raw.unit_price, line_amount=raw.line_amount,
        amount=raw.amount, currency=normalize_currency(raw.currency),
        material_type=raw.material_type, confidence=conf, **transport,
    )

    review: list[str] = []
    for field in REQUIRED[data.activity_type]:
        if getattr(data, field) is None:
            review.append(field)
        elif conf.get(field, 1.0) < settings.review_threshold:
            review.append(field)
    if data.activity_type != ActivityType.OTHER and (code is None or code == ACTIVITY_DEFAULT_CODE["MATERIAL"]):
        review.append("factor_code")  # không xác định được loại hoặc chỉ gắn được mã nguyên liệu chung
    # Cước vận chuyển cần quãng đường để tính tấn·km; thiếu thì nhờ người dùng/backend bổ sung
    if data.activity_type == ActivityType.FREIGHT and data.distance_km is None:
        review.append("distance_km")
    if data.activity_type == ActivityType.OTHER:
        review.append("activity_type")  # ngoài phạm vi kiểm kê: người dùng quyết định bỏ qua hay chọn loại
    review += consistency_flags(raw, data)

    data.review_fields = sorted(set(review))
    data.needs_review = bool(data.review_fields)
    return data


def extract_invoice(
    file_bytes: bytes, mime_type: str, doc_type_hint: Optional[str] = None
) -> ExtractionResponse:
    if mime_type not in ALLOWED_MIME:
        raise ExtractionInputError(f"Định dạng không hỗ trợ: {mime_type}")
    if len(file_bytes) > settings.max_file_mb * 1024 * 1024:
        raise ExtractionInputError(f"File vượt quá {settings.max_file_mb}MB")

    if settings.mock_mode or not settings.gemini_api_key:
        act = ActivityType(doc_type_hint) if doc_type_hint in ActivityType._value2member_map_ else ActivityType.ELECTRICITY
        return ExtractionResponse(status="OK", mock=True, data=mock_extraction(act))

    key = cache.file_key(file_bytes, doc_type_hint)
    cached = cache.get(key)
    if cached:
        log.info("Cache hit %s", key[-12:])
        return ExtractionResponse.model_validate(cached)

    hint = f"\nGợi ý từ người dùng: loại tài liệu có thể là {doc_type_hint}." if doc_type_hint else ""
    raw = generate_structured(
        EXTRACT_PROMPT.format(hint=hint), RawExtraction,
        file_bytes=file_bytes, mime_type=mime_type,
    )
    data = build_result(raw)
    result = ExtractionResponse(
        status="NEEDS_REVIEW" if data.needs_review else "OK", mock=False, data=data
    )
    cache.put(key, result.model_dump(mode="json"))
    return result
