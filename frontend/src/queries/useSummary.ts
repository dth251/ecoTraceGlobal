import { useQuery } from "@tanstack/react-query";
import { emissionsApi } from "@/api/emissions";
import { keys } from "@/queries/keys";

// TODO Sprint 4: staleTime 30 giây cho dữ liệu tổng hợp
export function useSummary(periodId: string | null) {
  return useQuery({
    queryKey: keys.summary(periodId ?? ""),
    queryFn: () => emissionsApi.summary(periodId!),
    enabled: !!periodId,
    staleTime: 30_000,
  });
}
