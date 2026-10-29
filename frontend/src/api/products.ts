import { api, json } from "@/api/client";
import type { CreateProductRequest, Product, ProductFootprint } from "@/types/domain";

export interface ProductionInput {
  productId: string;
  quantity: number;
  unit: string;
}

export const productsApi = {
  list: () => api<Product[]>("/products"),
  create: (body: CreateProductRequest) => api<Product>("/products", { method: "POST", ...json(body) }),
  // TODO Sprint 4: sản lượng và phát thải sản phẩm
  saveProduction: (periodId: string, items: ProductionInput[]) =>
    api<void>(`/periods/${periodId}/production`, { method: "POST", ...json(items) }),
  footprints: (periodId: string) => api<ProductFootprint[]>(`/periods/${periodId}/footprints`),
};
