import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input } from "@/components/ui/Input";
import { useCreatePeriod } from "@/queries/usePeriods";
import type { Period } from "@/types/domain";

export interface PeriodStepProps {
  facilityId: string;
  onBack: () => void;
  onCompleted: (period: Period) => void;
}

export function PeriodStep({ facilityId, onBack, onCompleted }: PeriodStepProps) {
  const { t } = useTranslation();
  const createPeriod = useCreatePeriod();
  const [name, setName] = useState("Q3/2026");
  const [startDate, setStartDate] = useState("2026-07-01");
  const [endDate, setEndDate] = useState("2026-09-30");
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: "thisQ" | "lastQ" | "thisY") => {
    if (preset === "thisQ") {
      setName("Q3/2026");
      setStartDate("2026-07-01");
      setEndDate("2026-09-30");
    } else if (preset === "lastQ") {
      setName("Q2/2026");
      setStartDate("2026-04-01");
      setEndDate("2026-06-30");
    } else {
      setName("2026");
      setStartDate("2026-01-01");
      setEndDate("2026-12-31");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("validation.required"));
      return;
    }
    if (endDate < startDate) {
      setError(t("validation.endBeforeStart"));
      return;
    }
    setError(null);
    const created = await createPeriod.mutateAsync({
      facilityId,
      name: name.trim(),
      startDate,
      endDate,
    });
    onCompleted(created);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset("thisQ")}>
          {t("onboarding.presetThisQuarter")}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset("lastQ")}>
          {t("onboarding.presetLastQuarter")}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset("thisY")}>
          {t("onboarding.presetThisYear")}
        </Button>
      </div>
      <Input
        label={t("onboarding.periodName")}
        value={name}
        error={error ?? undefined}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <DatePicker
          label={t("onboarding.startDate")}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <DatePicker
          label={t("onboarding.endDate")}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      <div className="flex justify-between">
        <Button type="button" variant="secondary" onClick={onBack}>
          {t("common.back")}
        </Button>
        <Button type="submit" loading={createPeriod.isPending}>
          {t("onboarding.finish")}
        </Button>
      </div>
    </form>
  );
}
