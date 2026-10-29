import { useTranslation } from "react-i18next";
import { Co2eValue } from "@/components/emissions/Co2eValue";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Recommendation } from "@/types/domain";

export interface RecommendationCardProps {
  recommendation: Recommendation;
  onSimulate: (recommendation: Recommendation) => void;
}

export function RecommendationCard({ recommendation, onSimulate }: RecommendationCardProps) {
  const { t } = useTranslation();

  return (
    <Card
      title={recommendation.title}
      actions={<Badge variant="info">Ưu tiên {recommendation.priority}</Badge>}
    >
      <p className="text-sm font-medium text-brand-800">
        Giảm <Co2eValue kg={recommendation.reductionKgPerYear} /> / năm (
        {(recommendation.reductionPercent * 100).toFixed(0)}%)
      </p>
      <p className="mt-1 text-xs text-slate-600">{recommendation.rationale}</p>
      {recommendation.paybackYears !== null && (
        <p className="mt-1 text-xs text-slate-500">Hoàn vốn ~ {recommendation.paybackYears} năm</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{t("optimizer.disclaimer")}</span>
        <Button size="sm" variant="secondary" onClick={() => onSimulate(recommendation)}>
          {t("optimizer.simulate")}
        </Button>
      </div>
    </Card>
  );
}
