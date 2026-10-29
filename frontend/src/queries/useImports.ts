import { useQuery } from "@tanstack/react-query";
import { importsApi } from "@/api/imports";
import { keys } from "@/queries/keys";

// TODO Sprint 3
export function useImports(periodId: string | null) {
  return useQuery({
    queryKey: keys.imports(periodId ?? ""),
    queryFn: () => importsApi.list(periodId!),
    enabled: !!periodId,
  });
}
