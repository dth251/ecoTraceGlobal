import { api, json, qs } from "@/api/client";
import type { Activity, ActivityFilters } from "@/types/domain";

export type ActivityInput = Omit<Activity, "id" | "co2eKg" | "scope" | "documentId">;

// TODO Sprint 4: dữ liệu hoạt động
export const activitiesApi = {
  list: (periodId: string, filters: ActivityFilters = {}) =>
    api<Activity[]>(`/activities${qs({ periodId, ...filters })}`),
  create: (body: ActivityInput) => api<Activity>("/activities", { method: "POST", ...json(body) }),
  update: (id: string, body: ActivityInput) =>
    api<Activity>(`/activities/${id}`, { method: "PUT", ...json(body) }),
};
