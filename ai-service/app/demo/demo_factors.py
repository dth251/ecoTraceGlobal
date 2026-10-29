"""Hệ số phát thải DEMO (giá trị tham khảo làm tròn, chỉ để test luồng).

Backend thay bằng bảng emission_factors có phiên bản và nguồn trích dẫn.
"""

# factor_code -> (giá trị, đơn vị hoạt động, nguồn tham khảo)
DEMO_FACTORS = {
    "ELEC_GRID": (0.66, "kWh", "Hệ số lưới điện VN (tham khảo)"),
    "FUEL_DIESEL": (2.68, "L", "IPCC 2006 (tham khảo)"),
    "FUEL_PETROL": (2.31, "L", "IPCC 2006 (tham khảo)"),
    "FUEL_LPG": (2.94, "kg", "DEFRA (tham khảo)"),
    "FUEL_NATGAS": (2.02, "m3", "DEFRA (tham khảo)"),
    "FUEL_COAL": (2.42, "kg", "IPCC 2006 (tham khảo)"),
    "MAT_STEEL": (1.9, "kg", "Tham khảo ngành thép"),
    "MAT_COTTON": (5.9, "kg", "Tham khảo sợi bông"),
    "MAT_PLASTIC": (2.5, "kg", "Tham khảo nhựa nguyên sinh"),
    "MAT_PAPER": (1.1, "kg", "Tham khảo giấy/carton"),
    "MAT_GENERIC": (2.0, "kg", "Giá trị mặc định demo"),
    # đơn vị: kg CO2e / tấn·km
    "FREIGHT_SEA": (0.016, "tkm", "DEFRA container (tham khảo)"),
    "FREIGHT_ROAD": (0.107, "tkm", "DEFRA HGV (tham khảo)"),
    "FREIGHT_AIR": (1.13, "tkm", "DEFRA air freight (tham khảo)"),
    "FREIGHT_RAIL": (0.028, "tkm", "DEFRA rail (tham khảo)"),
}

# Quãng đường demo khi vận đơn không ghi distance_km: (từ khóa nơi đi, từ khóa nơi đến) -> km
DEMO_ROUTES = [
    (("cát lái", "cat lai", "hồ chí minh", "ho chi minh", "hcm"), ("hamburg",), 17000),
    (("cát lái", "cat lai", "hồ chí minh", "ho chi minh", "hcm"), ("rotterdam",), 16800),
    (("cát lái", "cat lai", "hồ chí minh", "ho chi minh", "hcm"), ("los angeles", "long beach"), 13300),
    (("hải phòng", "hai phong"), ("rotterdam",), 17500),
    (("sgn", "tan son nhat", "tân sơn nhất"), ("frankfurt", "fra"), 9800),
    (("cát lái", "cat lai"), ("singapore",), 1250),
    (("cát lái", "cat lai"), ("busan",), 3600),
    (("hải phòng", "hai phong"), ("yokohama",), 3900),
    (("bình dương", "binh duong"), ("cát lái", "cat lai"), 35),
    (("long an",), ("cát lái", "cat lai"), 45),
]


def lookup_distance(origin: str | None, destination: str | None) -> float | None:
    if not origin or not destination:
        return None
    o, d = origin.lower(), destination.lower()
    for keys_o, keys_d, km in DEMO_ROUTES:
        if any(k in o for k in keys_o) and any(k in d for k in keys_d):
            return float(km)
    return None
