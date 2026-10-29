import { api } from "@/api/client";

export interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  factor_code: string;
  confidence: number;
}

/** Khối `data` gốc của AI service (có khi gọi trực tiếp AI service; backend hiện chưa chuyển tiếp). */
export interface ExtractedData extends Record<string, unknown> {
  activity_type?: string;
  scope?: number | null;
  factor_code?: string | null;
  needs_review?: boolean;
  review_fields?: string[];
}

export interface ExtractionResponse {
  status?: string;
  mock?: boolean;
  data?: ExtractedData;
  doc_type: string;
  supplier_name: string;
  invoice_no: string;
  invoice_date: string;
  total_amount: number;
  currency: string;
  lines: LineItem[];
  overall_confidence: number;
}

export interface ClassifyRequest {
  description: string;
  unit?: string;
  activity_type?: string;
}

export interface ClassifyResponse {
  scope: 1 | 2 | 3;
  factor_code: string;
  confidence: number;
  reasoning: string;
}

export interface SuggestionItem {
  title: string;
  description: string;
  target_factor_code: string;
  reduction_potential_pct: number;
  difficulty: string;
}

export interface OptimizeResponse {
  suggestions: SuggestionItem[];
  summary: string;
}

/** Gợi ý tối ưu từ AI service: ngoài các trường của SuggestionItem còn có số liệu và các bước thực hiện. */
export interface EstimateSuggestion extends SuggestionItem {
  id: string;
  estimated_reduction_kg: number;
  estimated_reduction_pct: number;
  estimated_cost_usd: number;
  steps: string[];
}

export interface EstimateDocument {
  name: string;
  activity_type: string;
  scope: number | null;
  factor_code: string | null;
  co2e_kg: number | null;
  status: "CALCULATED" | "MISSING_DATA" | "UNIT_MISMATCH" | "NO_FACTOR";
  formula: string | null;
  note: string | null;
  factor_value: number | null;
  factor_unit: string | null;
  factor_source: string | null;
  distance_km_used: number | null;
  needs_review: boolean;
  review_fields: string[];
}

export interface EstimateResponse {
  total_co2e_kg: number;
  by_scope: Record<string, number>;
  by_factor: Record<string, number>;
  documents: EstimateDocument[];
  calculated: number;
  optimization: { mock: boolean; total_co2e_kg: number; summary: string; suggestions: EstimateSuggestion[] };
  disclaimer: string;
}

export interface ReadinessCheck {
  code: string;
  title: string;
  status: "PASSED" | "FAILED";
  message: string;
  action: string;
  weight: number;
  earned: number;
}

export interface ReadinessReason {
  code: string;
  title: string;
  message: string;
  action: string;
}

/** Kết quả xét điều kiện cấp hộ chiếu xanh. `source` cho biết lời nhận xét do AI hay do quy tắc viết; DEMO là dữ liệu mẫu khi chưa có backend. */
export interface PassportReadiness {
  decision: "ISSUED" | "PROVISIONAL" | "NOT_ISSUED";
  can_issue: boolean;
  score: number;
  min_score: number;
  checks: ReadinessCheck[];
  blockers: string[];
  reasons: ReadinessReason[];
  overall_assessment: string;
  source: "AI" | "RULES" | "DEMO";
  mock: boolean;
}

export const aiApi = {
  checkHealth: () => api<{ status: string; model?: string; mock_mode?: boolean }>("/ai/health"),

  extractInvoice: (file: File, docType?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (docType) formData.append("docType", docType);
    return api<ExtractionResponse>("/ai/extract-invoice", {
      method: "POST",
      body: formData,
    });
  },

  classifyActivity: (req: ClassifyRequest) =>
    api<ClassifyResponse>("/ai/classify-activity", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  optimize: (periodId: string, language = "vi", maxSuggestions = 5) =>
    api<OptimizeResponse>(`/ai/optimize/${periodId}?language=${language}&maxSuggestions=${maxSuggestions}`, {
      method: "POST",
    }),

  /** Ước tính CO2e cho cả lô chứng từ đã bóc tách và sinh gợi ý tối ưu (AI service, hệ số tham khảo). */
  estimate: (items: { name: string; data: ExtractedData }[], language = "vi", maxSuggestions = 5) =>
    api<EstimateResponse>("/ai/estimate", {
      method: "POST",
      body: JSON.stringify({ items, language, max_suggestions: maxSuggestions }),
    }),

  auditPassport: (code: string, language = "vi") =>
    api<PassportReadiness>(`/ai/passports/${encodeURIComponent(code)}/audit?language=${language}`),
};

