import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DocTypeSelect } from "@/components/documents/DocTypeSelect";
import type { DocType } from "@/types/domain";

export interface EntryToolbarProps {
  fileName: string;
  docType: DocType;
  onDocTypeChange: (docType: DocType) => void;
  disabled?: boolean;
}

export function EntryToolbar({ fileName, docType, onDocTypeChange, disabled }: EntryToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5">
      <div className="flex items-center gap-3">
        <Link to="/documents" className="text-xs font-medium text-brand hover:underline">
          ← {t("common.back")}
        </Link>
        <span className="text-sm font-semibold text-slate-900">{fileName}</span>
      </div>
      <div className="w-56">
        <DocTypeSelect value={docType} onChange={onDocTypeChange} disabled={disabled} label="" />
      </div>
    </div>
  );
}
