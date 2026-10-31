import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_INK } from "@/lib/scopeColors";

export interface SourceBarItem {
  name: string;
  value: number; // in tCO₂e
  color: string;
}

export interface SourceBarChartProps {
  items: SourceBarItem[];
  format: (v: number) => string;
  totalKg: number;
}

export function SourceBarChart({ items, format, totalKg }: SourceBarChartProps) {
  if (items.length === 0) return null;

  const data = items.map((i) => ({
    name: i.name,
    value: i.value,
    color: i.color,
    percent: totalKg > 0 ? `${(((i.value * 1000) / totalKg) * 100).toFixed(1)}%` : "0%",
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 32, left: 16, bottom: 8 }}
          barCategoryGap="20%"
        >
          <CartesianGrid horizontal={false} stroke={CHART_INK.grid} strokeDasharray="3 3" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: CHART_INK.secondary }}
            tickFormatter={(v: number) => `${v.toFixed(1)}t`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={130}
            tick={{ fontSize: 12, fill: CHART_INK.primary, fontWeight: 500 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(14,16,19,0.03)" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div className="rounded-xl border border-slate-100 bg-white/95 p-3 shadow-lg backdrop-blur-sm text-xs space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </div>
                    <div className="text-slate-600">Phát thải: <b className="text-slate-900">{format(d.value)}</b></div>
                    <div className="text-slate-500">Tỷ trọng: <b className="text-brand font-semibold">{d.percent}</b></div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((entry, index) => (
              <Cell key={`bar-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

