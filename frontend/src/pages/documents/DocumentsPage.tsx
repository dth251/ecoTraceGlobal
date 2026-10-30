import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "@/api/documents";
import { DocTypeSelect } from "@/components/documents/DocTypeSelect";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { FileDropzone } from "@/components/documents/FileDropzone";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { usePermission } from "@/hooks/usePermission";
import { formatDate } from "@/lib/format";
import { keys } from "@/queries/keys";
import { useDocuments } from "@/queries/useDocuments";
import { AiProcessedDocuments } from "@/pages/documents/AiProcessedDocuments";
import { PeriodActions } from "@/pages/documents/PeriodActions";
import { Badge } from "@/components/ui/Badge";
import type { DocType } from "@/types/domain";

export function DocumentsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "vi";
  const queryClient = useQueryClient();
  const { periodId, isLocked } = useCurrentContext();
  const { canEdit } = usePermission();
  const [docType, setDocType] = useState<DocType>("ELECTRICITY_BILL");
  const docs = useDocuments(periodId);

  const handleFilesAccepted = async (files: File[]) => {
    if (!periodId) return;
    for (const f of files) {
      await documentsApi.upload(periodId, docType, f);
    }
    await queryClient.invalidateQueries({ queryKey: keys.documents(periodId) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">{t("documents.title")}</h1>
      </div>

      <PeriodActions />

      {canEdit && !isLocked && (
        <Card>
          <div className="mb-3 max-w-xs">
            <DocTypeSelect value={docType} onChange={setDocType} />
          </div>
          <FileDropzone onFilesAccepted={handleFilesAccepted} />
        </Card>
      )}

      <AiProcessedDocuments />

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2">{t("documents.docType")}</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(docs.data ?? []).map((doc) => (
                <tr key={doc.id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{doc.fileName}</td>
                  <td className="px-3 py-2 text-slate-600">{t(`documents.types.${doc.docType}`)}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <DocumentStatusBadge status={doc.status} />
                      {doc.aiDraft && doc.status === "PENDING_ENTRY" && <Badge variant="info">Bản nháp AI</Badge>}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{formatDate(doc.uploadedAt, lang)}</td>
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
