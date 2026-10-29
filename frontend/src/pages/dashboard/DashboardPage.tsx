import { useState } from "react";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { AbcCarbonRanking } from "@/pages/dashboard/widgets/AbcCarbonRanking";
import { AiIntelligenceWidget } from "@/pages/dashboard/widgets/AiIntelligenceWidget";
import { IngestionAuditFeed } from "@/pages/dashboard/widgets/IngestionAuditFeed";
import { IntelligenceHeader } from "@/pages/dashboard/widgets/IntelligenceHeader";
import { KpiCards } from "@/pages/dashboard/widgets/KpiCards";
import { MonthlyTrend } from "@/pages/dashboard/widgets/MonthlyTrend";
import { ProductIntensity } from "@/pages/dashboard/widgets/ProductIntensity";
import { useDocuments } from "@/queries/useDocuments";
import { useFootprints } from "@/queries/useProducts";
import { batchToSummary } from "@/pages/ai/batchSummary";
import { useSummary } from "@/queries/useSummary";
import { useAiBatchStore } from "@/stores/aiBatchStore";
import type { EmissionSummary } from "@/types/domain";

const DEMO_SUMMARY: EmissionSummary = {
  periodId: "demo-period",
  totalKg: 968000,
  previousTotalKg: 1128000,
  calculatedAt: "2026-03-31T12:00:00Z",
  byScope: {
    scope1: 231800,
    scope2: 542400,
    scope3: 193800,
  },
  byMonth: [
    { month: "T10/25", scope1: 82000, scope2: 189000, scope3: 71000 },
    { month: "T11/25", scope1: 79000, scope2: 184000, scope3: 68000 },
    { month: "T12/25", scope1: 84000, scope2: 191000, scope3: 74000 },
    { month: "T01/26", scope1: 76000, scope2: 178000, scope3: 63000 },
    { month: "T02/26", scope1: 78000, scope2: 181000, scope3: 65000 },
    { month: "T03/26", scope1: 77800, scope2: 183400, scope3: 65800 },
  ],
  topSources: [
    { category: "ELECTRICITY", label: "Điện lưới EVN", co2eKg: 542400 },
    { category: "FUEL", label: "Dầu Diesel lò sấy", co2eKg: 231800 },
    { category: "FREIGHT", label: "Vận tải biển Hải Phòng – Hamburg", co2eKg: 115200 },
    { category: "MATERIAL", label: "Hạt nhựa tái sinh & Giấy kraft", co2eKg: 78600 },
  ],
};

export function DashboardPage() {
  const { periodId } = useCurrentContext();
  const summaryQuery = useSummary(periodId);
  const docsQuery = useDocuments(periodId);
  const footprintsQuery = useFootprints(periodId);

  const aiBatch = useAiBatchStore((s) => s.batch);

  const [, setActiveTimeframe] = useState("Q3 2026");

  // Ưu tiên số liệu backend của kỳ; chưa có thì dùng lô chứng từ AI vừa xử lý; cuối cùng mới là dữ liệu mẫu
  const summary: EmissionSummary =
    summaryQuery.data && summaryQuery.data.totalKg > 0
      ? summaryQuery.data
      : aiBatch
        ? batchToSummary(aiBatch)
        : DEMO_SUMMARY;

  const documents = docsQuery.data ?? [];
  const footprints = footprintsQuery.data ?? [];

  return (
    <div className="space-y-4">
      {/* 1. Intelligence Command Header Bar */}
      <IntelligenceHeader onTimeframeChange={(tf) => setActiveTimeframe(tf)} />

      {/* 2. Top Metric Cards (Shopify Intelligence Platform Style) */}
      <KpiCards summary={summary} />

      {/* 3. Hero Section: Emissions Trajectory & AI Copilot Widget */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <MonthlyTrend summary={summary} />
        </div>
        <div className="lg:col-span-5">
          <AiIntelligenceWidget suggestions={aiBatch?.estimate.optimization.suggestions} />
        </div>
      </div>

      {/* 4. Secondary Section: ABC Carbon Analysis & Live Document Ingestion Stream */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <AbcCarbonRanking summary={summary} />
        </div>
        <div className="lg:col-span-5">
          <IngestionAuditFeed documents={documents} />
        </div>
      </div>

      {/* 5. Product Level Footprint & EU DPP Compliance */}
      <ProductIntensity footprints={footprints} />
    </div>
  );
}

export default DashboardPage;
