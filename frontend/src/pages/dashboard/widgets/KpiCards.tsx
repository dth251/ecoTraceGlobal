import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Leaf,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Co2eValue } from "@/components/emissions/Co2eValue";
import type { EmissionSummary } from "@/types/domain";

export interface KpiCardsProps {
  summary: EmissionSummary;
}

export function KpiCards({ summary }: KpiCardsProps) {
  const totalKg = summary.totalKg || 1;
  const s1Pct = Math.round((summary.byScope.scope1 / totalKg) * 100);
  const s2Pct = Math.round((summary.byScope.scope2 / totalKg) * 100);
  const s3Pct = 100 - s1Pct - s2Pct;

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {/* CARD 1: Total Emissions & Net-Zero Trajectory */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-slate-300 transition-all">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tổng phát thải CO₂e
            </span>
            <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              <Co2eValue kg={summary.totalKg} />
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Leaf className="h-5 w-5" />
          </div>
        </div>

        {/* Trend & Target Bar */}
        <div className="mt-3.5 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            <ArrowDownRight className="h-3.5 w-3.5" />
            -14.2% so với kỳ trước
          </span>
          <span className="text-[11px] font-semibold text-slate-400">Chỉ tiêu Net-Zero</span>
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-brand"
            style={{ width: "74%" }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">Đã dùng 74% ngân sách carbon năm 2026</p>
      </div>

      {/* CARD 2: AI Scope Breakdown */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-slate-300 transition-all">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Phân bổ 3 Scope (AI Audit)
            </span>
            <div className="mt-1 text-lg font-black tracking-tight text-slate-900">
              Scope 1 • 2 • 3
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        {/* Tri-color segmented bar */}
        <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            style={{ width: `${Math.max(s1Pct, 5)}%` }}
            className="bg-scope1 hover:opacity-90 transition-opacity"
            title={`Scope 1: ${s1Pct}%`}
          />
          <div
            style={{ width: `${Math.max(s2Pct, 5)}%` }}
            className="bg-scope2 hover:opacity-90 transition-opacity"
            title={`Scope 2: ${s2Pct}%`}
          />
          <div
            style={{ width: `${Math.max(s3Pct, 5)}%` }}
            className="bg-scope3 hover:opacity-90 transition-opacity"
            title={`Scope 3: ${s3Pct}%`}
          />
        </div>

        {/* Legend */}
        <div className="mt-2.5 grid grid-cols-3 gap-1 text-[11px]">
          <div>
            <span className="inline-block h-2 w-2 rounded-full bg-scope1 mr-1" />
            <span className="font-bold text-slate-700">S1: {s1Pct}%</span>
          </div>
          <div>
            <span className="inline-block h-2 w-2 rounded-full bg-scope2 mr-1" />
            <span className="font-bold text-slate-700">S2: {s2Pct}%</span>
          </div>
          <div>
            <span className="inline-block h-2 w-2 rounded-full bg-scope3 mr-1" />
            <span className="font-bold text-slate-700">S3: {s3Pct}%</span>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">Scope 2 chiếm tỷ trọng cao nhất (điện lưới)</p>
      </div>

      {/* CARD 3: Carbon Intensity & Productivity */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-slate-300 transition-all">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Cường độ carbon sản phẩm
            </span>
            <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              1.84 <span className="text-sm font-semibold text-slate-500">kg CO₂e/SP</span>
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Zap className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-3.5 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            <ArrowUpRight className="h-3.5 w-3.5" />
            +4.2% hiệu quả năng lượng
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-slate-500">Tối ưu dự kiến (Q4):</span>
          <span className="font-bold text-emerald-600">1.62 kg CO₂e</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Sản phẩm chủ lực: EcoTote & Bao bì tái chế</p>
      </div>

      {/* CARD 4: Green Passport & Audit Readiness */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-slate-300 transition-all">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Hộ chiếu số & CBAM Ready
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-slate-900">Hạng A</span>
              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-800">
                96/100
              </span>
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-3.5 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
            ● 24 Hộ chiếu số hoạt động
          </span>
          <span className="text-[11px] font-bold text-emerald-600">EU DPP Ready</span>
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-600" style={{ width: "96%" }} />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">Dữ liệu được bảo chứng bằng mã băm SHA-256</p>
      </div>
    </div>
  );
}
