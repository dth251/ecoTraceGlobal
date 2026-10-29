import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ScopeBarChartProps {
  scope1Kg: number;
  scope2Kg: number;
  scope3Kg: number;
}

export function ScopeBarChart({ scope1Kg, scope2Kg, scope3Kg }: ScopeBarChartProps) {
  const { t } = useTranslation();
  const data = [
    { name: "Scope 1", tco2e: scope1Kg / 1000, fill: "#e8590c" },
    { name: "Scope 2", tco2e: scope2Kg / 1000, fill: "#1c7ed6" },
    { name: "Scope 3", tco2e: scope3Kg / 1000, fill: "#0e7490" },
  ];

  return (
    <div className="h-56 w-full" aria-label={t("dashboard.totalEmissions")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis unit=" t" tick={{ fontSize: 12 }} />
          <Tooltip formatter={(val: number) => `${val.toFixed(2)} tCO₂e`} />
          <Bar dataKey="tco2e" fill="#027a48" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
