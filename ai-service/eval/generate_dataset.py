"""Sinh bộ dữ liệu ĐÁNH GIÁ (dữ liệu hư cấu, nhất quán nội tại) kèm đáp án.

    python eval/generate_dataset.py                 # 24 chứng từ (4 loại x 3 bố cục x 2 biến thể)
    python eval/generate_dataset.py --variants 4    # 48 chứng từ

Mỗi bố cục có "bẫy" hay gặp ngoài thực tế: chỉ số công tơ cạnh điện năng tiêu thụ, dòng thuế BVMT,
trọng lượng tịnh cạnh trọng lượng cả bì, trọng lượng tính cước hàng không, số lẻ kiểu Việt, MWh, tấn.
Biến thể 0 là ảnh sạch, các biến thể sau bị làm xấu (nghiêng, mờ, nhiễu, chụp điện thoại, nén JPEG).
"""
import argparse
import calendar
import json
import random
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "dataset"
FONT_DIR = Path("C:/Windows/Fonts")
FONTS = [("arial", "arialbd"), ("tahoma", "tahomabd"), ("verdana", "verdanab"),
         ("times", "timesbd"), ("calibri", "calibrib"), ("segoeui", "segoeuib")]
DEGRADATIONS = ["photo", "rotate", "blur", "scan_noise", "jpeg_low"]
CUSTOMER = "Công ty TNHH Dệt May Xanh Demo"


# ---------------- tiện ích định dạng ----------------
def vn(x: float, d: int = 0) -> str:
    """12450.5 -> '12.450,5' (kiểu Việt)."""
    s = f"{x:,.{d}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def en(x: float, d: int = 0) -> str:
    return f"{x:,.{d}f}"


def d_vn(dt: date) -> str:
    return dt.strftime("%d/%m/%Y")


def d_vn_long(dt: date) -> str:
    return f"Ngày {dt.day:02d} tháng {dt.month:02d} năm {dt.year}"


def d_en(dt: date) -> str:
    return dt.strftime("%d %b %Y")


@dataclass
class Doc:
    doc_type: str
    layout: str
    seller: str
    title: str
    info: list[str]
    header: list[str]
    rows: list[list[str]]
    totals: list[str]
    expected: dict
    expected_review: list[str] = field(default_factory=list)
    keywords: dict = field(default_factory=dict)
    col_weights: list[float] | None = None
    width: int = 1240
    center: bool = False
    form: dict | None = None  # bố cục hóa đơn điện tử (xem einvoice_forms.py)


NULL_TRANSPORT = {"origin": None, "destination": None, "transport_mode": None, "distance_km": None}


# ---------------- ĐIỆN (Scope 2) ----------------
ELEC_SUPPLIERS = ["CÔNG TY ĐIỆN LỰC MẪU MIỀN NAM", "CÔNG TY ĐIỆN LỰC THỬ NGHIỆM ĐỒNG NAI",
                  "TỔNG CÔNG TY ĐIỆN LỰC DEMO MIỀN BẮC"]


