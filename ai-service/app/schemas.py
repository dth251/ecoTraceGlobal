"""Hợp đồng dữ liệu giữa AI service và backend Spring Boot (AiExtractionPort)."""
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ActivityType(str, Enum):
    ELECTRICITY = "ELECTRICITY"  # Scope 2
    FUEL = "FUEL"  # Scope 1
    MATERIAL = "MATERIAL"  # Scope 3 - nguyên liệu mua vào
    FREIGHT = "FREIGHT"  # Scope 3 - cước vận chuyển
    OTHER = "OTHER"


class TransportMode(str, Enum):
    SEA = "SEA"
    ROAD = "ROAD"
    AIR = "AIR"
    RAIL = "RAIL"


class FieldConfidence(BaseModel):
    field: str
    confidence: float = Field(ge=0, le=1)


# ---------- Đầu ra thô của Gemini (response_schema) ----------
class RawExtraction(BaseModel):
    activity_type: ActivityType
    supplier: Optional[str] = None
    invoice_date: Optional[str] = Field(None, description="YYYY-MM-DD")
    invoice_series: Optional[str] = Field(None, description="Ký hiệu hóa đơn, ví dụ 1C25TAA")
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = Field(None, description="Đơn giá của dòng hàng chính")
    line_amount: Optional[float] = Field(None, description="Thành tiền của dòng hàng chính")
    amount: Optional[float] = None
    currency: Optional[str] = None
    # Vận chuyển
    origin: Optional[str] = None
    destination: Optional[str] = None
    transport_mode: Optional[TransportMode] = None
    weight_kg: Optional[float] = None
    distance_km: Optional[float] = None
    # Nguyên liệu
    material_type: Optional[str] = None
    confidences: list[FieldConfidence] = []


# ---------- /ai/extract-invoice ----------
class ExtractedInvoice(BaseModel):
    activity_type: ActivityType
    scope: Optional[int] = None
    factor_code: Optional[str] = None
    supplier: Optional[str] = None
    invoice_date: Optional[str] = None
    invoice_series: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    line_amount: Optional[float] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    transport_mode: Optional[TransportMode] = None
    weight_kg: Optional[float] = None
    distance_km: Optional[float] = None
    material_type: Optional[str] = None
    confidence: dict[str, float] = {}
    needs_review: bool = False
    review_fields: list[str] = []


class ExtractionResponse(BaseModel):
    status: str = "OK"  # OK | NEEDS_REVIEW
    mock: bool = False
    data: ExtractedInvoice


# ---------- /ai/classify-activity ----------
class ClassifyRequest(BaseModel):
    description: str
    unit: Optional[str] = None
    activity_type: Optional[ActivityType] = None


class ClassifyResponse(BaseModel):
    activity_type: ActivityType
    scope: Optional[int]
    factor_code: Optional[str]
    method: str  # RULE | LLM | NONE


# ---------- /ai/optimize ----------
class EmissionSource(BaseModel):
    factor_code: str
    activity_type: ActivityType
    scope: int
    co2e_kg: float
    quantity: Optional[float] = None
    unit: Optional[str] = None


class MonthlyPoint(BaseModel):
    month: str  # YYYY-MM
    co2e_kg: float


class OptimizeRequest(BaseModel):
    period: Optional[str] = None
    language: str = "vi"  # vi | en
    max_suggestions: int = Field(5, ge=1, le=10)
    sources: list[EmissionSource]
    monthly_trend: list[MonthlyPoint] = []


class Suggestion(BaseModel):
    id: str
    title: str
    category: str  # ENERGY | FUEL | MATERIAL | LOGISTICS
    priority: str  # HIGH | MEDIUM | LOW
    estimated_reduction_kg: float
    estimated_reduction_pct: float
    estimated_cost_usd: float
    rationale: str
    evidence: str
    steps: list[str]


class OptimizeResponse(BaseModel):
    mock: bool = False
    total_co2e_kg: float
    suggestions: list[Suggestion]


# ---------- Đầu ra thô của Gemini cho phần tối ưu ----------
class LlmSuggestionText(BaseModel):
    id: str
    title: str
    rationale: str
    steps: list[str]


class LlmOptimizeOutput(BaseModel):
    items: list[LlmSuggestionText]


class LlmClassify(BaseModel):
    activity_type: ActivityType
    factor_code: Optional[str] = None


# ---------- Schemas cho CSDL Lịch sử & Phản hồi AI ----------
class AuditFeedbackRequest(BaseModel):
    extraction_id: Optional[str] = None
    is_correct: bool = True
    rating: Optional[int] = Field(None, ge=1, le=5)
    corrections: Optional[dict] = None
    notes: Optional[str] = None


class AuditFeedbackResponse(BaseModel):
    status: str = "SAVED"
    feedback_id: str
    message: str


class ExtractionLogItem(BaseModel):
    id: str
    file_hash: str
    file_name: Optional[str] = None
    mime_type: str
    file_size: int
    activity_type: Optional[str] = None
    vendor: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = None
    status: str
    is_mock: bool
    is_cached: bool
    execution_time_ms: float
    confidence_score: Optional[float] = None
    created_at: str


class HistoryStatsResponse(BaseModel):
    total_extractions: int
    total_cached: int
    cache_hit_rate_pct: float
    needs_review_count: int
    average_latency_ms: float
    total_feedbacks: int
    positive_feedback_rate_pct: float
