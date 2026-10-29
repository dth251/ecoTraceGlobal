import { TrendingDown } from "lucide-react";
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart";
import type { EmissionSummary } from "@/types/domain";

export interface MonthlyTrendProps {
  summary: EmissionSummary;
}

export function MonthlyTrend({ summary }: MonthlyTrendProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-slate-300 transition-all">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Lộ trình phát thải & Dự báo Net-Zero (tCO₂e)
          </h2>
          <p className="text-xs text-slate-500">
            Theo dõi xu hướng thực tế theo 3 Scope so với chỉ tiêu hạn mức khử carbon.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-100">
          <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
          <span>-18.4t xu hướng</span>
        </div>
      </div>

      <MonthlyTrendChart data={summary.byMonth} />
    </div>
  );
}
