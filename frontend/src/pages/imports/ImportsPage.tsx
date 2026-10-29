import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { importsApi } from "@/api/imports";
import { FileDropzone } from "@/components/documents/FileDropzone";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { downloadFile } from "@/lib/download";
import { ImportHistoryTable } from "@/pages/imports/ImportHistoryTable";
import { ImportPreview } from "@/pages/imports/ImportPreview";
import { keys } from "@/queries/keys";
import { useImports } from "@/queries/useImports";
import type { ImportBatch, ImportTemplateType } from "@/types/domain";

const TEMPLATES: ImportTemplateType[] = ["ELECTRICITY", "FUEL", "MATERIAL", "TRANSPORT", "PRODUCTION"];

export function ImportsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { periodId, isLocked } = useCurrentContext();
  const [templateType, setTemplateType] = useState<ImportTemplateType>("ELECTRICITY");
  const [preview, setPreview] = useState<ImportBatch | null>(null);
  const imports = useImports(periodId);

  const handleUpload = async (files: File[]) => {
    if (!periodId || files.length === 0) return;
    const batch = await importsApi.upload(periodId, templateType, files[0]);
    setPreview(batch);
  };

  const handleCommit = async (id: string) => {
    await importsApi.commit(id);
    setPreview(null);
    if (periodId) {
      await queryClient.invalidateQueries({ queryKey: keys.imports(periodId) });
      await queryClient.invalidateQueries({ queryKey: keys.summary(periodId) });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-slate-900">{t("imports.title")}</h1>

      {!isLocked && (
        <Card>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <div className="w-60">
              <Select
                label="Mẫu Excel"
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value as ImportTemplateType)}
                options={TEMPLATES.map((tpl) => ({ value: tpl, label: tpl }))}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                void downloadFile(
                  importsApi.templatePath(templateType),
                  `${templateType.toLowerCase()}.xlsx`,
                )
              }
            >
              {t("imports.downloadTemplate")} ↓
            </Button>
          </div>
          <FileDropzone
            accept={{
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            }}
            maxSize={10 * 1024 * 1024}
            onFilesAccepted={handleUpload}
          />
        </Card>
      )}

      {preview && (
        <ImportPreview
          batch={preview}
          onCommit={handleCommit}
          onCancel={() => setPreview(null)}
        />
      )}

      <ImportHistoryTable
        batches={imports.data ?? []}
        disabled={isLocked}
        onCancelBatch={async (id) => {
          await importsApi.cancel(id);
          if (periodId) {
            await queryClient.invalidateQueries({ queryKey: keys.imports(periodId) });
          }
        }}
      />
    </div>
  );
}

export default ImportsPage;
