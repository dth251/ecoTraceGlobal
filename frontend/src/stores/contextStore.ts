import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ContextState {
  facilityId: string | null;
  periodId: string | null;
  setFacility: (id: string) => void;
  setPeriod: (id: string) => void;
  reset: () => void;
}

// Nhà máy và kỳ báo cáo đang chọn (đồng bộ với URL ?facility=&period=)
export const useContextStore = create<ContextState>()(
  persist(
    (set) => ({
      facilityId: null,
      periodId: null,
      setFacility: (facilityId) => set({ facilityId, periodId: null }),
      setPeriod: (periodId) => set({ periodId }),
      reset: () => set({ facilityId: null, periodId: null }),
    }),
    { name: "ecotrace-context" },
  ),
);