def electricity(layout: int, rng: random.Random) -> Doc:
    supplier = rng.choice(ELEC_SUPPLIERS)
    y, m = 2025, rng.randint(1, 11)
    total = rng.randrange(3000, 60000, 10)
    base = {"activity_type": "ELECTRICITY", "factor_code": "ELEC_GRID", "scope": 2, "supplier": supplier,
            "unit": "kWh", "quantity": float(total), "currency": "VND", **NULL_TRANSPORT}

    if layout == 0:  # bảng giờ bình thường / cao điểm / thấp điểm + chỉ số công tơ (bẫy)
        last = calendar.monthrange(y, m)[1]
        issue = date(y, m, last)
        normal = round(total * 0.6 / 10) * 10
        peak = round(total * 0.22 / 10) * 10
        off = total - normal - peak
        prices = [1960, 3640, 1190]
        rows, pre = [], 0
        for name, part, price in zip(["Giờ bình thường", "Giờ cao điểm", "Giờ thấp điểm"], [normal, peak, off], prices):
            old = rng.randrange(50_000, 900_000, 10)
            rows.append([name, vn(old), vn(old + part), vn(part), vn(price), vn(part * price)])
            pre += part * price
        vat = round(pre * 0.08)
        return Doc("ELECTRICITY", "E0_bang_gio", supplier, "HÓA ĐƠN GIÁ TRỊ GIA TĂNG (TIỀN ĐIỆN)",
                   [f"Kỳ hóa đơn: 01/{m:02d}/{y} - {last}/{m:02d}/{y}", f"Ngày lập: {d_vn(issue)}",
                    f"Khách hàng: {CUSTOMER}", "Địa chỉ: KCN Sóng Thần, Bình Dương",
                    f"Mã khách hàng: PE04000{rng.randint(10000, 99999)}"],
                   ["Nội dung", "Chỉ số cũ", "Chỉ số mới", "Điện năng TT (kWh)", "Đơn giá", "Thành tiền (VNĐ)"],
                   rows,
                   [f"Tổng điện năng tiêu thụ: {vn(total)} kWh", f"Cộng tiền điện: {vn(pre)}",
                    f"Thuế GTGT 8%: {vn(vat)}", f"Tổng cộng thanh toán: {vn(pre + vat)} VNĐ"],
                   {**base, "invoice_date": issue.isoformat(), "amount": float(pre + vat)},
                   col_weights=[1.6, 1, 1, 1.3, 0.8, 1.2])

    if layout == 1:  # kỳ lệch tháng, ngày lập dạng chữ
        issue = date(y, m + 1, 16)
        price = rng.choice([2103, 2280, 2456])
        pre = total * price
        tot = round(pre * 1.08)
        return Doc("ELECTRICITY", "E1_ky_lech", supplier, "HÓA ĐƠN TIỀN ĐIỆN",
                   [f"Kỳ: từ 15/{m:02d}/{y} đến 14/{m + 1:02d}/{y}", d_vn_long(issue),
                    f"Tên khách hàng: {CUSTOMER}", "Mục đích sử dụng: Sản xuất"],
                   ["Nội dung", "Sản lượng (kWh)", "Đơn giá (đ/kWh)", "Thành tiền"],
                   [["Điện năng tiêu thụ", vn(total), vn(price), vn(pre)]],
                   [f"Thuế GTGT (8%): {vn(tot - pre)}", f"Tổng tiền thanh toán: {vn(tot)} đồng"],
                   {**base, "invoice_date": issue.isoformat(), "amount": float(tot)},
                   col_weights=[1.6, 1.1, 1.1, 1.2])

    # layout 2: tiếng Anh, đơn vị MWh
    last = calendar.monthrange(y, m)[1]
    issue = date(y, m, last)
    tot = round(total * 2350 * 1.08)
    return Doc("ELECTRICITY", "E2_english_mwh", supplier, "ELECTRICITY BILL / HÓA ĐƠN TIỀN ĐIỆN",
               [f"Billing period: {d_en(date(y, m, 1))} - {d_en(issue)}", f"Issue date: {d_en(issue)}",
                "Customer: Xanh Demo Garment Co., Ltd", "Tariff: Industrial, 22kV"],
               ["Item", "Consumption", "Amount (VND)"],
               [["Active energy", f"{en(total / 1000, 2)} MWh", en(round(total * 2350))],
                ["VAT 8%", "", en(tot - round(total * 2350))]],
               [f"TOTAL DUE: VND {en(tot)}"],
               {**base, "invoice_date": issue.isoformat(), "amount": float(tot)},
               col_weights=[1.4, 1.2, 1.2])


