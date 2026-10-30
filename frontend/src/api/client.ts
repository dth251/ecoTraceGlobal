import { useAuthStore } from "@/stores/authStore";
import type { AuthResponse } from "@/types/domain";

export const BASE: string = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Single-flight: nhiều request 401 cùng lúc chỉ gọi refresh một lần
let refreshing: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      logout();
      return false;
    }
    const data = (await res.json()) as AuthResponse;
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    logout();
    return false;
  }
}

/** Header chung: token, ngôn ngữ */
export function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Accept-Language": localStorage.getItem("lang") ?? "vi",
  };
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const isForm = init.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...authHeaders(),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Không kết nối được máy chủ");
  }

  if (res.status === 401 && retry) {
    refreshing ??= refreshToken().finally(() => {
      refreshing = null;
    });
    if (await refreshing) return api<T>(path, init, false);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Partial<{ code: string; message: string; details: unknown }>;
    throw new ApiError(res.status, body.code ?? "UNKNOWN", body.message ?? res.statusText, body.details);
  }
  // Một số endpoint trả 200 không có nội dung (thu hồi, từ chối...)
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Tạo query string, bỏ qua giá trị rỗng */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });
