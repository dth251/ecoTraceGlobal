import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EstimateDocument, EstimateResponse, ExtractionResponse } from "@/api/ai";

/** Một chứng từ trong lô AI đã xử lý: dữ liệu bóc tách và phát thải ước tính của riêng nó. */
export interface BatchRecord {
  id: string;
  fileName: string;
  extraction: ExtractionResponse;
  estimate?: EstimateDocument;
}

export interface AiBatch {
  records: BatchRecord[];
  estimate: EstimateResponse;
  processedAt: string;
}

interface AiBatchState {
  batch: AiBatch | null;
  setBatch: (records: BatchRecord[], estimate: EstimateResponse) => void;
  clear: () => void;
}

/** Lô chứng từ AI xử lý gần nhất, dùng chung cho các trang Chứng từ, Tổng quan, Báo cáo và Tối ưu. */
export const useAiBatchStore = create<AiBatchState>()(
  persist(
    (set) => ({
      batch: null,
      setBatch: (records, estimate) => set({ batch: { records, estimate, processedAt: new Date().toISOString() } }),
      clear: () => set({ batch: null }),
    }),
    { name: "ecotrace-ai-batch" },
  ),
);
