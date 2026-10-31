import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_INK } from "@/lib/scopeColors";

export interface ScopeSegment {
  key: string;
  label: string;
  value: number;
  color: string;
  display: string;
}

export interface ScopePieChartProps {
  segments: ScopeSegment[];
  totalKg: number;
  formatPercent: (r: number) => string;
}

export function ScopePieChart({ segments, totalKg, formatPercent }: ScopePieChartProps) {
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
    <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
      <div className="relative h-64 w-64 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={96}
              paddingAngle={3}
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
                    <div className="rounded-xl border border-slate-100 bg-white/95 p-3 shadow-lg backdrop-blur-sm text-xs space-y-1">
                      <div className="flex items-center gap-2 font-semibold text-slate-800">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </div>
                      <div className="text-slate-600">Phát thải: <b className="text-slate-900">{d.display}</b></div>
                      <div className="text-slate-500">Tỷ trọng: <b className="text-brand font-semibold">{d.percent}</b></div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label inside donut */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Tổng cộng</span>
          <span className="text-lg font-extrabold text-slate-900">
            {totalKg >= 1000 ? `${(totalKg / 1000).toFixed(1)} t` : `${totalKg.toFixed(0)} kg`}
          </span>
          <span className="text-[11px] text-slate-400">CO₂e</span>
        </div>
      </div>

      <div className="w-full flex-1 space-y-3">
        {segments.map((s) => {
          const share = totalKg > 0 ? (s.value / totalKg) * 100 : 0;
          return (
            <div key={s.key} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 transition-colors hover:bg-slate-50">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2.5 font-medium text-slate-800">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </div>
                <div className="font-bold text-slate-900">{s.display}</div>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-slate-200/70 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(share, 100)}%`, backgroundColor: s.color }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-600 tabular-nums shrink-0">
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

