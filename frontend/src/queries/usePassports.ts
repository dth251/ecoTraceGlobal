import { useQuery } from "@tanstack/react-query";
import { passportsApi } from "@/api/passports";
import { keys } from "@/queries/keys";

// TODO Sprint 5
export function usePassports(periodId: string | null) {
  return useQuery({
    queryKey: keys.passports(periodId ?? ""),
    queryFn: () => passportsApi.list(periodId!),
    enabled: !!periodId,
  });
}

export function usePublicVerification(code: string | undefined) {
  return useQuery({
    queryKey: keys.verify(code ?? ""),
    queryFn: () => passportsApi.verify(code!),
    enabled: !!code,
    retry: false,
  });
}
