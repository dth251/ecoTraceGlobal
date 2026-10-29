import { api } from "@/api/client";
import type { EmissionSummary } from "@/types/domain";

export interface CalculationFailure {
  activityId: string;
  category: string;
  subCategory: string | null;
  code: string;
  message: string;
}

export interface CalculationResult {
  periodId: string;
  calculatedAt: string;
  recordsCalculated: number;
  activities: number;
  failures: CalculationFailure[];
}

export const emissionsApi = {
  calculate: (periodId: string) => api<CalculationResult>(`/periods/${periodId}/calculate`, { method: "POST" }),
  summary: (periodId: string) => api<EmissionSummary>(`/periods/${periodId}/summary`),
};
