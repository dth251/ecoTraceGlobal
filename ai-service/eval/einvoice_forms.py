"""Bố cục hóa đơn điện tử thực tế (dữ liệu hư cấu), mô phỏng cấu trúc của các mẫu công khai:
hóa đơn tiền điện (nhãn song ngữ, hàng ký hiệu A/B/C, số tiền bằng chữ, khung ký số), hóa đơn tiền nước
(thuế suất riêng từng dòng), hóa đơn phần mềm meInvoice (cột chiết khấu, bảng tổng hợp theo thuế suất, mã CQT).
Chỉ mượn BỐ CỤC; mọi tên, mã số thuế, số liệu đều giả.
"""
import calendar
import random
from datetime import date

import numpy as np
from PIL import Image, ImageDraw

from generate_dataset import (CUSTOMER, ELEC_SUPPLIERS, FONTS, FUELS, MATERIALS, NULL_TRANSPORT, Doc, _font, d_vn,
                              vn)

W = 1000
CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"

# ---------------- tiện ích ----------------
def vn_words(n: int) -> str:
    """1234000 -> 'Một triệu hai trăm ba mươi bốn nghìn đồng chẵn.'"""
    digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]

    def three(x: int, full: bool) -> str:
        tr, ch, dv = x // 100, x // 10 % 10, x % 10
        parts = []
        if full or tr > 0:
            parts += [digits[tr], "trăm"]
        if ch == 0:
            if dv > 0 and (full or tr > 0):
                parts.append("lẻ")
        elif ch == 1:
            parts.append("mười")
        else:
            parts += [digits[ch], "mươi"]
        if dv > 0:
            if ch >= 2 and dv == 1:
                parts.append("mốt")
            elif ch >= 1 and dv == 5:
                parts.append("lăm")
            else:
                parts.append(digits[dv])
        return " ".join(parts)

    units = ["", "nghìn", "triệu", "tỷ"]
    groups = []
    while n > 0:
        groups.append(n % 1000)
        n //= 1000
    out = []
    for i in range(len(groups) - 1, -1, -1):
        if groups[i]:
            out.append(three(groups[i], i < len(groups) - 1) + (f" {units[i]}" if units[i] else ""))
    s = " ".join(out).strip() or "không"
    return s[0].upper() + s[1:] + " đồng chẵn."


def _mst(rng):
    return f"0{rng.randint(100000000, 999999999)}"


def _code(rng, k=5):
    return "".join(rng.choices(CODE_CHARS, k=k))


def _wrap(dr, text, font, maxw):
    lines, cur = [], ""
    for w in text.split(" "):
        t = f"{cur} {w}".strip()
        if dr.textlength(t, font=font) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    return lines + [cur]


def _qr(dr, x, y, size, rng):
    n = 25
    c = size / n
    for i in range(n):
        for j in range(n):
            if rng.random() < 0.5:
                dr.rectangle([x + i * c, y + j * c, x + (i + 1) * c, y + (j + 1) * c], fill="black")
    for fx, fy in [(0, 0), (n - 7, 0), (0, n - 7)]:
        for off, size, col in [(0, 7, "black"), (1, 5, "white"), (2, 3, "black")]:
            dr.rectangle([x + (fx + off) * c, y + (fy + off) * c, x + (fx + off + size) * c, y + (fy + off + size) * c],
                         fill=col)


