import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PRODUCT_UNITS, unitLabel } from "@/lib/units";
import { useCreateProduct } from "@/queries/useProducts";

export interface ProductStepProps {
  onBack: () => void;
  onCompleted: () => void;
}

interface ProductDraft {
  name: string;
  cnCode: string;
  unit: string;
}

export function ProductStep({ onBack, onCompleted }: ProductStepProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "vi";
  const createProduct = useCreateProduct();
  const [rows, setRows] = useState<ProductDraft[]>([{ name: "", cnCode: "", unit: "t" }]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = rows.filter((r) => r.name.trim().length > 0);
    if (valid.length === 0) {
      setError(t("validation.required"));
      return;
    }
    setError(null);
    for (const item of valid) {
      await createProduct.mutateAsync({
        name: item.name.trim(),
        cnCode: item.cnCode.trim() || undefined,
        unit: item.unit,
      });
    }
    onCompleted();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Input
            label={t("onboarding.productName")}
            value={row.name}
            error={idx === 0 && error ? error : undefined}
            onChange={(e) => {
              const next = [...rows];
              next[idx] = { ...row, name: e.target.value };
              setRows(next);
            }}
          />
          <Input
            label={t("onboarding.cnCode")}
            value={row.cnCode}
            onChange={(e) => {
              const next = [...rows];
              next[idx] = { ...row, cnCode: e.target.value };
              setRows(next);
            }}
          />
          <Select
            label={t("onboarding.unit")}
            value={row.unit}
            onChange={(e) => {
              const next = [...rows];
              next[idx] = { ...row, unit: e.target.value };
              setRows(next);
            }}
            options={PRODUCT_UNITS.map((u) => ({ value: u, label: unitLabel(u, lang) }))}
          />
        </div>
      ))}

      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setRows([...rows, { name: "", cnCode: "", unit: "t" }])}
        >
          + {t("onboarding.addProduct")}
        </Button>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="secondary" onClick={onBack}>
          {t("common.back")}
        </Button>
        <Button type="submit" loading={createProduct.isPending}>
          {t("common.next")}
        </Button>
      </div>
    </form>
  );
}
