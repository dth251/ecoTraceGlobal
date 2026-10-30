import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/api/ai";
import { optimizerApi } from "@/api/optimizer";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { usePermission } from "@/hooks/usePermission";
import { SuggestionCard } from "@/pages/ai/SuggestionCard";
import { RecommendationCard } from "@/pages/optimizer/RecommendationCard";
import { ScenarioSimulator } from "@/pages/optimizer/ScenarioSimulator";
import { keys } from "@/queries/keys";
import { useRecommendations } from "@/queries/useRecommendations";
import { useAiBatchStore } from "@/stores/aiBatchStore";
import type { Recommendation } from "@/types/domain";

export function OptimizerPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { periodId } = useCurrentContext();
  const { canEdit } = usePermission();
  const recommendations = useRecommendations(periodId);
  const aiBatch = useAiBatchStore((s) => s.batch);
  const setBatch = useAiBatchStore((s) => s.setBatch);
  const [simulating, setSimulating] = useState<Recommendation | null>(null);

  const [regenerating, setRegenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Tạo lại gợi ý bằng AI từ số liệu của lô chứng từ gần nhất
  const handleRegenerate = async () => {
    if (!aiBatch) return;
    setRegenerating(true);
    setAiError(null);
    try {
      const items = aiBatch.records.flatMap((r) => (r.extraction.data ? [{ name: r.id, data: r.extraction.data }] : []));
      const estimate = await aiApi.estimate(items);
      const byId = new Map(estimate.documents.map((d) => [d.name, d]));
      setBatch(aiBatch.records.map((r) => ({ ...r, estimate: byId.get(r.id) ?? r.estimate })), estimate);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "AI chưa tạo được gợi ý");
    } finally {
      setRegenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!periodId) return;
    await optimizerApi.generate(periodId);
    await queryClient.invalidateQueries({ queryKey: keys.recommendations(periodId) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">{t("optimizer.title")}</h1>
        {aiBatch && (
          <Button size="sm" variant="secondary" onClick={handleRegenerate} loading={regenerating}>
            Tạo lại gợi ý bằng AI
          </Button>
        )}
        {canEdit && periodId && (
          <Button size="sm" onClick={handleGenerate}>
            {t("optimizer.generate")}
          </Button>
        )}
      </div>

      {aiError && <div className="rounded-md bg-danger-light p-2 text-xs text-danger-dark">{aiError}</div>}

      {aiBatch && aiBatch.estimate.optimization.suggestions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">Gợi ý AI từ lô chứng từ gần nhất</h2>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <span className="font-bold text-slate-800">Tóm tắt:</span> {aiBatch.estimate.optimization.summary}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {aiBatch.estimate.optimization.suggestions.map((item) => (
              <SuggestionCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {(recommendations.data ?? []).length === 0 ? (
        !aiBatch && (
          <EmptyState
            title={t("common.empty")}
            description="Tải chứng từ ở mục Chứng từ để AI phân tích và gợi ý giảm phát thải."
            action={
              <Link to="/documents" className="text-sm font-semibold text-brand hover:underline">
                Tải chứng từ →
              </Link>
            }
          />
        )
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
