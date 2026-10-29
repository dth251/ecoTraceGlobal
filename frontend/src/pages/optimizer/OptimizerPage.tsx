import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { optimizerApi } from "@/api/optimizer";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { usePermission } from "@/hooks/usePermission";
import { RecommendationCard } from "@/pages/optimizer/RecommendationCard";
import { ScenarioSimulator } from "@/pages/optimizer/ScenarioSimulator";
import { keys } from "@/queries/keys";
import { useRecommendations } from "@/queries/useRecommendations";
import type { Recommendation } from "@/types/domain";

export function OptimizerPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { periodId } = useCurrentContext();
  const { canEdit } = usePermission();
  const recommendations = useRecommendations(periodId);
  const [simulating, setSimulating] = useState<Recommendation | null>(null);

  const handleGenerate = async () => {
    if (!periodId) return;
    await optimizerApi.generate(periodId);
    await queryClient.invalidateQueries({ queryKey: keys.recommendations(periodId) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">{t("optimizer.title")}</h1>
        {canEdit && periodId && (
          <Button size="sm" onClick={handleGenerate}>
            {t("optimizer.generate")}
          </Button>
        )}
      </div>

      {(recommendations.data ?? []).length === 0 ? (
        <EmptyState title={t("common.empty")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {(recommendations.data ?? []).map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} onSimulate={setSimulating} />
          ))}
        </div>
      )}

      {periodId && (
        <ScenarioSimulator
          periodId={periodId}
          recommendation={simulating}
          onClose={() => setSimulating(null)}
        />
      )}
    </div>
  );
}

export default OptimizerPage;
