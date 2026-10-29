import { api, json, qs } from "@/api/client";
import type { CreatePeriodRequest, Period } from "@/types/domain";

export const periodsApi = {
  list: (facilityId?: string | null) => api<Period[]>(`/periods${qs({ facilityId })}`),
  create: (body: CreatePeriodRequest) => api<Period>("/periods", { method: "POST", ...json(body) }),
  lock: (id: string) => api<Period>(`/periods/${id}/lock`, { method: "POST" }),
  unlock: (id: string) => api<Period>(`/periods/${id}/unlock`, { method: "POST" }),
};
