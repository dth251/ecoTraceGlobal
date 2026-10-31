import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { makeTooltip } from "@/components/charts/ChartTooltip";
import { CHART_INK, SCOPE_COLORS } from "@/lib/scopeColors";
import { formatNumber } from "@/lib/format";

export interface MonthlyTrendPoint {
  month: string;
  scope1: number;
  scope2: number;
  scope3: number;
}

export interface MonthlyTrendChartProps {
  data: MonthlyTrendPoint[];
}

/** "yyyy-MM" → "T07/2026" (vi) hoặc "Jul 2026" (en) */
function monthLabel(m: string, lang: string) {
  const [y, mo] = m.split("-").map(Number);
  if (!y || !mo) return m;
  if (lang.startsWith("en")) return new Date(y, mo - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  return `T${String(mo).padStart(2, "0")}/${y}`;
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [chartType, setChartType] = useState<"line" | "bar">("line");

  const rows = data.map((d) => ({
    month: monthLabel(d.month, lang),
    scope1: d.scope1 / 1000,
    scope2: d.scope2 / 1000,
    scope3: d.scope3 / 1000,
    total: (d.scope1 + d.scope2 + d.scope3) / 1000,
  }));
  const fmt = (v: number) => `${formatNumber(v, lang, 2)} tCO₂e`;

  return (
    <div className="space-y-3">
      {/* Chart type toggle */}
      <div className="flex items-center justify-end">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setChartType("line")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all ${
              chartType === "line"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Biểu đồ đường
          </button>
          <button
            type="button"
            onClick={() => setChartType("bar")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all ${
              chartType === "bar"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Biểu đồ cột
          </button>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "line" ? (
            <AreaChart data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="scope1Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SCOPE_COLORS.scope1} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={SCOPE_COLORS.scope1} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="scope2Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SCOPE_COLORS.scope2} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={SCOPE_COLORS.scope2} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="scope3Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SCOPE_COLORS.scope3} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={SCOPE_COLORS.scope3} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={CHART_INK.grid} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: CHART_INK.secondary }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tick={{ fontSize: 12, fill: CHART_INK.secondary }}
                tickFormatter={(v: number) => formatNumber(v, lang, 1)}
                label={{ value: "tCO₂e", angle: -90, position: "insideLeft", fill: CHART_INK.secondary, fontSize: 12 }}
              />
              <Tooltip cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }} content={makeTooltip(fmt)} />
              <Area
                type="monotone"
                dataKey="scope1"
                name={t("common.scope1")}
                stroke={SCOPE_COLORS.scope1}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#scope1Grad)"
                dot={{ r: 4, fill: SCOPE_COLORS.scope1, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6 }}
              />
              <Area
                type="monotone"
                dataKey="scope2"
                name={t("common.scope2")}
                stroke={SCOPE_COLORS.scope2}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#scope2Grad)"
                dot={{ r: 4, fill: SCOPE_COLORS.scope2, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6 }}
              />
              <Area
                type="monotone"
                dataKey="scope3"
                name={t("common.scope3")}
                stroke={SCOPE_COLORS.scope3}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#scope3Grad)"
                dot={{ r: 4, fill: SCOPE_COLORS.scope3, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          ) : (
            <BarChart data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke={CHART_INK.grid} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: CHART_INK.secondary }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tick={{ fontSize: 12, fill: CHART_INK.secondary }}
                tickFormatter={(v: number) => formatNumber(v, lang, 1)}
                label={{ value: "tCO₂e", angle: -90, position: "insideLeft", fill: CHART_INK.secondary, fontSize: 12 }}
              />
              <Tooltip cursor={{ fill: "rgba(14,16,19,0.04)" }} content={makeTooltip(fmt)} />
              {(["scope1", "scope2", "scope3"] as const).map((s, i) => (
                <Bar
                  key={s}
                  dataKey={s}
                  name={t(`common.${s}`)}
                  stackId="scope"
                  fill={SCOPE_COLORS[s]}
                  stroke={CHART_INK.surface}
                  strokeWidth={2}
                  radius={i === 2 ? [4, 4, 0, 0] : 0}
                  maxBarSize={52}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
