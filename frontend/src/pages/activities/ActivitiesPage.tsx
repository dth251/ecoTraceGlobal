import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { activitiesApi } from "@/api/activities";
import { Co2eValue } from "@/components/emissions/Co2eValue";
import { ScopeTag } from "@/components/emissions/ScopeTag";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { usePermission } from "@/hooks/usePermission";
import { formatDate, formatNumber } from "@/lib/format";
import { unitLabel } from "@/lib/units";
import { ActivityFormDialog } from "@/pages/activities/ActivityFormDialog";
import { keys } from "@/queries/keys";

export function ActivitiesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "vi";
  const queryClient = useQueryClient();
  const { periodId, isLocked } = useCurrentContext();
  const { canEdit } = usePermission();
  const [dialogOpen, setDialogOpen] = useState(false);

  const activities = useQuery({
    queryKey: keys.activities(periodId ?? "", {}),
    queryFn: () => activitiesApi.list(periodId!),
    enabled: !!periodId,
  });
  const rows = activities.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-ink">{t("activities.title")}</h1>
        {canEdit && !isLocked && periodId && <Button onClick={() => setDialogOpen(true)}>{t("activities.addManual")}</Button>}
      </div>

      <Card className="p-0">
        {activities.isError ? (
          <ErrorState onRetry={() => void activities.refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-5 py-3">{t("activities.date")}</th>
                  <th className="px-5 py-3">{t("activities.category")}</th>
                  <th className="px-5 py-3">{t("activities.scope")}</th>
                  <th className="px-5 py-3 text-right">{t("activities.quantity")}</th>
                  <th className="px-5 py-3 text-right">{t("activities.emissions")}</th>
                  <th className="px-5 py-3">{t("activities.source")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((act) => (
                  <tr key={act.id} className="odd:bg-surface/60">
                    <td className="px-5 py-3 whitespace-nowrap">{formatDate(act.activityDate, lang)}</td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-ink">{t(`activities.categories.${act.category}`)}</span>
                      {act.subType && (
                        <span className="text-slate-600"> · {t(`activities.subTypes.${act.subType}`, act.subType)}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <ScopeTag scope={act.scope} />
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums whitespace-nowrap">
                      {formatNumber(act.quantity, lang)} {unitLabel(act.unit, lang)}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <Co2eValue kg={act.co2eKg} />
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {act.entryMethod ? t(`activities.entryMethods.${act.entryMethod}`) : ""}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !activities.isLoading && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-600">
                      {t("common.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {periodId && (
        <ActivityFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          periodId={periodId}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: keys.activities(periodId, {}) });
            void queryClient.invalidateQueries({ queryKey: keys.summary(periodId) });
          }}
        />
      )}
    </div>
  );
}

export default ActivitiesPage;
