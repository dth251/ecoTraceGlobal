import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PRODUCT_UNITS, unitLabel } from "@/lib/units";
import { useCreateProduct } from "@/queries/useProducts";

export interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Thêm sản phẩm (mặt hàng nhà máy sản xuất). Sản phẩm thuộc doanh nghiệp, dùng được cho mọi nhà máy và mọi kỳ;
 * mỗi kỳ chỉ cần nhập sản lượng để phân bổ phát thải và cấp hộ chiếu.
 */
export function AddProductDialog({ open, onOpenChange }: AddProductDialogProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "vi";
  const createProduct = useCreateProduct();
  const [name, setName] = useState("");
  const [cnCode, setCnCode] = useState("");
  const [unit, setUnit] = useState("t");
  const [error, setError] = useState<string | null>(null);

  const massUnit = unit === "t" || unit === "kg";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("validation.required"));
      return;
    }
    setError(null);
    try {
      await createProduct.mutateAsync({ name: name.trim(), cnCode: cnCode.trim() || undefined, unit });
      setName("");
      setCnCode("");
      setUnit("t");
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không tạo được sản phẩm");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Thêm sản phẩm">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label={t("onboarding.productName")}
          value={name}
          placeholder="Ví dụ: Thép cuộn cán nóng"
          error={error ?? undefined}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label={t("onboarding.cnCode")}
          value={cnCode}
          placeholder="Ví dụ: 72081000 (không bắt buộc)"
          onChange={(e) => setCnCode(e.target.value)}
        />
        <Select
          label={t("onboarding.unit")}
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          options={PRODUCT_UNITS.map((u) => ({ value: u, label: unitLabel(u, lang) }))}
        />
        <p className={`text-xs ${massUnit ? "text-slate-500" : "text-warning-dark"}`}>
          {massUnit
            ? "Mã CN bắt đầu bằng 72, 73 (sắt thép) hoặc 76 (nhôm) thì cần có dữ liệu nguyên liệu mua vào (tiền chất) mới cấp được hộ chiếu."
            : "Phát thải được phân bổ theo khối lượng, nên sản phẩm tính theo đơn vị khác tấn/kg sẽ không có dấu chân và không cấp được hộ chiếu."}
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={createProduct.isPending}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
