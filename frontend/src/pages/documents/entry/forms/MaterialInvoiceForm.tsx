import { useState } from "react";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";

export interface MaterialInvoiceFormProps {
  initialData?: Record<string, unknown>;
  disabled?: boolean;
  onChange: (data: Record<string, unknown>) => void;
}

export function MaterialInvoiceForm({ initialData, disabled, onChange }: MaterialInvoiceFormProps) {
  const [supplier, setSupplier] = useState(String(initialData?.supplier ?? ""));
  const [materialGroup, setMaterialGroup] = useState(String(initialData?.materialGroup ?? "STEEL"));
  const [date, setDate] = useState(String(initialData?.date ?? "2026-07-15"));
  const [quantityKg, setQuantityKg] = useState<number | null>(
    typeof initialData?.quantityKg === "number" ? initialData.quantityKg : null,
  );

  const emit = (patch: Record<string, unknown>) => {
    onChange({ supplier, materialGroup, date, quantityKg, ...patch });
  };

  return (
    <div className="space-y-3">
      <Input
        label="Nhà cung cấp nguyên liệu"
        disabled={disabled}
        value={supplier}
        onChange={(e) => {
          setSupplier(e.target.value);
          emit({ supplier: e.target.value });
        }}
      />
      <Input
        label="Nhóm vật liệu"
        disabled={disabled}
        value={materialGroup}
        onChange={(e) => {
          setMaterialGroup(e.target.value);
          emit({ materialGroup: e.target.value });
        }}
      />
      <DatePicker
        label="Ngày hóa đơn"
        disabled={disabled}
        value={date}
        onChange={(e) => {
          setDate(e.target.value);
          emit({ date: e.target.value });
        }}
      />
      <NumberInput
        label="Khối lượng (kg)"
        disabled={disabled}
        value={quantityKg}
        onChange={(val) => {
          setQuantityKg(val);
          emit({ quantityKg: val });
        }}
      />
    </div>
  );
}
