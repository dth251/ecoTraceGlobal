import { useState } from "react";
import { useTranslation } from "react-i18next";
import { activitiesApi } from "@/api/activities";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import { Select } from "@/components/ui/Select";
import { UNITS_BY_CATEGORY } from "@/lib/units";

export interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodId: string;
  onSaved: () => void;
}

export function ActivityFormDialog({ open, onOpenChange, periodId, onSaved }: ActivityFormDialogProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState("ELECTRICITY");
  const [activityDate, setActivityDate] = useState("2026-07-01");
  const [quantity, setQuantity] = useState<number | null>(null);
  const [unit, setUnit] = useState("kWh");
  const [note, setNote] = useState("");

  const allowedUnits = UNITS_BY_CATEGORY[category] ?? ["kWh"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || quantity <= 0) return;
    await activitiesApi.create({
      periodId,
      activityDate,
      category,
      subType: null,
      quantity,
      unit,
      note: note.trim() || null,
    });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("activities.addManual")}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Select
          label="Hạng mục"
          value={category}
          onChange={(e) => {
            const nextCat = e.target.value;
            setCategory(nextCat);
            setUnit((UNITS_BY_CATEGORY[nextCat] ?? ["kWh"])[0]);
          }}
          options={Object.keys(UNITS_BY_CATEGORY).map((c) => ({ value: c, label: c }))}
        />
        <DatePicker
          label="Ngày hoạt động"
          value={activityDate}
          onChange={(e) => setActivityDate(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="Số lượng" value={quantity} onChange={setQuantity} />
          <Select
            label="Đơn vị"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            options={allowedUnits.map((u) => ({ value: u, label: u }))}
          />
        </div>
        <Input label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit">{t("common.save")}</Button>
        </div>
      </form>
    </Dialog>
  );
}
