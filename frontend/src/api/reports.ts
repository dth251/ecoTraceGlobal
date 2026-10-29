export type ReportLang = "vi" | "en";

// TODO Sprint 5: đường dẫn báo cáo, tải qua lib/download.ts
export const reportsApi = {
  ghgPdfPath: (periodId: string, lang: ReportLang = "vi") => `/periods/${periodId}/reports/ghg.pdf?lang=${lang}`,
  cbamXlsxPath: (periodId: string, lang: ReportLang = "vi") =>
    `/periods/${periodId}/reports/cbam.xlsx?lang=${lang}`,
};