# ---------------- NHIÊN LIỆU (Scope 1) ----------------
# (tên hàng, mã hệ số, ĐVT in trên chứng từ, hệ số đổi sang đơn vị chuẩn, đơn vị chuẩn, khoảng SL, khoảng giá)
FUELS = [
    ("Dầu DO 0,05S-II", "FUEL_DIESEL", "Lít", 1, "L", (200, 5000), (18000, 21000)),
    ("Xăng RON 95-III", "FUEL_PETROL", "Lít", 1, "L", (100, 2000), (20000, 24000)),
    ("Than cám 4a", "FUEL_COAL", "Tấn", 1000, "kg", (5, 80), (2_500_000, 3_500_000)),
    ("Khí LPG (bình 45kg)", "FUEL_LPG", "kg", 1, "kg", (2, 20), (25000, 30000)),
    ("Xăng E5 RON 92-II", "FUEL_PETROL", "lít", 1, "L", (100, 1500), (19000, 22000)),
    ("Dầu Diesel 0,001S-V", "FUEL_DIESEL", "Lít", 1, "L", (500, 8000), (19000, 22000)),
]
FUEL_SUPPLIERS = ["CÔNG TY XĂNG DẦU KHU VỰC MẪU", "CÔNG TY CP NHIÊN LIỆU DEMO SÀI GÒN", "DOANH NGHIỆP THAN MẪU QUẢNG NINH"]


def fuel(layout: int, variant: int, rng: random.Random) -> Doc:
    issue = date(2025, rng.randint(1, 12), rng.randint(1, 28))
    if layout == 2:  # phiếu bán lẻ cây xăng: số lít lẻ kiểu Việt
        name, code = ("Xăng RON 95-III", "FUEL_PETROL") if variant % 2 == 0 else ("Dầu DO 0,05S-II", "FUEL_DIESEL")
        liters = round(rng.uniform(20, 80), 2)
        price = rng.randrange(19000, 24000, 10)
        amount = round(liters * price)
        supplier = f"CỬA HÀNG XĂNG DẦU MẪU SỐ {rng.randint(10, 99)}"
        return Doc("FUEL", "F2_phieu_ban_le", supplier, "HÓA ĐƠN BÁN LẺ XĂNG DẦU",
                   [f"Thời gian: {d_vn(issue)} {rng.randint(6, 21):02d}:{rng.randint(0, 59):02d}",
                    f"Vòi bơm: {rng.randint(1, 8)}", f"Mặt hàng: {name}", f"Số lít: {vn(liters, 2)}",
                    f"Đơn giá: {vn(price)} đ/lít", f"Thành tiền: {vn(amount)} đ", "Biển số xe: 51C-000.00 (mẫu)"],
                   [], [], ["Cảm ơn quý khách!"],
                   {"activity_type": "FUEL", "factor_code": code, "scope": 1, "supplier": supplier,
                    "invoice_date": issue.isoformat(), "quantity": liters, "unit": "L",
                    "amount": float(amount), "currency": "VND", **NULL_TRANSPORT},
                   width=760, center=True)

    name, code, unit_print, conv, unit_std, (q0, q1), (p0, p1) = FUELS[(layout * 3 + variant) % len(FUELS)]
    qty = rng.randint(q0, q1)
    if code == "FUEL_LPG":
        qty *= 45  # số kg = số bình x 45
    price = rng.randrange(p0, p1, 10)
    supplier = FUEL_SUPPLIERS[2] if code == "FUEL_COAL" else rng.choice(FUEL_SUPPLIERS[:2])
    rows = [["1", name, unit_print, vn(qty), vn(price), vn(qty * price)]]
    pre = qty * price
    if layout == 1:  # bẫy: dòng thuế BVMT cùng số lượng
        env_price = 2000 if unit_print.lower() == "lít" else 30000 if code == "FUEL_COAL" else 1000
        rows.append(["2", "Thuế bảo vệ môi trường", unit_print, vn(qty), vn(env_price), vn(qty * env_price)])
        pre += qty * env_price
    vat = round(pre * 0.1)
    return Doc("FUEL", f"F{layout}_{'hddt' if layout == 0 else 'thue_bvmt'}", supplier, "HÓA ĐƠN GIÁ TRỊ GIA TĂNG",
               [f"Ký hiệu: 1C25T{rng.choice('ABCDXY')}{rng.choice('ABCDXY')}   Số: {rng.randint(1, 9999):07d}",
                d_vn_long(issue) if layout == 0 else f"Ngày lập: {d_vn(issue)}",
                f"Người mua: {CUSTOMER}", "Hình thức thanh toán: CK"],
               ["STT", "Tên hàng hóa, dịch vụ", "ĐVT", "Số lượng", "Đơn giá", "Thành tiền"], rows,
               [f"Cộng tiền hàng: {vn(pre)}", f"Thuế GTGT 10%: {vn(vat)}", f"Tổng thanh toán: {vn(pre + vat)} VNĐ"],
               {"activity_type": "FUEL", "factor_code": code, "scope": 1, "supplier": supplier,
                "invoice_date": issue.isoformat(), "quantity": float(qty * conv), "unit": unit_std,
                "amount": float(pre + vat), "currency": "VND", **NULL_TRANSPORT},
               col_weights=[0.4, 2.4, 0.6, 0.9, 1, 1.2])


