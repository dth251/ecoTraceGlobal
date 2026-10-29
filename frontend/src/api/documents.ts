import { api, json, qs } from "@/api/client";
import type { DocType, DocumentEntry, DocumentItem, DocumentStatus, ValidationIssue } from "@/types/domain";

export const documentsApi = {
  list: (periodId: string, status?: DocumentStatus) =>
    api<DocumentItem[]>(`/documents${qs({ periodId, status })}`),
  upload: (periodId: string, docType: DocType | null, file: File) => {
    const form = new FormData();
    form.append("periodId", periodId);
    if (docType) form.append("docType", docType);
    form.append("file", file);
    return api<DocumentItem>("/documents", { method: "POST", body: form });
  },
  /** Lưu kết quả AI bóc tách làm bản nháp; chỉ vào kiểm kê khi người dùng xác nhận ở trang nhập liệu. */
  aiDraft: (id: string, extraction: unknown) =>
    api<DocumentItem>(`/documents/${id}/ai-draft`, { method: "PUT", ...json(extraction) }),
  fileUrl: (id: string) => api<{ url: string; contentType: string }>(`/documents/${id}/file`),
  getEntry: (id: string) => api<DocumentEntry>(`/documents/${id}/entry`),
  saveEntry: (id: string, data: Record<string, unknown>, acknowledgeWarnings = false, docType?: DocType) =>
    api<DocumentEntry>(`/documents/${id}/entry`, { method: "PUT", ...json({ data, acknowledgeWarnings, docType }) }),
  validateEntry: (id: string, data: Record<string, unknown>) =>
    api<ValidationIssue[]>(`/documents/${id}/entry/validate`, { method: "POST", ...json({ data }) }),
  reject: (id: string, reason: string) =>
    api<DocumentItem>(`/documents/${id}/reject`, { method: "POST", ...json({ reason }) }),
};
