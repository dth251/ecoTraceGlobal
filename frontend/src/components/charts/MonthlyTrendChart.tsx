import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface MonthlyTrendPoint {
  month: string;
  scope1: number;
  scope2: number;
  scope3: number;
}

export interface MonthlyTrendChartProps {
  data: MonthlyTrendPoint[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [activeScope, setActiveScope] = useState<"all" | "scope1" | "scope2" | "scope3">("all");

  const chartData = data.map((d) => {
    const s1 = d.scope1 / 1000;
    const s2 = d.scope2 / 1000;
    const s3 = d.scope3 / 1000;
    const total = s1 + s2 + s3;
    return {
      month: d.month,
      scope1: s1,
      scope2: s2,
      scope3: s3,
      total: Number(total.toFixed(2)),
      targetBudget: 120, // Net-zero target limit line
    };
  });

  return (
    <div className="space-y-3">
      {/* Chart Toolbar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveScope("all")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              activeScope === "all" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setActiveScope("scope1")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              activeScope === "scope1" ? "bg-scope1 text-white" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            Scope 1
          </button>
          <button
            type="button"
            onClick={() => setActiveScope("scope2")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              activeScope === "scope2" ? "bg-scope2 text-white" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            Scope 2
          </button>
          <button
            type="button"
            onClick={() => setActiveScope("scope3")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              activeScope === "scope3" ? "bg-scope3 text-white" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            Scope 3
          </button>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setChartType("area")}
            className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition-all ${
              chartType === "area" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
            }`}
          >
            Đường vùng (Area)
          </button>
          <button
            type="button"
            onClick={() => setChartType("bar")}
            className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition-all ${
              chartType === "bar" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
            }`}
          >
            Cột xếp chồng
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "area" ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scope1Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e8590c" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#e8590c" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="scope2Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1c7ed6" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#1c7ed6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="scope3Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7048e8" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#7048e8" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis unit=" t" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-white shadow-xl text-xs space-y-1.5">
                      <p className="font-bold text-slate-300 border-b border-slate-800 pb-1">{label}</p>
                      {payload.map((entry) => (
                        <div key={entry.name} className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-slate-300">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            {entry.name}:
                          </span>
                          <span className="font-bold text-white">
                            {Number(entry.value).toFixed(2)} tCO₂e
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              {(activeScope === "all" || activeScope === "scope1") && (
                <Area
                  type="monotone"
                  dataKey="scope1"
                  name="Scope 1 (Nhiên liệu)"
                  stackId={activeScope === "all" ? "1" : undefined}
                  stroke="#e8590c"
                  strokeWidth={2}
                  fill="url(#scope1Grad)"
                />
              )}
              {(activeScope === "all" || activeScope === "scope2") && (
                <Area
                  type="monotone"
                  dataKey="scope2"
                  name="Scope 2 (Điện lưới)"
                  stackId={activeScope === "all" ? "1" : undefined}
                  stroke="#1c7ed6"
                  strokeWidth={2}
                  fill="url(#scope2Grad)"
                />
              )}
              {(activeScope === "all" || activeScope === "scope3") && (
                <Area
                  type="monotone"
                  dataKey="scope3"
                  name="Scope 3 (Chuỗi cung ứng)"
                  stackId={activeScope === "all" ? "1" : undefined}
                  stroke="#7048e8"
                  strokeWidth={2}
                  fill="url(#scope3Grad)"
                />
              )}
              <ReferenceLine y={120} stroke="#10b981" strokeDasharray="4 4" label={{ value: "Mục tiêu Q3", fill: "#10b981", fontSize: 10 }} />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis unit=" t" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(val: number) => `${val.toFixed(2)} tCO₂e`} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              {(activeScope === "all" || activeScope === "scope1") && (
                <Bar dataKey="scope1" name="Scope 1" stackId="a" fill="#e8590c" radius={[0, 0, 0, 0]} />
              )}
              {(activeScope === "all" || activeScope === "scope2") && (
                <Bar dataKey="scope2" name="Scope 2" stackId="a" fill="#1c7ed6" radius={[0, 0, 0, 0]} />
              )}
              {(activeScope === "all" || activeScope === "scope3") && (
                <Bar dataKey="scope3" name="Scope 3" stackId="a" fill="#7048e8" radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
