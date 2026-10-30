// Hạng mục hoạt động khớp enum ActivityCategory của backend, kèm loại con có hệ số phát thải
export const ACTIVITY_CATEGORIES: Record<string, { units: string[]; subTypes: string[] }> = {
  ELECTRICITY: { units: ["kWh", "MWh"], subTypes: ["GRID"] },
  STATIONARY_FUEL: { units: ["litre", "m3"], subTypes: ["DIESEL", "LPG"] },
  MOBILE_FUEL: { units: ["litre"], subTypes: ["DIESEL"] },
  PURCHASED_MATERIAL: { units: ["kg", "t"], subTypes: ["STEEL"] },
  UPSTREAM_TRANSPORT: { units: ["tkm"], subTypes: ["ROAD"] },
  DOWNSTREAM_TRANSPORT: { units: ["tkm"], subTypes: ["SEA"] },
};

export const UNITS_BY_CATEGORY: Record<string, string[]> = Object.fromEntries(
  Object.entries(ACTIVITY_CATEGORIES).map(([k, v]) => [k, v.units]),
);

export const PRODUCT_UNITS = ["t", "kg", "pcs", "m2", "m3"] as const;

const LABELS: Record<string, { vi: string; en: string }> = {
  t: { vi: "tấn", en: "tonne" },
  kg: { vi: "kg", en: "kg" },
  pcs: { vi: "chiếc", en: "piece" },
  m2: { vi: "m²", en: "m²" },
  m3: { vi: "m³", en: "m³" },
  litre: { vi: "lít", en: "litre" },
  kWh: { vi: "kWh", en: "kWh" },
  MWh: { vi: "MWh", en: "MWh" },
  tkm: { vi: "tấn·km", en: "tonne·km" },
};

export function unitLabel(unit: string, lang = "vi"): string {
  const entry = LABELS[unit];
  if (!entry) return unit;
  return lang.startsWith("en") ? entry.en : entry.vi;
}
