import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { ValidationMessages } from "@/pages/documents/entry/ValidationMessages";
import { BillOfLadingForm } from "@/pages/documents/entry/forms/BillOfLadingForm";
import { ElectricityBillForm } from "@/pages/documents/entry/forms/ElectricityBillForm";
import { FuelInvoiceForm } from "@/pages/documents/entry/forms/FuelInvoiceForm";
import { MaterialInvoiceForm } from "@/pages/documents/entry/forms/MaterialInvoiceForm";
import type { DocType, ValidationIssue } from "@/types/domain";

export interface EntryFormProps {
  docType: DocType;
  initialData?: Record<string, unknown>;
  issues?: ValidationIssue[];
  disabled?: boolean;
  onSave: (data: Record<string, unknown>, acknowledgeWarnings: boolean) => void;
  onSaveAndNext?: (data: Record<string, unknown>, acknowledgeWarnings: boolean) => void;
  onReject?: () => void;
}

export function EntryForm({
  docType,
  initialData,
  issues = [],
  disabled = false,
  onSave,
  onSaveAndNext,
  onReject,
}: EntryFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData ?? {});
  const [ackWarnings, setAckWarnings] = useState(false);

  // Backend kiểm tra lại mỗi lần lưu; chỉ chặn khi còn cảnh báo chưa xác nhận
  const hasWarnings = issues.some((i) => i.severity === "WARNING");
  const canSubmit = !disabled && (!hasWarnings || ackWarnings);

  return (
    <div className="card-surface flex h-full flex-col justify-between space-y-5 p-6">
      <div className="space-y-4">
        {docType === "ELECTRICITY_BILL" && (
          <ElectricityBillForm initialData={initialData} disabled={disabled} onChange={setFormData} />
        )}
        {docType === "FUEL_INVOICE" && (
          <FuelInvoiceForm initialData={initialData} disabled={disabled} onChange={setFormData} />
        )}
        {docType === "MATERIAL_INVOICE" && (
          <MaterialInvoiceForm initialData={initialData} disabled={disabled} onChange={setFormData} />
        )}
        {(docType === "BILL_OF_LADING" || docType === "OTHER") && (
          <BillOfLadingForm initialData={initialData} disabled={disabled} onChange={setFormData} />
        )}

        <ValidationMessages issues={issues} />

        {hasWarnings && (
          <label className="flex items-center gap-2 text-sm text-warning-dark">
            <input
              type="checkbox"
              checked={ackWarnings}
              onChange={(e) => setAckWarnings(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-brand-700"
            />
            <span>{t("entry.acknowledgeWarnings")}</span>
          </label>
        )}
      </div>

      {!disabled && (
        <div className="flex items-center justify-between pt-2">
          {onReject ? (
            <Button variant="ghost" size="sm" onClick={onReject}>
              {t("entry.rejectDoc")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button disabled={!canSubmit} onClick={() => onSave(formData, ackWarnings)}>
              {t("common.save")}
            </Button>
            {onSaveAndNext && (
              <Button disabled={!canSubmit} onClick={() => onSaveAndNext(formData, ackWarnings)}>
                {t("entry.saveAndNext")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
