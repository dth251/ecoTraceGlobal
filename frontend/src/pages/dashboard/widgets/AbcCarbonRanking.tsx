import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";
import type { EmissionSummary } from "@/types/domain";

export interface AbcCarbonRankingProps {
  summary: EmissionSummary;
}

interface RankedItem {
  name: string;
  grade: "A" | "B" | "C";
  gradeBadge: string;
  scope: string;
  scopeBadge: string;
  co2eTon: number;
  sharePct: number;
  trend: string;
  trendPositive: boolean;
  aiNote: string;
}

export function AbcCarbonRanking({ summary }: AbcCarbonRankingProps) {
  const totalKg = summary.totalKg || 1;

  // Xếp hạng ABC mô phỏng theo chuẩn Skymetrics Analytics
  const items: RankedItem[] = [
    {
      name: "Điện lưới EVN (Dây chuyền 1 & 2)",
      grade: "A",
      gradeBadge: "bg-emerald-100 text-emerald-800 border-emerald-200",
      scope: "Scope 2",
      scopeBadge: "bg-blue-50 text-blue-700 border-blue-200",
      co2eTon: Number(((summary.byScope.scope2 * 0.85) / 1000).toFixed(1)) || 542.4,
      sharePct: Math.round(((summary.byScope.scope2 * 0.85) / totalKg) * 100) || 42,
      trend: "-3.2%",
      trendPositive: true,
      aiNote: "Ưu tiên ký Hợp đồng mua bán điện PPA",
    },
    {
      name: "Dầu Diesel DO 0.05S (Lò sấy trung tâm)",
      grade: "A",
      gradeBadge: "bg-emerald-100 text-emerald-800 border-emerald-200",
      scope: "Scope 1",
      scopeBadge: "bg-orange-50 text-orange-700 border-orange-200",
      co2eTon: Number((summary.byScope.scope1 / 1000).toFixed(1)) || 231.8,
      sharePct: Math.round((summary.byScope.scope1 / totalKg) * 100) || 18,
      trend: "-8.4%",
      trendPositive: true,
      aiNote: "Thay thế bằng sinh khối mùn cưa",
    },
    {
      name: "Vận tải đường biển (Hải Phòng - Rotterdam)",
      grade: "B",
      gradeBadge: "bg-amber-100 text-amber-800 border-amber-200",
      scope: "Scope 3",
      scopeBadge: "bg-purple-50 text-purple-700 border-purple-200",
      co2eTon: Number(((summary.byScope.scope3 * 0.5) / 1000).toFixed(1)) || 192.0,
      sharePct: Math.round(((summary.byScope.scope3 * 0.5) / totalKg) * 100) || 15,
      trend: "+1.5%",
      trendPositive: false,
      aiNote: "Tối ưu hóa tải trọng container FCL",
    },
    {
      name: "Hạt nhựa tái sinh & Giấy kraft bao bì",
      grade: "B",
      gradeBadge: "bg-amber-100 text-amber-800 border-amber-200",
      scope: "Scope 3",
      scopeBadge: "bg-purple-50 text-purple-700 border-purple-200",
      co2eTon: Number(((summary.byScope.scope3 * 0.3) / 1000).toFixed(1)) || 115.2,
      sharePct: Math.round(((summary.byScope.scope3 * 0.3) / totalKg) * 100) || 9,
      trend: "-12.0%",
      trendPositive: true,
      aiNote: "Đạt chuẩn hàm lượng tái chế GRS",
    },
    {
      name: "Điện năng khối văn phòng & Điều hòa",
      grade: "C",
      gradeBadge: "bg-slate-100 text-slate-700 border-slate-200",
      scope: "Scope 2",
      scopeBadge: "bg-blue-50 text-blue-700 border-blue-200",
      co2eTon: Number(((summary.byScope.scope2 * 0.15) / 1000).toFixed(1)) || 42.6,
      sharePct: Math.round(((summary.byScope.scope2 * 0.15) / totalKg) * 100) || 3,
      trend: "-1.0%",
      trendPositive: true,
      aiNote: "Lắp cảm biến nhiệt độ thông minh",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-slate-300 transition-all">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-slate-900">
              Phân tích ABC Trọng yếu Phát thải
            </h2>
            <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 border border-brand-100">
              Pareto 80/20
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Xếp hạng nguồn phát thải theo mức độ ảnh hưởng để ưu tiên ngân sách khử carbon.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-400">
              <th className="pb-2">Nguồn phát thải</th>
              <th className="pb-2 text-center">Hạng ABC</th>
              <th className="pb-2">Scope</th>
              <th className="pb-2 text-right">Khối lượng</th>
              <th className="pb-2 text-right">Tỷ trọng</th>
              <th className="pb-2 text-right">Xu hướng</th>
              <th className="pb-2 pl-3">Khuyến nghị AI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((it) => (
              <tr key={it.name} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-2.5 font-bold text-slate-800 pr-2">{it.name}</td>
                <td className="py-2.5 text-center">
                  <span
                    className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-black ${it.gradeBadge}`}
                  >
                    Hạng {it.grade}
                  </span>
                </td>
                <td className="py-2.5">
                  <span
                    className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${it.scopeBadge}`}
                  >
                    {it.scope}
                  </span>
                </td>
                <td className="py-2.5 text-right font-bold text-slate-900">
                  {it.co2eTon} tCO₂e
                </td>
                <td className="py-2.5 text-right font-semibold text-slate-600">
                  {it.sharePct}%
                </td>
                <td className="py-2.5 text-right">
                  <span
                    className={`inline-flex items-center gap-0.5 font-bold ${
                      it.trendPositive ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {it.trendPositive ? (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    )}
                    {it.trend}
                  </span>
                </td>
                <td className="py-2.5 pl-3 text-[11px] font-medium text-slate-500 truncate max-w-xs">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span>{it.aiNote}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

