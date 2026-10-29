import { api, json } from "@/api/client";
import type { Passport, PublicVerification } from "@/types/domain";

// TODO Sprint 5: hộ chiếu xanh
export const passportsApi = {
  list: (periodId: string) => api<Passport[]>(`/periods/${periodId}/passports`),
  issue: (periodId: string, productId: string) =>
    api<Passport>(`/periods/${periodId}/passports`, { method: "POST", ...json({ productId }) }),
  revoke: (id: string, reason: string) =>
    api<Passport>(`/passports/${id}/revoke`, { method: "POST", ...json({ reason }) }),
  /** Công khai, không cần token, không thử refresh */
  verify: (code: string) =>
    api<PublicVerification>(`/public/verify/${encodeURIComponent(code)}`, {}, false),
};
