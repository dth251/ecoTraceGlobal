import { useState } from "react";
import { useTranslation } from "react-i18next";
import { passportsApi } from "@/api/passports";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import type { Product } from "@/types/domain";

export interface IssuePassportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodId: string;
  products: Product[];
  onIssued: () => void;
}

export function IssuePassportDialog({
  open,
  onOpenChange,
  periodId,
  products,
  onIssued,
}: IssuePassportDialogProps) {
  const { t } = useTranslation();
  const [productId, setProductId] = useState(products[0]?.id ?? "");

  const handleIssue = async () => {
    const targetId = productId || products[0]?.id;
    if (!targetId) return;
    await passportsApi.issue(periodId, targetId);
    onIssued();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("passports.issueNew")}>
      <div className="space-y-4">
        <Select
          label={t("onboarding.productName")}
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          options={products.map((p) => ({ value: p.id, label: p.name }))}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleIssue}>{t("common.confirm")}</Button>
        </div>
      </div>
    </Dialog>
  );
}
