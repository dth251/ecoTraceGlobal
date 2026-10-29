# EcoTrace AI Service

Service AI (FastAPI + Gemini) cho EcoTrace Global. Chạy local, backend Spring Boot gọi qua HTTP (`AiExtractionPort`).
Phân tích luồng chi tiết: [docs/AI_FLOW.md](docs/AI_FLOW.md).

## Cấu trúc
```
ai-service/
├── app.py                   # giao diện Streamlit (streamlit run app.py)
├── .streamlit/config.toml   # giới hạn upload 10MB, màu chủ đạo
├── app/
│   ├── main.py              # FastAPI: các endpoint
│   ├── config.py            # đọc .env
│   ├── schemas.py           # hợp đồng dữ liệu với backend
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
├── tests/                   # unit test (mock, không gọi Gemini)
├── run.bat                  # chạy server :8001
└── run_pipeline.bat         # chạy luồng AI trên samples/
```

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

## Endpoint
| Method | Path | Mô tả |
|---|---|---|
| POST | `/ai/extract-invoice` | multipart: `file` (PDF/PNG/JPG/WEBP), `doc_type` tùy chọn |
| POST | `/ai/classify-activity` | `{description, unit?, activity_type?}` -> scope, factor_code |
| POST | `/ai/optimize` | tổng hợp inventory theo factor_code -> gợi ý |
| POST | `/ai/pipeline/run` | multipart nhiều `files` -> toàn bộ luồng (chỉ để demo) |
| GET | `/health` | trạng thái |

## Phạm vi và mã hệ số
- Scope 1: `FUEL_*`; Scope 2: `ELEC_GRID`; Scope 3: `MAT_*` (nguyên liệu), `FREIGHT_*` (cước vận chuyển).
- AI chỉ trả **mã** `factor_code`; giá trị hệ số và phép tính CO2e chính thức do backend làm.
- `app/demo/` chứa hệ số tham khảo chỉ để chạy thử, không dùng cho báo cáo.

## Test
```
.venv\Scripts\python -m pytest                 # unit test, chế độ mock
.venv\Scripts\python scripts\e2e_http.py       # e2e, cần server đang chạy và có key
.venv\Scripts\python eval\run_eval.py --no-cache # đánh giá độ chính xác (xem eval/README.md)
```
