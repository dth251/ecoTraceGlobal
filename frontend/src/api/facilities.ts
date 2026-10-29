import { api, json } from "@/api/client";
import type { CreateFacilityRequest, Facility } from "@/types/domain";

export const facilitiesApi = {
  list: () => api<Facility[]>("/facilities"),
  get: (id: string) => api<Facility>(`/facilities/${id}`),
  create: (body: CreateFacilityRequest) => api<Facility>("/facilities", { method: "POST", ...json(body) }),
  update: (id: string, body: CreateFacilityRequest) =>
    api<Facility>(`/facilities/${id}`, { method: "PUT", ...json(body) }),
  remove: (id: string) => api<void>(`/facilities/${id}`, { method: "DELETE" }),
};
