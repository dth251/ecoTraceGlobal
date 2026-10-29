import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { documentsApi } from "@/api/documents";
import { Badge } from "@/components/ui/Badge";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { DocumentViewer } from "@/pages/documents/entry/DocumentViewer";
import { EntryForm } from "@/pages/documents/entry/EntryForm";
import { EntryToolbar } from "@/pages/documents/entry/EntryToolbar";
import { keys } from "@/queries/keys";
import { useDocumentEntry } from "@/queries/useDocumentEntry";
import type { DocType, ValidationIssue } from "@/types/domain";

/**
 * Nhập liệu / xác nhận một chứng từ. Nếu AI đã bóc tách, form được điền sẵn từ bản nháp kèm cảnh báo cho trường
 * AI chưa chắc; số liệu chỉ vào kiểm kê khi người dùng đối chiếu với file gốc và bấm lưu.
 */
export function DocumentEntryPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { periodId, isLocked } = useCurrentContext();
  const entryQuery = useDocumentEntry(id);
  const fileQuery = useQuery({
    queryKey: ["document-file", id],
    queryFn: () => documentsApi.fileUrl(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
  const [docType, setDocType] = useState<DocType | null>(null);
  const [saveIssues, setSaveIssues] = useState<ValidationIssue[] | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const entry = entryQuery.data;
  const activeDocType = docType ?? entry?.docType ?? "ELECTRICITY_BILL";
  const issues = saveIssues ?? entry?.issues ?? [];

  const handleSave = async (data: Record<string, unknown>, ack: boolean) => {
    if (!id) return;
    setSaveError(null);
    try {
      await documentsApi.saveEntry(id, { ...data }, ack, activeDocType);
      if (periodId) await queryClient.invalidateQueries({ queryKey: keys.documents(periodId) });
      await queryClient.invalidateQueries({ queryKey: keys.entry(id) });
      navigate("/documents");
    } catch (err: unknown) {
      if (err instanceof ApiError && Array.isArray(err.details)) {
        setSaveIssues(err.details as ValidationIssue[]);
      } else {
        setSaveError(err instanceof Error ? err.message : "Không lưu được");
      }
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Link to="/documents" className="text-xs font-semibold text-brand hover:underline">
          ← Chứng từ
        </Link>
        <div className="flex items-center gap-2">
          {entry?.aiDraft && entry.status !== "ENTERED" && (
            <Badge variant="info">Bản nháp AI · cần bạn đối chiếu rồi lưu</Badge>
          )}
          {entry?.status === "ENTERED" && <Badge variant="success">Đã xác nhận</Badge>}
        </div>
      </div>
      <EntryToolbar
        fileName={entry?.fileName ?? (id ? `Document #${id}` : t("entry.title"))}
        docType={activeDocType}
        onDocTypeChange={(v) => {
          setDocType(v);
          setSaveIssues(null);
        }}
        disabled={isLocked}
      />
      {saveError && <div className="rounded-md bg-danger-light p-2 text-xs text-danger-dark">{saveError}</div>}

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <DocumentViewer fileUrl={fileQuery.data?.url} contentType={fileQuery.data?.contentType} fileName={entry?.fileName} />
        {/* key: dựng lại form khi dữ liệu (bản nháp AI hoặc số đã lưu) tải xong hoặc đổi loại chứng từ */}
        <EntryForm
          key={`${entryQuery.dataUpdatedAt}-${activeDocType}`}
          docType={activeDocType}
          initialData={activeDocType === entry?.docType ? entry?.data : undefined}
          issues={issues}
          disabled={isLocked}
          onSave={(data, ack) => void handleSave(data, ack)}
        />
      </div>
    </div>
  );
}

export default DocumentEntryPage;
