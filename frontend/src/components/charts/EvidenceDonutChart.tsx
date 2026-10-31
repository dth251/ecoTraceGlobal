import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_INK } from "@/lib/scopeColors";

export interface EvidenceSegment {
  key: string;
  label: string;
  value: number;
  color: string;
  display: string;
}

export interface EvidenceDonutChartProps {
  segments: EvidenceSegment[];
  totalKg: number;
  formatPercent: (r: number) => string;
}

export function EvidenceDonutChart({ segments, totalKg, formatPercent }: EvidenceDonutChartProps) {
  const visible = segments.filter((s) => s.value > 0);
  const data = visible.map((s) => ({
    name: s.label,
    value: s.value,
    color: s.color,
    display: s.display,
    percent: totalKg > 0 ? formatPercent(s.value / totalKg) : "0%",
  }));

  if (totalKg <= 0 || visible.length === 0) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
      <div className="relative h-56 w-56 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              stroke={CHART_INK.surface}
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-slate-100 bg-white/95 p-2.5 shadow-lg backdrop-blur-sm text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </div>
                      <div className="text-slate-600">Khối lượng: <b className="text-slate-900">{d.display}</b></div>
                      <div className="text-slate-500">Tỷ trọng: <b className="text-brand font-semibold">{d.percent}</b></div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Minh chứng</span>
          <span className="text-sm font-bold text-slate-800">
            {segments[0]?.value && totalKg > 0 ? formatPercent((segments[0].value + (segments[1]?.value ?? 0)) / totalKg) : "0%"}
          </span>
          <span className="text-[10px] text-slate-400">Có bằng chứng</span>
        </div>
      </div>

      <div className="w-full flex-1 space-y-2.5">
        {segments.map((s) => {
          const share = totalKg > 0 ? (s.value / totalKg) * 100 : 0;
          return (
            <div key={s.key} className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </div>
                <div className="font-semibold text-slate-900">{s.display}</div>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(share, 100)}%`, backgroundColor: s.color }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-slate-500 tabular-nums shrink-0">
                  {formatPercent(s.value / totalKg)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

