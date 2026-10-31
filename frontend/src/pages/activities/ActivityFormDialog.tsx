import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { activitiesApi } from "@/api/activities";
import { aiApi, type ClassifyResponse } from "@/api/ai";
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
  startDate?: string;
  endDate?: string;
  onSaved: () => void;
}

// Ngày theo giờ địa phương (toISOString dùng UTC nên lệch ngày ở múi giờ +7)
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function ActivityFormDialog({ open, onOpenChange, periodId, startDate, endDate, onSaved }: ActivityFormDialogProps) {
  const { t, i18n } = useTranslation();
  const [category, setCategory] = useState("ELECTRICITY");
  const [subType, setSubType] = useState("GRID");
  const [activityDate, setActivityDate] = useState(() => {
    const td = today();
    if (startDate && endDate) {
      if (td >= startDate && td <= endDate) return td;
      return startDate;
    }
    return td;
  });
  const [quantity, setQuantity] = useState<number | null>(null);
  const [unit, setUnit] = useState("kWh");
  const [note, setNote] = useState("");
  const [suggestion, setSuggestion] = useState<ClassifyResponse | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const td = today();
      if (startDate && endDate) {
        if (td >= startDate && td <= endDate) {
          setActivityDate(td);
        } else {
          setActivityDate(startDate);
        }
      }
    }
  }, [open, startDate, endDate]);

  const config = ACTIVITY_CATEGORIES[category];

  // AI gợi ý Scope và mã hệ số từ mô tả hoạt động
  const handleSuggest = async () => {
    setSuggesting(true);
    setSuggestError(null);
    try {
      setSuggestion(await aiApi.classifyActivity({ description: note.trim(), unit }));
    } catch (err: unknown) {
      setSuggestion(null);
      setSuggestError(err instanceof Error ? err.message : "AI chưa gợi ý được");
    } finally {
      setSuggesting(false);
    }
  };

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
          min={startDate}
          max={endDate}
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
        <Input
          label={t("activities.note")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ví dụ: Dầu DO chạy lò hơi phụ trợ"
        />
        <Button type="button" variant="secondary" size="sm" onClick={handleSuggest} loading={suggesting} disabled={!note.trim()}>
          Gợi ý Scope và hệ số bằng AI
        </Button>
        {suggestion && (
          <div className="rounded-md border border-brand/20 bg-brand/5 p-2 text-xs text-slate-700">
            <b>Scope {suggestion.scope}</b> · <span className="font-mono">{suggestion.factor_code}</span> · tin cậy{" "}
            {(suggestion.confidence * 100).toFixed(0)}%
            <div className="mt-0.5 text-slate-500">{suggestion.reasoning}</div>
          </div>
        )}
        {suggestError && <div className="rounded-md bg-danger-light p-2 text-xs text-danger-dark">{suggestError}</div>}
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