# ---------------- NGUYÊN LIỆU (Scope 3) ----------------
MATERIALS = [
    ("Sợi cotton chải kỹ Ne30/1", "MAT_COTTON", "Tấn", 1000, "kg", (2, 20), (50_000_000, 60_000_000)),
    ("Thép cuộn cán nóng SS400", "MAT_STEEL", "Tấn", 1000, "kg", (5, 60), (13_000_000, 16_000_000)),
    ("Hạt nhựa PP nguyên sinh", "MAT_PLASTIC", "kg", 1, "kg", (500, 20000), (28000, 35000)),
    ("Vải kaki cotton khổ 1m5", "MAT_COTTON", "Mét", 1, "Mét", (1000, 15000), (38000, 52000)),
    ("Giấy kraft cuộn định lượng 150g", "MAT_PAPER", "kg", 1, "kg", (1000, 12000), (12000, 16000)),
    ("Vải thun cotton 100%", "MAT_COTTON", "kg", 1, "kg", (300, 5000), (120000, 160000)),
]
MAT_SUPPLIERS = {"MAT_COTTON": "CÔNG TY TNHH VẢI SỢI MẪU TÂN BÌNH", "MAT_STEEL": "CÔNG TY TNHH THÉP DEMO PHÚ MỸ",
                 "MAT_PLASTIC": "CÔNG TY NHỰA THỬ NGHIỆM BÌNH CHÁNH", "MAT_PAPER": "CÔNG TY GIẤY MẪU ĐỒNG NAI"}


