import { documentsApi } from "@/api/documents";

// Nhập liệu chứng từ: tách riêng để hook useDocumentEntry dùng (TODO Sprint 3)
export const entriesApi = {
  get: documentsApi.getEntry,
  save: documentsApi.saveEntry,
  validate: documentsApi.validateEntry,
  reject: documentsApi.reject,
};
