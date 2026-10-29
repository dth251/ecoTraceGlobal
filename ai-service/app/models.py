import datetime
import uuid
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def get_current_time():
    return datetime.datetime.now(datetime.timezone.utc)


class ExtractionLog(Base):
    """Lưu lịch sử bóc tách chứng từ hóa đơn từ AI."""
    __tablename__ = "ai_extraction_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_hash = Column(String(64), index=True, nullable=False)
    file_name = Column(String(255), nullable=True)
    mime_type = Column(String(64), nullable=False)
    file_size = Column(Integer, nullable=False)
    doc_type_hint = Column(String(64), nullable=True)

    activity_type = Column(String(64), nullable=True)
    vendor = Column(String(255), nullable=True)
    invoice_date = Column(String(32), nullable=True)
    quantity = Column(Float, nullable=True)
    unit = Column(String(32), nullable=True)
    total_amount = Column(Float, nullable=True)
    currency = Column(String(16), nullable=True)

    status = Column(String(32), default="OK")  # OK, NEEDS_REVIEW, FAILED
    is_mock = Column(Boolean, default=False)
    is_cached = Column(Boolean, default=False)
    execution_time_ms = Column(Float, default=0.0)
    model_name = Column(String(64), nullable=True)
    confidence_score = Column(Float, nullable=True)
    extracted_data_json = Column(Text, nullable=True)

    created_at = Column(DateTime, default=get_current_time, nullable=False)

    feedbacks = relationship("AuditFeedback", back_populates="extraction", cascade="all, delete-orphan")


class ClassificationLog(Base):
    """Lưu lịch sử phân loại Scope 1/2/3 và mã hệ số phát thải."""
    __tablename__ = "ai_classification_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    description = Column(Text, nullable=False)
    quantity = Column(Float, nullable=True)
    unit = Column(String(32), nullable=True)

    matched_scope = Column(Integer, nullable=True)
    matched_category = Column(String(128), nullable=True)
    factor_code = Column(String(128), nullable=True)
    confidence = Column(Float, nullable=True)
    is_mock = Column(Boolean, default=False)

    created_at = Column(DateTime, default=get_current_time, nullable=False)


class PassportAuditLog(Base):
    """Lưu lịch sử kiểm tra hộ chiếu xanh của AI Agent."""
    __tablename__ = "ai_passport_audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    passport_code = Column(String(64), index=True, nullable=False)
    product_name = Column(String(255), nullable=True)
    total_footprint_kg = Column(Float, nullable=True)
    check_status = Column(String(32), default="VERIFIED")  # VERIFIED, WARNING, SUSPICIOUS, REJECTED
    risk_score = Column(Float, default=0.0)
    findings_json = Column(Text, nullable=True)
    recommendations_json = Column(Text, nullable=True)

    created_at = Column(DateTime, default=get_current_time, nullable=False)


class AuditFeedback(Base):
    """Lưu phản hồi và chỉnh sửa của chuyên viên kiểm toán cho dữ liệu bóc tách."""
    __tablename__ = "ai_audit_feedbacks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    extraction_id = Column(String(36), ForeignKey("ai_extraction_logs.id", ondelete="CASCADE"), nullable=True)
    is_correct = Column(Boolean, default=True)
    rating = Column(Integer, nullable=True)
    corrections_json = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=get_current_time, nullable=False)

    extraction = relationship("ExtractionLog", back_populates="feedbacks")
