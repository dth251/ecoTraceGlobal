import logging
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.gemini_client import GeminiError
from app.pipeline import InputDocument, PipelineResult, run_pipeline
from app.schemas import (
    ClassifyRequest,
    ClassifyResponse,
    ExtractionResponse,
    OptimizeRequest,
    OptimizeResponse,
)
from app.services import classification, optimization
from app.services.extraction import ExtractionInputError, extract_invoice

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(title="EcoTrace AI Service", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": settings.gemini_model,
        "mock_mode": settings.mock_mode or not settings.gemini_api_key,
    }


@app.post("/ai/extract-invoice", response_model=ExtractionResponse)
async def extract(file: UploadFile = File(...), doc_type: Optional[str] = Form(None)):
    content = await file.read()
    try:
        return extract_invoice(content, file.content_type or "", doc_type)
    except ExtractionInputError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except GeminiError as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/ai/classify-activity", response_model=ClassifyResponse)
def classify(req: ClassifyRequest):
    return classification.classify(req)


@app.post("/ai/optimize", response_model=OptimizeResponse)
def optimize(req: OptimizeRequest):
    return optimization.optimize(req)


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
