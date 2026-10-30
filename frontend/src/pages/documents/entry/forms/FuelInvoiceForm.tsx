import { useState } from "react";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import { Select } from "@/components/ui/Select";

export interface FuelInvoiceFormProps {
  initialData?: Record<string, unknown>;
  disabled?: boolean;
  onChange: (data: Record<string, unknown>) => void;
}

export function FuelInvoiceForm({ initialData, disabled, onChange }: FuelInvoiceFormProps) {
  const [supplier, setSupplier] = useState(String(initialData?.supplier ?? ""));
  const [date, setDate] = useState(String(initialData?.date ?? ""));
  const [fuelType, setFuelType] = useState(String(initialData?.fuelType ?? "DIESEL"));
  const [quantity, setQuantity] = useState<number | null>(
    typeof initialData?.quantity === "number" ? initialData.quantity : null,
  );

  const emit = (patch: Record<string, unknown>) => {
    onChange({ supplier, date, fuelType, quantity, unit: "L", ...patch });
  };

  return (
    <div className="space-y-3">
      <Input
        label="Nhà cung cấp nhiên liệu"
        disabled={disabled}
        value={supplier}
        onChange={(e) => {
          setSupplier(e.target.value);
          emit({ supplier: e.target.value });
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
      <Select
        label="Loại nhiên liệu"
        disabled={disabled}
        value={fuelType}
        onChange={(e) => {
          setFuelType(e.target.value);
          emit({ fuelType: e.target.value });
        }}
        options={[
          { value: "DIESEL", label: "Dầu DO (Diesel)" },
          { value: "LPG", label: "Khí hóa lỏng (LPG)" },
        ]}
      />
      <NumberInput
        label="Số lượng (lít)"
        disabled={disabled}
        value={quantity}
        onChange={(val) => {
          setQuantity(val);
          emit({ quantity: val });
        }}
      />
    </div>
  );
}