def material(layout: int, variant: int, rng: random.Random) -> Doc:
    issue = date(2025, rng.randint(1, 12), rng.randint(1, 28))
    if layout == 2:  # commercial invoice nhập khẩu, tiếng Anh, USD
        name, code, kw = [("100% Cotton combed yarn Ne40/1", "MAT_COTTON", "cotton"),
                          ("PP resin, injection grade", "MAT_PLASTIC", "plastic")][variant % 2]
        kgs = rng.randrange(2000, 25000, 25)
        price = round(rng.uniform(1.1, 3.2), 2)
        amount = round(kgs * price, 2)
        supplier = "DEMO TEXTILE MATERIALS CO., LTD"
        return Doc("MATERIAL", "M2_commercial_invoice", supplier, "COMMERCIAL INVOICE",
                   [f"Invoice No: DTM-{rng.randint(1000, 9999)}   Date: {issue.strftime('%B %d, %Y')}",
                    "Buyer: Xanh Demo Garment Co., Ltd, Binh Duong, Vietnam", "Terms: CIF Cat Lai",
                    "Country of origin: Korea (sample)"],
                   ["Description", "Quantity", "Unit price (USD/KG)", "Amount (USD)"],
                   [[name, f"{en(kgs, 2)} KGS", en(price, 2), en(amount, 2)]],
                   [f"TOTAL: USD {en(amount, 2)}"],
                   {"activity_type": "MATERIAL", "factor_code": code, "scope": 3, "supplier": supplier,
                    "invoice_date": issue.isoformat(), "quantity": float(kgs), "unit": "kg",
                    "amount": amount, "currency": "USD", **NULL_TRANSPORT},
                   col_weights=[2.2, 1.2, 1.2, 1.2])

    name, code, unit_print, conv, unit_std, (q0, q1), (p0, p1) = MATERIALS[(layout * 3 + variant) % len(MATERIALS)]
    qty = rng.randint(q0, q1)
    price = rng.randrange(p0, p1, 100)
    supplier = MAT_SUPPLIERS[code]
    rows = [["1", name, unit_print, vn(qty), vn(price), vn(qty * price)]]
    pre = qty * price
    if layout == 1:  # bẫy: thêm dòng cước vận chuyển (dịch vụ) không phải nguyên liệu
        fee = rng.randrange(1_500_000, 6_000_000, 10_000)
        rows.append(["2", "Cước vận chuyển giao hàng", "Chuyến", "1", vn(fee), vn(fee)])
        pre += fee
    vat = round(pre * 0.08)
    review = ["unit"] if unit_std not in ("kg",) else []  # nguyên liệu không tính theo khối lượng -> cần quy đổi
    return Doc("MATERIAL", f"M{layout}_{'hddt' if layout == 0 else 'kem_cuoc'}", supplier, "HÓA ĐƠN GIÁ TRỊ GIA TĂNG",
               [f"Số: {rng.randint(1, 9999):07d}   Ngày: {d_vn(issue)}", f"Người mua: {CUSTOMER}",
                "Hình thức thanh toán: Chuyển khoản"],
               ["STT", "Tên hàng hóa, dịch vụ", "ĐVT", "Số lượng", "Đơn giá", "Thành tiền"], rows,
               [f"Thuế GTGT 8%: {vn(vat)}", f"Tổng thanh toán: {vn(pre + vat)} VNĐ"],
               {"activity_type": "MATERIAL", "factor_code": code, "scope": 3, "supplier": supplier,
                "invoice_date": issue.isoformat(), "quantity": float(qty * conv), "unit": unit_std,
                "amount": float(pre + vat), "currency": "VND", **NULL_TRANSPORT},
               expected_review=review, col_weights=[0.4, 2.4, 0.6, 0.9, 1, 1.2])


# ---------------- VẬN CHUYỂN (Scope 3) ----------------
SEA_ROUTES = [("Cat Lai, Ho Chi Minh City, Vietnam", "cat lai", "Hamburg, Germany", "hamburg"),
              ("Cat Lai, Ho Chi Minh City, Vietnam", "cat lai", "Rotterdam, Netherlands", "rotterdam"),
              ("Cat Lai, Ho Chi Minh City, Vietnam", "cat lai", "Los Angeles, USA", "los angeles"),
              ("Hai Phong, Vietnam", "hai phong", "Rotterdam, Netherlands", "rotterdam")]
ROAD_ROUTES = [("Kho Bình Dương", "binh duong", "Cảng Cát Lái (TP.HCM)", "cat lai", 35),
               ("Nhà máy Long An", "long an", "Cảng Cát Lái", "cat lai", 45),
               ("KCN Nhơn Trạch, Đồng Nai", "nhon trach", "Cảng Cái Mép", "cai mep", 62)]


