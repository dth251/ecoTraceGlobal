import { useTranslation } from "react-i18next";
import { ScopeBarChart } from "@/components/charts/ScopeBarChart";
import { Card } from "@/components/ui/Card";
import type { EmissionSummary } from "@/types/domain";

export interface ScopeBreakdownProps {
  summary: EmissionSummary;
}

export function ScopeBreakdown({ summary }: ScopeBreakdownProps) {
  const { t } = useTranslation();
  return (
    <Card title={t("dashboard.totalEmissions")}>
      <ScopeBarChart
        scope1Kg={summary.byScope.scope1}
        scope2Kg={summary.byScope.scope2}
        scope3Kg={summary.byScope.scope3}
      />
    </Card>
  );
}
