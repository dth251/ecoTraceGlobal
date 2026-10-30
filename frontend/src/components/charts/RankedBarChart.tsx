import { Tooltip } from "@/components/ui/Tooltip";

export interface RankedItem {
  name: string;
  value: number;
  color: string;
}

export interface RankedBarChartProps {
  items: RankedItem[];
  /** Định dạng đầy đủ cho tooltip */
  format: (v: number) => string;
  /** Nhãn ngắn ở cuối thanh */
  labelFormat?: (v: number) => string;
}

/**
 * Thanh ngang xếp hạng theo độ lớn (HTML để chữ không bị ngắt/chồng).
 * Màu theo thực thể (scope của nguồn), không theo thứ hạng; nhãn giá trị trực tiếp ở cuối thanh; đầu thanh bo 4px.
 */
export function RankedBarChart({ items, format, labelFormat = format }: RankedBarChartProps) {
  const max = Math.max(...items.map((i) => i.value), 0);
  if (max <= 0) return null;
  return (
    <ol className="space-y-4">
      {items.map((item) => (
        <li key={item.name}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink">{item.name}</span>
            <span className="shrink-0 font-semibold tabular-nums text-ink">{labelFormat(item.value)}</span>
          </div>
          <Tooltip content={`${item.name}: ${format(item.value)}`}>
            <div className="mt-1.5 h-3 w-full rounded-[4px] bg-surface">
              <div
                className="h-full rounded-[4px] transition-[width] duration-ui ease-smooth"
                style={{ width: `${Math.max((item.value / max) * 100, 1.5)}%`, background: item.color }}
              />
            </div>
          </Tooltip>
        </li>
      ))}
    </ol>
  );
}
