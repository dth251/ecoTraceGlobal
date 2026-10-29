import hashlib
import json
import logging
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import AuditFeedback, ClassificationLog, ExtractionLog, PassportAuditLog
from app.schemas import (
    AuditFeedbackRequest,
    AuditFeedbackResponse,
    ClassifyRequest,
    ClassifyResponse,
    ExtractedInvoice,
    ExtractionLogItem,
    ExtractionResponse,
    HistoryStatsResponse,
)

log = logging.getLogger("ai.db_service")


def save_extraction_record(
    file_bytes: bytes,
    mime_type: str,
    file_name: Optional[str],
    doc_type_hint: Optional[str],
    res: ExtractionResponse,
    latency_ms: float,
    model_name: str,
    is_cached: bool = False,
) -> Optional[str]:
    """Lưu lịch sử bóc tách chứng từ hóa đơn vào CSDL an toàn (không ném Exception)."""
    db = SessionLocal()
    try:
        data: Optional[ExtractedInvoice] = res.data
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        # Tính điểm tin cậy trung bình
        avg_confidence: Optional[float] = None
        if data and data.confidence:
            conf_vals = list(data.confidence.values())
            if conf_vals:
                avg_confidence = round(sum(conf_vals) / len(conf_vals), 4)

        record = ExtractionLog(
            id=str(uuid.uuid4()),
            file_hash=file_hash,
            file_name=file_name,
            mime_type=mime_type,
            file_size=len(file_bytes),
            doc_type_hint=doc_type_hint,
            activity_type=data.activity_type.value if data and data.activity_type else None,
            vendor=data.supplier if data else None,
            invoice_date=data.invoice_date if data else None,
            quantity=data.quantity if data else None,
            unit=data.unit if data else None,
            total_amount=data.amount if data else None,
            currency=data.currency if data else None,
            status=res.status,
            is_mock=res.mock,
            is_cached=is_cached,
            execution_time_ms=round(latency_ms, 2),
            model_name=model_name,
            confidence_score=avg_confidence,
            extracted_data_json=json.dumps(res.model_dump(mode="json"), ensure_ascii=False),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        log.info("Saved extraction record id=%s, hash=%s", record.id, file_hash[:8])
        return record.id
    except Exception as e:
        db.rollback()
        log.warning("Could not persist extraction record to DB: %s", e)
        return None
    finally:
        db.close()


def save_classification_record(req: ClassifyRequest, res: ClassifyResponse) -> Optional[str]:
    """Lưu lịch sử phân loại Scope vào CSDL."""
    db = SessionLocal()
    try:
        record = ClassificationLog(
            id=str(uuid.uuid4()),
            description=req.description,
            quantity=req.amount,
            unit=req.unit,
            matched_scope=res.scope,
            matched_category=res.category,
            factor_code=res.factor_code,
            confidence=res.confidence,
            is_mock=res.mock,
        )
        db.add(record)
        db.commit()
        return record.id
    except Exception as e:
        db.rollback()
        log.warning("Could not persist classification record: %s", e)
        return None
    finally:
        db.close()


def save_audit_feedback(req: AuditFeedbackRequest) -> AuditFeedbackResponse:
    """Lưu phản hồi & đánh giá của chuyên viên kiểm toán đối với kết quả AI."""
    db = SessionLocal()
    try:
        feedback = AuditFeedback(
            id=str(uuid.uuid4()),
            extraction_id=req.extraction_id,
            is_correct=req.is_correct,
            rating=req.rating,
            corrections_json=json.dumps(req.corrections, ensure_ascii=False) if req.corrections else None,
            notes=req.notes,
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)
        return AuditFeedbackResponse(
            status="SAVED",
            feedback_id=feedback.id,
            message="Đã lưu phản hồi kiểm toán thành công vào CSDL.",
        )
    except Exception as e:
        db.rollback()
        log.error("Failed to save audit feedback: %s", e)
        raise
    finally:
        db.close()


def get_extraction_history(limit: int = 50, offset: int = 0) -> List[ExtractionLogItem]:
    """Lấy danh sách lịch sử bóc tách chứng từ."""
    db = SessionLocal()
    try:
        records = (
            db.query(ExtractionLog)
            .order_by(desc(ExtractionLog.created_at))
            .offset(offset)
            .limit(limit)
            .all()
        )
        return [
            ExtractionLogItem(
                id=r.id,
                file_hash=r.file_hash,
                file_name=r.file_name,
                mime_type=r.mime_type,
                file_size=r.file_size,
                activity_type=r.activity_type,
                vendor=r.vendor,
                quantity=r.quantity,
                unit=r.unit,
                total_amount=r.total_amount,
                currency=r.currency,
                status=r.status,
                is_mock=r.is_mock,
                is_cached=r.is_cached,
                execution_time_ms=r.execution_time_ms,
                confidence_score=r.confidence_score,
                created_at=r.created_at.isoformat(),
            )
            for r in records
        ]
    finally:
        db.close()


def get_extraction_detail(record_id: str) -> Optional[Dict[str, Any]]:
    """Lấy chi tiết đầy đủ 1 bản ghi bóc tách kèm JSON raw."""
    db = SessionLocal()
    try:
        r = db.query(ExtractionLog).filter(ExtractionLog.id == record_id).first()
        if not r:
            return None
        return {
            "id": r.id,
            "file_hash": r.file_hash,
            "file_name": r.file_name,
            "mime_type": r.mime_type,
            "file_size": r.file_size,
            "status": r.status,
            "execution_time_ms": r.execution_time_ms,
            "confidence_score": r.confidence_score,
            "model_name": r.model_name,
            "created_at": r.created_at.isoformat(),
            "extracted_data": json.loads(r.extracted_data_json) if r.extracted_data_json else None,
            "feedbacks": [
                {
                    "id": f.id,
                    "is_correct": f.is_correct,
                    "rating": f.rating,
                    "corrections": json.loads(f.corrections_json) if f.corrections_json else None,
                    "notes": f.notes,
                    "created_at": f.created_at.isoformat(),
                }
                for f in r.feedbacks
            ],
        }
    finally:
        db.close()


def get_history_stats() -> HistoryStatsResponse:
    """Thống kê tổng hợp về hiệu năng bóc tách và phản hồi của AI."""
    db = SessionLocal()
    try:
        total = db.query(func.count(ExtractionLog.id)).scalar() or 0
        cached = db.query(func.count(ExtractionLog.id)).filter(ExtractionLog.is_cached == True).scalar() or 0
        needs_review = db.query(func.count(ExtractionLog.id)).filter(ExtractionLog.status == "NEEDS_REVIEW").scalar() or 0
        avg_latency = db.query(func.avg(ExtractionLog.execution_time_ms)).scalar() or 0.0

        total_feedbacks = db.query(func.count(AuditFeedback.id)).scalar() or 0
        positive_feedbacks = db.query(func.count(AuditFeedback.id)).filter(AuditFeedback.is_correct == True).scalar() or 0

        hit_rate = round((cached / total * 100), 2) if total > 0 else 0.0
        pos_rate = round((positive_feedbacks / total_feedbacks * 100), 2) if total_feedbacks > 0 else 100.0

        return HistoryStatsResponse(
            total_extractions=total,
            total_cached=cached,
            cache_hit_rate_pct=hit_rate,
            needs_review_count=needs_review,
            average_latency_ms=round(float(avg_latency), 2),
            total_feedbacks=total_feedbacks,
            positive_feedback_rate_pct=pos_rate,
        )
    finally:
        db.close()
