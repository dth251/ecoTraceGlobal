# EcoTrace AI Service

Service AI (FastAPI + Gemini) cho EcoTrace Global. Chạy local, backend Spring Boot gọi qua HTTP (`AiExtractionPort`).
Phân tích luồng chi tiết: [docs/AI_FLOW.md](docs/AI_FLOW.md).

## Cấu trúc
```
ai-service/
├── app.py                   # giao diện Streamlit (streamlit run app.py)
├── .streamlit/config.toml   # giới hạn upload 10MB, màu chủ đạo
├── data/                    # thư mục chứa CSDL SQLite mặc định (ai_service.db)
├── app/
│   ├── main.py              # FastAPI: các endpoint
│   ├── config.py            # đọc .env (DATABASE_URL, GEMINI_API_KEY,...)
│   ├── database.py          # SQLAlchemy engine, session maker, init_db
│   ├── models.py            # bảng CSDL: ExtractionLog, ClassificationLog, PassportAuditLog, AuditFeedback
│   ├── db_service.py        # logic nghiệp vụ lưu vết, truy vấn lịch sử & thống kê
│   ├── schemas.py           # hợp đồng dữ liệu với backend & DTO CSDL
│   ├── prompts.py           # prompt Gemini
│   ├── gemini_client.py     # gọi Gemini + JSON Schema + retry
│   ├── factors.py           # mã hệ số, quy tắc từ khóa
│   ├── normalize.py         # chuẩn hóa đơn vị, ngày, tiền tệ
│   ├── cache.py             # cache theo SHA-256 file (.cache/)
│   ├── mock_data.py         # dữ liệu cho MOCK_MODE
│   ├── pipeline.py          # luồng đầu-cuối (demo)
│   ├── services/            # extraction, classification, optimization
│   └── demo/                # giả lập backend: hệ số demo + tính CO2e
├── scripts/
│   ├── make_samples.py      # sinh 6 chứng từ mẫu (dữ liệu hư cấu)
│   ├── run_pipeline.py      # chạy luồng AI trên một thư mục
│   └── e2e_http.py          # test e2e qua HTTP
├── samples/                 # chứng từ mẫu
├── output/                  # kết quả JSON
├── eval/                    # đánh giá độ chính xác: dữ liệu có đáp án, chấm điểm, báo cáo
├── tests/                   # unit test (mock, không gọi Gemini, test DB)
├── run.bat                  # chạy server :8001
└── run_pipeline.bat         # chạy luồng AI trên samples/
```

## Cơ sở dữ liệu riêng (AI Database)
AI Service trang bị CSDL riêng biệt (mặc định **SQLite** tại `data/ai_service.db` hoặc cấu hình **PostgreSQL** qua `DATABASE_URL` trong `.env`):
* `ai_extraction_logs`: Lưu vết lịch sử bóc tách mọi hóa đơn/chứng từ, mã SHA-256, độ tin cậy, thời gian xử lý (latency), JSON trích xuất.
* `ai_classification_logs`: Lưu vết phân loại Scope 1/2/3 và gán mã hệ số phát thải.
* `ai_audit_feedbacks`: Lưu phản hồi, đánh giá 1-5 sao và dữ liệu chỉnh sửa thực tế của kiểm toán viên phục vụ re-training / prompt tuning.
* `ai_passport_audit_logs`: Lưu kết quả phân tích & đánh giá rủi ro Hộ chiếu số xanh (Digital Green Passport).

## Chạy giao diện demo (Streamlit)
Cài một lần:
```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```
Sao chép `.env.example` thành `.env`, điền `GEMINI_API_KEY`. Sau đó chỉ cần:
```
streamlit run app.py
```
Mở http://localhost:8501: chọn chứng từ (hoặc dùng 6 chứng từ mẫu) -> **Chạy luồng AI** -> xem Chứng từ,
Xác nhận & chỉnh sửa (sửa dữ liệu rồi tính lại), Inventory, Gợi ý tối ưu, JSON.

## Cách chạy khác
- Server API cho backend: `run.bat` -> Swagger tại http://localhost:8001/docs
- Luồng AI trên dòng lệnh: `run_pipeline.bat` (hoặc `run_pipeline.bat <thư_mục>`)

