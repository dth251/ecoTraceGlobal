import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, authHeaders, BASE } from "@/api/client";
import { documentsApi } from "@/api/documents";
import { entriesApi } from "@/api/entries";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { DocumentViewer } from "@/pages/documents/entry/DocumentViewer";
import { EntryForm } from "@/pages/documents/entry/EntryForm";
import { keys } from "@/queries/keys";
import { useDocumentEntry } from "@/queries/useDocumentEntry";
import type { ValidationIssue } from "@/types/domain";

/** Lấy URL hiển thị file: URL ký tạm của S3, hoặc tải qua API có token rồi tạo object URL */
function useDocumentFile(id: string | undefined) {
  const [file, setFile] = useState<{ url: string; contentType: string } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!id) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const info = await documentsApi.fileUrl(id);
        if (info.url) {
          if (!cancelled) setFile({ url: info.url, contentType: info.contentType });
          return;
        }
        const res = await fetch(BASE + info.contentPath, { headers: authHeaders() });
        if (!res.ok) throw new Error(res.statusText);
        objectUrl = URL.createObjectURL(await res.blob());
        if (!cancelled) setFile({ url: objectUrl, contentType: info.contentType });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  return { file, failed };
}

function issuesFrom(err: unknown): ValidationIssue[] | null {
  if (err instanceof ApiError && err.details && typeof err.details === "object" && "issues" in err.details) {
    return (err.details as { issues: ValidationIssue[] }).issues;
  }
  return null;
}

export function DocumentEntryPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { periodId, isLocked } = useCurrentContext();
  const entryQuery = useDocumentEntry(id);
  const { file, failed } = useDocumentFile(id);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [saving, setSaving] = useState(false);

  const entry = entryQuery.data;

  const handleSave = async (data: Record<string, unknown>, acknowledgeWarnings: boolean) => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await entriesApi.save(id, data, acknowledgeWarnings);
      setIssues(res.issues ?? []);
      toast.success(t("entry.saved"));
      void queryClient.invalidateQueries({ queryKey: keys.entry(id) });
      if (periodId) {
        void queryClient.invalidateQueries({ queryKey: keys.summary(periodId) });
        void queryClient.invalidateQueries({ queryKey: ["documents"] });
        void queryClient.invalidateQueries({ queryKey: ["activities"] });
      }
    } catch (err) {
      const found = issuesFrom(err);
      if (found) {
        setIssues(found);
        toast.error(t("entry.fixErrors"));
      } else {
        toast.error(err instanceof ApiError ? err.message : t("errors.UNKNOWN"));
      }
    } finally {
      setSaving(false);
    }
  };

  if (entryQuery.isError) return <ErrorState onRetry={() => void entryQuery.refetch()} />;

  return (
    <div className="flex min-h-[calc(100vh-9rem)] flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-4">
          <Link to="/documents" className="text-sm font-semibold text-brand-700 hover:underline">
            {t("common.back")}
          </Link>
          <h1 className="text-xl font-bold text-ink">{entry?.fileName ?? t("entry.title")}</h1>
        </div>
        {entry && <span className="text-sm text-slate-600">{t(`documents.types.${entry.docType}`, entry.docType)}</span>}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        {failed ? (
          <div className="card-surface flex items-center justify-center p-8 text-sm text-slate-600">{t("entry.noFile")}</div>
        ) : (
          <DocumentViewer fileUrl={file?.url} contentType={file?.contentType} fileName={entry?.fileName} />
        )}
        {entry ? (
          <EntryForm
            key={entry.documentId}
            docType={entry.docType}
            initialData={entry.data}
            issues={issues}
            disabled={isLocked || saving}
            onSave={(data, ack) => void handleSave(data, ack)}
          />
        ) : (
          <Skeleton className="h-96 rounded-3xl" />
        )}
      </div>
    </div>
  );
}

export default DocumentEntryPage;
