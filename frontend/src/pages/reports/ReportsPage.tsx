import { useState } from "react";
import { useTranslation } from "react-i18next";
import { reportsApi, type ReportLang } from "@/api/reports";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { downloadFile } from "@/lib/download";

export function ReportsPage() {
  const { t } = useTranslation();
  const { periodId, isLocked } = useCurrentContext();
  const [lang, setLang] = useState<ReportLang>("vi");

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-slate-900">{t("reports.title")}</h1>

      {!isLocked && (
        <div className="rounded-md border border-warning/30 bg-warning-light p-3 text-xs text-warning-dark">
          ⚠ {t("reports.incompleteWarning")}
        </div>
      )}

      <Card>
        <div className="mb-4 max-w-xs">
          <Select
            label="Ngôn ngữ báo cáo"
            value={lang}
            onChange={(e) => setLang(e.target.value as ReportLang)}
            options={[
              { value: "vi", label: "Tiếng Việt" },
              { value: "en", label: "English" },
            ]}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            disabled={!periodId}
            onClick={() => {
              if (periodId) void downloadFile(reportsApi.ghgPdfPath(periodId, lang), "ghg-report.pdf");
            }}
          >
            {t("reports.ghgPdf")} ↓
          </Button>
          <Button
            variant="secondary"
            disabled={!periodId}
            onClick={() => {
              if (periodId) void downloadFile(reportsApi.cbamXlsxPath(periodId, lang), "cbam-report.xlsx");
            }}
          >
            {t("reports.cbamXlsx")} ↓
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default ReportsPage;
