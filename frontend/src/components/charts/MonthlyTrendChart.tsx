import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

/** Phát thải theo tháng (tCO₂e), cột chồng theo scope; khe 2px giữa các đoạn, đầu cột bo 4px */
export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const rows = data.map((d) => ({
    month: monthLabel(d.month, lang),
    scope1: d.scope1 / 1000,
    scope2: d.scope2 / 1000,
    scope3: d.scope3 / 1000,
  }));
  const fmt = (v: number) => `${formatNumber(v, lang, 2)} tCO₂e`;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: CHART_INK.secondary }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fontSize: 13, fill: CHART_INK.secondary }}
            tickFormatter={(v: number) => formatNumber(v, lang, 1)}
            label={{ value: "tCO₂e", angle: -90, position: "insideLeft", fill: CHART_INK.secondary, fontSize: 13 }}
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
              maxBarSize={56}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
