// Màu dữ liệu đã kiểm định bằng validate_palette.js (skill dataviz) — khớp token scope1/2/3 trong tailwind.config.js
// Scope 1/2/3: đạt CVD ΔE ≥ 24 trên nền sáng; vàng < 3:1 nên luôn đi kèm nhãn số hiển thị
export const SCOPE_COLORS = { scope1: "#eb6834", scope2: "#2a78d6", scope3: "#eda100" } as const;

export type ScopeKey = keyof typeof SCOPE_COLORS;

export const scopeKey = (scope: number): ScopeKey => (`scope${scope}` as ScopeKey);

// Nguồn gốc số liệu là thang có thứ bậc (bằng chứng mạnh → yếu): một sắc độ xanh, đậm → sáng
export const EVIDENCE_COLORS = { DOCUMENT: "#054f31", IMPORT: "#027a48", MANUAL: "#12b76a" } as const;

// Ký tự văn bản trên biểu đồ dùng màu chữ, không dùng màu chuỗi dữ liệu
export const CHART_INK = { primary: "#0e1013", secondary: "#475569", grid: "#eef0f3", surface: "#ffffff" } as const;
