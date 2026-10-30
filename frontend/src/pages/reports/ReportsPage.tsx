import { useState } from "react";
import { useTranslation } from "react-i18next";
import { reportsApi, type ReportLang } from "@/api/reports";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { downloadFile } from "@/lib/download";
import { batchToCsv, downloadText } from "@/pages/ai/batchSummary";
import { formatEmission } from "@/pages/ai/batch";
import { useAiBatchStore } from "@/stores/aiBatchStore";

export function ReportsPage() {
  const { t } = useTranslation();
  const { periodId, isLocked } = useCurrentContext();
  const [lang, setLang] = useState<ReportLang>("vi");
  const aiBatch = useAiBatchStore((s) => s.batch);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-slate-900">{t("reports.title")}</h1>

      {!isLocked && (
        <div className="rounded-md border border-warning/30 bg-warning-light p-3 text-xs text-warning-dark">
          {t("reports.incompleteWarning")}
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

      {aiBatch && (
        <Card>
          <h2 className="text-sm font-bold text-slate-900">Bảng tổng hợp lô chứng từ AI</h2>
          <p className="mt-1 text-xs text-slate-500">
            {aiBatch.records.length} chứng từ · tổng {formatEmission(aiBatch.estimate.total_co2e_kg)}. Số liệu ước tính theo hệ số tham khảo, chưa phải số
            chính thức của backend.
          </p>
          <div className="mt-3">
            <Button
              variant="secondary"
              onClick={() => downloadText(batchToCsv(aiBatch), `tong-hop-phat-thai-${aiBatch.processedAt.slice(0, 10)}.csv`)}
            >
              Tải bảng tổng hợp (CSV) ↓
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default ReportsPage;
