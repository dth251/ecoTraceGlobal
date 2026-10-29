import { useTranslation } from "react-i18next";
import { Select } from "@/components/ui/Select";
import type { DocType } from "@/types/domain";

const DOC_TYPES: DocType[] = [
  "ELECTRICITY_BILL",
  "FUEL_INVOICE",
  "MATERIAL_INVOICE",
  "BILL_OF_LADING",
  "OTHER",
];

export interface DocTypeSelectProps {
  value: DocType;
  onChange: (value: DocType) => void;
  disabled?: boolean;
  label?: string;
}

export function DocTypeSelect({ value, onChange, disabled, label }: DocTypeSelectProps) {
  const { t } = useTranslation();

  return (
    <Select
      label={label ?? t("documents.docType")}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value as DocType)}
      options={DOC_TYPES.map((type) => ({
        value: type,
        label: t(`documents.types.${type}`),
      }))}
    />
  );
}
