"""Luồng AI đầu-cuối: chứng từ -> trích xuất -> phân loại -> CO2e (demo) -> inventory -> gợi ý.

Backend thật chỉ gọi từng endpoint riêng; luồng này dùng để chạy thử/demo toàn bộ.
"""
import logging
import time
from dataclasses import dataclass
from typing import Optional

from pydantic import BaseModel

from app.demo.emission_calc import EmissionResult, calculate
from app.gemini_client import GeminiError
from app.schemas import (
    EmissionSource,
    ExtractionResponse,
    MonthlyPoint,
    OptimizeRequest,
    OptimizeResponse,
)
from app.services.extraction import ExtractionInputError, extract_invoice
from app.services.optimization import optimize

log = logging.getLogger("ai.pipeline")


@dataclass
class InputDocument:
    name: str
    content: bytes
    mime_type: str
    doc_type: Optional[str] = None


class DocumentResult(BaseModel):
    file: str
    ok: bool
    error: Optional[str] = None
    elapsed_ms: int = 0
    extraction: Optional[ExtractionResponse] = None
    emission: Optional[EmissionResult] = None


class Inventory(BaseModel):
    total_co2e_kg: float
    by_scope: dict[str, float]
    by_factor: dict[str, float]
    monthly: list[MonthlyPoint]
    documents_calculated: int
    documents_need_review: int
    documents_failed: int


class PipelineResult(BaseModel):
    documents: list[DocumentResult]
    inventory: Inventory
    optimization: OptimizeResponse


def process_document(doc: InputDocument) -> DocumentResult:
    start = time.perf_counter()
    try:
        ext = extract_invoice(doc.content, doc.mime_type, doc.doc_type)
        emission = calculate(ext.data)
        return DocumentResult(
            file=doc.name, ok=True, extraction=ext, emission=emission,
            elapsed_ms=int((time.perf_counter() - start) * 1000),
        )
    except (ExtractionInputError, GeminiError) as e:
        log.warning("Lỗi xử lý %s: %s", doc.name, e)
        return DocumentResult(
            file=doc.name, ok=False, error=str(e),
            elapsed_ms=int((time.perf_counter() - start) * 1000),
        )


def build_inventory(results: list[DocumentResult]) -> tuple[Inventory, list[EmissionSource]]:
    by_scope: dict[str, float] = {"1": 0.0, "2": 0.0, "3": 0.0}
    by_factor: dict[str, float] = {}
    monthly: dict[str, float] = {}
    sources: dict[str, EmissionSource] = {}
    calculated = review = failed = 0

    for r in results:
        if not r.ok:
            failed += 1
            continue
        data = r.extraction.data
        if data.needs_review:
            review += 1
        if not r.emission or r.emission.status != "CALCULATED" or data.scope is None:
            continue
        calculated += 1
        co2e = r.emission.co2e_kg
        by_scope[str(data.scope)] += co2e
        by_factor[data.factor_code] = by_factor.get(data.factor_code, 0) + co2e
        if data.invoice_date:
            month = data.invoice_date[:7]
            monthly[month] = monthly.get(month, 0) + co2e
        src = sources.get(data.factor_code)
        if src:
            src.co2e_kg += co2e
        else:
            sources[data.factor_code] = EmissionSource(
                factor_code=data.factor_code, activity_type=data.activity_type,
                scope=data.scope, co2e_kg=co2e,
            )

    inv = Inventory(
        total_co2e_kg=round(sum(by_scope.values()), 2),
        by_scope={k: round(v, 2) for k, v in by_scope.items()},
        by_factor={k: round(v, 2) for k, v in sorted(by_factor.items(), key=lambda x: -x[1])},
        monthly=[MonthlyPoint(month=m, co2e_kg=round(v, 2)) for m, v in sorted(monthly.items())],
        documents_calculated=calculated, documents_need_review=review, documents_failed=failed,
    )
    return inv, list(sources.values())


def run_pipeline(docs: list[InputDocument], language: str = "vi", max_suggestions: int = 5) -> PipelineResult:
    return finalize([process_document(d) for d in docs], language, max_suggestions)


def finalize(results: list[DocumentResult], language: str = "vi", max_suggestions: int = 5) -> PipelineResult:
    """Tổng hợp inventory và sinh gợi ý từ các chứng từ đã xử lý (dùng lại khi người dùng sửa dữ liệu)."""
    inventory, sources = build_inventory(results)
    if sources:
        opt = optimize(OptimizeRequest(
            language=language, max_suggestions=max_suggestions,
            sources=sources, monthly_trend=inventory.monthly,
        ))
    else:
        opt = OptimizeResponse(total_co2e_kg=0, suggestions=[])
    return PipelineResult(documents=results, inventory=inventory, optimization=opt)
