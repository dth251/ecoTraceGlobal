import { useState } from "react";
import { useTranslation } from "react-i18next";
import { productsApi } from "@/api/products";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { NumberInput } from "@/components/ui/NumberInput";
import type { Product } from "@/types/domain";

export interface ProductionOutputTableProps {
  periodId: string;
  products: Product[];
  disabled?: boolean;
  onSaved: () => void;
}

export function ProductionOutputTable({
  periodId,
  products,
  disabled = false,
  onSaved,
}: ProductionOutputTableProps) {
  const { t } = useTranslation();
  const [quantities, setQuantities] = useState<Record<string, number | null>>({});

  const handleSave = async () => {
    const items = products
      .map((p) => ({
        productId: p.id,
        quantity: quantities[p.id] ?? 0,
        unit: p.unit,
      }))
      .filter((i) => i.quantity > 0);
    await productsApi.saveProduction(periodId, items);
    onSaved();
  };

  return (
    <Card
      title={t("products.productionTitle")}
      actions={
        !disabled && (
          <Button size="sm" onClick={handleSave}>
            {t("common.save")}
          </Button>
        )
      }
    >
      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-4 border-b border-slate-100 py-2">
            <div>
              <p className="text-sm font-medium text-slate-900">{p.name}</p>
              {p.cnCode && <p className="text-xs text-slate-500">CN: {p.cnCode}</p>}
            </div>
            <div className="flex w-48 items-center gap-2">
              <NumberInput
                disabled={disabled}
                value={quantities[p.id] ?? null}
                onChange={(v) => setQuantities({ ...quantities, [p.id]: v })}
              />
              <span className="text-xs text-slate-600">{p.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
