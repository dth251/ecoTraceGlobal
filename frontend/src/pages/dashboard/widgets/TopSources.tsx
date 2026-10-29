import { useTranslation } from "react-i18next";
import { SourceDonutChart } from "@/components/charts/SourceDonutChart";
import { TraceabilityPopover } from "@/components/emissions/TraceabilityPopover";
import { Card } from "@/components/ui/Card";
import type { EmissionSummary } from "@/types/domain";

export interface TopSourcesProps {
  summary: EmissionSummary;
}

export function TopSources({ summary }: TopSourcesProps) {
  const { t } = useTranslation();
  return (
    <Card title={t("dashboard.topSources")}>
      <SourceDonutChart items={summary.topSources} />
      <ul className="mt-3 divide-y divide-slate-100 text-xs">
        {summary.topSources.slice(0, 5).map((src) => (
          <li key={src.category} className="flex items-center justify-between py-1.5">
            <span className="text-slate-700">{src.label}</span>
            <TraceabilityPopover co2eKg={src.co2eKg} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
