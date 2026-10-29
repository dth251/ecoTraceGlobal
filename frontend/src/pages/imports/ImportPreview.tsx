import { useTranslation } from "react-i18next";
import { importsApi } from "@/api/imports";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { downloadFile } from "@/lib/download";
import type { ImportBatch } from "@/types/domain";

export interface ImportPreviewProps {
  batch: ImportBatch;
  onCommit: (id: string) => void;
  onCancel: () => void;
}

export function ImportPreview({ batch, onCommit, onCancel }: ImportPreviewProps) {
  const { t } = useTranslation();

  return (
    <Card
      title={`${t("imports.previewTitle")}: ${batch.totalRows} dòng · ${batch.validRows} hợp lệ · ${batch.errorRows} lỗi`}
    >
      {batch.errors && batch.errors.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-left font-semibold text-slate-600">
              <tr>
                <th className="px-2 py-1.5">Dòng</th>
                <th className="px-2 py-1.5">Cột</th>
                <th className="px-2 py-1.5">Giá trị</th>
                <th className="px-2 py-1.5">Lỗi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batch.errors.map((err, idx) => (
                <tr key={idx}>
                  <td className="px-2 py-1.5 tabular-nums">{err.row}</td>
                  <td className="px-2 py-1.5 font-mono">{err.column}</td>
                  <td className="px-2 py-1.5">{err.value ?? "—"}</td>
                  <td className="px-2 py-1.5 text-danger-dark">{err.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {batch.errorRows > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void downloadFile(importsApi.errorsPath(batch.id), `errors-${batch.id}.xlsx`)}
          >
            {t("imports.downloadErrors")}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button
          size="sm"
          disabled={batch.validRows === 0}
          onClick={() => onCommit(batch.id)}
        >
          {t("imports.commitValid")} ({batch.validRows})
        </Button>
      </div>
    </Card>
  );
}
