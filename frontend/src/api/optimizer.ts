import { api, json } from "@/api/client";
import type { Recommendation, ScenarioRequest, ScenarioResult } from "@/types/domain";

// TODO Sprint 6: đề xuất giảm phát thải
export const optimizerApi = {
  generate: (periodId: string) =>
    api<Recommendation[]>(`/periods/${periodId}/recommendations/generate`, { method: "POST" }),
  list: (periodId: string) => api<Recommendation[]>(`/periods/${periodId}/recommendations`),
  simulate: (body: ScenarioRequest) =>
    api<ScenarioResult>("/scenarios/simulate", { method: "POST", ...json(body) }),
};
