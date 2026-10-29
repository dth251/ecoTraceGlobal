import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/api/products";
import { keys } from "@/queries/keys";
import type { CreateProductRequest } from "@/types/domain";

export function useProducts() {
  return useQuery({ queryKey: keys.products(), queryFn: productsApi.list });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProductRequest) => productsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.products() }),
  });
}

// TODO Sprint 4
export function useFootprints(periodId: string | null) {
  return useQuery({
    queryKey: keys.footprints(periodId ?? ""),
    queryFn: () => productsApi.footprints(periodId!),
    enabled: !!periodId,
  });
}