def _watermark(img, text, cy):
    layer = Image.new("RGBA", img.size, (255, 255, 255, 0))
    f = _font("arialbd", 130)
    tmp = Image.new("RGBA", (int(ImageDraw.Draw(layer).textlength(text, font=f)) + 40, 190), (255, 255, 255, 0))
    ImageDraw.Draw(tmp).text((20, 20), text, font=f, fill=(110, 160, 200, 40))
    tmp = tmp.rotate(20, expand=True, resample=Image.BICUBIC)
    layer.paste(tmp, ((img.width - tmp.width) // 2, cy - tmp.height // 2), tmp)
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def _table(dr, x, y, width, header, rows, weights, reg, bold, size=16, sub=None, num_from=3):
    scale = width / sum(weights)
    widths = [w * scale for w in weights]
    fr, fb = _font(reg, size), _font(bold, size)
    lh = int(size * 1.35)

    def row(cells, font, fill, ys, right=False):
        wrapped = [_wrap(dr, c, font, widths[i] - 10) for i, c in enumerate(cells)]
        h = max(len(w) for w in wrapped) * lh + 14
        x0 = x
        for i, lines in enumerate(wrapped):
            dr.rectangle([x0, ys, x0 + widths[i], ys + h], outline="black", fill=fill)
            for k, line in enumerate(lines):
                tx = x0 + 5
                if right and i >= num_from:
                    tx = x0 + widths[i] - 6 - dr.textlength(line, font=font)
                dr.text((tx, ys + 7 + k * lh), line, font=font, fill="black")
            x0 += widths[i]
        return ys + h

    y = row(header, fb, "#f2f2f2", y)
    if sub:
        y = row(sub, fr, None, y)
    for r in rows:
        y = row(r, fr, None, y, right=True)
    return y


def render_form(doc: Doc, rng: random.Random) -> Image.Image:
    f = doc.form
    reg, bold = rng.choice(FONTS)
    img = Image.new("RGB", (W, 2000), "white")
    if f.get("watermark"):
        img = _watermark(img, f["watermark"], 640)
    dr = ImageDraw.Draw(img)
    y = 50

    def put(text, size=18, b=False, x=60, color="black", center=False, maxw=W - 120, gap=1.45):
        nonlocal y
        font = _font(bold if b else reg, size)
        for line in _wrap(dr, text, font, maxw):
            tx = x + (maxw - dr.textlength(line, font=font)) / 2 if center else x
            dr.text((tx, y), line, font=font, fill=color)
            y += int(size * gap)

    # --- khối người bán + QR / logo ---
    x_text, maxw = 60, W - 120
    top = y
    if f.get("qr") == "left":
        _qr(dr, 60, y, 130, rng)
        x_text, maxw = 215, W - 275
    elif f.get("qr") == "right":
        _qr(dr, W - 190, y, 130, rng)
        maxw = W - 280
    if f.get("logo"):
        dr.ellipse([60, y, 150, y + 90], outline="#2a7d4f", width=6)
        dr.ellipse([85, y + 25, 125, y + 65], fill="#2a7d4f")
        x_text, maxw = 175, W - 380
    for text, size, b in f["seller_block"]:
        put(text, size, b, x=x_text, maxw=maxw)
    y = max(y, top + 135) + 10
    dr.line([40, y, W - 40, y], fill="black", width=2)
    y += 18

    # --- tiêu đề ---
    ty = y
    for text, size, b, color in f["title_lines"]:
        put(text, size, b, color=color, center=True, x=60, maxw=W - 360 if f.get("right_box") else W - 120)
    if f.get("right_box"):
        y_after, y = y, ty + 10
        for text in f["right_box"]:
            put(text, 18, True, x=W - 300, maxw=270)
        y = max(y, y_after)
    y += 4
    dr.line([40, y, W - 40, y], fill="black", width=2)
    y += 16

    for item in f["info"]:
        text, b = item if isinstance(item, tuple) else (item, False)
        put(text, 17, b)
    y += 12

    # --- bảng chính ---
    t = f["table"]
    y = _table(dr, 60, y, W - 120, t["header"], t["rows"], t["weights"], reg, bold, size=t.get("size", 16),
               sub=t.get("sub"))
    for line in f.get("pre_summary", []):
        put(line, 16, True, gap=1.7)

    # --- bảng tổng hợp thuế suất (meInvoice) hoặc dòng tổng (EVN) ---
    if f.get("tax_table"):
        tt = f["tax_table"]
        y += 8
        y = _table(dr, 60, y, W - 120, tt["header"], tt["rows"], tt["weights"], reg, bold, size=15, num_from=1)
    if f.get("summary_rows"):
        y += 8
        wl = [3.0, 1.2]
        for label, value in f["summary_rows"]:
            y = _table(dr, 60, y, W - 120, [label, value], [], wl, reg, bold, size=16, num_from=1)
    if f.get("words"):
        put(f"Số tiền bằng chữ (Amount in words): {f['words']}", 16, False, gap=1.7)

    # --- chữ ký ---
    y += 20
    put("Người mua hàng (Buyer)", 17, True, x=150, maxw=300)
    y_sig = y - 25
    sy = y
    y = y_sig
    put("Người bán hàng (Seller)", 17, True, x=W - 400, maxw=330)
    if f.get("sig_box"):
        box = [W - 430, y + 5, W - 70, y + 100]
        dr.rectangle(box, outline="#2a9d4f", width=2)
        yy = y + 12
        for line in f["sig_box"]:
            dr.text((W - 420, yy), line, font=_font(reg, 14), fill="#2a7d4f")
            yy += 22
        y = box[3] + 10
    y = max(y, sy + 10) + 25
    for text in f.get("footer", []):
        put(text, 14, False, center=True, color="#333")

    img = img.crop((0, 0, W, max(y + 40, int(W * 1.38))))
    if f.get("border"):
        d2 = ImageDraw.Draw(img)
        h = img.height
        d2.rectangle([14, 14, W - 14, h - 14], outline="#7a9ccb", width=3)
        for xx in range(30, W - 30, 26):
            d2.ellipse([xx, 8, xx + 14, 22], outline="#7a9ccb")
            d2.ellipse([xx, h - 22, xx + 14, h - 8], outline="#7a9ccb")
    return img


# ---------------- dựng bố cục ----------------
def _buyer_info(rng, bilingual=True):
    s = (lambda vi, en: f"{vi} ({en})") if bilingual else (lambda vi, en: vi)
    return [f"{s('Họ tên người mua hàng', 'Buyer name')}: ", f"{s('Tên đơn vị', 'Company name')}: {CUSTOMER}",
            f"{s('Mã số thuế', 'Tax code')}: {_mst(rng)}      {s('Mã khách hàng', 'Customer code')}: PE04{rng.randint(1000000, 9999999)}",
            f"{s('Địa chỉ', 'Address')}: KCN Sóng Thần, Phường Dĩ An, Thành phố Hồ Chí Minh",
            f"{s('Hình thức thanh toán', 'Payment method')}: TM/CK      {s('Đồng tiền thanh toán', 'Currency')}: VND"]


def _empty_expected(activity, **kw):
    base = {"activity_type": activity, "factor_code": None, "scope": None, "supplier": None, "invoice_date": None,
            "quantity": None, "unit": None, "amount": None, "currency": None, **NULL_TRANSPORT}
    return {**base, **kw}


def evn_form(variant: int, rng: random.Random) -> Doc:
    """Hóa đơn tiền điện theo mẫu EVN: không in dòng 'tổng kWh', số lượng nằm ở dòng hàng."""
    supplier = rng.choice(ELEC_SUPPLIERS)
    y, m = 2025, rng.randint(1, 11)
    last = calendar.monthrange(y, m)[1]
    issue = date(y, m + 1, rng.randint(1, 12))
    period = f"từ ngày 01/{m:02d}/{y} đến ngày {last}/{m:02d}/{y}"
    total = rng.randrange(4000, 80000, 10)
    if variant % 2 == 0:  # chia theo khung giờ: người đọc phải CỘNG các dòng
        parts = [round(total * 0.6 / 10) * 10, round(total * 0.22 / 10) * 10]
        parts.append(total - sum(parts))
        prices = [1968, 3640, 1190]
        names = ["giờ bình thường", "giờ cao điểm", "giờ thấp điểm"]
        rows = [[str(i + 1), f"Điện tiêu thụ tháng {m:02d} năm {y} {period} ({n})", "kWh", vn(q), vn(p), vn(q * p)]
                for i, (n, q, p) in enumerate(zip(names, parts, prices))]
        pre = sum(q * p for q, p in zip(parts, prices))
    else:
        price = rng.choice([2103, 2280, 2456])
        pre = total * price
        rows = [["1", f"Điện tiêu thụ tháng {m:02d} năm {y} {period}", "kWh", vn(total), vn(price), vn(pre)],
                ["", f"(kèm theo bảng kê ngày {issue.day:02d} tháng {issue.month:02d} năm {issue.year})",
                 "", "", "", ""]]
    tax = round(pre * 0.08)
    tot = pre + tax
    form = {
        "qr": "left", "watermark": "DEMO",
        "seller_block": [(supplier, 21, True), (f"Mã số thuế (Tax code): {_mst(rng)}", 16, False),
                         ("Địa chỉ (Address): 2 Đường Số 1, Thành phố Hồ Chí Minh", 16, False),
                         ("Điện thoại (Phone Number): 1900 0000", 16, False),
                         (f"Thông tin thanh toán (Payment Information): • Số TK: {rng.randint(10**9, 10**10 - 1)} "
                          "• Tại NH: Ngân hàng Demo", 16, False)],
        "title_lines": [("HÓA ĐƠN GIÁ TRỊ GIA TĂNG", 27, True, "#b01010"), ("(VAT INVOICE)", 20, True, "#b01010"),
                        ("Bản thể hiện của hóa đơn điện tử (Electronic invoice display)", 15, False, "black"),
                        (f"Ngày (date) {issue.day:02d} tháng (month) {issue.month:02d} năm (year) {issue.year}",
                         16, False, "black")],
        "right_box": ["Ký hiệu (Serial): 1C25TAA", f"Số (No): {rng.randint(1, 9999999):07d}"],
        "info": _buyer_info(rng),
        "table": {"header": ["STT (No.)", "Tên hàng hóa, dịch vụ (Description)", "ĐVT (Unit)", "Số lượng (Quantity)",
                             "Đơn giá (Unit price)", "Thành tiền (Amount)"],
                  "sub": ["A", "B", "C", "1", "2", "3=1x2"], "rows": rows,
                  "weights": [0.55, 3.2, 0.7, 1.15, 1.0, 1.4]},
        "summary_rows": [("Cộng tiền hàng (Total amount)", vn(pre)),
                         ("Thuế suất GTGT (VAT rate): 8%     Tiền thuế GTGT (VAT amount)", vn(tax)),
                         ("Tổng cộng tiền thanh toán (Total payment)", vn(tot))],
        "words": vn_words(tot),
        "sig_box": ["Được ký bởi:", supplier[:36], f"Ngày ký: {d_vn(issue)}"],
        "footer": [f"Khởi tạo từ (Created by) Phần mềm Demo - MST {_mst(rng)} (dữ liệu mẫu)"],
    }
    exp = _empty_expected("ELECTRICITY", factor_code="ELEC_GRID", scope=2, supplier=supplier,
                          invoice_date=issue.isoformat(), quantity=float(total), unit="kWh", amount=float(tot),
                          currency="VND")
    return Doc("ELECTRICITY", "E3_evn_song_ngu", supplier, "", [], [], [], [], exp, form=form)


def _meinvoice(rng, seller, issue, items, vat, disc_pct, buyer_lines, channel=None, watermark=None):
    """items: [(tên, ĐVT in trên chứng từ, số lượng, đơn giá)] -> (form, tổng thanh toán)."""
    rows, pre_total, disc_total, tax_total = [], 0, 0, 0
    for i, (name, unit, qty, price) in enumerate(items, 1):
        gross = round(qty * price)
        disc = round(gross * disc_pct / 100)
        pre = gross - disc
        tax = round(pre * vat / 100)
        rows.append([str(i), name, unit, vn(qty, 2) if qty % 1 else vn(qty), vn(price), vn(disc), vn(pre), f"{vat}%",
                     vn(tax), vn(pre + tax)])
        pre_total, disc_total, tax_total = pre_total + pre, disc_total + disc, tax_total + tax
    tot = pre_total + tax_total
    tax_rows = [[f"Không kê khai thuế GTGT:", "", "", ""], ["Không chịu thuế GTGT:", "", "", ""]]
    for rate in ("0", "5", "8", "10"):
        tax_rows.append([f"Thuế suất {rate}%:", *([vn(pre_total), vn(tax_total), vn(tot)] if str(vat) == rate
                                                  else ["", "", ""])])
    tax_rows += [["Thuế suất KHÁC:", "", "", ""], ["Tổng cộng:", vn(pre_total), vn(tax_total), vn(tot)]]
    code = f"M1-{issue:%y}-{_code(rng)}-{rng.randint(10 ** 10, 10 ** 11 - 1)}"
    form = {
        "logo": True, "qr": "right", "border": True, "watermark": watermark,
        "seller_block": [(seller, 20, True), ("Địa chỉ: 12 Đường Số 5, Phường Demo, Thành phố Hồ Chí Minh, Việt Nam.", 15, False),
                         (f"Mã số thuế: {_mst(rng)}", 15, False), ("Số điện thoại: (028) 3000 0000", 15, False),
                         (f"Số tài khoản: {rng.randint(10 ** 9, 10 ** 10 - 1)} - Ngân hàng Demo - CN Sài Gòn", 15, False)],
        "title_lines": [("HÓA ĐƠN GIÁ TRỊ GIA TĂNG", 26, True, "black"),
                        (f"Ngày {issue.day:02d} tháng {issue.month:02d} năm {issue.year}", 16, False, "black"),
                        (f"Mã CQT: {code}", 15, False, "black")],
        "right_box": ["Ký hiệu: 1C25MSP", f"Số: {rng.randint(1, 99999999):08d}"],
        "info": buyer_lines + ([channel] if channel else []),
        "table": {"header": ["STT", "Tên hàng hóa, dịch vụ", "ĐVT", "Số lượng", "Đơn giá trước chiết khấu",
                             "Tiền chiết khấu", "Thành tiền trước thuế GTGT", "Thuế suất GTGT", "Tiền thuế GTGT",
                             "Thành tiền sau thuế GTGT"],
                  "rows": rows, "weights": [0.45, 2.4, 0.6, 0.85, 1.15, 1.0, 1.25, 0.75, 1.0, 1.25], "size": 14},
        "pre_summary": ([f"Tỷ lệ CK: {disc_pct}%      Số tiền chiết khấu: {vn(disc_total)}"] if disc_pct else []),
        "tax_table": {"header": ["Tổng hợp", "Thành tiền trước thuế GTGT", "Tiền thuế GTGT", "Cộng tiền thanh toán"],
                      "rows": tax_rows, "weights": [2.2, 1.8, 1.5, 1.8]},
        "words": vn_words(tot),
        "footer": [f"Tra cứu tại Website: https://tracuu.demo-invoice.vn/tra-cuu - Mã tra cứu: {_code(rng, 12)}",
                   "(Cần kiểm tra, đối chiếu khi lập, giao, nhận hóa đơn)",
                   f"Phát hành bởi phần mềm Demo eInvoice - MST {_mst(rng)} (dữ liệu mẫu)"],
    }
    return form, tot


def fuel_form(variant: int, rng: random.Random) -> Doc:
    """Hóa đơn nhiên liệu kiểu meInvoice: có cột chiết khấu nên đơn giá × số lượng ≠ thành tiền."""
    name, code, unit_print, conv, unit_std, (q0, q1), (p0, p1) = FUELS[[0, 2, 1, 5][variant % 4]]
    qty, price = rng.randint(q0, q1), rng.randrange(p0, p1, 10)
    issue = date(2025, rng.randint(1, 12), rng.randint(1, 28))
    supplier = "CÔNG TY CỔ PHẦN NHIÊN LIỆU DEMO MIỀN NAM" if code != "FUEL_COAL" else "CÔNG TY THAN DEMO ĐÔNG BẮC"
    form, tot = _meinvoice(rng, supplier, issue, [(name, unit_print, qty, price)], vat=rng.choice([8, 10]),
                           disc_pct=rng.choice([0, 2, 3, 4]),
                           buyer_lines=["Họ và tên người mua hàng: ", f"Tên đơn vị: {CUSTOMER}", f"Mã số thuế: {_mst(rng)}",
                                        "Địa chỉ: KCN Sóng Thần, Thành phố Hồ Chí Minh", "Hình thức thanh toán: TM/CK"],
                           watermark=supplier.split(" ")[-2] + " " + supplier.split(" ")[-1])
    exp = _empty_expected("FUEL", factor_code=code, scope=1, supplier=supplier, invoice_date=issue.isoformat(),
                          quantity=float(qty * conv), unit=unit_std, amount=float(tot), currency="VND")
    return Doc("FUEL", "F3_meinvoice_chiet_khau", supplier, "", [], [], [], [], exp, form=form)


def material_form(variant: int, rng: random.Random) -> Doc:
    name, code, unit_print, conv, unit_std, (q0, q1), (p0, p1) = MATERIALS[[0, 2, 1, 4][variant % 4]]
    qty, price = rng.randint(q0, q1), rng.randrange(p0, p1, 100)
    issue = date(2025, rng.randint(1, 12), rng.randint(1, 28))
    supplier = {"MAT_COTTON": "CÔNG TY TNHH SỢI DEMO LONG AN", "MAT_STEEL": "CÔNG TY CP THÉP DEMO HÒA PHÁT",
                "MAT_PLASTIC": "CÔNG TY NHỰA DEMO BÌNH DƯƠNG", "MAT_PAPER": "CÔNG TY GIẤY DEMO BÌNH AN"}[code]
    form, tot = _meinvoice(rng, supplier, issue, [(name, unit_print, qty, price)], vat=8,
                           disc_pct=rng.choice([0, 0, 2]),
                           buyer_lines=["Họ và tên người mua hàng: ", f"Tên đơn vị: {CUSTOMER}", f"Mã số thuế: {_mst(rng)}",
                                        "Hình thức thanh toán: CK"],
                           watermark="DEMO")
    exp = _empty_expected("MATERIAL", factor_code=code, scope=3, supplier=supplier, invoice_date=issue.isoformat(),
                          quantity=float(qty * conv), unit=unit_std, amount=float(tot), currency="VND")
    return Doc("MATERIAL", "M3_meinvoice", supplier, "", [], [], [], [], exp, form=form)


FORWARDER_ROUTES = [("Cảng Cát Lái (TP.HCM)", "cat lai", "Cảng Singapore", "singapore"),
                    ("Cảng Cát Lái (TP.HCM)", "cat lai", "Cảng Busan (Hàn Quốc)", "busan"),
                    ("Cảng Hải Phòng", "hai phong", "Cảng Yokohama (Nhật Bản)", "yokohama")]


def forwarder_form(variant: int, rng: random.Random) -> Doc:
    """Hóa đơn dịch vụ giao nhận quốc tế bằng tiếng Việt: nhiều dòng phí, khối lượng ghi ở phần thông tin."""
    o, okw, d, dkw = FORWARDER_ROUTES[variant % len(FORWARDER_ROUTES)]
    issue = date(2025, rng.randint(1, 12), rng.randint(1, 28))
    tons = rng.choice([8.5, 12, 14.75, 18.2, 21])
    supplier = "CÔNG TY TNHH GIAO NHẬN VẬN TẢI DEMO GLOBAL"
    fees = [("Cước vận chuyển đường biển (Ocean freight)", rng.randrange(18, 60) * 1_000_000),
            ("Phụ phí nhiên liệu (BAF)", rng.randrange(2, 9) * 1_000_000),
            ("Phí xếp dỡ tại cảng (THC)", rng.randrange(2, 5) * 1_000_000 + 340_000),
            ("Phí chứng từ (Documentation fee)", 750_000)]
    rows = [[str(i), n, "Lô", "1", vn(a), vn(a)] for i, (n, a) in enumerate(fees, 1)]
    tot = sum(a for _, a in fees)
    kg = tons * 1000
    form = {
        "qr": "left",
        "seller_block": [(supplier, 20, True), (f"Mã số thuế: {_mst(rng)}", 16, False),
                         ("Địa chỉ: 88 Nguyễn Văn Linh, Quận 7, Thành phố Hồ Chí Minh", 16, False)],
        "title_lines": [("HÓA ĐƠN GIÁ TRỊ GIA TĂNG", 26, True, "black"),
                        ("(Dịch vụ vận tải hàng hóa quốc tế)", 19, True, "#1a3d9c"),
                        (f"Ngày {issue.day:02d} tháng {issue.month:02d} năm {issue.year}", 16, False, "black")],
        "right_box": ["Ký hiệu: 1C25TGN", f"Số: {rng.randint(1, 999999):07d}"],
        "info": [f"Đơn vị mua hàng: {CUSTOMER}", f"Mã số thuế: {_mst(rng)}",
                 f"Số vận đơn (B/L): DGL{rng.randint(100000, 999999)}", f"Tuyến vận chuyển: {o} → {d}",
                 "Phương thức: Vận chuyển đường biển, container (FCL)",
                 f"Trọng lượng hàng (Gross weight): {vn(kg)} kg"],
        "table": {"header": ["STT", "Tên dịch vụ", "ĐVT", "Số lượng", "Đơn giá", "Thành tiền"], "rows": rows,
                  "weights": [0.5, 3.3, 0.7, 0.9, 1.3, 1.4]},
        "summary_rows": [("Cộng tiền hàng", vn(tot)), ("Thuế suất GTGT: 0%     Tiền thuế GTGT", "0"),
                         ("Tổng cộng tiền thanh toán", vn(tot))],
        "words": vn_words(tot),
        "sig_box": ["Được ký bởi:", supplier[:36], f"Ngày ký: {d_vn(issue)}"],
        "footer": ["(Cần kiểm tra, đối chiếu khi lập, giao, nhận hóa đơn)"],
    }
    exp = _empty_expected("FREIGHT", factor_code="FREIGHT_SEA", scope=3, supplier=supplier,
                          invoice_date=issue.isoformat(), amount=float(tot), currency="VND", origin=o, destination=d,
                          transport_mode="SEA", weight_kg=float(kg))
    return Doc("FREIGHT", "T3_giao_nhan_vn", supplier, "", [], [], [], [], exp, expected_review=["distance_km"],
               keywords={"origin": okw, "destination": dkw}, form=form)


def water_form(variant: int, rng: random.Random) -> Doc:
    """Hóa đơn tiền nước (ngoài phạm vi): mô phỏng mẫu 9 cột, thuế suất riêng từng dòng."""
    m = rng.randint(1, 11)
    last = calendar.monthrange(2025, m)[1]
    issue = date(2025, m + 1, rng.randint(1, 10))
    m3 = rng.randint(8, 2500 if variant % 2 else 90)
    p1, p2 = rng.randrange(7000, 14000, 100), rng.randrange(1500, 3500, 100)
    a1, a2 = m3 * p1, m3 * p2
    t1, t2 = round(a1 * 0.05), round(a2 * 0.08)
    period = f"từ ngày 01/{m:02d}/2025 đến ngày {last}/{m:02d}/2025"
    tot = a1 + a2 + t1 + t2
    old = rng.randint(100, 9000)
    supplier = "CÔNG TY CP CẤP NƯỚC DEMO ĐỒNG THÁP"
    form = {
        "logo": True, "border": True,
        "seller_block": [(supplier, 20, True), (f"Mã số thuế (Tax code): {_mst(rng)}", 16, False),
                         ("Địa chỉ (Address): 21 Trần Hưng Đạo, Đồng Tháp, Việt Nam", 16, False),
                         ("Xí nghiệp Cấp nước: DEMO XUYÊN", 16, True)],
        "title_lines": [("HÓA ĐƠN GIÁ TRỊ GIA TĂNG", 26, True, "black"), ("(TIỀN NƯỚC)", 22, True, "#1a3d9c"),
                        (f"Ngày (date) {issue.day:02d} tháng (month) {issue.month:02d} năm (year) {issue.year}",
                         16, False, "black")],
        "right_box": ["Ký hiệu (Series): 1K25TBA", f"Số (No.): {rng.randint(1, 999999):06d}"],
        "info": [("THÔNG TIN KHÁCH HÀNG (Buyer's information):", True), f"Tên đơn vị (Company's name): {CUSTOMER}",
                 f"Mã số thuế (Tax code): {_mst(rng)}      Mã khách hàng: KH{rng.randint(10000, 99999)}",
                 "Hình thức thanh toán (Payment method): TM/CK",
                 ("THÔNG TIN SỬ DỤNG NƯỚC (Water usage information):", True),
                 f"Địa chỉ lắp đặt: KCN Sóng Thần      Loại KH: A",
                 f"Chỉ số cũ: {old}      Chỉ số mới: {old + m3}      M3 phải trả: {m3}"],
        "table": {"header": ["STT (No.)", "Tên hàng hóa, dịch vụ", "Đơn vị tính", "Số lượng", "Đơn giá",
                             "Thành tiền chưa có thuế", "Thuế suất", "Tiền thuế", "Thành tiền có thuế"],
                  "sub": ["1", "2", "3", "4", "5", "6 = 4 x 5", "7", "8 = 6 x 7", "9 = 6 + 8"],
                  "rows": [["1", f"Nước tiêu thụ kỳ {period}", "m3", str(m3), vn(p1), vn(a1), "5%", vn(t1), vn(a1 + t1)],
                           ["2", "Dịch vụ thoát nước", "m3", str(m3), vn(p2), vn(a2), "8%", vn(t2), vn(a2 + t2)]],
                  "weights": [0.5, 2.3, 0.7, 0.8, 0.9, 1.2, 0.7, 1.0, 1.2], "size": 14},
        "summary_rows": [("Tổng tiền chưa có thuế GTGT", vn(a1 + a2)), ("Tổng số tiền thuế GTGT", vn(t1 + t2)),
                         ("Tiền phí bảo vệ môi trường đối với nước thải sinh hoạt", "0"),
                         ("Tổng tiền thanh toán đã có thuế GTGT", vn(tot))],
        "words": vn_words(tot),
        "footer": ["(Cần kiểm tra, đối chiếu khi lập, giao, nhận hóa đơn)"],
    }
    exp = _empty_expected("OTHER")
    return Doc("OTHER", "O0_hoa_don_nuoc", supplier, "", [], [], [], [], exp, expected_review=["activity_type"],
               form=form)


def retail_form(variant: int, rng: random.Random) -> Doc:
    """Hóa đơn bán lẻ hàng tiêu dùng (ngoài phạm vi), theo mẫu meInvoice."""
    issue = date(2025, rng.randint(1, 12), rng.randint(1, 28))
    goods = [("Dầu gội dược liệu Mẫu Plus siêu mượt 400g - Dành cho tóc khô xơ, hư tổn", "Chai", 1, 129630),
             ("Sữa tắm thảo dược Mẫu Xanh 500ml", "Chai", 2, 98000),
             ("Kem chống nắng SPF50 Demo 50ml", "Tuýp", 1, 215000)]
    items = rng.sample(goods, k=1 + variant % 2)
    supplier = "CÔNG TY CỔ PHẦN DƯỢC PHẨM MẪU XANH"
    form, _ = _meinvoice(rng, supplier, issue, items, vat=8, disc_pct=rng.choice([0, 4]),
                         buyer_lines=["Họ và tên người mua hàng: Bán cho người tiêu dùng", "Tên đơn vị: ", "Mã số thuế: ",
                                      "Hình thức thanh toán: TM/CK"],
                         channel=f"Kênh bán hàng: Shopee      Mã đơn hàng: {rng.randint(10 ** 5, 10 ** 6)}DEMO{_code(rng, 6)}",
                         watermark="XANH")
    return Doc("OTHER", "O1_ban_le_hang_tieu_dung", supplier, "", [], [], [], [], _empty_expected("OTHER"),
               expected_review=["activity_type"], form=form)
