"""Chuẩn hóa đơn vị, ngày, số sau khi LLM trích xuất."""
import re
from datetime import datetime
from typing import Optional

# đơn vị -> (đơn vị chuẩn, hệ số nhân)
_UNIT_MAP = {
    "kwh": ("kWh", 1.0), "kw.h": ("kWh", 1.0), "kwhr": ("kWh", 1.0),
    "mwh": ("kWh", 1000.0), "wh": ("kWh", 0.001),
    "l": ("L", 1.0), "lit": ("L", 1.0), "lít": ("L", 1.0), "liter": ("L", 1.0), "litre": ("L", 1.0), "liters": ("L", 1.0), "litres": ("L", 1.0),
    "m3": ("m3", 1.0), "m³": ("m3", 1.0),
    "kg": ("kg", 1.0), "kgs": ("kg", 1.0), "kilogram": ("kg", 1.0), "kilograms": ("kg", 1.0),
    "kilo": ("kg", 1.0), "g": ("kg", 0.001),
    "tấn": ("kg", 1000.0), "tan": ("kg", 1000.0), "ton": ("kg", 1000.0),
    "tonne": ("kg", 1000.0), "t": ("kg", 1000.0), "mt": ("kg", 1000.0),
}


def normalize_unit(quantity: Optional[float], unit: Optional[str]):
    """Trả (quantity, unit) theo đơn vị chuẩn: kWh, L, m3, kg."""
    if quantity is None or not unit:
        return quantity, unit
    key = unit.strip().lower().replace(" ", "")
    if key in _UNIT_MAP:
        std, factor = _UNIT_MAP[key]
        return round(quantity * factor, 4), std
    return quantity, unit.strip()


_CURRENCY_MAP = {"vnđ": "VND", "vnd": "VND", "đ": "VND", "đồng": "VND", "dong": "VND",
                 "usd": "USD", "$": "USD", "us$": "USD", "eur": "EUR", "€": "EUR"}


def normalize_currency(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    key = value.strip().lower()
    return _CURRENCY_MAP.get(key, value.strip().upper())


def normalize_date(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    value = value.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%Y/%m/%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    m = re.search(r"(\d{1,2})\D+(\d{1,2})\D+(\d{4})", value)  # "ngày 05 tháng 03 năm 2024"
    if m:
        d, mo, y = map(int, m.groups())
        try:
            return datetime(y, mo, d).strftime("%Y-%m-%d")
        except ValueError:
            return None
    return None
