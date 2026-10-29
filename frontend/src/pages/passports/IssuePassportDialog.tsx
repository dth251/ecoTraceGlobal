import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { passportsApi } from "@/api/passports";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { PassportReadinessView } from "@/pages/passports/PassportReadinessView";
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
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "vi";
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [issueError, setIssueError] = useState<string | null>(null);
  const targetId = productId || products[0]?.id;

  // Xét điều kiện cấp ngay khi mở hộp thoại; chỉ cho cấp khi đủ điều kiện
  const readiness = useQuery({
    queryKey: ["passport-readiness", periodId, targetId, lang],
    queryFn: () => passportsApi.readiness(periodId, targetId!, lang),
    enabled: open && !!targetId,
    retry: false,
    staleTime: 0,
  });

  const handleIssue = async () => {
    if (!targetId) return;
    setIssueError(null);
    try {
      await passportsApi.issue(periodId, targetId);
      onIssued();
      onOpenChange(false);
    } catch (err: unknown) {
      setIssueError(err instanceof Error ? err.message : "Không cấp được hộ chiếu");
    }
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

        {readiness.isLoading && <p className="text-xs text-slate-500">{lang === "en" ? "Checking requirements…" : "Đang xét điều kiện cấp…"}</p>}
        {readiness.isError && (
          <p className="rounded-md bg-danger-light p-2 text-xs text-danger-dark">
            {lang === "en" ? "Cannot check requirements: " : "Không xét được điều kiện cấp: "}
            {readiness.error instanceof Error ? readiness.error.message : ""}
          </p>
        )}
        {readiness.data && <PassportReadinessView result={readiness.data} lang={lang} />}
        {issueError && <p className="rounded-md bg-danger-light p-2 text-xs text-danger-dark">{issueError}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleIssue} disabled={!readiness.data?.can_issue}>
            {t("common.confirm")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
