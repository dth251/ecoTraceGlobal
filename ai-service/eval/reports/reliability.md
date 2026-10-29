# Độ tin cậy của kết quả đánh giá

## 1. Khoảng tin cậy 95% (Wilson)

Con số 100% trên 36 chứng từ KHÔNG có nghĩa là độ chính xác thật là 100%.

| Lần chạy | Chứng từ đúng | Gắn cờ được lỗi quan trọng |
|---|---|---|
| v4_bo36 | 91.7% [78.2% – 97.1%] (n=36) | 0.0% [0.0% – 56.2%] (n=3) |
| v6_bo36 | 100.0% [90.4% – 100.0%] (n=36) | không có lỗi để bắt |
| v6_bo36_lan2 | 100.0% [90.4% – 100.0%] (n=36) | không có lỗi để bắt |
| v6_holdout | 98.1% [90.2% – 99.7%] (n=54) | 100.0% [20.7% – 100.0%] (n=1) |
| v6_holdout_lan2 | 98.1% [90.2% – 99.7%] (n=54) | 100.0% [20.7% – 100.0%] (n=1) |

## 2. Gộp các lần chạy với prompt cuối (v6)

- Số lượt chấm: **180** (tính lặp: cùng chứng từ chạy nhiều lần, nên KHÔNG phải 180 mẫu độc lập)
- Chứng từ đúng: 98.9% [96.0% – 99.7%] (n=180)
- Lỗi quan trọng: 2; được gắn cờ: 2; chứng từ có lỗi lọt qua không gắn cờ: 0
- Tỷ lệ **lỗi lọt** (sai mà không gắn cờ, người dùng không được nhắc sửa), tính theo chứng từ: 0.0% [0.0% – 2.1%] (n=180)
- Cùng chỉ số nhưng coi **mỗi bố cục là một đơn vị độc lập** (thực tế hơn, vì các chứng từ cùng bố cục chung khuôn): 0/18 bố cục có lỗi lọt, cận trên 95% = **17.6%**
- Các kiểm tra phát hiện lỗi (đơn giá, năm ký hiệu, đơn vị...) được thiết kế SAU khi thấy lỗi tương ứng, nên con số này có xu hướng lạc quan với dạng lỗi chưa từng gặp.

## 3. Cần bao nhiêu mẫu để khẳng định?

Nếu KHÔNG quan sát thấy lỗi nào, cận trên 95% của tỷ lệ lỗi xấp xỉ 3/n (quy tắc ba).

| Muốn khẳng định lỗi lọt ≤ | Cần tối thiểu (không lỗi nào) |
|---|---|
| 10% | 30 chứng từ độc lập |
| 5% | 60 chứng từ độc lập |
| 2% | 150 chứng từ độc lập |
| 1% | 300 chứng từ độc lập |

## 4. Độ ổn định giữa các lần chạy (cùng prompt, cùng chứng từ)

- `v6_bo36` vs `v6_bo36_lan2`: 36/36 chứng từ cùng kết quả đúng/sai; 35/36 cho đầu ra giống hệt ở các trường chính
- `v6_holdout` vs `v6_holdout_lan2`: 54/54 chứng từ cùng kết quả đúng/sai; 48/54 cho đầu ra giống hệt ở các trường chính

## 5. Khoảng cách khi gặp bố cục MỚI (bằng chứng quan trọng nhất)

Prompt v4 đã được chỉnh theo 24 chứng từ cũ. Khi thêm 6 bố cục mới (lần đầu gặp), chưa chỉnh gì:

| Nhóm | Chứng từ đúng | Gắn cờ lỗi |
|---|---|---|
| Bố cục đã dùng để chỉnh prompt | 100.0% [86.2% – 100.0%] (n=24) | không có lỗi |
| Bố cục MỚI (lần đầu gặp) | 75.0% [46.8% – 91.1%] (n=12) | 0.0% [0.0% – 56.2%] (n=3) |

Trong 12 chứng từ bố cục mới có 3 chứng từ sai, trong đó 3 chứng từ sai mà **không được gắn cờ**.
Cả hai lần mở rộng bộ dữ liệu (24 -> 36 chứng từ) đều lộ lỗi mới => độ chính xác sau khi chỉnh KHÔNG nên ngoại suy sang dạng chứng từ chưa từng thấy. Đây là con số sát thực tế hơn mục 1-2.

## 6. Dữ liệu giả lập đa dạng đến đâu?

**Lưu ý về bộ held-out:** nó dùng seed khác (số liệu, ngày, công ty, kiểu làm xấu ảnh khác) nhưng vẫn là CÙNG 18 bố cục đã dùng khi chỉnh prompt. Vì vậy nó đo độ bền trước dữ liệu mới trên khuôn cũ, KHÔNG đo khả năng đọc một mẫu hóa đơn chưa từng thấy.

- 54 chứng từ nhưng chỉ **18 bố cục**; các chứng từ cùng bố cục chung khuôn, chỉ khác số liệu và kiểu làm xấu ảnh, nên không độc lập với nhau.
- Cỡ mẫu hiệu dụng gần với số bố cục (18) hơn là số chứng từ (54).
- Khoảng tin cậy nếu coi mỗi bố cục là một đơn vị: bố cục đúng trọn vẹn 94.4% [74.2% – 99.0%] (n=18)
- Chung nguồn sinh: 1 bộ sinh, 6 phông chữ hệ thống, nền trắng/viền đơn giản, dữ liệu nhất quán tuyệt đối, không có lỗi in ấn, con dấu đè chữ, chữ viết tay, tem, dòng gạch bỏ, bản photo nhiều thế hệ.
- Các lỗi hay gặp ở hóa đơn thật mà bộ này CHƯA có: hóa đơn nhiều trang, nhiều mặt hàng thật sự (hiện chỉ tính một dòng chính), file Excel, hóa đơn sai/điều chỉnh, ảnh chụp cuộn/gấp, chữ ký đè số.

## 7. Kết luận

| Mục đích | Dữ liệu giả lập đủ chưa? |
|---|---|
| Kiểm tra pipeline chạy đúng, hồi quy khi sửa code/prompt | ✅ Đủ |
| So sánh phiên bản prompt A với B | ✅ Đủ nếu chênh lệch lớn (lớn hơn khoảng tin cậy ở mục 1) |
| Bắt lỗi logic kiểm tra (đơn vị, dấu số, phân loại) | ✅ Đủ, đã bắt được nhiều lỗi thật |
| Khẳng định độ chính xác với chứng từ doanh nghiệp thật | ❌ Không đủ |
| Cam kết con số với nhà đầu tư/khách hàng | ❌ Không đủ: cần dữ liệu thật |
