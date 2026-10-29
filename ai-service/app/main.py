import logging
import time
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.demo.emission_calc import calculate
from app.database import engine, init_db
from app.db_service import (
    get_extraction_detail,
    get_extraction_history,
    get_history_stats,
    save_audit_feedback,
    save_classification_record,
    save_extraction_record,
)
from app.gemini_client import GeminiError
from app.pipeline import DocumentResult, InputDocument, PipelineResult, finalize, run_pipeline
from app.schemas import (
    AuditFeedbackRequest,
    AuditFeedbackResponse,
    ClassifyRequest,
    ClassifyResponse,
    EstimateDocument,
    EstimateRequest,
    EstimateResponse,
    ExtractionLogItem,
    ExtractionResponse,
    HistoryStatsResponse,
    OptimizeRequest,
    OptimizeResponse,
)
from app.services import classification, optimization
from app.services.extraction import ExtractionInputError, extract_invoice

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("ai.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi tạo CSDL khi khởi động service
    init_db()
    yield


app = FastAPI(title="EcoTrace AI Service", version="0.2.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
@app.get("/ai/health")
def health():
    db_status = "connected"
    try:
        with engine.connect() as conn:
            pass
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "ok",
        "model": settings.gemini_model,
        "mock_mode": settings.mock_mode or not settings.gemini_api_key,
        "database": {
            "status": db_status,
            "url_type": settings.database_url.split(":")[0] if settings.database_url else "sqlite",
        },
    }


@app.post("/ai/extract-invoice", response_model=ExtractionResponse)
async def extract(file: UploadFile = File(...), doc_type: Optional[str] = Form(None)):
    content = await file.read()
    start_time = time.time()
    try:
        res = extract_invoice(content, file.content_type or "", doc_type)
        latency_ms = (time.time() - start_time) * 1000

        # Tự động lưu bản ghi bóc tách vào CSDL riêng của ai-service
        save_extraction_record(
            file_bytes=content,
            mime_type=file.content_type or "",
            file_name=file.filename,
            doc_type_hint=doc_type,
            res=res,
            latency_ms=latency_ms,
            model_name=settings.gemini_model,
            is_cached=latency_ms < 50.0 and not res.mock,
        )
        return res
    except ExtractionInputError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except GeminiError as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/ai/classify-activity", response_model=ClassifyResponse)
def classify(req: ClassifyRequest):
    res = classification.classify(req)
    # Lưu vào CSDL
    save_classification_record(req, res)
    return res


@app.post("/ai/optimize", response_model=OptimizeResponse)
def optimize(req: OptimizeRequest):
    return optimization.optimize(req)


ESTIMATE_DISCLAIMER = ("Ước tính theo hệ số phát thải và bảng quãng đường THAM KHẢO của bản demo, chưa phải số chính thức. "
                       "Số chính thức do backend tính từ bảng emission_factors.")


@app.post("/ai/estimate", response_model=EstimateResponse)
def estimate(req: EstimateRequest):
    """Ước tính CO2e cho cả lô chứng từ đã bóc tách, tổng hợp theo Scope và sinh gợi ý tối ưu từ tổng hợp đó."""
    results = [
        DocumentResult(
            file=it.name, ok=True, emission=calculate(it.data),
            extraction=ExtractionResponse(status="NEEDS_REVIEW" if it.data.needs_review else "OK", data=it.data),
        )
        for it in req.items
    ]
    out = finalize(results, language=req.language, max_suggestions=req.max_suggestions)
    docs = [
        EstimateDocument(
            name=r.file, activity_type=r.extraction.data.activity_type, scope=r.extraction.data.scope,
            factor_code=r.extraction.data.factor_code, co2e_kg=r.emission.co2e_kg, status=r.emission.status,
            formula=r.emission.formula, note=r.emission.note, factor_value=r.emission.factor_value,
            factor_unit=r.emission.factor_unit, factor_source=r.emission.factor_source,
            distance_km_used=r.emission.distance_km_used, needs_review=r.extraction.data.needs_review,
            review_fields=r.extraction.data.review_fields,
        )
        for r in results
    ]
    return EstimateResponse(
        total_co2e_kg=out.inventory.total_co2e_kg, by_scope=out.inventory.by_scope, by_factor=out.inventory.by_factor,
        documents=docs, calculated=out.inventory.documents_calculated, optimization=out.optimization,
        disclaimer=ESTIMATE_DISCLAIMER,
    )


@app.post("/ai/pipeline/run", response_model=PipelineResult)
async def pipeline_run(
    files: list[UploadFile] = File(...),
    language: str = Form("vi"),
    max_suggestions: int = Form(5),
):
    """Chạy demo toàn bộ luồng (gồm tính CO2e bằng hệ số demo)."""
    docs = [
        InputDocument(name=f.filename or "file", content=await f.read(), mime_type=f.content_type or "")
        for f in files
    ]
    return run_pipeline(docs, language=language, max_suggestions=max_suggestions)


# ---------- Endpoints truy vấn & quản lý CSDL của AI Service ----------

@app.get("/ai/history/extractions", response_model=List[ExtractionLogItem])
def list_extractions(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Lấy danh sách lịch sử bóc tách chứng từ đã lưu trong CSDL."""
    return get_extraction_history(limit=limit, offset=offset)


@app.get("/ai/history/extractions/{record_id}")
def get_extraction(record_id: str):
    """Lấy chi tiết dữ liệu bóc tách và phản hồi kiểm toán từ CSDL."""
    item = get_extraction_detail(record_id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi bóc tách.")
    return item


@app.get("/ai/history/stats", response_model=HistoryStatsResponse)
def history_stats():
    """Xem thống kê hiệu năng, tỉ lệ cache hit và phản hồi kiểm toán."""
    return get_history_stats()


@app.post("/ai/feedback", response_model=AuditFeedbackResponse)
def submit_feedback(req: AuditFeedbackRequest):
    """Gửi phản hồi / hiệu chỉnh của chuyên viên kiểm toán vào CSDL."""
    try:
        return save_audit_feedback(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu phản hồi: {str(e)}")
