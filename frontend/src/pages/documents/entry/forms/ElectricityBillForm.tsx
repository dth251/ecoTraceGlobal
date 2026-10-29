import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";

export interface ElectricityBillFormProps {
  initialData?: Record<string, unknown>;
  disabled?: boolean;
  onChange: (data: Record<string, unknown>) => void;
}

export function ElectricityBillForm({ initialData, disabled, onChange }: ElectricityBillFormProps) {
  const { t } = useTranslation();
  const [supplierName, setSupplierName] = useState(String(initialData?.supplierName ?? ""));
  const [customerCode, setCustomerCode] = useState(String(initialData?.customerCode ?? ""));
  const [startDate, setStartDate] = useState(String(initialData?.startDate ?? "2026-07-01"));
  const [endDate, setEndDate] = useState(String(initialData?.endDate ?? "2026-07-31"));
  const [totalKwh, setTotalKwh] = useState<number | null>(
    typeof initialData?.totalKwh === "number" ? initialData.totalKwh : null,
  );

  const emit = (patch: Record<string, unknown>) => {
    onChange({
      supplierName,
      customerCode,
      startDate,
      endDate,
      totalKwh,
      ...patch,
    });
  };

  return (
    <div className="space-y-3">
      <Input
        label={t("entry.supplierName")}
        disabled={disabled}
        value={supplierName}
        onChange={(e) => {
          setSupplierName(e.target.value);
          emit({ supplierName: e.target.value });
        }}
      />
      <Input
        label={t("entry.customerCode")}
        disabled={disabled}
        value={customerCode}
        onChange={(e) => {
          setCustomerCode(e.target.value);
          emit({ customerCode: e.target.value });
        }}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <DatePicker
          label={t("entry.startDate")}
          disabled={disabled}
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            emit({ startDate: e.target.value });
          }}
        />
        <DatePicker
          label={t("entry.endDate")}
          disabled={disabled}
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            emit({ endDate: e.target.value });
          }}
        />
      </div>
      <NumberInput
        label={t("entry.totalKwh")}
        disabled={disabled}
        value={totalKwh}
        onChange={(val) => {
          setTotalKwh(val);
          emit({ totalKwh: val });
        }}
      />
    </div>
  );
}
