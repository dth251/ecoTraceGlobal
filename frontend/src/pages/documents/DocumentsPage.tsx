import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { usePermission } from "@/hooks/usePermission";
import { formatDate } from "@/lib/format";
import { useDocuments } from "@/queries/useDocuments";
import { BatchExtractPanel } from "@/pages/ai/BatchExtractPanel";
import { AiProcessedDocuments } from "@/pages/documents/AiProcessedDocuments";
import { PeriodActions } from "@/pages/documents/PeriodActions";
import { Badge } from "@/components/ui/Badge";

export function DocumentsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "vi";
  const { periodId, isLocked } = useCurrentContext();
  const { canEdit } = usePermission();
  const docs = useDocuments(periodId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">{t("documents.title")}</h1>
      </div>

      <PeriodActions />

      {canEdit && !isLocked && <BatchExtractPanel />}

      <AiProcessedDocuments />

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-2">{t("documents.fileName")}</th>
                <th className="px-3 py-2">{t("documents.docType")}</th>
                <th className="px-3 py-2">{t("documents.statusColumn")}</th>
                <th className="px-3 py-2">{t("documents.uploadedAt")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(docs.data ?? []).map((doc) => (
                <tr key={doc.id}>
                  <td className="max-w-[16rem] truncate px-3 py-2 font-medium text-slate-900" title={doc.fileName}>
                    {doc.fileName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{t(`documents.types.${doc.docType}`)}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <DocumentStatusBadge status={doc.status} />
                      {doc.aiDraft && doc.status === "PENDING_ENTRY" && <Badge variant="info">Bản nháp AI</Badge>}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-500">{formatDate(doc.uploadedAt, lang)}</td>
                  <td className="px-3 py-2 text-right">
                    <Link to={`/documents/${doc.id}/entry`}>
                      <Button size="sm" variant={doc.status === "PENDING_ENTRY" ? "primary" : "secondary"}>
                        {doc.status === "PENDING_ENTRY" ? "Xác nhận" : t("common.edit")}
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {(docs.data ?? []).length === 0 && (
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
    </div>
  );
}

export default DocumentsPage;
