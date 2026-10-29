import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { activitiesApi } from "@/api/activities";
import { ScopeTag } from "@/components/emissions/ScopeTag";
import { TraceabilityPopover } from "@/components/emissions/TraceabilityPopover";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { usePermission } from "@/hooks/usePermission";
import { formatDate, formatNumber } from "@/lib/format";
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">{t("activities.title")}</h1>
        {canEdit && !isLocked && periodId && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            + {t("activities.addManual")}
          </Button>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-left font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Scope</th>
                <th className="px-3 py-2">Quantity</th>
                <th className="px-3 py-2">Emissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(activities.data ?? []).map((act) => (
                <tr key={act.id}>
                  <td className="px-3 py-2">{formatDate(act.activityDate, lang)}</td>
                  <td className="px-3 py-2 font-medium">{act.category}</td>
                  <td className="px-3 py-2">
                    <ScopeTag scope={act.scope} />
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatNumber(act.quantity, lang)} {act.unit}
                  </td>
                  <td className="px-3 py-2">
                    <TraceabilityPopover co2eKg={act.co2eKg} />
                  </td>
                </tr>
              ))}
              {(activities.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    {t("common.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {periodId && (
        <ActivityFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          periodId={periodId}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: keys.activities(periodId, {}) });
          }}
        />
      )}
    </div>
  );
}

export default ActivitiesPage;
