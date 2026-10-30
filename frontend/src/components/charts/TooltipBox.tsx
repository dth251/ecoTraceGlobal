export interface ChartTooltipRow {
  label: string;
  color: string;
  value: string;
}

/** Hộp tooltip chung: tiêu đề, từng dòng có chấm màu, dòng tổng in đậm */
export function TooltipBox({ title, rows, total }: { title: string; rows: ChartTooltipRow[]; total?: string }) {
  return (
    <div className="min-w-44 rounded-xl bg-ink px-3 py-2.5 text-sm text-white shadow-float">
      <p className="font-semibold">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-ink-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
              {r.label}
            </span>
            <span className="tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
      {total && <p className="mt-1.5 flex justify-between gap-4 border-t border-white/10 pt-1.5 font-semibold"><span>Σ</span><span className="tabular-nums">{total}</span></p>}
    </div>
  );
}
