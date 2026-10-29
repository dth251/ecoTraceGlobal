import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "@/api/documents";
import { keys } from "@/queries/keys";

// TODO Sprint 2: polling khi có chứng từ đang xử lý
export function useDocuments(periodId: string | null) {
  return useQuery({
    queryKey: keys.documents(periodId ?? ""),
    queryFn: () => documentsApi.list(periodId!),
    enabled: !!periodId,
  });
}
