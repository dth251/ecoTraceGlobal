"""Giả lập CalculationEngine của backend."""
from typing import Optional

from pydantic import BaseModel

from app.demo.demo_factors import DEMO_FACTORS, lookup_distance
from app.schemas import ActivityType, ExtractedInvoice


class EmissionResult(BaseModel):
    co2e_kg: Optional[float] = None
    factor_code: Optional[str] = None
    factor_value: Optional[float] = None
    factor_unit: Optional[str] = None
    factor_source: Optional[str] = None
    formula: Optional[str] = None
    distance_km_used: Optional[float] = None  # quãng đường thực dùng (từ chứng từ hoặc tra bảng demo)
    status: str  # CALCULATED | MISSING_DATA | UNIT_MISMATCH | NO_FACTOR
    note: Optional[str] = None


def calculate(inv: ExtractedInvoice) -> EmissionResult:
    code = inv.factor_code
    if not code or code not in DEMO_FACTORS:
        return EmissionResult(status="NO_FACTOR", factor_code=code, note="Chưa xác định được hệ số")
    value, f_unit, source = DEMO_FACTORS[code]
    base = dict(factor_code=code, factor_value=value, factor_unit=f_unit, factor_source=source)

    if inv.activity_type == ActivityType.FREIGHT:
        distance, note = inv.distance_km, None
        if distance is None:
            distance = lookup_distance(inv.origin, inv.destination)
            note = f"distance_km tra bảng demo: {distance} km" if distance else None
        if inv.weight_kg is None or distance is None:
            return EmissionResult(status="MISSING_DATA", note="Thiếu khối lượng hoặc quãng đường", **base)
        tkm = inv.weight_kg / 1000 * distance
        return EmissionResult(
            status="CALCULATED", co2e_kg=round(tkm * value, 2),
            formula=f"{inv.weight_kg / 1000:g} t × {distance:g} km × {value} = {tkm * value:,.2f} kg",
            distance_km_used=distance, note=note, **base,
        )

    if inv.quantity is None:
        return EmissionResult(status="MISSING_DATA", note="Thiếu số lượng", **base)
    if inv.unit != f_unit:
        return EmissionResult(
            status="UNIT_MISMATCH", note=f"Đơn vị {inv.unit} khác đơn vị hệ số {f_unit}", **base
        )
    co2e = inv.quantity * value
    return EmissionResult(
        status="CALCULATED", co2e_kg=round(co2e, 2),
        formula=f"{inv.quantity:g} {inv.unit} × {value} = {co2e:,.2f} kg", **base,
    )
