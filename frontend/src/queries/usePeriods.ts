import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { periodsApi } from "@/api/periods";
import { keys } from "@/queries/keys";
import type { CreatePeriodRequest } from "@/types/domain";

export function usePeriods(facilityId: string | null) {
  return useQuery({
    queryKey: keys.periods(facilityId),
    queryFn: () => periodsApi.list(facilityId),
    enabled: !!facilityId,
  });
}

export function useCreatePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePeriodRequest) => periodsApi.create(body),
    onSuccess: (p) => qc.invalidateQueries({ queryKey: keys.periods(p.facilityId) }),
  });
}

/** Khóa / mở kỳ: làm mới toàn bộ query của kỳ + danh sách kỳ */
export function useTogglePeriodLock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lock }: { id: string; lock: boolean }) =>
      lock ? periodsApi.lock(id) : periodsApi.unlock(id),
    onSuccess: () => qc.invalidateQueries(),
  });
}
