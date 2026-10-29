# Đánh giá độ chính xác trích xuất

## Chạy
```
.venv\Scripts\python eval\generate_dataset.py            # sinh 24 chứng từ giả lập + labels.json
.venv\Scripts\python eval\run_eval.py --no-cache --tag v4  # gọi Gemini, chấm điểm, xuất báo cáo
```
Báo cáo nằm trong `eval/reports/<thời_điểm>_<tag>.md` (kèm `.json` chi tiết từng chứng từ).
Mỗi lần sửa prompt: tăng `PROMPT_VERSION` trong `app/cache.py`, chạy lại với `--tag` mới, so sánh hai báo cáo.

## Bộ dữ liệu giả lập
5 nhóm (điện, nhiên liệu, nguyên liệu, vận chuyển, **ngoài phạm vi**) × 2–4 bố cục × nhiều biến thể
(ảnh sạch / ảnh xấu: chụp điện thoại, nghiêng, mờ, nhiễu scan, nén thấp). Dữ liệu hư cấu, nhất quán nội tại
(thành tiền = SL × đơn giá, tổng = tiền hàng + VAT, số tiền bằng chữ khớp số).

Bố cục `E3, F3, M3, T3, O0, O1` mô phỏng **cấu trúc** của các hóa đơn điện tử thực tế (chỉ mượn bố cục, mọi tên
và số liệu đều giả): nhãn song ngữ Việt-Anh, mã QR, hình mờ, viền trang trí, hàng ký hiệu `A B C 1 2 3=1x2`,
số tiền bằng chữ, khung ký số, cột chiết khấu, bảng tổng hợp theo thuế suất, mã CQT, thuế suất riêng từng dòng.

Các "bẫy" có chủ đích: chỉ số công tơ cạnh điện năng tiêu thụ, **điện chia theo khung giờ không in dòng tổng**
(AI phải cộng), đơn vị MWh, kỳ hóa đơn lệch tháng, dòng thuế BVMT, số lít lẻ kiểu Việt, nguyên liệu tính theo
tấn/mét, dòng cước đi kèm hóa đơn nguyên liệu, commercial invoice tiếng Anh, Net weight cạnh Gross weight,
Chargeable weight hàng không, **chiết khấu làm đơn giá × SL ≠ thành tiền**, hóa đơn **tiền nước và hàng tiêu dùng
(phải nhận ra là ngoài phạm vi)**.

### Bộ held-out (chống chỉnh prompt theo đề)
Prompt được chỉnh dựa trên lỗi của `eval/dataset`, nên bộ đó có thể cho kết quả lạc quan. Để kiểm chứng:
```
.venv\Scripts\python eval\generate_dataset.py --seed 7 --variants 3 --out eval/dataset_holdout
.venv\Scripts\python eval\run_eval.py --dataset eval/dataset_holdout --no-cache --tag holdout
```
Seed khác nên số liệu, ngày, công ty, kiểu ảnh xấu đều khác. **Không chỉnh prompt dựa trên bộ này.**

## Chỉ số
| Chỉ số | Ý nghĩa |
|---|---|
| Chứng từ đúng | % chứng từ có mọi trường quan trọng đúng (quyết định con số CO2e) |
| Trường đúng | % trường đúng trên các trường đáp án có giá trị (số cho phép lệch 0,5%) |
| Bịa | % trường AI tự điền khi chứng từ không có |
| Gắn cờ lỗi | % lỗi ở trường quan trọng nằm trong `review_fields` (người dùng sẽ được nhắc sửa) |
| Sai lệch CO2e | Lệch tổng CO2e so với đáp án (hệ số demo); "sau xác nhận" = giả lập người dùng sửa đúng các trường bị gắn cờ |

## Dùng với chứng từ thật
Tạo thư mục (vd. `eval/dataset_real/`) gồm các file và `labels.json` cùng định dạng với `eval/dataset/labels.json`
(điền `expected` bằng tay), rồi chạy `run_eval.py --dataset eval/dataset_real --tag real_v4`.

