import { useQuery } from "@tanstack/react-query";
import { optimizerApi } from "@/api/optimizer";
import { keys } from "@/queries/keys";

// TODO Sprint 6
export function useRecommendations(periodId: string | null) {
  return useQuery({
    queryKey: keys.recommendations(periodId ?? ""),
    queryFn: () => optimizerApi.list(periodId!),
    enabled: !!periodId,
  });
}
