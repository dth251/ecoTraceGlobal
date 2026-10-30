import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SCOPE_COLORS } from "@/lib/scopeColors";

export interface MonthlyTrendPoint {
  month: string;
  scope1: number;
  scope2: number;
  scope3: number;
}

export interface MonthlyTrendChartProps {
  data: MonthlyTrendPoint[];
}

/** Phát thải theo tháng, cột chồng theo scope (đơn vị tCO₂e) */
export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const { t } = useTranslation();
  const rows = data.map((d) => ({
    month: d.month,
    scope1: d.scope1 / 1000,
    scope2: d.scope2 / 1000,
    scope3: d.scope3 / 1000,
  }));

  return (
    <div className="h-72 w-full" aria-label={t("dashboard.monthlyTrend")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#eef0f3" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: "#475569" }} />
          <YAxis unit=" t" tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: "#475569" }} width={56} />
          <Tooltip
            cursor={{ fill: "rgba(14,16,19,0.04)" }}
            formatter={(val: number) => `${val.toLocaleString(undefined, { maximumFractionDigits: 2 })} tCO₂e`}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="scope1" name={t("common.scope1")} stackId="s" fill={SCOPE_COLORS.scope1} />
          <Bar dataKey="scope2" name={t("common.scope2")} stackId="s" fill={SCOPE_COLORS.scope2} />
          <Bar dataKey="scope3" name={t("common.scope3")} stackId="s" fill={SCOPE_COLORS.scope3} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
