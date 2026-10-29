# Phân tích luồng AI - EcoTrace Global

## 1. Vị trí của AI service trong hệ thống

```
[Frontend React] --upload--> [Backend Spring Boot] --HTTP--> [AI service :8001] --> Gemini
                                   |  (AiExtractionPort)            |
                                   v                                v
                             PostgreSQL (documents,          trả JSON có cấu trúc
                             emission_factors, inventory)
```

AI service **không lưu DB, không tính số CO2e chính thức**. Nó chỉ:
1. Đọc chứng từ -> dữ liệu có cấu trúc.
2. Gắn Scope + mã nhóm hệ số (`factor_code`).
3. Từ inventory đã tính -> gợi ý giảm phát thải.

Backend lưu kết quả, cho người dùng xác nhận, nhân với bảng `emission_factors`, tổng hợp inventory.

## 2. Luồng nghiệp vụ đầy đủ

| Bước | Ai làm | Input | Output |
|---|---|---|---|
| 1. Upload | FE -> BE | File PDF/ảnh + `doc_type` | `document` trạng thái PROCESSING |
| 2. Trích xuất | **AI** `/ai/extract-invoice` | File bytes | `ExtractedInvoice` + confidence + `review_fields` |
| 3. Phân loại | **AI** (trong bước 2, hoặc `/ai/classify-activity` khi người dùng sửa mô tả) | Mô tả, đơn vị | `scope`, `factor_code` |
| 4. Xác nhận | Người dùng (trang `/documents/:id`) | Các trường trong `review_fields` | Dữ liệu đã xác nhận |
| 5. Tính CO2e | BE `CalculationEngine` | quantity × factor | `emission_entry` |
| 6. Tổng hợp | BE | Các entry theo kỳ/nhà máy | Inventory Scope 1/2/3 |
| 7. Gợi ý | **AI** `/ai/optimize` | Tổng hợp theo `factor_code` | Danh sách `Suggestion` |

Trong repo này, bước 5-6 có bản **demo** (`app/demo/`) chỉ để chạy thử e2e khi backend chưa xong. Hệ số demo là giá trị tham khảo, không dùng cho báo cáo thật.

## 3. Chi tiết xử lý từng bước AI

### 3.1 Trích xuất (`services/extraction.py`)
1. Kiểm tra MIME (PDF, PNG, JPEG, WEBP) và dung lượng (`MAX_FILE_MB`).
2. Tính SHA-256 của file -> tra cache (`.cache/`). Trùng thì trả ngay, không gọi Gemini.
3. Gửi file + prompt cho Gemini, ép đầu ra theo `RawExtraction` (JSON Schema).
4. Hậu xử lý:
   - Chuẩn hóa đơn vị: MWh->kWh, tấn->kg, lít->L.
   - Chuẩn hóa ngày về `YYYY-MM-DD`.
   - Vận đơn: nếu thiếu `weight_kg` nhưng `quantity` là kg thì lấy `quantity`.
5. Gắn `factor_code`: vận chuyển theo `transport_mode`, nguyên liệu theo `material_type`, còn lại theo từ khóa.
6. Đánh dấu cần xem lại (`review_fields`) khi:
   - thiếu trường bắt buộc của loại chứng từ,
   - confidence < `REVIEW_THRESHOLD`,
   - không xác định được `factor_code`,
   - vận chuyển thiếu `distance_km`,
   - **kiểm tra xác định** (không dựa vào confidence do LLM tự báo, vì đánh giá cho thấy Gemini vẫn báo tin cậy cao khi đọc sai số):
     1. số lượng × đơn giá so với thành tiền dòng hàng (cho phép chiết khấu tới 15%, VAT tới 10%);
     2. **đơn giá suy ra** (tổng tiền / số lượng) phải nằm trong khoảng giá thị trường VND (điện 1.000–5.000 đ/kWh,
        diesel 10.000–40.000 đ/lít...). Kiểm tra này cần thiết vì AI hay tự suy đơn giá từ thành tiền, khiến phép (1) luôn khớp dù số lượng sai;
     3. số lượng/khối lượng nằm trong khoảng hợp lý (vd. hàng không không thể 1,025 kg);
     4. **năm trong ký hiệu hóa đơn điện tử** (`1C25TAA` → 2025) phải khớp năm ngày lập: bắt lỗi đọc sai chữ số năm trên ảnh mờ;
     5. đơn vị phải khớp mã hệ số (vải tính theo mét cần quy đổi ra kg); mã nguyên liệu chung `MAT_GENERIC`
        và chứng từ `OTHER` (ngoài phạm vi) luôn được gắn cờ.

   Trường vận chuyển (`origin`, `destination`, `weight_kg`...) bị xóa khi chứng từ không phải cước vận chuyển.

## 4. Công thức tính (backend, bản demo trong `app/demo`)

```
Điện, nhiên liệu, nguyên liệu:  CO2e (kg) = quantity × factor (kg CO2e / đơn vị)
Vận chuyển:                      CO2e (kg) = (weight_kg / 1000) × distance_km × factor (kg CO2e / tấn·km)
```

## 5. Xử lý lỗi

| Tình huống | Mã HTTP | Hành vi |
|---|---|---|
| Sai định dạng / quá dung lượng | 422 | Từ chối |
| Gemini lỗi sau 3 lần thử | 502 | BE đặt document = ERROR, cho thử lại |
| Ảnh mờ, thiếu trường | 200 | `status=NEEDS_REVIEW` |
| Thiếu key / `MOCK_MODE=true` | 200 | Trả dữ liệu mẫu, `mock=true` |

## 6. Đánh giá
Xem [eval/README.md](../eval/README.md): bộ 24 chứng từ giả lập có đáp án, script chấm điểm và kết quả theo phiên bản prompt.

## 7. Giới hạn hiện tại
- Mỗi chứng từ trả **một** hoạt động chính (chưa tách nhiều dòng hàng).
- Chưa hỗ trợ Excel.
- Tỷ lệ giảm và chi phí trong gợi ý là giả định, cần thay bằng số liệu ngành.
