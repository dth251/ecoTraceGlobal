import { api } from "@/api/client";

export interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  factor_code: string;
  confidence: number;
}

export interface ExtractionResponse {
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

export interface PassportAuditCheck {
  code: string;
  title: string;
  status: "PASSED" | "WARNING" | "FAILED";
  message: string;
  suggestion: string;
}

export interface PassportAuditResponse {
  publicCode: string;
  readinessScore: number;
  overallAssessment: string;
  checks: PassportAuditCheck[];
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

  auditPassport: (code: string) => api<PassportAuditResponse>(`/ai/passports/${code}/audit`),
};