`MOCK_MODE=true` (hoặc thiếu key): trả dữ liệu mẫu, không gọi Gemini.
`CACHE_ENABLED=false`: luôn gọi Gemini (mặc định có cache theo nội dung file).

## Endpoint API
| Method | Path | Mô tả |
|---|---|---|
| POST | `/ai/extract-invoice` | multipart: `file` (PDF/PNG/JPG/WEBP), `doc_type` tùy chọn (tự động lưu vào CSDL) |
| POST | `/ai/classify-activity` | `{description, unit?, activity_type?}` -> scope, factor_code (lưu CSDL) |
| POST | `/ai/optimize` | tổng hợp inventory theo factor_code -> gợi ý |
| POST | `/ai/passport-readiness` | Ảnh chụp dữ liệu kỳ + sản phẩm (backend dựng; trường null = chưa có dữ liệu = chưa đạt) -> 8 điều kiện bắt buộc, điểm so với ngưỡng, quyết định ISSUED / PROVISIONAL / NOT_ISSUED, lý do và việc cần làm. Quy tắc quyết định, Gemini chỉ viết lời nhận xét. Ngưỡng chỉnh qua `PASSPORT_MIN_ACTUAL_SHARE` (0.8), `PASSPORT_MIN_SCORE` (85), `PASSPORT_ALLOCATION_TOLERANCE_PCT` (1) |
| POST | `/ai/estimate` | `{items:[{name, data}]}` (khối `data` của extract) -> tổng CO2e theo Scope 1/2/3, từng chứng từ, gợi ý tối ưu; hệ số tham khảo của bản demo (giao diện Trợ lý AI dùng khi chọn nhiều chứng từ) |
| POST | `/ai/pipeline/run` | multipart nhiều `files` -> toàn bộ luồng (chỉ để demo) |
| GET | `/ai/history/extractions` | Danh sách lịch sử bóc tách chứng từ trong CSDL |
| GET | `/ai/history/extractions/{id}`| Chi tiết 1 bản ghi bóc tách và phản hồi audit |
| GET | `/ai/history/stats` | Thống kê số lượng, tỉ lệ cache hit, thời gian xử lý trung bình |
| POST | `/ai/feedback` | Tiếp nhận phản hồi & chỉnh sửa của kiểm toán viên |
| GET | `/health` | Trạng thái server & kết nối CSDL |

## Hợp đồng với backend/frontend
Phản hồi giữ nguyên khối `data` gốc và **thêm** các trường mà backend (`AiDtos.java`) và frontend (`api/ai.ts`) đang chờ:
- `/ai/extract-invoice`: thêm `doc_type`, `supplier_name`, `invoice_no`, `invoice_date`, `total_amount`, `currency`, `lines[]`, `overall_confidence`
  (0..1, không vượt 0,79 khi còn trường cần xem lại).
- `/ai/optimize`: nhận cả `sources[]` và `inventory_summary` (map mã/nhóm -> kg CO2e); mỗi gợi ý thêm `description`,
  `target_factor_code`, `reduction_potential_pct`, `difficulty`; phản hồi thêm `summary`.
- `/ai/classify-activity`: thêm `confidence`, `reasoning`.

`tests/test_contract.py` đọc thẳng `AiDtos.java` và `ai.ts` để phát hiện lệch tên trường (nếu thiếu, backend sẽ trả `{}` âm thầm).
E2E toàn hệ thống: `scripts/e2e_full_stack.py` (cần frontend, backend, PostgreSQL và AI service đang chạy).

## Phạm vi và mã hệ số
- Scope 1: `FUEL_*`; Scope 2: `ELEC_GRID`; Scope 3: `MAT_*` (nguyên liệu), `FREIGHT_*` (cước vận chuyển).
- AI chỉ trả **mã** `factor_code`; giá trị hệ số và phép tính CO2e chính thức do backend làm.
- `app/demo/` chứa hệ số tham khảo chỉ để chạy thử, không dùng cho báo cáo.

## Test
```
.venv\Scripts\python -m pytest tests           # unit test & test DB (30/30 passed)
.venv\Scripts\python scripts\e2e_http.py       # e2e, cần server đang chạy và có key
.venv\Scripts\python eval\run_eval.py --no-cache # đánh giá độ chính xác (xem eval/README.md)
```
