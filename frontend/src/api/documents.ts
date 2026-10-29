import { api, json, qs } from "@/api/client";
import type { DocType, DocumentEntry, DocumentItem, DocumentStatus, ValidationIssue } from "@/types/domain";

export const documentsApi = {
  list: (periodId: string, status?: DocumentStatus) =>
    api<DocumentItem[]>(`/documents${qs({ periodId, status })}`),
  upload: (periodId: string, docType: DocType, file: File) => {
    const form = new FormData();
    form.append("periodId", periodId);
    form.append("docType", docType);
    form.append("file", file);
    return api<DocumentItem>("/documents", { method: "POST", body: form });
  },
  /** URL ký tạm (S3) hoặc đường dẫn API cần token (lưu cục bộ) */
  fileUrl: (id: string) =>
    api<{ url?: string; contentPath?: string; contentType: string }>(`/documents/${id}/file`),
  getEntry: (id: string) => api<DocumentEntry>(`/documents/${id}/entry`),
  saveEntry: (id: string, data: Record<string, unknown>, acknowledgeWarnings = false) =>
    api<DocumentEntry>(`/documents/${id}/entry`, { method: "PUT", ...json({ data, acknowledgeWarnings }) }),
  validateEntry: (id: string, data: Record<string, unknown>) =>
    api<ValidationIssue[]>(`/documents/${id}/entry/validate`, { method: "POST", ...json({ data }) }),
  reject: (id: string, reason: string) =>
    api<DocumentItem>(`/documents/${id}/reject`, { method: "POST", ...json({ reason }) }),
};
