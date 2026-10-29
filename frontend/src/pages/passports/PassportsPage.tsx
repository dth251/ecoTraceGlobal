import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { passportsApi } from "@/api/passports";
import { Co2eValue } from "@/components/emissions/Co2eValue";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { usePermission } from "@/hooks/usePermission";
import { IssuePassportDialog } from "@/pages/passports/IssuePassportDialog";
import { PassportDetailDrawer } from "@/pages/passports/PassportDetailDrawer";
import { keys } from "@/queries/keys";
import { usePassports } from "@/queries/usePassports";
import { useProducts } from "@/queries/useProducts";
import type { Passport } from "@/types/domain";

export function PassportsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { periodId } = useCurrentContext();
  const { isOwner } = usePermission();
  const passports = usePassports(periodId);
  const products = useProducts();
  const [issueOpen, setIssueOpen] = useState(false);
  const [selected, setSelected] = useState<Passport | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">{t("passports.title")}</h1>
        {isOwner && periodId && (
          <Button size="sm" onClick={() => setIssueOpen(true)}>
            + {t("passports.issueNew")}
          </Button>
        )}
      </div>

      <Card>
        <div className="divide-y divide-slate-100 text-sm">
          {(passports.data ?? []).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p)}
              className="flex w-full items-center justify-between py-2.5 text-left hover:bg-slate-50"
            >
              <div>
                <p className="font-mono font-semibold text-slate-900">{p.publicCode}</p>
                <p className="text-xs text-slate-500">{p.productName}</p>
              </div>
              <div className="flex items-center gap-3">
                <Co2eValue kg={p.totalPerUnit} />
                <Badge variant={p.status === "VALID" ? "success" : "danger"}>{p.status}</Badge>
              </div>
            </button>
          ))}
          {(passports.data ?? []).length === 0 && (
            <p className="py-6 text-center text-xs text-slate-500">{t("common.empty")}</p>
          )}
        </div>
      </Card>

      {periodId && (
        <IssuePassportDialog
          open={issueOpen}
          onOpenChange={setIssueOpen}
          periodId={periodId}
          products={products.data ?? []}
          onIssued={() => {
            void queryClient.invalidateQueries({ queryKey: keys.passports(periodId) });
          }}
        />
      )}

      <PassportDetailDrawer
        passport={selected}
        onClose={() => setSelected(null)}
        onRevoke={
          isOwner
            ? async (id) => {
                await passportsApi.revoke(id, "Revoked by owner");
                setSelected(null);
                if (periodId) {
                  await queryClient.invalidateQueries({ queryKey: keys.passports(periodId) });
                }
              }
            : undefined
        }
      />
    </div>
  );
}

export default PassportsPage;
