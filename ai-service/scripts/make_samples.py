"""Sinh chứng từ MẪU (dữ liệu hư cấu) để test luồng AI.

    python scripts/make_samples.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "samples"
FONT_DIR = Path("C:/Windows/Fonts")


def _font(size: int, bold: bool = False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    try:
        return ImageFont.truetype(str(FONT_DIR / name), size)
    except OSError:
        return ImageFont.load_default()


SAMPLES = [
    {
        "file": "01_hoa_don_dien_t03.png",
        "seller": "CÔNG TY ĐIỆN LỰC MIỀN NAM MẪU",
        "title": "HÓA ĐƠN GIÁ TRỊ GIA TĂNG (TIỀN ĐIỆN)",
        "info": [
            "Kỳ hóa đơn: 01/03/2025 - 31/03/2025", "Ngày lập: 31/03/2025",
            "Khách hàng: Công ty TNHH Dệt May Xanh Demo", "Địa chỉ: KCN Sóng Thần, Bình Dương",
            "Mã khách hàng: PE0400012345",
        ],
        "header": ["Nội dung", "Chỉ số cũ", "Chỉ số mới", "Điện năng TT (kWh)", "Thành tiền (VNĐ)"],
        "rows": [
            ["Giờ bình thường", "152.300", "159.800", "7.500", "13.987.500"],
            ["Giờ cao điểm", "48.100", "50.950", "2.850", "9.402.150"],
            ["Giờ thấp điểm", "61.200", "63.300", "2.100", "2.233.350"],
        ],
        "totals": ["Tổng điện năng tiêu thụ: 12.450 kWh", "Thuế GTGT 8%: 2.041.920",
                   "Tổng cộng thanh toán: 27.664.920 VNĐ"],
    },
    {
        "file": "02_hoa_don_dien_t04.png",
        "seller": "CÔNG TY ĐIỆN LỰC MIỀN NAM MẪU",
        "title": "HÓA ĐƠN GIÁ TRỊ GIA TĂNG (TIỀN ĐIỆN)",
        "info": [
            "Kỳ hóa đơn: 01/04/2025 - 30/04/2025", "Ngày lập: 30/04/2025",
            "Khách hàng: Công ty TNHH Dệt May Xanh Demo", "Mã khách hàng: PE0400012345",
        ],
        "header": ["Nội dung", "Điện năng TT (kWh)", "Thành tiền (VNĐ)"],
        "rows": [["Điện sản xuất", "11.200", "23.520.000"]],
        "totals": ["Tổng điện năng tiêu thụ: 11.200 kWh", "Tổng cộng thanh toán: 25.401.600 VNĐ"],
        "blur": 1.2,  # ảnh chụp hơi mờ để kiểm tra độ tin cậy
    },
    {
        "file": "03_hoa_don_dau_diesel.pdf",
        "seller": "CÔNG TY XĂNG DẦU KHU VỰC MẪU",
        "title": "HÓA ĐƠN GIÁ TRỊ GIA TĂNG",
        "info": [
            "Ký hiệu: 1C25TXD   Số: 0004521", "Ngày 15 tháng 03 năm 2025",
            "Người mua: Công ty TNHH Dệt May Xanh Demo", "Mục đích: nhiên liệu cho máy phát điện và nồi hơi",
        ],
        "header": ["STT", "Tên hàng hóa", "ĐVT", "Số lượng", "Đơn giá", "Thành tiền"],
        "rows": [["1", "Dầu DO 0,05S-II", "Lít", "800", "19.450", "15.560.000"]],
        "totals": ["Cộng tiền hàng: 15.560.000", "Thuế GTGT 10%: 1.556.000",
                   "Tổng thanh toán: 17.116.000 VNĐ"],
    },
    {
        "file": "04_hoa_don_nguyen_lieu_soi.png",
        "seller": "CÔNG TY CỔ PHẦN SỢI MẪU VIỆT",
        "title": "HÓA ĐƠN GIÁ TRỊ GIA TĂNG",
        "info": [
            "Số: 0001876   Ngày: 10/03/2025", "Người mua: Công ty TNHH Dệt May Xanh Demo",
            "Hình thức thanh toán: Chuyển khoản",
        ],
        "header": ["STT", "Tên hàng hóa", "ĐVT", "Số lượng", "Đơn giá", "Thành tiền"],
        "rows": [["1", "Sợi cotton chải kỹ Ne30/1 (100% cotton)", "Tấn", "5", "55.000.000", "275.000.000"]],
        "totals": ["Thuế GTGT 8%: 22.000.000", "Tổng thanh toán: 297.000.000 VNĐ"],
    },
    {
        "file": "05_van_don_duong_bien.pdf",
        "seller": "DEMO OCEAN LINES CO., LTD",
        "title": "BILL OF LADING / FREIGHT INVOICE",
        "info": [
            "B/L No: DOL2503HCMHAM01   Date of issue: 20/03/2025",
            "Shipper: Xanh Demo Garment Co., Ltd", "Port of loading: Cat Lai, Ho Chi Minh City, Vietnam",
            "Port of discharge: Hamburg, Germany", "Vessel: DEMO STAR V.025W   Mode: Ocean freight (FCL)",
        ],
        "header": ["Container", "Description", "Packages", "Gross weight (KGS)"],
        "rows": [["1 x 40HC", "Cotton T-shirts", "1,200 cartons", "18,000.00"]],
        "totals": ["Ocean freight: USD 1,650.00", "THC + Doc fee: USD 200.00", "Total: USD 1,850.00"],
    },
    {
        "file": "06_cuoc_van_chuyen_duong_bo.png",
        "seller": "CÔNG TY TNHH VẬN TẢI MẪU NAM BỘ",
        "title": "HÓA ĐƠN CƯỚC VẬN CHUYỂN ĐƯỜNG BỘ",
        "info": [
            "Số: 0000932   Ngày: 05/04/2025", "Khách hàng: Công ty TNHH Dệt May Xanh Demo",
            "Tuyến: Kho Bình Dương -> Cảng Cát Lái (TP.HCM)", "Phương tiện: Xe đầu kéo container 40'",
        ],
        "header": ["Nội dung", "Khối lượng", "Quãng đường", "Thành tiền (VNĐ)"],
        "rows": [["Kéo container hàng xuất", "18 tấn", "35 km", "3.200.000"]],
        "totals": ["Thuế GTGT 8%: 256.000", "Tổng thanh toán: 3.456.000 VNĐ"],
    },
]


def render(spec: dict) -> Image.Image:
    W = 1240
    img = Image.new("RGB", (W, 1100), "white")
    d = ImageDraw.Draw(img)
    y = 50
    d.text((60, y), spec["seller"], font=_font(26, True), fill="black"); y += 45
    d.text((60, y), "Mã số thuế: 0300000000 (dữ liệu mẫu)", font=_font(18), fill="#444"); y += 50
    t = spec["title"]
    tw = d.textlength(t, font=_font(32, True))
    d.text(((W - tw) / 2, y), t, font=_font(32, True), fill="#0b3d2e"); y += 70
    for line in spec["info"]:
        d.text((60, y), line, font=_font(20), fill="black"); y += 34
    y += 20

    cols = len(spec["header"])
    col_w = (W - 120) / cols
    row_h = 46
    for r, row in enumerate([spec["header"]] + spec["rows"]):
        for c, cell in enumerate(row):
            x0 = 60 + c * col_w
            d.rectangle([x0, y, x0 + col_w, y + row_h], outline="black", width=1,
                        fill="#e8f2ec" if r == 0 else None)
            f = _font(17, r == 0)
            text = cell
            while d.textlength(text, font=f) > col_w - 12 and len(text) > 4:
                f = _font(f.size - 1, r == 0)
            d.text((x0 + 6, y + 13), text, font=f, fill="black")
        y += row_h
    y += 30
    for line in spec["totals"]:
        d.text((W - 620, y), line, font=_font(21, True), fill="black"); y += 36
    y += 40
    d.text((60, y), "Người mua hàng", font=_font(18), fill="black")
    d.text((W - 360, y), "Người bán hàng (đã ký)", font=_font(18), fill="black")
    img = img.crop((0, 0, W, y + 80))
    if spec.get("blur"):
        img = img.filter(ImageFilter.GaussianBlur(spec["blur"]))
    return img


def main():
    OUT.mkdir(exist_ok=True)
    for spec in SAMPLES:
        img = render(spec)
        path = OUT / spec["file"]
        if path.suffix == ".pdf":
            img.save(path, "PDF", resolution=150)
        else:
            img.save(path)
        print("Đã tạo", path.name)


if __name__ == "__main__":
    main()
