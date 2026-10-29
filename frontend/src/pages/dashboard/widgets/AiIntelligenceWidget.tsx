import { Link } from "react-router-dom";
import type { EstimateSuggestion } from "@/api/ai";
import {
  ArrowRight,
  Bot,
  ChevronRight,
  Flame,
  Ship,
  Sparkles,
  Zap,
} from "lucide-react";

interface AiRecommendationItem {
  id: string;
  category: "ENERGY" | "LOGISTICS" | "MATERIAL";
  title: string;
  description: string;
  impactLabel: "Cao" | "Trung bình" | "Nhanh chóng";
  impactBadgeColor: string;
  reductionKg: number;
  costSaving: string;
  icon: typeof Zap;
}

const RECOMMENDATIONS: AiRecommendationItem[] = [
  {
    id: "rec-1",
    category: "ENERGY",
    title: "Chuyển đổi lò hơi sấy sang viên nén sinh khối (Biomass)",
    description: "Thay thế dầu DO bằng viên nén gỗ mùn cưa cho dây chuyền 1 & 2 tại Nhà máy Hà Nội.",
    impactLabel: "Cao",
    impactBadgeColor: "bg-red-50 text-red-700 border-red-200",
    reductionKg: 142500,
    costSaving: "Hoàn vốn 8.2 tháng",
    icon: Flame,
  },
  {
    id: "rec-2",
    category: "LOGISTICS",
    title: "Tối ưu hóa gom hàng và tuyến biển Hải Phòng – Hamburg",
    description: "Chuyển 3 lô hàng linh kiện gấp từ đường hàng không (Air) sang vận tải biển đường biển xanh.",
    impactLabel: "Cao",
    impactBadgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    reductionKg: 48200,
    costSaving: "Tiết kiệm $8,400",
    icon: Ship,
  },
  {
    id: "rec-3",
    category: "ENERGY",
    title: "Lắp đặt biến tần VFD cho hệ thống bơm quạt làm mát",
    description: "Giảm 12% điện năng tiêu thụ giờ cao điểm, nâng cao hệ số công suất cosφ lên 0.98.",
    impactLabel: "Nhanh chóng",
    impactBadgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    reductionKg: 28400,
    costSaving: "Tiết kiệm 65 tr đ/tháng",
    icon: Zap,
  },
];

const IMPACT_COLORS = {
  cao: "bg-red-50 text-red-700 border-red-200",
  "trung bình": "bg-indigo-50 text-indigo-700 border-indigo-200",
  thấp: "bg-emerald-50 text-emerald-700 border-emerald-200",
} as const;

const iconOf = (code: string) => (code.startsWith("ELEC") ? Zap : code.startsWith("FREIGHT") ? Ship : Flame);

/** Gợi ý của AI cho lô chứng từ vừa xử lý, đưa về cùng dạng với danh sách mẫu bên dưới. */
function fromAi(items: EstimateSuggestion[]): AiRecommendationItem[] {
  return items.slice(0, 3).map((s) => ({
    id: s.id,
    category: s.target_factor_code.startsWith("ELEC") ? "ENERGY" : s.target_factor_code.startsWith("FREIGHT") ? "LOGISTICS" : "MATERIAL",
    title: s.title,
    description: s.description,
    impactLabel: s.difficulty === "cao" ? "Cao" : s.difficulty === "thấp" ? "Nhanh chóng" : "Trung bình",
    impactBadgeColor: IMPACT_COLORS[s.difficulty as keyof typeof IMPACT_COLORS] ?? IMPACT_COLORS["trung bình"],
    reductionKg: s.estimated_reduction_kg,
    costSaving: `~${s.estimated_reduction_pct.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% tổng phát thải`,
    icon: iconOf(s.target_factor_code),
  }));
}

export function AiIntelligenceWidget({ suggestions }: { suggestions?: EstimateSuggestion[] }) {
  const live = suggestions && suggestions.length > 0;
  const items = live ? fromAi(suggestions) : RECOMMENDATIONS;
  const totalKg = items.reduce((sum, r) => sum + r.reductionKg, 0);
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-4 shadow-sm hover:border-slate-300 transition-all">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-emerald-400">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Gợi ý AI & Tối ưu hóa Khử Carbon
              </h2>
              <p className="text-[11px] text-slate-500">
                {live ? "Từ lô chứng từ AI vừa xử lý" : "Dữ liệu mẫu — xử lý chứng từ ở Trợ lý AI để có gợi ý thật"}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
            <Sparkles className="h-3 w-3" />
            {items.length} cơ hội
          </span>
        </div>

        {/* Actionable Recommendations List */}
        <div className="mt-3 space-y-2.5">
          {items.map((rec) => {
            const Icon = rec.icon;
            return (
              <div
                key={rec.id}
                className="group relative rounded-xl border border-slate-200/60 bg-white p-3 hover:border-brand/40 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-700 border border-slate-200/60 group-hover:bg-brand-50 group-hover:text-brand transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 line-clamp-1">
                          {rec.title}
                        </span>
                        <span
                          className={`rounded-md border px-1.5 py-0.2 text-[10px] font-bold ${rec.impactBadgeColor}`}
                        >
                          {rec.impactLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 leading-snug line-clamp-2">
                        {rec.description}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-[11px]">
                        <span className="font-bold text-emerald-600">
                          ↓ {(rec.reductionKg / 1000).toFixed(1)} tCO₂e
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-semibold text-slate-600">{rec.costSaving}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to="/optimizer"
                    className="shrink-0 p-1 text-slate-400 group-hover:text-brand transition-colors"
                    title="Mô phỏng kịch bản"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">
          Tổng tiềm năng giảm: <strong className="text-slate-900 font-bold">{(totalKg / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tCO₂e{live ? "" : " / năm"}</strong>
        </span>
        <Link
          to="/optimizer"
          className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-800 transition-colors"
        >
          <span>Mở trình mô phỏng</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
