import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Co2eValue } from "@/components/emissions/Co2eValue";
import { Card } from "@/components/ui/Card";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { FootprintDetailDrawer } from "@/pages/products/FootprintDetailDrawer";
import { ProductionOutputTable } from "@/pages/products/ProductionOutputTable";
import { keys } from "@/queries/keys";
import { useFootprints, useProducts } from "@/queries/useProducts";
import type { ProductFootprint } from "@/types/domain";

export function ProductsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { periodId, isLocked } = useCurrentContext();
  const products = useProducts();
  const footprints = useFootprints(periodId);
  const [selected, setSelected] = useState<ProductFootprint | null>(null);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-slate-900">{t("products.title")}</h1>

      {periodId && (
        <ProductionOutputTable
          periodId={periodId}
          products={products.data ?? []}
          disabled={isLocked}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: keys.footprints(periodId) });
          }}
        />
      )}

      <Card title={t("products.footprintTitle")}>
        <div className="divide-y divide-slate-100 text-sm">
          {(footprints.data ?? []).map((fp) => (
            <button
              key={fp.productId}
              type="button"
              onClick={() => setSelected(fp)}
              className="flex w-full items-center justify-between py-2.5 text-left hover:bg-slate-50"
            >
              <span className="font-medium text-slate-900">{fp.productName}</span>
              <Co2eValue kg={fp.totalPerUnit} />
            </button>
          ))}
          {(footprints.data ?? []).length === 0 && (
            <p className="py-4 text-center text-xs text-slate-500">{t("common.empty")}</p>
          )}
        </div>
      </Card>

      <FootprintDetailDrawer footprint={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export default ProductsPage;
