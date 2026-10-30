import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";

export interface ChartCardProps {
  title: string;
  /** Một câu nói biểu đồ trả lời câu hỏi gì */
  description: string;
  children: ReactNode;
  /** Bảng số liệu thay thế cho biểu đồ (trợ năng, in ấn) */
  table?: ReactNode;
  legend?: ReactNode;
  className?: string;
}

/** Khung chung cho mọi biểu đồ: tiêu đề, ý nghĩa, chú giải, và chuyển sang dạng bảng */
export function ChartCard({ title, description, children, table, legend, className }: ChartCardProps) {
  const { t } = useTranslation();
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={clsx("card-surface p-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">{description}</p>
        </div>
        {table && (
          <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-semibold text-brand-700 transition-colors duration-hover hover:bg-surface"
          >
            {asTable ? t("common.viewAsChart") : t("common.viewAsTable")}
          </button>
        )}
      </div>
      {legend && !asTable && <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">{legend}</div>}
      <div className="mt-5">{asTable && table ? table : children}</div>
    </section>
  );
}

/** Mục chú giải: chấm màu nhận diện, chữ dùng màu văn bản */
export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-700">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

/** Bảng số liệu đơn giản cho chế độ xem bảng */
export function DataTable({ head, rows }: { head: string[]; rows: (string | ReactNode)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-slate-600">
          {head.map((h, i) => (
            <th key={h} className={clsx("px-3 py-2 font-semibold", i > 0 && "text-right")}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="odd:bg-surface/70">
            {r.map((c, j) => (
              <td key={j} className={clsx("px-3 py-2", j > 0 && "text-right tabular-nums", j === 0 && "text-ink")}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
