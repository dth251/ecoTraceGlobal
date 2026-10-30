import { api } from "@/api/client";
import type { EmissionSummary } from "@/types/domain";

export interface CalculationFailure {
  activityId: string;
  category: string;
  subCategory: string | null;
  code: string;
  message: string;
}

/** Hình dạng backend trả về cho GET /periods/{id}/summary */
interface PeriodSummaryResponse {
  periodId: string;
  totalCo2eKg: number;
  scope1Co2eKg: number;
  scope2Co2eKg: number;
  scope3Co2eKg: number;
  byMonth: { month: string; scope1Kg: number; scope2Kg: number; scope3Kg: number }[];
  topSources: { category: string; subCategory: string | null; scope: number; co2eKg: number }[];
  calculatedAt: string | null;
}

export interface CalculationResult {
  periodId: string;
  calculatedAt: string;
  recordsCalculated: number;
  activities?: number;
  failures?: CalculationFailure[];
  skipped: string[];
}

const toSummary = (r: PeriodSummaryResponse): EmissionSummary => ({
  periodId: r.periodId,
  totalKg: Number(r.totalCo2eKg),
  byScope: { scope1: Number(r.scope1Co2eKg), scope2: Number(r.scope2Co2eKg), scope3: Number(r.scope3Co2eKg) },
  byMonth: r.byMonth.map((m) => ({
    month: m.month,
    scope1: Number(m.scope1Kg),
    scope2: Number(m.scope2Kg),
    scope3: Number(m.scope3Kg),
  })),
  topSources: r.topSources.map((s) => ({
    category: s.subCategory ? `${s.category}/${s.subCategory}` : s.category,
    label: s.subCategory ? `${s.category} · ${s.subCategory}` : s.category,
    co2eKg: Number(s.co2eKg),
    scope: s.scope,
    subCategory: s.subCategory,
  })),
  previousTotalKg: null,
  calculatedAt: r.calculatedAt,
});

export const emissionsApi = {
  calculate: (periodId: string) => api<CalculationResult>(`/periods/${periodId}/calculate`, { method: "POST" }),
  summary: async (periodId: string) => toSummary(await api<PeriodSummaryResponse>(`/periods/${periodId}/summary`)),
};