## Kết quả (dữ liệu giả lập, gemini-2.5-flash)
| Bộ dữ liệu / phiên bản | Chứng từ | Chứng từ đúng | Bịa | Lỗi được gắn cờ | Sai lệch CO2e (sau xác nhận) |
|---|---|---|---|---|---|
| 24 chứng từ cũ, prompt v3 | 24 | 79,2% | 7,4% | 0% | 28,2% (28,2%) |
| 24 chứng từ cũ, prompt v4 | 24 | 91,7–100% | 0% | 100% | 0–6,5% (0%) |
| 36 chứng từ, prompt v4, **lần đầu gặp 12 bố cục mới** | 36 | 91,7% (bố cục mới: **75%**) | 3% | **0%** (0/3) | 7,9% (7,9%) |
| 36 chứng từ, prompt v6 (2 lần chạy) | 36 | 100% / 100% | 0% | không có lỗi | 0% |
| held-out 54 chứng từ, prompt v6 (2 lần chạy) | 54 | 98,1% / 98,1% | 0% | 100% (1/1) | 1,1% (0%) |

| **6 ảnh chụp tay thật** (in ra giấy rồi chụp điện thoại; 3 chứng từ gốc: điện ×3, nhiên liệu ×1, vận tải ×2), prompt v6 | 6 | 100% | 0% | không có lỗi | 0% |

Ảnh chụp tay nằm trong `eval/dataset_photo/`. Chúng chỉ kiểm tra tác động của **chất lượng ảnh thật** (nghiêng, lóa, chữ
xuyên từ trang sau, nhiều tờ chồng lên nhau); nội dung vẫn là 3 mẫu hư cấu đã dùng khi chỉnh prompt, nên không đo được
khả năng đọc mẫu hóa đơn mới.

Tổng hợp prompt v6: 180 lượt chấm, 98,9% đúng (khoảng tin cậy 95%: 96,0–99,7%), 0 lỗi lọt.

## Độ tin cậy của kết quả này
Chạy `python eval/reliability.py` để sinh `eval/reports/reliability.md`. Kết luận chính:

- **Chưa phải độ chính xác thật.** Chỉ có 18 bố cục; các chứng từ cùng bố cục chung khuôn nên không độc lập.
  Coi mỗi bố cục là một đơn vị, cận trên 95% của tỷ lệ lỗi lọt vẫn là khoảng 17,6%.
- **Khoảng cách khi gặp mẫu mới:** bố cục đã dùng để chỉnh prompt đúng 100%, bố cục lần đầu gặp chỉ đúng 75%
  và cả 3 lỗi đều không được gắn cờ. Các kiểm tra hiện tại được viết sau khi thấy lỗi, nên có xu hướng lạc quan
  với dạng lỗi chưa gặp.
- **Bộ held-out chưa độc lập:** cùng 18 bố cục, chỉ khác số liệu và kiểu làm xấu ảnh. Nó đo độ bền trên khuôn cũ,
  không đo khả năng đọc mẫu hóa đơn chưa từng thấy.
- **Độ ổn định:** chạy lặp cho kết quả đúng/sai giống nhau, nhưng đầu ra các trường chính chỉ giống hệt ở
  35/36 (bộ chính) và 48/54 (held-out) chứng từ; LLM không hoàn toàn tất định.

### Dữ liệu giả lập dùng được cho gì
| Mục đích | Đủ chưa? |
|---|---|
| Kiểm tra luồng chạy, hồi quy khi sửa code/prompt | Đủ |
| So sánh hai phiên bản prompt (khi chênh lệch lớn hơn khoảng tin cậy) | Đủ |
| Bắt lỗi logic kiểm tra (đơn vị, dấu số, phân loại) | Đủ |
| Khẳng định độ chính xác với hóa đơn doanh nghiệp thật | **Không đủ** |
| Cam kết con số với nhà đầu tư/khách hàng | **Không đủ** |

### Cần bao nhiêu dữ liệu thật
Nếu không thấy lỗi nào trong n mẫu độc lập, cận trên của tỷ lệ lỗi lọt xấp xỉ 3/n:
30 chứng từ cho ≤10%, 60 cho ≤5%, 150 cho ≤2%. Nên lấy từ ít nhất 15–20 nhà cung cấp khác nhau
(nhiều bố cục quan trọng hơn nhiều bản của cùng một nhà cung cấp), có cả ảnh chụp điện thoại.
