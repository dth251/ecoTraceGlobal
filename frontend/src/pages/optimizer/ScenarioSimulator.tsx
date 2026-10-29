import { useState } from "react";
import { optimizerApi } from "@/api/optimizer";
import { Co2eValue } from "@/components/emissions/Co2eValue";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { NumberInput } from "@/components/ui/NumberInput";
import type { Recommendation, ScenarioResult } from "@/types/domain";

export interface ScenarioSimulatorProps {
  periodId: string;
  recommendation: Recommendation | null;
  onClose: () => void;
}

export function ScenarioSimulator({ periodId, recommendation, onClose }: ScenarioSimulatorProps) {
  const [capacityKwp, setCapacityKwp] = useState<number | null>(100);
  const [result, setResult] = useState<ScenarioResult | null>(null);

  const handleSimulate = async () => {
    if (!recommendation) return;
    const res = await optimizerApi.simulate({
      periodId,
      scenario: recommendation.type,
      params: { capacityKwp: capacityKwp ?? 100 },
    });
    setResult(res);
  };

  return (
    <Dialog
      open={!!recommendation}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={recommendation?.title ?? "Mô phỏng kịch bản"}
    >
      <div className="space-y-3">
        <NumberInput label="Công suất / Quy mô" value={capacityKwp} onChange={setCapacityKwp} />
        <Button size="sm" onClick={handleSimulate}>
          Chạy mô phỏng
        </Button>
        {result && (
          <div className="rounded-md bg-brand-50 p-3 text-xs text-brand-900">
            Dự kiến giảm: <Co2eValue kg={result.reductionKg} /> (từ{" "}
            <Co2eValue kg={result.baselineKg} /> còn <Co2eValue kg={result.scenarioKg} />)
          </div>
        )}
      </div>
    </Dialog>
  );
}