def freight(layout: int, variant: int, rng: random.Random) -> Doc:
    issue = date(2025, rng.randint(1, 12), rng.randint(1, 28))
    if layout == 0:  # vận đơn đường biển: gross weight + net weight (bẫy), không có quãng đường
        o, okw, d, dkw = SEA_ROUTES[variant % len(SEA_ROUTES)]
        n_cont = rng.randint(1, 3)
        gross = round(rng.uniform(7000, 24000) * n_cont / 10) * 10
        net = round(gross * 0.92)
        fee = n_cont * rng.randrange(1200, 2600, 50)
        supplier = "DEMO OCEAN LINES CO., LTD"
        return Doc("FREIGHT", "T0_bill_of_lading", supplier, "BILL OF LADING / FREIGHT INVOICE",
                   [f"B/L No: DOL{rng.randint(10000, 99999)}   Date of issue: {d_vn(issue)}",
                    "Shipper: Xanh Demo Garment Co., Ltd", f"Port of loading: {o}", f"Port of discharge: {d}",
                    "Mode: Ocean freight (FCL)"],
                   ["Container", "Description", "Net weight (KGS)", "Gross weight (KGS)", "Measurement"],
                   [[f"{n_cont} x 40HC", "Garments", en(net, 2), en(gross, 2), f"{n_cont * 67} CBM"]],
                   [f"Ocean freight: USD {en(fee - 150, 2)}", "THC + Doc fee: USD 150.00", f"Total: USD {en(fee, 2)}"],
                   {"activity_type": "FREIGHT", "factor_code": "FREIGHT_SEA", "scope": 3, "supplier": supplier,
                    "invoice_date": issue.isoformat(), "amount": float(fee), "currency": "USD",
                    "origin": o, "destination": d, "transport_mode": "SEA", "weight_kg": float(gross),
                    "distance_km": None},
                   expected_review=["distance_km"], keywords={"origin": okw, "destination": dkw},
                   col_weights=[1, 1.2, 1.2, 1.2, 1])

    if layout == 1:  # cước đường bộ: khối lượng theo tấn lẻ, có quãng đường
        o, okw, d, dkw, km = ROAD_ROUTES[variant % len(ROAD_ROUTES)]
        tons = rng.choice([8, 12.5, 15, 18, 22.4, 25])
        fee = rng.randrange(2_500_000, 6_000_000, 50_000)
        tot = round(fee * 1.08)
        supplier = rng.choice(["CÔNG TY TNHH VẬN TẢI MẪU NAM BỘ", "CÔNG TY CP LOGISTICS DEMO ĐÔNG NAM"])
        return Doc("FREIGHT", "T1_duong_bo", supplier, "HÓA ĐƠN CƯỚC VẬN CHUYỂN ĐƯỜNG BỘ",
                   [f"Số: {rng.randint(1, 9999):07d}   Ngày: {d_vn(issue)}", f"Khách hàng: {CUSTOMER}",
                    f"Tuyến: {o} -> {d}", "Phương tiện: Xe đầu kéo container 40'"],
                   ["Nội dung", "Khối lượng", "Quãng đường", "Thành tiền (VNĐ)"],
                   [["Kéo container hàng xuất", f"{vn(tons, 1 if tons % 1 else 0)} tấn", f"{km} km", vn(fee)]],
                   [f"Thuế GTGT 8%: {vn(tot - fee)}", f"Tổng thanh toán: {vn(tot)} VNĐ"],
                   {"activity_type": "FREIGHT", "factor_code": "FREIGHT_ROAD", "scope": 3, "supplier": supplier,
                    "invoice_date": issue.isoformat(), "amount": float(tot), "currency": "VND",
                    "origin": o, "destination": d, "transport_mode": "ROAD", "weight_kg": tons * 1000,
                    "distance_km": float(km)},
                   keywords={"origin": okw, "destination": dkw}, col_weights=[1.8, 1, 1, 1.2])

    # layout 2: air waybill: gross weight + chargeable weight (bẫy), không có quãng đường
    gross = rng.randrange(150, 2500, 5)
    charge = round(gross * rng.uniform(1.15, 1.6))
    rate = round(rng.uniform(2.8, 4.5), 2)
    fee = round(charge * rate, 2)
    supplier = "DEMO AIR CARGO SERVICES"
    return Doc("FREIGHT", "T2_air_waybill", supplier, "AIR WAYBILL / AIR FREIGHT INVOICE",
               [f"AWB No: 999-{rng.randint(10000000, 99999999)}   Issued: {d_en(issue)}",
                "Airport of departure: Tan Son Nhat (SGN), Ho Chi Minh City", "Airport of destination: Frankfurt (FRA)",
                "Shipper: Xanh Demo Garment Co., Ltd"],
               ["Pieces", "Gross weight (kg)", "Chargeable weight (kg)", "Rate (USD/kg)", "Total (USD)"],
               [[str(rng.randint(5, 80)), en(gross), en(charge), en(rate, 2), en(fee, 2)]],
               [f"TOTAL CHARGES: USD {en(fee, 2)}"],
               {"activity_type": "FREIGHT", "factor_code": "FREIGHT_AIR", "scope": 3, "supplier": supplier,
                "invoice_date": issue.isoformat(), "amount": fee, "currency": "USD",
                "origin": "Tan Son Nhat (SGN), Ho Chi Minh City", "destination": "Frankfurt (FRA)",
                "transport_mode": "AIR", "weight_kg": float(gross), "distance_km": None},
               expected_review=["distance_km"], keywords={"origin": "sgn|tan son nhat|ho chi minh", "destination": "fra"},
               col_weights=[0.8, 1.2, 1.4, 1, 1.1])


