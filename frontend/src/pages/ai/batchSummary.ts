import type { AiBatch } from "@/stores/aiBatchStore";
import type { EmissionSummary } from "@/types/domain";

const UNKNOWN_MONTH = "Chưa rõ tháng";

const SOURCE_LABELS: Record<string, string> = {
  ELEC_GRID: "Điện lưới",
  FUEL_DIESEL: "Dầu diesel",
  FUEL_PETROL: "Xăng",
  FUEL_LPG: "LPG",
  FUEL_COAL: "Than",
  FUEL_NATGAS: "Khí tự nhiên",
};

export function sourceCategory(code: string): string {
  if (code.startsWith("ELEC")) return "ELECTRICITY";
  if (code.startsWith("FUEL")) return "FUEL";
  if (code.startsWith("FREIGHT")) return "FREIGHT";
  if (code.startsWith("MAT")) return "MATERIAL";
  return "OTHER";
}

export const sourceLabel = (code: string) => SOURCE_LABELS[code] ?? code;

/** Khóa tháng "2025-10" từ ngày lập hóa đơn dạng 2025-10-03 hoặc 03/10/2025; không đọc được thì trả null. */
export function monthKey(date: string | undefined): string | null {
  if (!date) return null;
  const iso = /(\d{4})-(\d{1,2})/.exec(date);
  const vn = /\d{1,2}[/.-](\d{1,2})[/.-](\d{4})/.exec(date);
  const year = iso?.[1] ?? vn?.[2];
  const month = iso?.[2] ?? vn?.[1];
  if (!year || !month || Number(month) < 1 || Number(month) > 12) return null;
  return `${year}-${month.padStart(2, "0")}`;
}

const monthLabel = (key: string) => (key === UNKNOWN_MONTH ? key : `T${key.slice(5)}/${key.slice(2, 4)}`);

/** Chuyển lô AI sang cùng dạng `EmissionSummary` mà backend sẽ trả, để Tổng quan dùng chung các widget. */
export function batchToSummary(batch: AiBatch): EmissionSummary {
  const { estimate, records } = batch;
  const months = new Map<string, { scope1: number; scope2: number; scope3: number }>();
  for (const r of records) {
    const scope = r.estimate?.scope;
    const kg = r.estimate?.co2e_kg;
    if (!scope || kg == null) continue;
    const key = monthKey(r.extraction.invoice_date) ?? UNKNOWN_MONTH;
    const row = months.get(key) ?? { scope1: 0, scope2: 0, scope3: 0 };
    row[`scope${scope}` as "scope1" | "scope2" | "scope3"] += kg;
    months.set(key, row);
  }

  return {
    periodId: "ai-batch",
    totalKg: estimate.total_co2e_kg,
    previousTotalKg: null,
    calculatedAt: batch.processedAt,
    byScope: { scope1: estimate.by_scope["1"] ?? 0, scope2: estimate.by_scope["2"] ?? 0, scope3: estimate.by_scope["3"] ?? 0 },
    byMonth: [...months.entries()]
      .sort(([a], [b]) => (a === UNKNOWN_MONTH ? 1 : b === UNKNOWN_MONTH ? -1 : a.localeCompare(b)))
      .map(([key, v]) => ({ month: monthLabel(key), ...v })),
    topSources: Object.entries(estimate.by_factor)
      .sort(([, a], [, b]) => b - a)
      .map(([code, co2eKg]) => ({ category: sourceCategory(code), label: sourceLabel(code), co2eKg })),
  };
}

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Bảng tổng hợp lô AI dạng CSV (UTF-8 có BOM để Excel đọc đúng tiếng Việt). */
export function batchToCsv(batch: AiBatch): string {
  const header = ["Tệp", "Nhà cung cấp", "Số hóa đơn", "Ngày lập", "Scope", "Mã hệ số", "Phát thải (kgCO2e)", "Công thức", "Cần xem lại"];
  const rows = batch.records.map((r) => [
    r.fileName,
    r.extraction.supplier_name,
    r.extraction.invoice_no,
    r.extraction.invoice_date,
    r.estimate?.scope ?? "",
    r.estimate?.factor_code ?? "",
    r.estimate?.co2e_kg ?? "",
    r.estimate?.formula ?? "",
    r.estimate?.needs_review ? "có" : "",
  ]);
  const { by_scope, total_co2e_kg } = batch.estimate;
  const foot = [
    [],
    ["Tổng Scope 1", "", "", "", "", "", by_scope["1"] ?? 0],
    ["Tổng Scope 2", "", "", "", "", "", by_scope["2"] ?? 0],
    ["Tổng Scope 3", "", "", "", "", "", by_scope["3"] ?? 0],
    ["Tổng cộng", "", "", "", "", "", total_co2e_kg],
    [],
    [batch.estimate.disclaimer],
  ];
  return "﻿" + [header, ...rows, ...foot].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function downloadText(content: string, filename: string, mime = "text/csv;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
