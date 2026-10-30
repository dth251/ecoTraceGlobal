import type { TooltipProps } from "recharts";
import { TooltipBox } from "@/components/charts/TooltipBox";

/** Tooltip cho recharts: nhận payload, đổi giá trị bằng hàm định dạng */
export function makeTooltip(format: (v: number) => string, showTotal = true) {
  return function RechartsTooltip({ active, payload, label }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    const rows = payload
      .filter((p) => Number(p.value) > 0)
      .map((p) => ({ label: String(p.name), color: String(p.color ?? p.payload?.fill), value: format(Number(p.value)) }));
    const total = payload.reduce((s, p) => s + Number(p.value ?? 0), 0);
    return <TooltipBox title={String(label ?? payload[0].payload?.name ?? "")} rows={rows} total={showTotal && rows.length > 1 ? format(total) : undefined} />;
  };
}
