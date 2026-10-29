import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import { Select } from "@/components/ui/Select";

export interface BillOfLadingFormProps {
  initialData?: Record<string, unknown>;
  disabled?: boolean;
  onChange: (data: Record<string, unknown>) => void;
}

const num = (v: unknown) => (typeof v === "number" ? v : null);

export function BillOfLadingForm({ initialData, disabled, onChange }: BillOfLadingFormProps) {
  const { t } = useTranslation();
  const [bolNumber, setBolNumber] = useState(String(initialData?.bolNumber ?? ""));
  const [date, setDate] = useState(String(initialData?.date ?? ""));
  const [mode, setMode] = useState(String(initialData?.mode ?? "SEA"));
  const [origin, setOrigin] = useState(String(initialData?.origin ?? ""));
  const [destination, setDestination] = useState(String(initialData?.destination ?? ""));
  const [weightKg, setWeightKg] = useState<number | null>(num(initialData?.weightKg));
  const [distanceKm, setDistanceKm] = useState<number | null>(num(initialData?.distanceKm));

  const emit = (patch: Record<string, unknown>) => {
    onChange({ bolNumber, date, mode, origin, destination, weightKg, distanceKm, ...patch });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Số vận đơn"
          disabled={disabled}
          value={bolNumber}
          onChange={(e) => {
            setBolNumber(e.target.value);
            emit({ bolNumber: e.target.value });
          }}
        />
        <DatePicker
          label={t("entry.date")}
          disabled={disabled}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            emit({ date: e.target.value });
          }}
        />
      </div>
      <Select
        label="Phương thức vận tải"
        disabled={disabled}
        value={mode}
        onChange={(e) => {
          setMode(e.target.value);
          emit({ mode: e.target.value });
        }}
        options={[
          { value: "SEA", label: t("activities.subTypes.SEA") },
          { value: "ROAD", label: t("activities.subTypes.ROAD") },
        ]}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumberInput
          label="Khối lượng (kg)"
          disabled={disabled}
          value={weightKg}
          onChange={(val) => {
            setWeightKg(val);
            emit({ weightKg: val });
          }}
        />
        <NumberInput
          label={t("entry.distanceKm")}
          disabled={disabled}
          value={distanceKm}
          onChange={(val) => {
            setDistanceKm(val);
            emit({ distanceKm: val });
          }}
        />
      </div>
    </div>
  );
}
