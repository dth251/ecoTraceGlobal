import { api, qs } from "@/api/client";
import type { ImportBatch, ImportTemplateType } from "@/types/domain";

// TODO Sprint 3: nhập file Excel
export const importsApi = {
  templatePath: (type: ImportTemplateType) => `/imports/templates/${type}.xlsx`,
  errorsPath: (id: string) => `/imports/${id}/errors.xlsx`,
  upload: (periodId: string, templateType: ImportTemplateType, file: File) => {
    const form = new FormData();
    form.append("periodId", periodId);
    form.append("templateType", templateType);
    form.append("file", file);
    return api<ImportBatch>("/imports", { method: "POST", body: form });
  },
  list: (periodId: string) => api<ImportBatch[]>(`/imports${qs({ periodId })}`),
  get: (id: string) => api<ImportBatch>(`/imports/${id}`),
  commit: (id: string) => api<ImportBatch>(`/imports/${id}/commit`, { method: "POST" }),
  cancel: (id: string) => api<void>(`/imports/${id}`, { method: "DELETE" }),
};
