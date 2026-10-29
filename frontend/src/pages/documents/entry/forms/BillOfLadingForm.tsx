import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import { Select } from "@/components/ui/Select";

export interface BillOfLadingFormProps {
  initialData?: Record<string, unknown>;
  disabled?: boolean;
  onChange: (data: Record<string, unknown>) => void;
}

export function BillOfLadingForm({ initialData, disabled, onChange }: BillOfLadingFormProps) {
  const [bolNumber, setBolNumber] = useState(String(initialData?.bolNumber ?? ""));
  const [mode, setMode] = useState(String(initialData?.mode ?? "ROAD"));
  const [origin, setOrigin] = useState(String(initialData?.origin ?? ""));
  const [destination, setDestination] = useState(String(initialData?.destination ?? ""));
  const [weightKg, setWeightKg] = useState<number | null>(
    typeof initialData?.weightKg === "number" ? initialData.weightKg : null,
  );

  const emit = (patch: Record<string, unknown>) => {
    onChange({ bolNumber, mode, origin, destination, weightKg, ...patch });
  };

  return (
    <div className="space-y-3">
      <Input
        label="Số vận đơn"
        disabled={disabled}
        value={bolNumber}
        onChange={(e) => {
          setBolNumber(e.target.value);
          emit({ bolNumber: e.target.value });
        }}
      />
      <Select
        label="Phương thức vận tải"
        disabled={disabled}
        value={mode}
        onChange={(e) => {
          setMode(e.target.value);
          emit({ mode: e.target.value });
        }}
        options={[
          { value: "ROAD", label: "Đường bộ" },
          { value: "SEA", label: "Đường biển" },
          { value: "RAIL", label: "Đường sắt" },
        ]}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input
          label="Nơi đi"
          disabled={disabled}
          value={origin}
          onChange={(e) => {
            setOrigin(e.target.value);
            emit({ origin: e.target.value });
          }}
        />
        <Input
          label="Nơi đến"
          disabled={disabled}
          value={destination}
          onChange={(e) => {
            setDestination(e.target.value);
            emit({ destination: e.target.value });
          }}
        />
      </div>
      <NumberInput
        label="Khối lượng (kg)"
        disabled={disabled}
        value={weightKg}
        onChange={(val) => {
          setWeightKg(val);
          emit({ weightKg: val });
        }}
      />
    </div>
  );
}