# ---------------- vẽ và làm xấu ảnh ----------------
def _font(name: str, size: int):
    try:
        return ImageFont.truetype(str(FONT_DIR / f"{name}.ttf"), size)
    except OSError:
        return ImageFont.truetype(str(FONT_DIR / "arial.ttf"), size)


def render(doc: Doc, rng: random.Random) -> Image.Image:
    reg, bold = rng.choice(FONTS)
    W = doc.width
    img = Image.new("RGB", (W, 1600), "white")
    dr = ImageDraw.Draw(img)
    y = 50

    def line(text, size=20, b=False, color="black", x=60, center=doc.center):
        nonlocal y
        f = _font(bold if b else reg, size)
        if center:
            x = (W - dr.textlength(text, font=f)) / 2
        dr.text((x, y), text, font=f, fill=color)
        y += int(size * 1.7)

    line(doc.seller, 25, True)
    line("Mã số thuế: 0300000000 (dữ liệu mẫu)", 17, color="#555")
    y += 15
    line(doc.title, 30, True, "#0b3d2e", center=True)
    y += 10
    for t in doc.info:
        line(t, 20)
    y += 15

    if doc.header:
        weights = doc.col_weights or [1] * len(doc.header)
        scale = (W - 120) / sum(weights)
        widths = [w * scale for w in weights]
        for r, row in enumerate([doc.header] + doc.rows):
            x0 = 60
            for c, cell in enumerate(row):
                dr.rectangle([x0, y, x0 + widths[c], y + 48], outline="black", fill="#e8f2ec" if r == 0 else None)
                size = 17
                f = _font(bold if r == 0 else reg, size)
                while dr.textlength(cell, font=f) > widths[c] - 10 and size > 10:
                    size -= 1
                    f = _font(bold if r == 0 else reg, size)
                dr.text((x0 + 5, y + 14), cell, font=f, fill="black")
                x0 += widths[c]
            y += 48
        y += 25

    for t in doc.totals:
        line(t, 21, True, x=W - 640 if not doc.center else 60)
    y += 30
    if not doc.center:
        dr.text((60, y), "Người mua hàng", font=_font(reg, 18), fill="black")
        dr.text((W - 360, y), "Người bán hàng (đã ký)", font=_font(reg, 18), fill="black")
    return img.crop((0, 0, W, y + 80))


