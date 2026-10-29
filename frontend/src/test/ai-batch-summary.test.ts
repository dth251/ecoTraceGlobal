import { describe, expect, it } from "vitest";
import type { EstimateResponse } from "@/api/ai";
import { batchToCsv, batchToSummary, monthKey, sourceCategory } from "@/pages/ai/batchSummary";
import type { AiBatch, BatchRecord } from "@/stores/aiBatchStore";

const record = (id: string, date: string, scope: number, kg: number, code: string): BatchRecord => ({
  id,
  fileName: `${id}.png`,
  extraction: { doc_type: "x", supplier_name: "Công ty A, B", invoice_no: "1", invoice_date: date, total_amount: 0, currency: "VND", lines: [], overall_confidence: 0.9 },
  estimate: {
    name: id, activity_type: "x", scope, factor_code: code, co2e_kg: kg, status: "CALCULATED", formula: null, note: null,
    factor_value: null, factor_unit: null, factor_source: null, distance_km_used: null, needs_review: false, review_fields: [],
  },
});

const estimate: EstimateResponse = {
  total_co2e_kg: 300,
  by_scope: { "1": 100, "2": 200 },
  by_factor: { FUEL_DIESEL: 100, ELEC_GRID: 200 },
  documents: [],
  calculated: 3,
  optimization: { mock: true, total_co2e_kg: 300, summary: "", suggestions: [] },
  disclaimer: "Ước tính, tham khảo",
};

const batch: AiBatch = {
  processedAt: "2026-10-30T00:00:00Z",
  estimate,
  records: [
    record("a", "2025-10-03", 2, 120, "ELEC_GRID"),
    record("b", "15/10/2025", 2, 80, "ELEC_GRID"),
    record("c", "", 1, 100, "FUEL_DIESEL"),
  ],
};

describe("batchSummary", () => {
  it("đọc tháng từ cả hai dạng ngày, bỏ qua ngày không hợp lệ", () => {
    expect(monthKey("2025-10-03")).toBe("2025-10");
    expect(monthKey("03/10/2025")).toBe("2025-10");
    expect(monthKey("32/13/2025")).toBeNull();
    expect(monthKey("")).toBeNull();
  });

  it("phân loại nguồn theo mã hệ số", () => {
    expect(sourceCategory("FREIGHT_SEA")).toBe("FREIGHT");
    expect(sourceCategory("MAT_STEEL")).toBe("MATERIAL");
  });

  it("chuyển lô AI sang tổng hợp theo Scope, theo tháng, theo nguồn", () => {
    const s = batchToSummary(batch);
    expect(s.totalKg).toBe(300);
    expect(s.byScope).toEqual({ scope1: 100, scope2: 200, scope3: 0 });
    expect(s.byMonth).toEqual([
      { month: "T10/25", scope1: 0, scope2: 200, scope3: 0 },
      { month: "Chưa rõ tháng", scope1: 100, scope2: 0, scope3: 0 },
    ]);
    expect(s.topSources[0]).toMatchObject({ category: "ELECTRICITY", co2eKg: 200 });
  });

  it("xuất CSV có BOM, bao dấu phẩy trong ô và dòng tổng", () => {
    const csv = batchToCsv(batch);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"Công ty A, B"');
    expect(csv).toContain("Tổng cộng,,,,,,300");
  });
});
