import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#027a48", "#1c7ed6", "#e8590c", "#7048e8", "#d97706", "#64748b"];

export interface SourceDonutItem {
  category: string;
  label: string;
  co2eKg: number;
}

export interface SourceDonutChartProps {
  items: SourceDonutItem[];
}

export function SourceDonutChart({ items }: SourceDonutChartProps) {
  const top5 = items.slice(0, 5);
  const restKg = items.slice(5).reduce((sum, i) => sum + i.co2eKg, 0);
  const slices = restKg > 0 ? [...top5, { category: "OTHER", label: "Khác", co2eKg: restKg }] : top5;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="co2eKg"
            nameKey="label"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
          >
            {slices.map((s, idx) => (
              <Cell key={s.category} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(val: number) => `${(val / 1000).toFixed(2)} tCO₂e`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