def degrade(img: Image.Image, kind: str, rng: random.Random) -> Image.Image:
    if kind == "rotate":
        return img.rotate(rng.choice([-1, 1]) * rng.uniform(1.5, 4), expand=True, fillcolor=(232, 232, 226),
                          resample=Image.BICUBIC)
    if kind == "blur":
        return img.filter(ImageFilter.GaussianBlur(rng.uniform(1.4, 2.0)))
    if kind == "scan_noise":
        arr = np.asarray(img.convert("L"), dtype=np.float32)
        arr = arr * 0.82 + 30 + np.random.default_rng(rng.randint(0, 9999)).normal(0, 22, arr.shape)
        return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert("RGB")
    if kind == "photo":
        w, h = img.size
        img = img.resize((int(w * 0.7), int(h * 0.7)), Image.BILINEAR)
        img = img.rotate(rng.uniform(-2.5, 2.5), expand=True, fillcolor=(120, 110, 95), resample=Image.BICUBIC)
        arr = np.asarray(img, dtype=np.float32)
        grad = np.linspace(rng.uniform(0.55, 0.7), 1.0, arr.shape[1])[None, :, None]  # bóng tối một bên
        arr = arr * grad * np.array([1.0, 0.97, 0.9])  # ánh sáng vàng
        return ImageEnhance.Contrast(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))).enhance(0.85)
    if kind == "jpeg_low":
        w, h = img.size
        return img.resize((int(w * 0.55), int(h * 0.55)), Image.BILINEAR)
    return img


LAYOUTS = {"ELECTRICITY": 4, "FUEL": 4, "MATERIAL": 4, "FREIGHT": 4, "OTHER": 2}


def build_doc(doc_type: str, layout: int, variant: int, rng: random.Random) -> Doc:
    import einvoice_forms as ef  # nạp muộn để tránh import vòng

    if doc_type == "ELECTRICITY":
        return electricity(layout, rng) if layout < 3 else ef.evn_form(variant, rng)
    if doc_type == "FUEL":
        return fuel(layout, variant, rng) if layout < 3 else ef.fuel_form(variant, rng)
    if doc_type == "MATERIAL":
        return material(layout, variant, rng) if layout < 3 else ef.material_form(variant, rng)
    if doc_type == "FREIGHT":
        return freight(layout, variant, rng) if layout < 3 else ef.forwarder_form(variant, rng)
    return (ef.water_form if layout == 0 else ef.retail_form)(variant, rng)


def main():
    import einvoice_forms as ef

    ap = argparse.ArgumentParser()
    ap.add_argument("--variants", type=int, default=2, help="số biến thể mỗi bố cục (biến thể 0 là ảnh sạch)")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", default=str(OUT), help="thư mục xuất (vd. eval/dataset_holdout)")
    args = ap.parse_args()
    out = Path(args.out)

    out.mkdir(parents=True, exist_ok=True)
    for old in out.iterdir():
        old.unlink()

    labels, n = [], 0
    for doc_type, n_layouts in LAYOUTS.items():
        for layout in range(n_layouts):
            for variant in range(args.variants):
                rng = random.Random(f"{args.seed}-{doc_type}-{layout}-{variant}")  # ổn định khi thêm bố cục mới
                doc = build_doc(doc_type, layout, variant, rng)
                img = ef.render_form(doc, rng) if doc.form else render(doc, rng)
                kind = "clean" if variant == 0 else DEGRADATIONS[(n + variant) % len(DEGRADATIONS)]
                img = degrade(img, kind, rng)
                n += 1
                stem = f"{n:03d}_{doc.layout}_{kind}"
                if kind == "clean":
                    ext = ".pdf" if n % 2 else ".png"
                    path = out / f"{stem}{ext}"
                    img.save(path, "PDF", resolution=150) if ext == ".pdf" else img.save(path)
                else:
                    path = out / f"{stem}.jpg"
                    img.save(path, "JPEG", quality=20 if kind == "jpeg_low" else 60)
                labels.append({"file": path.name, "doc_type": doc.doc_type, "layout": doc.layout,
                               "degradation": kind, "expected": doc.expected,
                               "expected_review": doc.expected_review, "keywords": doc.keywords})

    (out / "labels.json").write_text(json.dumps(labels, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Đã tạo {len(labels)} chứng từ + labels.json trong {out}")


if __name__ == "__main__":
    main()
