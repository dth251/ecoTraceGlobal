const locale = (lang: string) => (lang.startsWith("en") ? "en-US" : "vi-VN");

/** Định dạng số theo ngôn ngữ, tối đa `digits` chữ số thập phân */
export function formatNumber(value: number, lang = "vi", digits = 2): string {
  return new Intl.NumberFormat(locale(lang), { maximumFractionDigits: digits }).format(value);
}

/** Dưới 1 tấn hiển thị kgCO₂e, từ 1 tấn trở lên hiển thị tCO₂e */
export function formatCo2e(kg: number, lang = "vi"): string {
  if (Math.abs(kg) < 1000) return `${formatNumber(kg, lang, 1)} kgCO₂e`;
  return `${formatNumber(kg / 1000, lang, 1)} tCO₂e`;
}

/** Tỷ lệ 0..1 → phần trăm */
export function formatPercent(ratio: number, lang = "vi", digits = 1): string {
  return new Intl.NumberFormat(locale(lang), { style: "percent", maximumFractionDigits: digits }).format(ratio);
}

/** Ngày ISO → dd/MM/yyyy (vi) hoặc d MMM yyyy (en) */
export function formatDate(iso: string | null | undefined, lang = "vi"): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (lang.startsWith("en")) {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/**
 * Đọc số nhập tay theo cả kiểu vi (120.000,5) và en (120,000.5).
 * Dấu phân cách xuất hiện sau cùng được coi là dấu thập phân.
 */
export function parseLocaleNumber(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let normalized: string;
  if (lastComma > lastDot) {
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma && lastComma !== -1) {
    normalized = s.replace(/,/g, "");
  } else if (lastDot !== -1 && (s.match(/\./g) ?? []).length > 1) {
    normalized = s.replace(/\./g, "");
  } else {
    normalized = s;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
