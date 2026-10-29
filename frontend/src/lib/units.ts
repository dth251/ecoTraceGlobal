// BẢN DỰNG LẠI TẠM THỜI (không phải bản gốc của tác giả frontend).
// Thư mục src/lib/ từng bị .gitignore ("lib/") loại khỏi repo nên CI không build được. Dựng lại từ cách các trang dùng
// và src/test/format.test.ts để CI chạy được. Tác giả frontend: hãy thay bằng bản gốc của bạn.
export const UNITS_BY_CATEGORY: Record<string, string[]> = {
  ELECTRICITY: ["kWh", "MWh"],
  STATIONARY_FUEL: ["litre", "kg", "m3"],
  MOBILE_FUEL: ["litre"],
  PROCESS: ["kg", "t"],
  PURCHASED_MATERIAL: ["kg", "t"],
  UPSTREAM_TRANSPORT: ["tkm"],
  DOWNSTREAM_TRANSPORT: ["tkm"],
  WASTE: ["kg", "t"],
};

export const PRODUCT_UNITS = ["t", "kg", "piece", "m", "m2"];

const LABELS: Record<string, { vi: string; en: string }> = {
  t: { vi: "tấn", en: "tonne" },
  kg: { vi: "kg", en: "kg" },
  piece: { vi: "cái", en: "piece" },
  m: { vi: "mét", en: "metre" },
  m2: { vi: "m²", en: "m²" },
};

export function unitLabel(unit: string, lang: string = "vi"): string {
  const l = LABELS[unit];
  return l ? (lang === "en" ? l.en : l.vi) : unit;
}
