import { api, json } from "@/api/client";
import type { AuthResponse, LoginRequest, RegisterRequest } from "@/types/domain";

export const authApi = {
  login: (body: LoginRequest) => api<AuthResponse>("/auth/login", { method: "POST", ...json(body) }, false),
  register: (body: RegisterRequest) =>
    api<AuthResponse>("/auth/register", { method: "POST", ...json(body) }, false),
  refresh: (refreshToken: string) =>
    api<AuthResponse>("/auth/refresh", { method: "POST", ...json({ refreshToken }) }, false),
};
