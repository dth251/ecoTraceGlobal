// BẢN DỰNG LẠI TẠM THỜI (không phải bản gốc của tác giả frontend).
// Thư mục src/lib/ từng bị .gitignore ("lib/") loại khỏi repo nên CI không build được. Dựng lại từ cách các trang dùng
// và src/test/format.test.ts để CI chạy được. Tác giả frontend: hãy thay bằng bản gốc của bạn.
type Lang = "vi" | "en" | string;

const loc = (lang?: Lang) => (lang === "en" ? "en-US" : "vi-VN");

export function formatNumber(value: number, lang: Lang = "vi", digits = 2): string {
  return new Intl.NumberFormat(loc(lang), { maximumFractionDigits: digits }).format(value);
}

export function formatCo2e(kg: number, lang: Lang = "vi"): string {
  if (Math.abs(kg) >= 1000) return `${formatNumber(kg / 1000, lang, 1)} tCO₂e`;
  return `${formatNumber(kg, lang)} kgCO₂e`;
}

export function formatPercent(share: number, lang: Lang = "vi"): string {
  return `${formatNumber((share ?? 0) * 100, lang, 1)}%`;
}

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso: string | null | undefined, lang: Lang = "vi"): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return lang === "en" ? `${Number(d)} ${MONTHS_EN[Number(mo) - 1]} ${y}` : `${d}/${mo}/${y}`;
}

export function parseLocaleNumber(text: string): number | null {
  const s = (text ?? "").trim();
  if (!s) return null;
  let norm = s;
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    const decimalIsComma = s.lastIndexOf(",") > s.lastIndexOf(".");
    norm = decimalIsComma ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (hasComma) {
    norm = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (hasDot) {
    norm = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s;
  }
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}
