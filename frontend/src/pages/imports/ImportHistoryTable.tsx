import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";
import type { ImportBatch } from "@/types/domain";

export interface ImportHistoryTableProps {
  batches: ImportBatch[];
  onCancelBatch?: (id: string) => void;
  disabled?: boolean;
}

export function ImportHistoryTable({ batches, onCancelBatch, disabled }: ImportHistoryTableProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "vi";

  return (
    <Card title={t("imports.historyTitle")}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-xs">
          <thead className="bg-slate-50 text-left font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Template</th>
              <th className="px-3 py-2">Rows</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {batches.map((b) => (
              <tr key={b.id}>
                <td className="px-3 py-2 font-medium">{b.templateType}</td>
                <td className="px-3 py-2 tabular-nums">
                  {b.validRows}/{b.totalRows}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={b.status === "COMMITTED" ? "success" : "neutral"}>{b.status}</Badge>
                </td>
                <td className="px-3 py-2 text-slate-500">{formatDate(b.createdAt, lang)}</td>
                <td className="px-3 py-2 text-right">
                  {onCancelBatch && b.status === "COMMITTED" && !disabled && (
                    <Button size="sm" variant="ghost" onClick={() => onCancelBatch(b.id)}>
                      {t("common.cancel")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {batches.length === 0 && (
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
  );
}
