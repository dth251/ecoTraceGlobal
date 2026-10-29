"""Gợi ý tối ưu: số liệu do quy tắc tính (xác định), LLM chỉ viết lại phần văn bản."""
import json
import logging

from app.config import settings
from app.gemini_client import GeminiError, generate_structured
from app.prompts import OPTIMIZE_PROMPT
from app.schemas import (
    LlmOptimizeOutput,
    OptimizeRequest,
    OptimizeResponse,
    Suggestion,
)

log = logging.getLogger("ai.optimize")

# (code prefix, category, id, tiêu đề vi, tiêu đề en, % giảm trên nguồn, chi phí USD / tấn CO2e giảm, bước mặc định)
RULES = [
    ("ELEC_GRID", "ENERGY", "solar_rooftop",
     "Lắp điện mặt trời áp mái", "Install rooftop solar", 0.25, 450,
     ["Khảo sát mái và tải điện", "Xin báo giá 3 nhà thầu", "Lắp đặt và đấu nối", "Theo dõi sản lượng hằng tháng"]),
    ("ELEC_GRID", "ENERGY", "energy_efficiency",
     "Tối ưu tải và thiết bị tiết kiệm điện", "Optimise load and efficient equipment", 0.10, 120,
     ["Kiểm toán năng lượng sơ bộ", "Thay đèn LED và biến tần cho động cơ", "Tắt thiết bị chờ ngoài giờ"]),
    ("FUEL_", "FUEL", "fuel_switch",
     "Chuyển đổi nhiên liệu sạch hơn", "Switch to cleaner fuel", 0.15, 300,
     ["Rà soát thiết bị đốt", "Đánh giá khí tự nhiên/biomass thay thế", "Chạy thử một dây chuyền"]),
    ("FREIGHT_ROAD", "LOGISTICS", "consolidate_road",
     "Gom hàng và tối ưu tuyến đường bộ", "Consolidate loads and optimise road routes", 0.15, 80,
     ["Gom đơn cùng tuyến", "Tăng hệ số tải xe", "Lập lịch giao hàng theo cụm"]),
    ("FREIGHT_AIR", "LOGISTICS", "air_to_sea",
     "Chuyển một phần hàng không sang đường biển", "Shift air freight to sea", 0.60, 100,
     ["Phân loại lô hàng không gấp", "Đàm phán lead time với khách", "Đặt tuyến đường biển thay thế"]),
    ("FREIGHT_SEA", "LOGISTICS", "optimise_sea",
     "Chọn hãng tàu phát thải thấp và đóng container đầy", "Choose low-emission carriers and full containers", 0.08, 60,
     ["So sánh chỉ số phát thải hãng tàu", "Tối ưu xếp hàng để đầy container"]),
    ("MAT_", "MATERIAL", "recycled_material",
     "Tăng tỷ lệ nguyên liệu tái chế/ít phát thải", "Increase recycled / low-carbon materials", 0.12, 200,
     ["Liệt kê nguyên liệu phát thải cao", "Tìm nhà cung cấp có chứng nhận tái chế", "Thử nghiệm tỷ lệ 10-20%"]),
]


def _priority(share: float) -> str:
    return "HIGH" if share >= 0.3 else "MEDIUM" if share >= 0.1 else "LOW"


def build_candidates(req: OptimizeRequest) -> tuple[float, list[Suggestion]]:
    total = sum(s.co2e_kg for s in req.sources)
    if total <= 0:
        return 0.0, []
    en = req.language == "en"
    by_code: dict[str, float] = {}
    for s in req.sources:
        by_code[s.factor_code] = by_code.get(s.factor_code, 0) + s.co2e_kg

    out: list[Suggestion] = []
    for prefix, cat, sid, title_vi, title_en, pct, usd_per_t, steps in RULES:
        src = sum(v for k, v in by_code.items() if k.startswith(prefix))
        if src <= 0:
            continue
        reduction = src * pct
        share = src / total
        evidence = (
            f"{prefix.rstrip('_')} accounts for {src:,.0f} kg CO2e ({share:.0%} of total)"
            if en else
            f"Nhóm {prefix.rstrip('_')} phát thải {src:,.0f} kg CO2e ({share:.0%} tổng)"
        )
        out.append(Suggestion(
            id=sid, title=title_en if en else title_vi, category=cat, priority=_priority(share),
            estimated_reduction_kg=round(reduction, 1),
            estimated_reduction_pct=round(reduction / total * 100, 1),
            estimated_cost_usd=round(reduction / 1000 * usd_per_t, 0),
            rationale=evidence, evidence=evidence, steps=steps,
        ))
    out.sort(key=lambda x: x.estimated_reduction_kg, reverse=True)
    return total, out[: req.max_suggestions]


def _enrich_with_llm(req: OptimizeRequest, items: list[Suggestion]) -> list[Suggestion]:
    payload = json.dumps(
        [{"id": s.id, "title": s.title, "category": s.category, "evidence": s.evidence,
          "reduction_pct": s.estimated_reduction_pct, "steps": s.steps} for s in items],
        ensure_ascii=False,
    )
    out = generate_structured(
        OPTIMIZE_PROMPT.format(language="English" if req.language == "en" else "Tiếng Việt", payload=payload),
        LlmOptimizeOutput,
    )
    text = {t.id: t for t in out.items}
    for s in items:
        t = text.get(s.id)
        if t:
            s.title, s.rationale = t.title or s.title, t.rationale or s.rationale
            s.steps = t.steps or s.steps
    return items


def optimize(req: OptimizeRequest) -> OptimizeResponse:
    total, items = build_candidates(req)
    mock = settings.mock_mode or not settings.gemini_api_key
    if items and not mock:
        try:
            items = _enrich_with_llm(req, items)
        except GeminiError as e:
            log.warning("LLM diễn giải lỗi, dùng văn bản quy tắc: %s", e)
    return OptimizeResponse(mock=mock, total_co2e_kg=round(total, 1), suggestions=items)
