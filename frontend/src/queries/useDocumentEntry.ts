import { useQuery } from "@tanstack/react-query";
import { entriesApi } from "@/api/entries";
import { keys } from "@/queries/keys";

// TODO Sprint 3: mutation lưu / validate / reject + invalidate theo mục 20.5
export function useDocumentEntry(docId: string | undefined) {
  return useQuery({
    queryKey: keys.entry(docId ?? ""),
    queryFn: () => entriesApi.get(docId!),
    enabled: !!docId,
  });
}
