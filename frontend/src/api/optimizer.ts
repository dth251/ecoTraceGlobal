import { api, json } from "@/api/client";
import type { Recommendation, ScenarioRequest, ScenarioResult } from "@/types/domain";

/** Hình dạng backend trả về cho POST /scenarios/simulate */
interface ScenarioResponse {
  baselineCo2e: number;
  projectedCo2e: number;
}

export const optimizerApi = {
  generate: (periodId: string) =>
    api<Recommendation[]>(`/periods/${periodId}/recommendations/generate`, { method: "POST" }),
  list: (periodId: string) => api<Recommendation[]>(`/periods/${periodId}/recommendations`),
  simulate: async (body: ScenarioRequest): Promise<ScenarioResult> => {
    const r = await api<ScenarioResponse>("/scenarios/simulate", {
      method: "POST",
      ...json({ periodId: body.periodId, type: body.scenario, parameters: body.params }),
    });
    const baselineKg = Number(r.baselineCo2e);
    const scenarioKg = Number(r.projectedCo2e);
    return { baselineKg, scenarioKg, reductionKg: baselineKg - scenarioKg };
  },
};
