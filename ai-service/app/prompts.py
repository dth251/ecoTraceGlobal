EXTRACT_PROMPT = """Bạn là hệ thống trích xuất dữ liệu từ chứng từ phục vụ kiểm kê phát thải carbon của doanh nghiệp xuất khẩu (Việt Nam).
Đọc tài liệu đính kèm (hóa đơn/vận đơn, tiếng Việt hoặc tiếng Anh) và điền các trường theo schema.

Quy tắc:
- activity_type:
  ELECTRICITY = hóa đơn tiền điện (kWh); FUEL = nhiên liệu đốt (xăng, dầu diesel, gas/LPG, than);
  MATERIAL = nguyên liệu, vật tư dùng để SẢN XUẤT (sợi, vải, thép, hạt nhựa, giấy, bao bì...);
  FREIGHT = vận đơn, hóa đơn cước vận chuyển;
  OTHER = mọi chứng từ còn lại, ví dụ tiền nước, rác thải, hàng tiêu dùng/mỹ phẩm/thực phẩm bán lẻ, văn phòng phẩm,
  dịch vụ, bán cho người tiêu dùng. Không chắc thuộc nhóm nào thì chọn OTHER.
- Chỉ điền giá trị THỰC SỰ có trên tài liệu. Không có thì để null. Tuyệt đối không bịa số.
- Định dạng số theo NGÔN NGỮ của chứng từ, trả về số thuần:
  tiếng Việt: dấu chấm phân cách nghìn, dấu phẩy thập phân (1.234,5 = 1234.5; 61,29 lít = 61.29);
  tiếng Anh: dấu phẩy phân cách nghìn, dấu chấm thập phân (2,854 = 2854; 18,000.00 KGS = 18000).
  Hóa đơn điện tử Việt Nam (có "Hóa đơn giá trị gia tăng", tiền VND/VNĐ) LUÔN dùng quy ước tiếng Việt, kể cả khi có
  nhãn song ngữ Việt-Anh: "45.170" kWh = 45170, "1.968" đồng/kWh = 1968. Chỉ chứng từ hoàn toàn tiếng Anh mới dùng quy ước Anh.
- invoice_date dạng YYYY-MM-DD: ngày lập/phát hành chứng từ (không phải ngày đầu/cuối kỳ).
- invoice_series: "Ký hiệu" của hóa đơn điện tử (ví dụ 1C25TAA), nếu có.
- description, quantity, unit, unit_price, line_amount: của DÒNG HÀNG CHÍNH (điện/nhiên liệu/nguyên liệu).
  Bỏ qua các dòng thuế, phí, cước phụ đi kèm. Giữ đơn vị như trên tài liệu.
  Điện: quantity là TỔNG điện năng tiêu thụ, KHÔNG phải chỉ số công tơ cũ/mới.
  Nếu hóa đơn chia nhiều dòng cùng đơn vị (ví dụ điện theo giờ bình thường/cao điểm/thấp điểm) và không in dòng tổng,
  quantity là TỔNG các dòng. unit_price/line_amount chỉ điền khi hóa đơn in đúng số đó, không tự tính.
- amount: TỔNG TIỀN THANH TOÁN của cả chứng từ (đã gồm VAT), không phải thành tiền một dòng. currency: VND/USD/...
- FREIGHT: origin, destination, transport_mode (SEA/ROAD/AIR/RAIL), distance_km nếu có ghi.
  weight_kg = trọng lượng thực tế cả bì (Gross weight), đổi sang kg. KHÔNG dùng Net weight hay Chargeable weight.
- Chỉ điền origin, destination, transport_mode, weight_kg, distance_km khi activity_type = FREIGHT.
  Xuất xứ hàng hóa hay điều kiện giao hàng (CIF, FOB...) trên hóa đơn mua hàng KHÔNG phải origin/destination.
- MATERIAL: điền material_type (ví dụ thép, bông, nhựa, giấy).
- confidences: với MỖI trường bạn đã điền, cho điểm tin cậy 0..1 (chữ mờ, số khó đọc, phải suy đoán => thấp).
{hint}"""

CLASSIFY_PROMPT = """Phân loại hoạt động phát thải từ mô tả sau cho kiểm kê GHG Protocol.
Mô tả: "{description}"
Đơn vị: {unit}

activity_type: ELECTRICITY | FUEL | MATERIAL | FREIGHT | OTHER.
factor_code chỉ được chọn trong danh sách: {codes}. Nếu không chắc, để null."""

OPTIMIZE_PROMPT = """Bạn là chuyên gia giảm phát thải cho doanh nghiệp SME xuất khẩu.
Dưới đây là các gợi ý đã được tính sẵn số liệu (KHÔNG được thay đổi hay thêm con số nào).
Nhiệm vụ: viết lại tiêu đề, lý do (rationale: 2-3 câu, bám vào dữ liệu evidence) và 3-5 bước thực hiện cụ thể cho từng gợi ý.
Ngôn ngữ: {language}. Giữ nguyên id.

Dữ liệu:
{payload}"""
