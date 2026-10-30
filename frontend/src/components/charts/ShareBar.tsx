import { Tooltip } from "@/components/ui/Tooltip";

export interface ShareSegment {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Giá trị đã định dạng để hiển thị (ví dụ "16,5 tCO₂e") */
  display: string;
}

/**
 * Thanh 100% cho cơ cấu một tổng (phần trên toàn thể, ít nhóm).
 * Có khe 2px giữa các đoạn, đầu thanh bo tròn, nhãn trực tiếp dưới thanh và tooltip khi rê chuột.
 */
export function ShareBar({ segments, formatPercent }: { segments: ShareSegment[]; formatPercent: (r: number) => string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  if (total <= 0) return null;
  return (
    <div>
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-[4px]" role="img" aria-label={segments.map((s) => `${s.label} ${formatPercent(s.value / total)}`).join(", ")}>
        {visible.map((s) => (
          <Tooltip key={s.key} content={`${s.label}: ${s.display} (${formatPercent(s.value / total)})`}>
            <div
              className="h-full transition-opacity duration-hover first:rounded-l-[4px] last:rounded-r-[4px] hover:opacity-85"
              style={{ width: `${(s.value / total) * 100}%`, background: s.color, minWidth: 4 }}
            />
          </Tooltip>
        ))}
      </div>
      <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-3">
        {segments.map((s) => (
          <div key={s.key}>
            <dt className="flex items-center gap-2 text-sm text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </dt>
            <dd className="mt-1 text-lg font-bold text-ink tabular-nums">
              {s.display}
              <span className="ml-2 text-sm font-medium text-slate-600">{formatPercent(s.value / total)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
