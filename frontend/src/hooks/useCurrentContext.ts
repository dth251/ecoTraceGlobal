import { useFacilities } from "@/queries/useFacilities";
import { usePeriods } from "@/queries/usePeriods";
import { useContextStore } from "@/stores/contextStore";

/** Lấy facilityId, periodId đang chọn và đối tượng tương ứng */
export function useCurrentContext() {
  const facilityId = useContextStore((s) => s.facilityId);
  const periodId = useContextStore((s) => s.periodId);
  const facilities = useFacilities();
  const periods = usePeriods(facilityId);

  const facility = facilities.data?.find((f) => f.id === facilityId) ?? null;
  const period = periods.data?.find((p) => p.id === periodId) ?? null;

  return {
    facilityId,
    periodId,
    facility,
    period,
    isLocked: period?.status === "LOCKED",
    isLoading: facilities.isLoading || periods.isLoading,
  };
}
