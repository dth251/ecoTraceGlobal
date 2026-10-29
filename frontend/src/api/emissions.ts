import { api } from "@/api/client";
import type { EmissionSummary } from "@/types/domain";

// TODO Sprint 4: tính toán và tổng hợp
export const emissionsApi = {
  calculate: (periodId: string) => api<EmissionSummary>(`/periods/${periodId}/calculate`, { method: "POST" }),
  summary: (periodId: string) => api<EmissionSummary>(`/periods/${periodId}/summary`),
};
