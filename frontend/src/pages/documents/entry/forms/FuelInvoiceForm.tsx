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

  // Đơn vị theo loại nhiên liệu, khớp đơn vị của hệ số phát thải (LPG, than theo kg; khí tự nhiên theo m³)
  const unitOf = (fuel: string) => (fuel === "LPG" || fuel === "COAL" ? "kg" : fuel === "NATGAS" ? "m3" : "L");
  const unitText = { L: "lít", kg: "kg", m3: "m³" }[unitOf(fuelType)];

  const emit = (patch: Record<string, unknown>) => {
    const next = { supplier, date, fuelType, quantity, ...patch };
    onChange({ ...next, unit: unitOf(String(next.fuelType)) });
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
          { value: "PETROL", label: "Xăng" },
          { value: "LPG", label: "Khí hóa lỏng (LPG, kg)" },
          { value: "NATGAS", label: "Khí tự nhiên (m³)" },
          { value: "COAL", label: "Than (kg)" },
        ]}
      />
      <NumberInput
        label={`Số lượng (${unitText})`}
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
