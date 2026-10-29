"""Danh mục mã nhóm hệ số phát thải mà AI được phép gợi ý.

AI chỉ trả về MÃ. Giá trị hệ số nằm ở bảng emission_factors của backend.
"""

FACTOR_SCOPE = {
    # Scope 2
    "ELEC_GRID": 2,
    # Scope 1
    "FUEL_DIESEL": 1,
    "FUEL_PETROL": 1,
    "FUEL_LPG": 1,
    "FUEL_NATGAS": 1,
    "FUEL_COAL": 1,
    # Scope 3 - nguyên liệu
    "MAT_STEEL": 3,
    "MAT_COTTON": 3,
    "MAT_PLASTIC": 3,
    "MAT_PAPER": 3,
    "MAT_GENERIC": 3,
    # Scope 3 - vận chuyển
    "FREIGHT_SEA": 3,
    "FREIGHT_ROAD": 3,
    "FREIGHT_AIR": 3,
    "FREIGHT_RAIL": 3,
}

# (từ khóa, mã) - kiểm tra theo thứ tự, so khớp trên văn bản đã hạ chữ thường
KEYWORD_RULES = [
    (("điện", "dien", "electric", "kwh", "evn", "power"), "ELEC_GRID"),
    (("diesel", "dầu do", "dau do", "do 0,05", "do 0.05"), "FUEL_DIESEL"),
    (("xăng", "xang", "petrol", "gasoline", "ron95", "ron 95", "e5"), "FUEL_PETROL"),
    (("lpg", "gas hóa lỏng", "khí hóa lỏng"), "FUEL_LPG"),
    (("khí tự nhiên", "natural gas", "lng", "cng"), "FUEL_NATGAS"),
    (("than đá", "than ", "coal"), "FUEL_COAL"),
    (("đường biển", "sea freight", "ocean", "b/l", "container", "fcl", "lcl"), "FREIGHT_SEA"),
    (("hàng không", "air freight", "awb", "airway"), "FREIGHT_AIR"),
    (("đường sắt", "rail"), "FREIGHT_RAIL"),
    (("vận chuyển", "cước", "freight", "trucking", "xe tải", "đường bộ", "logistics"), "FREIGHT_ROAD"),
    (("thép", "steel", "sắt"), "MAT_STEEL"),
    (("bông", "sợi", "vải", "cotton", "fabric", "yarn"), "MAT_COTTON"),
    (("nhựa", "plastic", "pp", "pe", "pvc", "pet", "resin", "polypropylene", "polyethylene"), "MAT_PLASTIC"),
    (("giấy", "paper", "carton", "bìa", "kraft"), "MAT_PAPER"),
]

FREIGHT_MODE_TO_CODE = {
    "SEA": "FREIGHT_SEA",
    "ROAD": "FREIGHT_ROAD",
    "AIR": "FREIGHT_AIR",
    "RAIL": "FREIGHT_RAIL",
}

ACTIVITY_DEFAULT_CODE = {
    "ELECTRICITY": "ELEC_GRID",
    "MATERIAL": "MAT_GENERIC",
}

# Đơn vị hoạt động mà mỗi mã hệ số yêu cầu (dùng để phát hiện đơn vị/mã không khớp)
FACTOR_UNIT = {
    "ELEC_GRID": "kWh", "FUEL_DIESEL": "L", "FUEL_PETROL": "L", "FUEL_LPG": "kg", "FUEL_NATGAS": "m3",
    "FUEL_COAL": "kg", **{c: "kg" for c in FACTOR_SCOPE if c.startswith("MAT_")},
}

# Khoảng đơn giá thị trường Việt Nam (VND / đơn vị chuẩn), dùng để phát hiện đọc sai số lượng cả khi
# LLM tự suy ra đơn giá từ thành tiền (khi đó phép nhân số lượng × đơn giá luôn khớp dù số lượng sai)
PRICE_RANGE_VND = {
    "ELEC_GRID": (1_000, 5_000), "FUEL_DIESEL": (10_000, 40_000), "FUEL_PETROL": (10_000, 40_000),
    "FUEL_LPG": (15_000, 60_000), "FUEL_COAL": (1_000, 8_000), "FUEL_NATGAS": (5_000, 60_000),
}
MATERIAL_PRICE_RANGE_VND = (3_000, 400_000)  # nguyên liệu: khoảng rộng vì rất đa dạng
