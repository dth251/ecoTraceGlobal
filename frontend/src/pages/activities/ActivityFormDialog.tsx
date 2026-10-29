import { useState } from "react";
import { useTranslation } from "react-i18next";
import { activitiesApi } from "@/api/activities";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import { Select } from "@/components/ui/Select";
import { ACTIVITY_CATEGORIES, unitLabel } from "@/lib/units";

export interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodId: string;
  onSaved: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function ActivityFormDialog({ open, onOpenChange, periodId, onSaved }: ActivityFormDialogProps) {
  const { t, i18n } = useTranslation();
  const [category, setCategory] = useState("ELECTRICITY");
  const [subType, setSubType] = useState("GRID");
  const [activityDate, setActivityDate] = useState(today);
  const [quantity, setQuantity] = useState<number | null>(null);
  const [unit, setUnit] = useState("kWh");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const config = ACTIVITY_CATEGORIES[category];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || quantity <= 0) {
      setError(t("validation.nonNegative"));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await activitiesApi.create({
        periodId,
        activityDate,
        category,
        subType,
        quantity,
        unit,
        note: note.trim() || null,
      });
      onSaved();
      onOpenChange(false);
      setQuantity(null);
      setNote("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errors.UNKNOWN"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("activities.addManual")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t("activities.category")}
            value={category}
            onChange={(e) => {
              const next = ACTIVITY_CATEGORIES[e.target.value];
              setCategory(e.target.value);
              setSubType(next.subTypes[0]);
              setUnit(next.units[0]);
            }}
            options={Object.keys(ACTIVITY_CATEGORIES).map((c) => ({ value: c, label: t(`activities.categories.${c}`) }))}
          />
          <Select
            label={t("activities.subType")}
            value={subType}
            onChange={(e) => setSubType(e.target.value)}
            options={config.subTypes.map((s) => ({ value: s, label: t(`activities.subTypes.${s}`) }))}
          />
        </div>
        <DatePicker
          label={t("activities.date")}
          value={activityDate}
          onChange={(e) => setActivityDate(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label={t("activities.quantity")} value={quantity} onChange={setQuantity} lang={i18n.language} />
          <Select
            label={t("activities.unit")}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            options={config.units.map((u) => ({ value: u, label: unitLabel(u, i18n.language) }))}
          />
        </div>
        <Input label={t("activities.note")} value={note} onChange={(e) => setNote(e.target.value)} />
        {error && (
          <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger-dark">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={saving}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
