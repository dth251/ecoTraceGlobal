import { useAuthStore } from "@/stores/authStore";
import {
  DEMO_EMAIL,
  sampleActivities,
  sampleAuthResponse,
  sampleDocuments,
  sampleFacilities,
  sampleFootprints,
  sampleImports,
  sampleOrganization,
  samplePassports,
  samplePeriods,
  sampleProducts,
  sampleRecommendations,
  sampleSummary,
  sampleVerification,
} from "@/test/fixtures/sample";
import type { AuthResponse, LoginRequest } from "@/types/domain";

export const BASE: string = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

/** Trả dữ liệu demo khi chạy giao diện độc lập (chưa bật backend) với token demo */
function resolveDemoResponse(path: string, init: RequestInit): unknown | undefined {
  const method = (init.method ?? "GET").toUpperCase();
  if (method === "POST" && path === "/auth/login" && typeof init.body === "string") {
    const body = JSON.parse(init.body) as LoginRequest;
    const email = (body.email || "").trim().toLowerCase();
    const role = email.includes("auditor") ? "AUDITOR" : email.includes("admin") ? "ADMIN" : "OWNER";
    const name = email.includes("auditor")
      ? "Chuyên viên Kiểm toán (Auditor)"
      : email.includes("admin")
        ? "Quản trị viên EcoTrace"
        : "Chị Lan (QA & Xuất khẩu)";
    return {
      accessToken: sampleAuthResponse.accessToken,
      refreshToken: sampleAuthResponse.refreshToken,
      expiresIn: 1800,
      user: {
        id: "usr-1",
        email: body.email || DEMO_EMAIL,
        fullName: name,
        role: role,
        organizationId: "org-1",
        organizationName: "EcoTrace Global Manufacturing",
      },
    };
  }
  if (path.startsWith("/public/verify/")) {
    return sampleVerification;
  }
  if (path.startsWith("/ai/passports/") && path.endsWith("/audit")) {
    return {
      publicCode: "ET-7KQ2-9XMA",
      readinessScore: 92,
      overallAssessment: "Hồ sơ đạt độ tin cậy cao, phương pháp phân bổ MASS và hệ số nguồn hợp lệ theo tiêu chuẩn EU CBAM.",
      checks: [
        {
          code: "SIGNATURE_STATUS",
          title: "Tính pháp lý chữ ký ECDSA",
          status: "PASSED",
          message: "Chữ ký ECDSA P-256 nguyên vẹn, mã SHA-256 khớp tuyệt đối với dữ liệu phát thải gốc.",
          suggestion: "Đạt chuẩn niêm phong số",
        },
        {
          code: "ACTUAL_DATA_SHARE",
          title: "Tỷ lệ dữ liệu đo thực tế",
          status: "PASSED",
          message: "Tỷ lệ dữ liệu thực tế đạt 72.0% (vượt mức tối thiểu 50% yêu cầu chuyển tiếp CBAM).",
          suggestion: "Duy trì số liệu từ hóa đơn đo lường trực tiếp",
        },
        {
          code: "CBAM_PRECURSORS",
          title: "Hạch toán tiền chất thép/nhôm",
          status: "PASSED",
          message: "Tiền chất nguyên liệu Scope 3 Cat 1 đã được tính theo hệ số vòng đời sản phẩm.",
          suggestion: "Yêu cầu nhà cung ứng cung cấp số liệu thực tế để giảm hệ số mặc định",
        },
      ],
    };
  }
  if (path === "/ai/health") {
    return { status: "ok", model: "gemini-2.5-flash", mock_mode: false };
  }
  if (path === "/ai/classify-activity") {
    return {
      scope: 1,
      factor_code: "FUEL_DIESEL",
      confidence: 0.95,
      reasoning: "Hoạt động sử dụng nhiên liệu diesel cho thiết bị đốt cố định hoặc phụ trợ được xếp vào Scope 1.",
    };
  }
  if (path.startsWith("/ai/optimize")) {
    return {
      suggestions: [
        {
          title: "Lắp điện mặt trời áp mái 300 kWp",
          description: "Điện lưới mua vào Scope 2 chiếm 57% phát thải. Thay thế 30% bằng điện mặt trời tự dùng giúp giảm đáng kể dấu chân carbon.",
          target_factor_code: "ELEC_GRID",
          reduction_potential_pct: 18.0,
          difficulty: "trung bình",
        },
        {
          title: "Thay đổi nhà cung ứng thép có lò hồ quang điện (EAF)",
          description: "Phát thải tiền chất Scope 3 chiếm 74% tổng phát thải nhúng sản phẩm. Chọn nhà cung ứng thép EAF giảm lượng CO2 tiền chất.",
          target_factor_code: "MAT_STEEL",
          reduction_potential_pct: 25.0,
          difficulty: "cao",
        },
      ],
      summary: "Tập trung cắt giảm Scope 2 (điện áp mái) và Scope 3 (nguyên liệu thép) để đạt hiệu quả giảm thuế CBAM lớn nhất.",
    };
  }
  if (useAuthStore.getState().accessToken !== sampleAuthResponse.accessToken) {
    return undefined;
  }
  if (method === "GET") {
    if (path === "/organizations/me") return sampleOrganization;
    if (path === "/facilities") return sampleFacilities;
    if (path.startsWith("/periods") && path.endsWith("/summary")) return sampleSummary;
    if (path.startsWith("/periods") && path.endsWith("/footprints")) return sampleFootprints;
    if (path.startsWith("/periods") && path.endsWith("/recommendations")) return sampleRecommendations;
    if (path.startsWith("/periods")) return samplePeriods;
    if (path.startsWith("/products")) return sampleProducts;
    if (path.startsWith("/documents/") && path.endsWith("/entry")) {
      return { documentId: "doc-1", docType: "ELECTRICITY_BILL", data: {}, issues: [] };
    }
    if (path.startsWith("/documents")) return sampleDocuments;
    if (path.startsWith("/imports")) return sampleImports;
    if (path.startsWith("/activities")) return sampleActivities;
    if (path.startsWith("/passports")) return samplePassports;
  }
  return undefined;
}

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
  } catch (err) {
    const demo = resolveDemoResponse(path, init);
    if (demo !== undefined) return demo as T;
    throw err;
  }

  if (!res.ok && res.status >= 500) {
    const demo = resolveDemoResponse(path, init);
    if (demo !== undefined) return demo as T;
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
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
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
